import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

// Callable function to create a new user
export const createUser = functions.https.onCall(async (data, context) => {
  // Add this check to ensure the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  const { email, name, companyId, companyName, companyType } = data;
  const defaultPassword = 'asdf1234';
  const adminId = context.auth.uid; // Get admin's UID from the context

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
    throw new functions.https.HttpsError('internal', 'An error occurred while creating the user.');
  }
});
