import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
// --- ADDED ---
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import axios from 'axios';
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
}

// Callable function to create a new user
export const createUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated.');
  }

  // 2. Destructure the exact keys
  const { email, displayName, companyId, companyName, companyType, permissions }: CreateUserData =
    request.data;
  const adminId = request.auth.uid;

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
      companyId: companyId,
      companyName: companyName,
      companyType: companyType,
      permissions: permissions || {},
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

const KREOLA_API_URL = 'http://192.168.1.69:3100';
const KREOLA_CREDS = { email: 'admin@kreola-dev.com', password: 'secret' };

async function getKreolaToken(): Promise<string> {
  const res = await axios.post<{ access_token: string }>(
    `${KREOLA_API_URL}/auth/sign-in`,
    KREOLA_CREDS,
  );
  return res.data.access_token;
}

export const getRoomPricesProxy = onCall(async (request) => {
  const { payload } = request.data;

  try {
    const token = await getKreolaToken();

    console.log('Proxying request to Kreola API with payload:', payload);

    const response = await axios.get(`${KREOLA_API_URL}/merchants`, {
      data: payload,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    return { data: response.data, test: 'test' };
  } catch (error: any) {
    console.error('Proxy Error:', error.response?.data || error.message);
    throw new HttpsError(
      'internal',
      error.response?.statusText || 'API Error',
      error.response?.data,
    );
  }
});
