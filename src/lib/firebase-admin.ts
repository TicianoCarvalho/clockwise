import * as admin from 'firebase-admin';

const formatPrivateKey = (
  key: string | undefined
) => {
  if (!key) return undefined;

  return key
    .replace(/^["']|["']$/g, '')
    .replace(/\\n/g, '\n')
    .trim();
};

const serviceAccount = {
  projectId:
    process.env.FIREBASE_ADMIN_PROJECT_ID,

  clientEmail:
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL,

  privateKey: formatPrivateKey(
    process.env.FIREBASE_ADMIN_PRIVATE_KEY
  ),
};

// Detecta build do Next
const isBuildStep =
  process.env.NEXT_PHASE ===
  'phase-production-build';

// =====================================
// INIT FIREBASE ADMIN
// =====================================

function initializeFirebaseAdmin() {
  // evita init durante build
  if (isBuildStep) {
    console.warn(
      '[Firebase Admin] Build step detectado'
    );

    return null;
  }

  // reutiliza app existente
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // valida envs
  if (
    !serviceAccount.projectId ||
    !serviceAccount.clientEmail ||
    !serviceAccount.privateKey
  ) {
    console.error(
      '[Firebase Admin] Variáveis ausentes'
    );

    return null;
  }

  try {
    return admin.initializeApp({
      credential: admin.credential.cert(
        serviceAccount as admin.ServiceAccount
      ),
    });
  } catch (error) {
    console.error(
      '[Firebase Admin] Erro init:',
      error
    );

    return null;
  }
}

// =====================================
// START
// =====================================

const firebaseAdminApp =
  initializeFirebaseAdmin();

// =====================================
// EXPORTS
// =====================================

export const adminDb =
  firebaseAdminApp
    ? admin.firestore()
    : null;

export const adminAuth =
  firebaseAdminApp
    ? admin.auth()
    : null;

export default admin;