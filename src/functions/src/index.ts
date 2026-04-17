
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize the Admin SDK
admin.initializeApp();

/**
 * Cloud Function that triggers when a user document is created OR updated in Firestore.
 * It reads the user's role and tenantId from the document and sets them as custom claims
 * on the user's Firebase Authentication token. Using onWrite makes this process more robust,
 * ensuring claims are updated if the document changes and can be re-triggered on login.
 */
exports.syncUserClaims = functions.firestore
  .document("users/{userId}")
  .onWrite(async (change, context) => {
    const { userId } = context.params;
    const afterData = change.after.data();
    const beforeData = change.before.data();

    // If the document is deleted, do nothing.
    if (!afterData) {
      console.log(`User ${userId} document deleted. Claims will persist until token expiry.`);
      return null;
    }
    
    // Only proceed if it's a new document or the role/tenantId has actually changed.
    // This is crucial to prevent infinite loops if other parts of the function were to write to the doc.
    if (beforeData && beforeData.role === afterData.role && beforeData.tenantId === afterData.tenantId) {
      console.log(`No change in role or tenantId for user ${userId}. Skipping claim update.`);
      return null;
    }

    // Role is always required for a valid user document.
    if (!afterData.role) {
      console.error(`"role" field missing for user ${userId}. Cannot set claims.`);
      return null;
    }

    const claims: { [key: string]: any } = { role: afterData.role };

    // For non-master users, a tenantId is mandatory for data scoping.
    if (afterData.role !== 'master' && !afterData.tenantId) {
      console.error(`"tenantId" is required for role '${afterData.role}' on user ${userId}.`);
      return null;
    }

    if (afterData.tenantId) {
      claims.tenantId = afterData.tenantId;
    }

    try {
      await admin.auth().setCustomUserClaims(userId, claims);
      console.log(
        `Successfully set custom claims for user ${userId}: ${JSON.stringify(
          claims
        )}`
      );
    } catch (error) {
      console.error(`Error setting custom claims for user ${userId}:`, error);
    }
  });
