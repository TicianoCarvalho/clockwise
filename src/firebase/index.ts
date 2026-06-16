'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Objeto de configuração extraído diretamente das variáveis NEXT_PUBLIC
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseInstance() {
  if (typeof window !== 'undefined') { // Garante execução apenas no Browser
    if (!getApps().length) {
      return initializeApp(firebaseConfig);
    }
    return getApp();
  }
  return null;
}

const app = getFirebaseInstance();

// Exportações seguras
export const firebaseApp = app as FirebaseApp;
export const auth = app ? getAuth(app) : null as unknown as Auth;
export const firestore = app ? getFirestore(app) : null as unknown as Firestore;

// Helpers de exportação
export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './errors';