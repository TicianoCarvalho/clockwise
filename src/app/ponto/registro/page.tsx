'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useState } from 'react';
import { IdentifyAndClockInContent } from '@/components/IdentifyAndClockInContent';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { type Employee } from '@/lib/data';
import { initializeFirebase } from '@/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

// 1. Criamos um componente interno para a lógica que usa searchParams
function RegistroPontoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { firestore } = initializeFirebase();
  
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cpfFromUrl = searchParams.get('cpf');
  const cleanedCpf = cpfFromUrl?.replace(/\D/g, '') || '';

  useEffect(() => {
    if (!cpfFromUrl) {
      setError("CPF não fornecido.");
      setLoading(false);
      return;
    }

    if (cleanedCpf.length !== 11) {
      router.push('/ponto/login');
      return;
    }

    const fetchEmployeeData = async () => {
      if (!firestore) return;
      
      setLoading(true);
      setError(null);
      try {
        const tenantId = "43058506000164"; // Tenant fixo Aleph IT
        const employeesRef = collection(firestore, 'tenants', tenantId, 'employees');
        
        const formattedCpf = cleanedCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
        const q = query(employeesRef, where("cpf", "==", formattedCpf), limit(1));
        
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setError("Colaborador não encontrado na base da Aleph IT.");
          return;
        }

        const employeeDoc = querySnapshot.docs[0];
        const foundEmployee = { ...employeeDoc.data(), id: employeeDoc.id } as Employee;
        
        if (foundEmployee.allowMobilePunch === false) {
          setError("Acesso via celular não autorizado.");
          return;
        }

        setEmployee(foundEmployee);
      } catch (err: any) {
        console.error("Erro Firestore:", err);
        setError("Erro ao conectar com o banco de dados.");
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeData();
  }, [cpfFromUrl, cleanedCpf, firestore, router]);

  if (loading) return (
    <div className="flex justify-center p-8">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  );

  if (error) return (
    <Card className="w-full max-w-sm text-center border-none shadow-none">
      <CardHeader><CardTitle className="text-destructive">Acesso Negado</CardTitle></CardHeader>
      <CardContent>
        <p className="mb-4">{error}</p>
        <Button onClick={() => router.push('/ponto/login')}>Voltar</Button>
      </CardContent>
    </Card>
  );

  return <IdentifyAndClockInContent initialEmployee={employee!} isPontoMode={true} />;
}

// 2. O componente principal apenas envolve tudo em Suspense
export default function RegistroPontoPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-[380px]">
        <CardHeader className="text-center">
          <CardTitle>Ponto Biométrico</CardTitle>
          <CardDescription>Empresa: Aleph IT</CardDescription>
        </CardHeader>
        <CardContent>
          {/* O Suspense DEVE envolver qualquer componente que use useSearchParams */}
          <Suspense fallback={
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          }>
            <RegistroPontoContent />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}