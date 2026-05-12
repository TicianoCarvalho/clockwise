'use client';

import React, {
  createContext,
  useContext,
  ReactNode,
  useMemo,
  useState,
  useEffect,
  DependencyList,
} from 'react';

import { FirebaseApp } from 'firebase/app';

import { Firestore } from 'firebase/firestore';

import {
  Auth,
  User,
  onAuthStateChanged,
} from 'firebase/auth';

import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

// =====================================================
// TYPES
// =====================================================

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export interface FirebaseContextState {
  areServicesAvailable: boolean;

  firebaseApp: FirebaseApp | null;

  firestore: Firestore | null;

  auth: Auth | null;

  user: User | null;

  isUserLoading: boolean;

  userError: Error | null;
}

export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp | null;

  firestore: Firestore | null;

  auth: Auth | null;

  user: User | null;

  isUserLoading: boolean;

  userError: Error | null;
}

export interface UserHookResult {
  user: User | null;

  isUserLoading: boolean;

  userError: Error | null;
}

// =====================================================
// CONTEXT
// =====================================================

export const FirebaseContext =
  createContext<FirebaseContextState | undefined>(
    undefined
  );

// =====================================================
// PROVIDER
// =====================================================

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {

  const [userAuthState, setUserAuthState] =
    useState<UserAuthState>({
      user: null,
      isUserLoading: true,
      userError: null,
    });

  // =====================================================
  // AUTH LISTENER
  // =====================================================

  useEffect(() => {

    if (!auth) {

      console.error(
        '[AUTH] Firebase Auth não inicializado'
      );

      setUserAuthState({
        user: null,
        isUserLoading: false,
        userError: new Error(
          'Firebase Auth não inicializado.'
        ),
      });

      return;
    }

    const unsubscribe = onAuthStateChanged(

      auth,

      (firebaseUser) => {

        setUserAuthState({
          user: firebaseUser,
          isUserLoading: false,
          userError: null,
        });
      },

      (error) => {

        console.error(
          '[AUTH] onAuthStateChanged:',
          error
        );

        setUserAuthState({
          user: null,
          isUserLoading: false,
          userError: error,
        });
      }
    );

    return () => unsubscribe();

  }, [auth]);

  // =====================================================
  // CONTEXT VALUE
  // =====================================================

  const contextValue = useMemo<FirebaseContextState>(() => {

    const servicesAvailable =
      !!firebaseApp &&
      !!firestore &&
      !!auth;

    return {

      areServicesAvailable: servicesAvailable,

      firebaseApp: servicesAvailable
        ? firebaseApp
        : null,

      firestore: servicesAvailable
        ? firestore
        : null,

      auth: servicesAvailable
        ? auth
        : null,

      user: userAuthState.user,

      isUserLoading:
        userAuthState.isUserLoading,

      userError:
        userAuthState.userError,
    };

  }, [
    firebaseApp,
    firestore,
    auth,
    userAuthState,
  ]);

  // =====================================================
  // RENDER
  // =====================================================

  return (

    <FirebaseContext.Provider value={contextValue}>

      <FirebaseErrorListener />

      {children}

    </FirebaseContext.Provider>
  );
};

// =====================================================
// SAFE FALLBACK
// =====================================================

const firebaseFallback: FirebaseServicesAndUser = {

  firebaseApp: null,

  firestore: null,

  auth: null,

  user: null,

  isUserLoading: true,

  userError: null,
};

// =====================================================
// HOOKS
// =====================================================

export const useFirebase =
  (): FirebaseServicesAndUser => {

    const context =
      useContext(FirebaseContext);

    // SSR SAFE
    if (!context) {

      return firebaseFallback;
    }

    // SERVICES SAFE
    if (
      !context.areServicesAvailable ||
      !context.firebaseApp ||
      !context.firestore ||
      !context.auth
    ) {

      return {
        firebaseApp: context.firebaseApp,
        firestore: context.firestore,
        auth: context.auth,
        user: context.user,
        isUserLoading: true,
        userError: context.userError,
      };
    }

    return {

      firebaseApp: context.firebaseApp,

      firestore: context.firestore,

      auth: context.auth,

      user: context.user,

      isUserLoading:
        context.isUserLoading,

      userError:
        context.userError,
    };
  };

// =====================================================
// AUTH
// =====================================================

export const useAuth = (): Auth | null => {

  const { auth } = useFirebase();

  return auth;
};

// =====================================================
// FIRESTORE
// =====================================================

export const useFirestore =
  (): Firestore | null => {

    const { firestore } =
      useFirebase();

    return firestore;
  };

// =====================================================
// APP
// =====================================================

export const useFirebaseApp =
  (): FirebaseApp | null => {

    const { firebaseApp } =
      useFirebase();

    return firebaseApp;
  };

// =====================================================
// USER
// =====================================================

export const useUser =
  (): UserHookResult => {

    const {
      user,
      isUserLoading,
      userError,
    } = useFirebase();

    return {
      user,
      isUserLoading,
      userError,
    };
  };

// =====================================================
// MEMO HELPER
// =====================================================

type MemoFirebase<T> = T & {
  __memo?: boolean;
};

export function useMemoFirebase<T>(
  factory: () => T,
  deps: DependencyList
): T | MemoFirebase<T> {

  const memoized =
    useMemo(factory, deps);

  if (
    typeof memoized !== 'object' ||
    memoized === null
  ) {
    return memoized;
  }

  (
    memoized as MemoFirebase<T>
  ).__memo = true;

  return memoized;
}