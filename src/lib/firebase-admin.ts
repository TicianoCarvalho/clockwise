import * as admin from 'firebase-admin';

const formatPrivateKey = (key: string | undefined) => {
  if (!key) return undefined;
  return key.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n').trim();
};

const serviceAccount = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: formatPrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY),
};

const isBuildStep = process.env.NEXT_PHASE === 'phase-production-build';

if (!admin.apps.length && !isBuildStep && serviceAccount.projectId && serviceAccount.privateKey) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
  } catch (error) {
    console.error('[Firebase Admin] Erro de inicialização:', error);
  }
}

// Exporta proxies para evitar erro de "initializeApp" no build
export const adminDb = isBuildStep ? {} as any : admin.firestore();
export const adminAuth = isBuildStep ? {} as any : admin.auth();
export default admin;