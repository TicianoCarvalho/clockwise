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
import { collectionGroup, query, where, getDocs, limit, getDoc } from 'firebase/firestore';

function RegistroPontoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { firestore } = initializeFirebase();
  
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [tenantName, setTenantName] = useState<string>("Carregando...");
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
        // --- BUSCA GLOBAL (Collection Group) ---
        // Isso ignora o tenantId fixo e procura em todas as coleções 'employees'
        const employeesGroup = collectionGroup(firestore, 'employees');
        const formattedCpf = cleanedCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
        
        const q = query(employeesGroup, where("cpf", "==", formattedCpf), limit(1));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setError("Colaborador não encontrado em nenhuma unidade do sistema.");
          return;
        }

        const employeeDoc = querySnapshot.docs[0];
        const employeeData = employeeDoc.data();
        
        // Descobre o tenantId dinamicamente através da hierarquia do documento encontrado
        const tenantRef = employeeDoc.ref.parent.parent;
        
        if (tenantRef) {
          // Busca o nome da empresa para exibir no cabeçalho
          const tenantSnap = await getDoc(tenantRef);
          if (tenantSnap.exists()) {
            setTenantName(tenantSnap.data().name || "Empresa Identificada");
          }
        }

        const foundEmployee = { 
          ...employeeData, 
          id: employeeDoc.id,
          tenantId: tenantRef?.id // Importante para o registro do ponto saber onde salvar
        } as Employee;
        
        if (foundEmployee.allowMobilePunch === false) {
          setError("Acesso via celular não autorizado para este perfil.");
          return;
        }

        setEmployee(foundEmployee);
      } catch (err: any) {
        console.error("Erro Firestore:", err);
        // Se der erro de índice, o link aparecerá no console do navegador (F12)
        setError("Erro ao conectar com o banco de dados. Verifique o console.");
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
      <CardHeader>
        <CardTitle className="text-destructive">Acesso Negado</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">{error}</p>
        <Button className="w-full" onClick={() => router.push('/ponto/login')}>Voltar para Login</Button>
      </CardContent>
    </Card>
  );

  return (
    <>
      <CardHeader className="text-center">
        <CardTitle>Ponto Biométrico</CardTitle>
        <CardDescription>Unidade: {tenantName}</CardDescription>
      </CardHeader>
      <CardContent>
        <IdentifyAndClockInContent initialEmployee={employee!} isPontoMode={true} />
      </CardContent>
    </>
  );
}

export default function RegistroPontoPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-[380px] overflow-hidden">
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center p-12 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Validando acesso...</p>
          </div>
        }>
          <RegistroPontoContent />
        </Suspense>
      </Card>
    </main>
  );
}