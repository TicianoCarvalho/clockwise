'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { Loader2 } from 'lucide-react';

export default function MyCompanyPage() {
  const router = useRouter();
  const { user, isUserLoading } = useFirebase();

  useEffect(() => {
    if (isUserLoading) {
      return; // Wait until user is loaded
    }

    if (!user) {
      router.replace('/login'); // Should not happen if layout protects, but good practice
      return;
    }

    // Immediately check for hardcoded master user
    if (user.email === 'admin@clockwise.com') {
        // Master user doesn't have a single tenant, so redirect them to the master panel
        router.replace('/dashboard/companies');
        return;
    }

    // For other users, get tenantId from claims
    user.getIdTokenResult(true).then(idTokenResult => {
      const tenantId = idTokenResult.claims.tenantId as string;
      const role = idTokenResult.claims.role as string;

      if (tenantId) {
        // Redirect to the specific company edit page
        router.replace(`/dashboard/companies/${tenantId}`);
      } else {
        // Handle case where tenantId is missing
        console.error("Tenant ID not found in user claims.");
        if (role === 'master') {
            router.replace('/dashboard/companies');
        } else {
            router.replace('/dashboard');
        }
      }
    });
  }, [user, isUserLoading, router]);

  return (
    <div className="flex h-full w-full items-center justify-center p-16">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Redirecionando para os dados da sua empresa...</p>
      </div>
    </div>
  );
}
