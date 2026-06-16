'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from './provider'; // Importação local relativa direta e segura
import { initializeFirebase } from './index';   // Consome do index corrigido

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    // Inicializa os serviços usando o nosso mapeamento unificado
    return initializeFirebase();
  }, []);

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}