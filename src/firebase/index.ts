'use client';

import { firebaseApp, auth, firestore, storage } from '@/lib/data'; // Puxa do seu singleton robusto

// Função substituta para manter a compatibilidade com providers legados que a chamavam
export function initializeFirebase() {
  return {
    firebaseApp,
    auth,
    firestore,
    storage
  };
}

// Mantém os exports nomeados que outras páginas utilizam
export { firebaseApp, auth, firestore, storage };

// Re-exporta os providers e hooks internos da pasta para consertar o dashboard
export * from './provider';
export * from './client-provider';

// Proteção caso existam os arquivos abaixo. Se o compilador reclamar de algum deles sumido, 
// certifique-se de que eles existem nesta pasta ou comente a linha correspondente.
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './errors';