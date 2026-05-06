import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { AuthProvider } from "@/contexts/auth-context";
import { WhatsappWidget } from '@/components/WhatsappWidget';

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
    <html lang="pt-br" suppressHydrationWarning>
      <body className="antialiased font-sans"> 
        {/* 
          1. FirebaseClientProvider: Inicializa a conexão com o Firebase.
          2. AuthProvider: Agora carrega o vínculo entre o Usuário e o Tenant (empresa).
        */}
        <FirebaseClientProvider>
          <AuthProvider> 
            {children}
          </AuthProvider>
        </FirebaseClientProvider>

        {/* Componentes globais de interface */}
        <WhatsappWidget />
        <Toaster />
      </body>
    </html>
  );
}