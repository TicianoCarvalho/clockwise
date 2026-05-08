"use client";

import { initializeApp, getApps, getApp } from "firebase/app";

import {
  getAuth
} from "firebase/auth";

import {
  getFirestore
} from "firebase/firestore";

import {
  getStorage
} from "firebase/storage";

// ✅ CONFIG VIA .ENV
const firebaseConfig = {

  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY,

  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,

  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,

  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,

  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,

  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// ✅ VALIDAÇÃO
const hasFirebaseConfig =
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId;

// ✅ APP
const app =
  getApps().length > 0
    ? getApp()
    : hasFirebaseConfig
      ? initializeApp(firebaseConfig)
      : null;

// ✅ AUTH
export const auth =
  app ? getAuth(app) : null;

// ✅ FIRESTORE
export const firestore =
  app ? getFirestore(app) : null;

// ✅ STORAGE
export const storage =
  app ? getStorage(app) : null;

// ✅ EXPORT DEFAULT
export default app;

// ✅ DEBUG
if (!hasFirebaseConfig) {
  console.error(
    "[FIREBASE] Variáveis NEXT_PUBLIC_* não carregadas."
  );
}