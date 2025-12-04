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
  name: string;
  companyId: string;
  companyName: string;
  companyType: string;
}

// Callable function to create a new user
export const createUser = onCall(async (request) => {
  // Check if the user is authenticated.
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const { email, name, companyId, companyName, companyType }: CreateUserData = request.data;
  const defaultPassword = 'asdf1234';
  const adminId = request.auth.uid; // Get admin's UID from the context

  try {
    // 1. Fetch the admin's display name
    const adminUserRecord = await admin.auth().getUser(adminId);
    const adminName = adminUserRecord.displayName || 'Admin';

    // 2. Create the user in Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email: email,
      password: defaultPassword,
      displayName: name,
    });

    // 3. Create the user's profile document in Firestore
    const userDocRef = admin.firestore().collection('users').doc(userRecord.uid);
    await userDocRef.set({
      name: name,
      email: email,
      roles: ['user'],
      companyId: companyId,
      companyName: companyName,
      companyType: companyType,
      documentStatus: 'ACTIVE',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: adminId,
      createdByName: adminName,
      updatedBy: adminId,
      updatedByName: adminName,
    });

    return { result: `Successfully created user ${email}` };
  } catch (error) {
    console.error('Error creating new user:', error);
    if (error instanceof Error) {
      throw new HttpsError('internal', error.message);
    }
    throw new HttpsError('internal', 'An error occurred while creating the user.');
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

// Proxy function to handle GET requests with bodies (which browsers can't do)
export const getRoomPricesProxy = onCall(async (request) => {
  // 1. Extract data sent from Angular
  const { token, hotelId, payload } = request.data;
  const apiUrl = 'https://api.kreola-dev.com';

  try {
    // 2. Make the request from the Server (Node.js supports GET+Body)
    const response = await axios.get(`${apiUrl}/offer/${hotelId}`, {
      data: payload, // In Axios, 'data' is the body
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    // 3. Return data back to Angular
    return response.data;
  } catch (error: any) {
    console.error('Proxy Error:', error.response?.data || error.message);
    // Pass the error back to the client
    throw new HttpsError(
      'internal',
      error.response?.statusText || 'API Error',
      error.response?.data
    );
  }
});
// --- END ADD ---
