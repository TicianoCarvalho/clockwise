import * as admin from 'firebase-admin';

const formatPrivateKey = (key: string | undefined) => {
  if (!key) return undefined;

  return key
    .replace(/\\n/g, '\n')
    .replace(/^"(.*)"$/, '$1')
    .trim();
};

function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = formatPrivateKey(
    process.env.FIREBASE_ADMIN_PRIVATE_KEY
  );

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      '[Firebase Admin] Variáveis de ambiente não configuradas.'
    );
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

// ✅ Lazy initialization
export const getAdminDb = () => {
  const app = initializeFirebaseAdmin();
  return admin.firestore(app);
};

export const getAdminAuth = () => {
  const app = initializeFirebaseAdmin();
  return admin.auth(app);
};

export default admin;