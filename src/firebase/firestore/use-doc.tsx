'use client';

import {
  useState,
  useEffect
} from 'react';

import {
  DocumentReference,
  onSnapshot,
  DocumentData,
  FirestoreError,
  DocumentSnapshot,
} from 'firebase/firestore';

import {
  errorEmitter
} from '@/firebase/error-emitter';

import {
  FirestorePermissionError
} from '@/firebase/errors';

/** Utility type to add an 'id' field to a given type T. */
type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useDoc hook.
 */
export interface UseDocResult<T> {

  data: WithId<T> | null;

  isLoading: boolean;

  error: FirestoreError | Error | null;
}

/**
 * React hook to subscribe to a single Firestore document.
 */
export function useDoc<T = any>(
  memoizedDocRef:
    | DocumentReference<DocumentData>
    | null
    | undefined,
): UseDocResult<T> {

  type StateDataType = WithId<T> | null;

  const [data, setData] =
    useState<StateDataType>(null);

  const [isLoading, setIsLoading] =
    useState<boolean>(true);

  const [error, setError] =
    useState<FirestoreError | Error | null>(null);

  useEffect(() => {

    let unsubscribe: () => void = () => {};

    if (memoizedDocRef) {

      setIsLoading(true);

      setError(null);

      unsubscribe = onSnapshot(

        memoizedDocRef,

        (
          snapshot:
            DocumentSnapshot<DocumentData>
        ) => {

          if (snapshot.exists()) {

            setData({
              ...(snapshot.data() as T),
              id: snapshot.id,
            });

          } else {

            setData(null);
          }

          setError(null);

          setIsLoading(false);
        },

        (firebaseError: FirestoreError) => {

          const contextualError =
            new FirestorePermissionError({

              operation: 'get',

              path: memoizedDocRef.path,
            });

          console.error(
            '[FIRESTORE DOC ERROR]',
            firebaseError
          );

          setError(contextualError);

          setData(null);

          setIsLoading(false);

          errorEmitter.emit(
            'permission-error',
            contextualError
          );
        }
      );

    } else {

      setData(null);

      setIsLoading(false);

      setError(null);
    }

    return () => unsubscribe();

  }, [memoizedDocRef]);

  return {
    data,
    isLoading,
    error,
  };
}

// ========================================
// BACKWARD COMPATIBILITY
// ========================================

export const useDocument = useDoc;