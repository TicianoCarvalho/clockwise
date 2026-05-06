import * as admin from 'firebase-admin';

const formatPrivateKey = (key: string | undefined) => {
  if (!key) return undefined;
  return key
    .replace(/\\n/g, '\n')
    .replace(/^"(.*)"$/, '$1')
    .trim();
};

const serviceAccount = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: formatPrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY),
};

// 🔐 Inicialização segura (singleton)
function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    throw new Error('[Firebase Admin] Variáveis de ambiente não configuradas corretamente.');
  }

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}

// 🚀 Inicializa de forma garantida
const app = initializeFirebaseAdmin();

// ✅ EXPORTS SEGUROS
export const adminDb = admin.firestore(app);
export const adminAuth = admin.auth(app);

export default admin;