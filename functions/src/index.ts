import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
// --- ADDED ---
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import axios from 'axios';
import { defineSecret } from 'firebase-functions/params';
// --- END ADD ---

admin.initializeApp();

// Define an interface for the expected data payload
interface CreateUserData {
  email: string;
  password?: string; // Make password dynamic from the form
  displayName: string;
  permissions: Record<string, string>;
  companyId: string;
  companyName: string;
  companyType: string; // e.g., { 'products': 'write', 'partners': 'read' }
  isActive: boolean;
  // Present when creating a B2B partner account (bound to one Kreola merchant)
  b2bMerchant?: { id: number; externalMerchantId: string; name: string };
}

// B2B partner accounts carry the merchant they are bound to on their users/{uid} doc.
async function getCallerProfile(uid: string) {
  const snap = await admin.firestore().collection('users').doc(uid).get();
  return snap.data() as
    | { b2bMerchantId?: number; b2bExternalMerchantId?: string; documentStatus?: string }
    | undefined;
}

// Internal staff only: B2B partners must never reach the unrestricted merchant/price proxies.
async function assertInternalUser(request: CallableRequest): Promise<void> {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated.');
  }
  const profile = await getCallerProfile(request.auth.uid);
  if (!profile || profile.b2bMerchantId != null) {
    throw new HttpsError('permission-denied', 'Not allowed for this account.');
  }
}

// B2B partner accounts only; returns the merchant binding stored server-side.
async function getB2bBinding(request: CallableRequest) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated.');
  }
  const profile = await getCallerProfile(request.auth.uid);
  if (
    !profile ||
    profile.b2bMerchantId == null ||
    !profile.b2bExternalMerchantId ||
    profile.documentStatus === 'INACTIVE'
  ) {
    throw new HttpsError('permission-denied', 'Not a B2B partner account.');
  }
  return {
    merchantId: profile.b2bMerchantId,
    externalMerchantId: profile.b2bExternalMerchantId,
  };
}

// Callable function to create a new user
export const createUser = onCall(async (request) => {
  await assertInternalUser(request);

  // 2. Destructure the exact keys
  const {
    email,
    displayName,
    companyId,
    companyName,
    companyType,
    permissions,
    b2bMerchant,
  }: CreateUserData = request.data;

  if (b2bMerchant && (b2bMerchant.id == null || !b2bMerchant.externalMerchantId)) {
    throw new HttpsError('invalid-argument', 'Invalid B2B merchant.');
  }
  const adminId = request.auth!.uid; // assertInternalUser guarantees auth

  try {
    const adminUserRecord = await admin.auth().getUser(adminId);
    const adminName = adminUserRecord.displayName || 'Admin';

    // 3. Create the Auth User
    const userRecord = await admin.auth().createUser({
      email: email,
      password: 'asdf1234', // Default password
      displayName: displayName,
    });

    // 4. Create the Firestore Document
    const userDocRef = admin.firestore().collection('users').doc(userRecord.uid);

    // IF ANY OF THESE ARE UNDEFINED, THIS BLOCK WILL CRASH!
    await userDocRef.set({
      id: userRecord.uid,
      displayName: displayName,
      email: email,
      companyId: companyId ?? null,
      companyName: companyName ?? null,
      companyType: companyType ?? null,
      permissions: permissions || {},
      ...(b2bMerchant
        ? {
            b2bMerchantId: b2bMerchant.id,
            b2bExternalMerchantId: b2bMerchant.externalMerchantId,
            b2bMerchantName: b2bMerchant.name ?? '',
          }
        : {}),
      documentStatus: 'ACTIVE',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: adminId,
      createdByName: adminName,
      updatedBy: adminId,
      updatedByName: adminName,
    });

    return { result: `Successfully created user ${email}` };
  } catch (error: any) {
    console.error('Error creating user:', error);
    throw new HttpsError('internal', error.message || 'Failed to create user.');
  }
});

// --- ADDED: Cloud Function to generate sequential order numbers ---
export const generateOrderNumber = onDocumentCreated('sales-orders/{orderId}', async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    console.log('No data associated with the event');
    return;
  }

  // Reference to the counter document
  const counterRef = admin.firestore().doc('counters/salesOrders');

  try {
    // Run a transaction to atomically update the counter and the new order
    await admin.firestore().runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(counterRef);

      // Get the new order number, starting at 1 if counter doesn't exist
      const newOrderNumber = (counterDoc.data()?.currentValue || 0) + 1;

      // Update the counter
      transaction.set(counterRef, { currentValue: newOrderNumber }, { merge: true });

      // Update the new sales order with the sequential number
      transaction.update(snapshot.ref, { orderNumber: newOrderNumber });

      console.log(`Successfully set order number ${newOrderNumber} for ${snapshot.id}`);
    });
  } catch (error) {
    console.error('Error generating order number:', error);
  }
});

// Kreola ERP API (production). Credentials live in Firebase secrets, never in source:
//   firebase functions:secrets:set KREOLA_EMAIL
//   firebase functions:secrets:set KREOLA_PASSWORD
const KREOLA_API_URL = 'https://api.kreola.mu'; // no trailing slash: paths are appended as `/auth/...`
const KREOLA_EMAIL = defineSecret('KREOLA_EMAIL');
const KREOLA_PASSWORD = defineSecret('KREOLA_PASSWORD');
const kreolaOpts = { secrets: [KREOLA_EMAIL, KREOLA_PASSWORD] };

async function getKreolaToken(): Promise<string> {
  const res = await axios.post<{ access_token: string }>(`${KREOLA_API_URL}/auth/sign-in`, {
    email: KREOLA_EMAIL.value(),
    password: KREOLA_PASSWORD.value(),
  });
  return res.data.access_token;
}

export const getRoomPricesProxy = onCall(kreolaOpts, async (request) => {
  await assertInternalUser(request);
  const { payload } = request.data;

  try {
    const token = await getKreolaToken();

    const response = await axios.post(`${KREOLA_API_URL}/erp/availability`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    return response.data;
  } catch (error: any) {
    console.error('Proxy Error:', error.response?.data || error.message);
    throw new HttpsError(
      'internal',
      error.response?.statusText || 'API Error',
      error.response?.data,
    );
  }
});

export const getMerchantsProxy = onCall(kreolaOpts, async (request) => {
  await assertInternalUser(request);
  try {
    const token = await getKreolaToken();
    const response = await axios.get(`${KREOLA_API_URL}/erp/merchants`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    return response.data;
  } catch (error: any) {
    console.error('Merchants Proxy Error:', error.response?.data || error.message);
    throw new HttpsError(
      'internal',
      error.response?.statusText || 'API Error',
      error.response?.data,
    );
  }
});

export const getMerchantHotelsProxy = onCall(kreolaOpts, async (request) => {
  await assertInternalUser(request);
  const { merchantId } = request.data;

  try {
    const token = await getKreolaToken();
    const response = await axios.get(`${KREOLA_API_URL}/erp/merchants/${merchantId}/hotels`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    return response.data;
  } catch (error: any) {
    console.error('Merchant Hotels Proxy Error:', error.response?.data || error.message);
    throw new HttpsError(
      'internal',
      error.response?.statusText || 'API Error',
      error.response?.data,
    );
  }
});

export const getMerchantHotelListProxy = onCall(kreolaOpts, async (request) => {
  await assertInternalUser(request);
  const { externalMerchantId } = request.data;

  try {
    const token = await getKreolaToken();

    // Now GET with a query param — was POST /merchants/hotel-list
    const response = await axios.get(`${KREOLA_API_URL}/erp/hotel-list`, {
      params: { externalMerchantId },
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    return response.data;
  } catch (error: any) {
    console.error('Hotel List Proxy Error:', error.response?.data || error.message);
    throw new HttpsError(
      'internal',
      error.response?.statusText || 'API Error',
      error.response?.data,
    );
  }
});

// --- B2B partner module -------------------------------------------------------
// The merchant is never taken from the request: it comes from the caller's users/{uid} doc,
// so a partner can only ever see the hotels and prices of their own merchant.
async function getB2bHotels(merchantId: number): Promise<any[]> {
  const token = await getKreolaToken();
  const response = await axios.get(`${KREOLA_API_URL}/erp/merchants/${merchantId}/hotels`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  return (response.data as any[]).filter((h) => h.active !== false);
}

export const b2bGetHotelsProxy = onCall(kreolaOpts, async (request) => {
  const { merchantId } = await getB2bBinding(request);
  try {
    const hotels = await getB2bHotels(merchantId);
    return hotels.map((h) => ({ externalHotelId: h.externalHotelId, name: h.name }));
  } catch (error: any) {
    console.error('B2B Hotels Error:', error.response?.data || error.message);
    throw new HttpsError('internal', error.response?.statusText || 'API Error');
  }
});

export const b2bGetPricesProxy = onCall(kreolaOpts, async (request) => {
  const { merchantId, externalMerchantId } = await getB2bBinding(request);
  const { externalHotelId, startDate, endDate, roomCandidates } = request.data ?? {};

  if (!externalHotelId || !startDate || !endDate || !Array.isArray(roomCandidates)) {
    throw new HttpsError('invalid-argument', 'Missing hotel, dates or room candidates.');
  }

  try {
    const hotels = await getB2bHotels(merchantId);
    if (!hotels.some((h) => String(h.externalHotelId) === String(externalHotelId))) {
      throw new HttpsError('permission-denied', 'Hotel not available for this partner.');
    }

    const token = await getKreolaToken();
    const response = await axios.post(
      `${KREOLA_API_URL}/erp/availability`,
      // Merchant is forced from the account binding, never from the client
      { externalMerchantId, externalHotelId, startDate, endDate, roomCandidates },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      },
    );
    return response.data;
  } catch (error: any) {
    if (error instanceof HttpsError) throw error;
    console.error('B2B Prices Error:', error.response?.data || error.message);
    throw new HttpsError('internal', error.response?.statusText || 'API Error');
  }
});
