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
import { collection, doc, updateDoc, query, getCountFromServer } from "firebase/firestore";
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

        const checkClaims = (retries = 5, delay = 1000) => {
             user.getIdTokenResult(true).then(idTokenResult => {
                const claims = idTokenResult.claims;
                if (claims.role === 'master' || user.email === 'admin@clockwise.com') {
                    setIsAuthorized(true);
                } else if (retries > 0) {
                    setTimeout(() => checkClaims(retries - 1, delay), delay);
                } else {
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
      if (!firestore || !companies || companies.length === 0) {
        if (companies?.length === 0) {
            setEmployeeCounts({});
            setTotalEmployees(0);
            setLoadingCounts(false);
        }
        return;
      }

      const fetchAllEmployeeCounts = async () => {
        setLoadingCounts(true);
        let total = 0;
        const counts: Record<string, number> = {};
        try {
          const countPromises = companies.map(async (company) => {
            if (!company.id) return;
            const employeesRef = collection(firestore, 'tenants', company.id, 'employees');
            const snapshot = await getCountFromServer(employeesRef);
            const count = snapshot.data().count;
            counts[company.id] = count;
            total += count;
          });

          await Promise.all(countPromises);
          setEmployeeCounts(counts);
          setTotalEmployees(total);
        } catch (e) {
          console.error("Failed to fetch counts:", e);
        } finally {
          setLoadingCounts(false);
        }
      };

      fetchAllEmployeeCounts();
    }, [firestore, companies]);
    
    const isLoading = isUserLoading || isAuthorized === null || (isAuthorized && companiesLoading);

    const handleToggleStatus = async (company: Company) => {
        if (!firestore) return;
        const newStatus = company.status === 'Ativa' ? 'Inativa' : 'Ativa';
        try {
            await updateDoc(doc(firestore, 'tenants', company.id), { status: newStatus });
            toast({ title: 'Status Atualizado!', description: `Empresa ${newStatus}.` });
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Erro', description: err.message });
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

    if (isAuthorized === false) {
        return (
            <div className="p-4">
                <Alert variant="destructive">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Acesso Negado</AlertTitle>
                    <AlertDescription>Sua conta não possui nível Master.</AlertDescription>
                </Alert>
            </div>
        );
    }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
          <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Empresas</CardTitle></CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (companies?.length ?? 0)}</div>
              </CardContent>
          </Card>
          <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Colaboradores Totais</CardTitle></CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{loadingCounts ? <Loader2 className="h-5 w-5 animate-spin" /> : totalEmployees}</div>
              </CardContent>
          </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Painel Master</CardTitle>
          <Button asChild size="sm"><Link href="/signup"><PlusCircle className="mr-2 h-4 w-4" />Nova Empresa</Link></Button>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Razão Social</TableHead>
                            <TableHead>Plano</TableHead>
                            <TableHead>Colaboradores</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {companies?.map((company) => (
                            <TableRow key={company.id}>
                                <TableCell className="font-medium">{company.name}</TableCell>
                                <TableCell>
                                    <Badge variant={getPlanBadgeVariant(company.plan)}>{company.plan}</Badge>
                                </TableCell>
                                <TableCell>
                                    {loadingCounts ? <Loader2 className="h-3 w-3 animate-spin" /> : `${employeeCounts[company.id] ?? 0} / ${company.plan ? PLAN_LIMITS[company.plan] : 'N/A'}`}
                                </TableCell>
                                <TableCell>
                                    <Badge className={cn(company.status === 'Ativa' ? 'bg-green-500' : 'bg-red-500')}>
                                        {company.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon"><EllipsisVertical className="h-4 w-4" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem asChild>
                                                <Link href={`/dashboard/companies/${company.id}`}><Edit className="mr-2 h-4 w-4" />Editar</Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleToggleStatus(company)}>Alterar Status</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </CardContent>
      </Card>
    </div>
  );
}