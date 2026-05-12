"use client";

import {
  initializeApp,
  getApps,
  getApp
} from "firebase/app";

import {
  getAuth
} from "firebase/auth";

import {
  getFirestore,
  collection,
  doc,
  query,
  onSnapshot,
  Query,
  DocumentReference
} from "firebase/firestore";

import {
  getStorage
} from "firebase/storage";

import {
  useEffect,
  useMemo,
  useState
} from "react";

// ======================================================
// CONFIG
// ======================================================

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

// ======================================================
// SAFE INIT
// ======================================================

const hasFirebaseConfig =

  !!firebaseConfig.apiKey &&
  !!firebaseConfig.authDomain &&
  !!firebaseConfig.projectId &&
  !!firebaseConfig.appId;

// NÃO lançar throw no build
const app = hasFirebaseConfig

  ? (
      getApps().length > 0
        ? getApp()
        : initializeApp(firebaseConfig)
    )

  : null;

// ======================================================
// SERVICES
// ======================================================

export const auth =
  app ? getAuth(app) : null;

export const firestore =
  app ? getFirestore(app) : null;

export const storage =
  app ? getStorage(app) : null;

// ======================================================
// DEFAULT
// ======================================================

export default app;

// ======================================================
// DEBUG
// ======================================================

if (!hasFirebaseConfig) {

  console.error(
    "[FIREBASE] Variáveis NEXT_PUBLIC_FIREBASE_* ausentes."
  );

} else {

  console.log(
    "[FIREBASE] Inicializado:",
    firebaseConfig.projectId
  );
}

// ======================================================
// HOOKS
// ======================================================

export function useFirebase() {

  return {
    app,
    auth,
    firestore,
    storage,
  };
}

// ======================================================
// useMemoFirebase
// ======================================================

export function useMemoFirebase<T>(
  factory: () => T,
  deps: React.DependencyList
) {

  return useMemo(factory, deps);
}

// ======================================================
// useCollection
// ======================================================

export function useCollection<T>(
  q: Query | null
) {

  const [data, setData] =
    useState<T[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  useEffect(() => {

    if (!q) {

      setData([]);
      setIsLoading(false);

      return;
    }

    const unsubscribe =
      onSnapshot(
        q,
        (snapshot) => {

          const docs =
            snapshot.docs.map(
              (doc) => ({
                id: doc.id,
                ...doc.data(),
              })
            ) as T[];

          setData(docs);

          setIsLoading(false);
        },
        (error) => {

          console.error(error);

          setData([]);

          setIsLoading(false);
        }
      );

    return () => unsubscribe();

  }, [q]);

  return {
    data,
    isLoading,
  };
}

// ======================================================
// useDocument
// ======================================================

export function useDocument<T>(
  ref: DocumentReference | null
) {

  const [data, setData] =
    useState<T | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  useEffect(() => {

    if (!ref) {

      setData(null);
      setIsLoading(false);

      return;
    }

    const unsubscribe =
      onSnapshot(
        ref,
        (snapshot) => {

          if (!snapshot.exists()) {

            setData(null);

          } else {

            setData({
              id: snapshot.id,
              ...snapshot.data(),
            } as T);
          }

          setIsLoading(false);
        },
        (error) => {

          console.error(error);

          setData(null);

          setIsLoading(false);
        }
      );

    return () => unsubscribe();

  }, [ref]);

  return {
    data,
    isLoading,
  };
}