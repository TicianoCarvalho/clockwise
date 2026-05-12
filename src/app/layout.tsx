import type { Metadata } from 'next';
import './globals.css';

import { Toaster } from "@/components/ui/toaster";

import { FirebaseProvider } from '@/firebase/provider';

import {
  app,
  auth,
  firestore
} from '@/firebase';

import { AuthProvider } from "@/contexts/auth-context";

import { WhatsappWidget } from '@/components/WhatsappWidget';

export const metadata: Metadata = {
  title: 'ClockWise - Gestão de Ponto Inteligente',
  description:
    'Sistema moderno de controle de ponto e gestão estratégica de RH.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html
      lang="pt-br"
      suppressHydrationWarning
    >
      <body className="antialiased font-sans">

        {/* 
          FirebaseProvider:
          Inicializa Firebase App + Auth + Firestore
        */}

        <FirebaseProvider
          firebaseApp={app}
          auth={auth}
          firestore={firestore}
        >

          {/* 
            AuthProvider:
            Gerencia sessão do usuário e tenant
          */}

          <AuthProvider>
            {children}
          </AuthProvider>

        </FirebaseProvider>

        {/* COMPONENTES GLOBAIS */}

        <WhatsappWidget />

        <Toaster />

      </body>
    </html>
  );
}