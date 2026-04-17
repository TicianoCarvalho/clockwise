"use client";

import { useState, useEffect, useMemo } from "react";
import Link from 'next/link';
import { Building, PlusCircle, Users, Loader2, ShieldAlert, EllipsisVertical, CheckCircle, AlertTriangle, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import type { Company } from "@/lib/data";
import { cn } from "@/lib/utils";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, updateDoc, query, getDocs } from "firebase/firestore";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";


const PLAN_LIMITS = {
  soft: 20,
  plus: 50,
  prime: 100,
};

export default function CompaniesPage() {
    const { toast } = useToast();
    const { firestore, user, isUserLoading } = useFirebase();
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

    const [employeeCounts, setEmployeeCounts] = useState<Record<string, number>>({});
    const [totalEmployees, setTotalEmployees] = useState(0);
    const [loadingCounts, setLoadingCounts] = useState(true);

    useEffect(() => {
        if (isUserLoading) return;
        if (!user) {
            setIsAuthorized(false);
            return;
        }

        // Retry mechanism to wait for custom claims to be available.
        const checkClaims = (retries = 5, delay = 1000) => {
             user.getIdTokenResult(true).then(idTokenResult => {
                const claims = idTokenResult.claims;
                // The master role or the specific master email grants access.
                if (claims.role === 'master' || user.email === 'admin@clockwise.com') {
                    setIsAuthorized(true);
                } else if (retries > 0) {
                    // If claims are not yet propagated, wait and retry.
                    setTimeout(() => checkClaims(retries - 1, delay), delay);
                } else {
                    // If no master role is found after all retries, deny access.
                    setIsAuthorized(false);
                }
            }).catch(error => {
                console.error("Error fetching token claims:", error);
                setIsAuthorized(false);
            });
        }
        
        checkClaims();

    }, [user, isUserLoading]);

    const tenantsQuery = useMemoFirebase(() => 
        (firestore && isAuthorized) ? query(collection(firestore, 'tenants')) : null, 
    [firestore, isAuthorized]);

    const { data: companies, isLoading: companiesLoading, error } = useCollection<Company>(tenantsQuery);
    
    useEffect(() => {
      if (!firestore || !companies) {
        setLoadingCounts(companiesLoading);
        return;
      }
      if (companies.length === 0) {
        setEmployeeCounts({});
        setTotalEmployees(0);
        setLoadingCounts(false);
        return;
      }

      setLoadingCounts(true);
      const fetchAllEmployeeCounts = async () => {
        let total = 0;
        const counts: Record<string, number> = {};
        try {
          const countPromises = companies.map(async (company) => {
            if (!company.id) return;
            const employeesCollectionRef = collection(firestore, 'tenants', company.id, 'employees');
            const snapshot = await getDocs(employeesCollectionRef);
            counts[company.id] = snapshot.size;
            total += snapshot.size;
          });

          await Promise.all(countPromises);
          
          setEmployeeCounts(counts);
          setTotalEmployees(total);
        } catch (e) {
          console.error("Failed to fetch employee counts:", e);
          toast({
            variant: 'destructive',
            title: 'Erro ao carregar contagem de colaboradores',
          });
        } finally {
          setLoadingCounts(false);
        }
      };

      fetchAllEmployeeCounts();
    }, [firestore, companies, toast, companiesLoading]);
    
    const isLoading = isUserLoading || isAuthorized === null || (isAuthorized && (companiesLoading || loadingCounts));

    useEffect(() => {
      if(error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Erro ao carregar empresas',
          description: 'Não foi possível buscar a lista de empresas. Verifique suas permissões e a conexão.'
        })
      }
    }, [error, toast]);


    const handleToggleStatus = async (company: Company) => {
        if (!firestore) return;
        const newStatus = company.status === 'Ativa' ? 'Inativa' : 'Ativa';
        const companyRef = doc(firestore, 'tenants', company.id);

        try {
            await updateDoc(companyRef, { status: newStatus });
            toast({ title: 'Status Atualizado!', description: `A empresa "${company.name}" foi marcada como ${newStatus.toLowerCase()}.` });
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Erro ao atualizar', description: err.message });
        }
    };
    
    const handleTogglePayment = async (company: Company) => {
        if (!firestore) return;
        const newPaymentStatus = company.paymentStatus === 'Em dia' ? 'Atrasado' : 'Em dia';
        const companyRef = doc(firestore, 'tenants', company.id);
        
        try {
            await updateDoc(companyRef, { paymentStatus: newPaymentStatus });
            toast({ title: 'Status de Pagamento Atualizado!', description: `O pagamento da empresa "${company.name}" foi marcado como "${newPaymentStatus}".` });
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Erro ao atualizar', description: err.message });
        }
    };

    const getPlanBadgeVariant = (plan?: Company['plan']) => {
        switch (plan) {
            case 'soft': return 'secondary';
            case 'plus': return 'default';
            case 'prime': return 'outline';
            default: return 'secondary';
        }
    };
    
    const getPlanDisplayName = (plan?: Company['plan']) => {
        switch(plan) {
            case 'soft': return 'Soft';
            case 'plus': return 'Plus';
            case 'prime': return 'Prime';
            default: return 'N/A';
        }
    }

    if (isAuthorized === false) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                        <ShieldAlert className="h-6 w-6" />
                        Acesso Negado
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Permissão de Master Não Encontrada</AlertTitle>
                        <AlertDescription>
                            Sua conta não tem o nível de acesso "Master" necessário para visualizar este painel. Por favor, tente recarregar a página ou contate o suporte se acreditar que isso é um erro.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        )
    }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Empresas Ativas</CardTitle>
                  <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : (companies?.length ?? 0)}</div>
                  <p className="text-xs text-muted-foreground">Total de empresas no sistema</p>
              </CardContent>
          </Card>
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Colaboradores Totais</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : totalEmployees}</div>
                  <p className="text-xs text-muted-foreground">Total de colaboradores em todas as empresas</p>
              </CardContent>
          </Card>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-6 w-6" />
                Empresas (Painel Master)
            </CardTitle>
            <CardDescription>Visualize e gerencie todas as empresas (tenants) ativas no sistema.</CardDescription>
          </div>
           <Button asChild>
              <Link href="/signup">
                <PlusCircle className="mr-2 h-4 w-4" />
                Nova Empresa
              </Link>
            </Button>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                 <div className="flex flex-col items-center justify-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">Verificando permissões e carregando dados...</p>
                </div>
            ) : (
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Razão Social</TableHead>
                        <TableHead>CNPJ</TableHead>
                        <TableHead>Plano</TableHead>
                        <TableHead>Colaboradores</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Pagamento</TableHead>
                        <TableHead>Dia Pgto.</TableHead>
                        <TableHead className="text-right w-[50px]">Ações</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {!companies || companies.length === 0 ? (
                         <TableRow>
                            <TableCell colSpan={8} className="h-24 text-center">
                                {error ? "Erro ao carregar empresas." : "Nenhuma empresa (tenant) encontrada."}
                            </TableCell>
                        </TableRow>
                    ) : (
                        companies.map((company) => (
                        <TableRow key={company.id}>
                            <TableCell className="font-medium">{company.name}</TableCell>
                            <TableCell>{company.cnpj}</TableCell>
                            <TableCell>
                               <Badge variant={getPlanBadgeVariant(company.plan)} className="capitalize">
                                    {getPlanDisplayName(company.plan)}
                                </Badge>
                            </TableCell>
                             <TableCell>
                                <div className="flex items-center gap-2">
                                   <Users className="h-4 w-4 text-muted-foreground" />
                                   <span>{employeeCounts[company.id] ?? 0} / {company.plan ? PLAN_LIMITS[company.plan] : 'N/A'}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant={company.status === 'Ativa' ? 'default' : 'destructive'} className={cn('gap-1', company.status === 'Ativa' && 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200')}>
                                    {company.status === 'Ativa' ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                                    {company.status || 'N/A'}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <Badge variant={company.paymentStatus === 'Em dia' ? 'secondary' : 'destructive'} className="gap-1">
                                    {company.paymentStatus === 'Em dia' ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                                    {company.paymentStatus || 'N/A'}
                                </Badge>
                            </TableCell>
                            <TableCell className="font-medium text-center">{company.paymentDay || 'N/A'}</TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <EllipsisVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem asChild>
                                            <Link href={`/dashboard/companies/${company.id}`}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                Editar
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleToggleStatus(company)}>
                                            {company.status === 'Ativa' ? 'Desativar Empresa' : 'Ativar Empresa'}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleTogglePayment(company)}>
                                            Marcar como {company.paymentStatus === 'Em dia' ? '"Atrasado"' : '"Em dia"'}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                        ))
                    )}
                    </TableBody>
                </Table>
            )}
        </CardContent>
      </Card>
    </>
  );
}
