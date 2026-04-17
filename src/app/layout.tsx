import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { AuthProvider } from "@/contexts/auth-context";
import { WhatsappWidget } from '@/components/WhatsappWidget';

export const metadata: Metadata = {
  title: 'ClockWise',
  description: 'Modern time tracking for your business.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br" suppressHydrationWarning>
      {/* Remova o <head> manual se as fontes estiverem pesando ou dando erro de Hydration */}
      <body className="antialiased font-sans"> 
        <FirebaseClientProvider>
          <AuthProvider> 
            {children}
          </AuthProvider>
        </FirebaseClientProvider>
        <WhatsappWidget />
        <Toaster />
      </body>
    </html>
  );
}