import * as admin from 'firebase-admin';

const formatPrivateKey = (key: string | undefined) => {
  if (!key) return undefined;
  // Trata a chave de forma robusta para Windows e Linux
  return key.replace(/\\n/g, '\n').replace(/^"(.*)"$/, '$1').trim();
};

const serviceAccount = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: formatPrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY),
};

// Se não houver app inicializado, inicializa
if (!admin.apps.length) {
  if (serviceAccount.projectId && serviceAccount.privateKey && serviceAccount.clientEmail) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      });
      console.log('[Firebase Admin] Inicializado com sucesso.');
    } catch (error) {
      console.error('[Firebase Admin] Erro de inicialização:', error);
    }
  } else {
    // Log crucial para você saber PORQUE não conectou
    console.warn('[Firebase Admin] Aviso: Variáveis de ambiente faltando ou inválidas.');
  }
}

// Exporta as instâncias reais ou tenta recuperá-las
export const adminDb = admin.apps.length > 0 
  ? admin.firestore() 
  : admin.apps.length === 0 && process.env.NODE_ENV === 'development'
    ? admin.firestore() // Tenta forçar em dev
    : {} as admin.firestore.Firestore;

export const adminAuth = admin.apps.length > 0 
  ? admin.auth() 
  : {} as admin.auth.Auth;

export default admin;