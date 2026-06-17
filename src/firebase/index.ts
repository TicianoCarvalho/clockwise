'use client';

// 1. Puxa as instâncias limpas e seguras do singleton de cliente
import { firebaseApp, auth, firestore, storage } from '@/lib/data';

// 2. Mantém a função de inicialização para compatibilidade com os providers legados
export function initializeFirebase() {
  return {
    firebaseApp,
    auth,
    firestore,
    storage,
  };
}

// 3. Mantém os exports nomeados diretos das instâncias do SDK do cliente
export { firebaseApp, auth, firestore, storage };

// 4. 🚀 Re-exporta o FirebaseProvider e os hooks (useFirebase, useMemoFirebase) do arquivo provider
export * from './provider';

// 5. Re-exporta o wrapper do cliente
export * from './client-provider';

// 6. Proteções e retrocompatibilidade com hooks e utilitários internos da pasta.
// Se o compilador reclamar que algum deles não existe, você pode comentar a linha.
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './errors';