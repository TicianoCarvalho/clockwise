import type { Metadata } from 'next';
import './globals.css';

import { Toaster } from "@/components/ui/toaster";
import { FirebaseProvider } from '@/firebase/provider';

// 🚀 CORREÇÃO: Puxando as instâncias limpas e seguras do lib/data
import { firebaseApp, auth, firestore } from '@/lib/data';

import { AuthProvider } from "@/contexts/auth-context";

// Importação corrigida para export default (sem as chaves)
import WhatsappWidget from '@/components/WhatsappWidget';

export const metadata: Metadata = {
  title: 'ClockWise - Gestão de Ponto Inteligente',
  description: 'Sistema moderno de controle de ponto e gestão estratégica de RH.',
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
        {/* FirebaseProvider:
          Inicializa Firebase App + Auth + Firestore usando as instâncias da lib/data
        */}
        <FirebaseProvider
          firebaseApp={firebaseApp}
          auth={auth}
          firestore={firestore}
        >
          {/* AuthProvider:
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