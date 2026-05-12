"use client";

import { useEffect, useState } from "react";
import {
  onSnapshot,
  Query,
  DocumentReference,
} from "firebase/firestore";

// ======================================================
// COLLECTION HOOK
// ======================================================

export function useCollection<T>(q: Query | null) {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!q) {
      setData([]);
      setIsLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setData(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as T[]
        );

        setIsLoading(false);
      },
      (error) => {
        console.error("[useCollection]", error);
        setData([]);
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [q]);

  return { data, isLoading };
}

// ======================================================
// DOCUMENT HOOK
// ======================================================

export function useDocument<T>(ref: DocumentReference | null) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!ref) {
      setData(null);
      setIsLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setData(null);
        } else {
          setData({
            id: snap.id,
            ...snap.data(),
          } as T);
        }

        setIsLoading(false);
      },
      (error) => {
        console.error("[useDocument]", error);
        setData(null);
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [ref]);

  return { data, isLoading };
}