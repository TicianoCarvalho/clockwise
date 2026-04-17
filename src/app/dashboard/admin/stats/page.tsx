"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, CheckCircle, Loader2, ShieldAlert, AlertTriangle, Search, CalendarDays } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import type { Company, User } from "@/lib/data";
import { Input } from "@/components/ui/input";

export default function AdminStatsPage() {
  const { firestore, user, isUserLoading } = useFirebase();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      setIsAuthorized(false);
      return;
    }
    user.getIdTokenResult(true).then(idTokenResult => {
      const claims = idTokenResult.claims;
      if (claims.role === 'master' || user.email === 'admin@clockwise.com') {
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
      }
    });
  }, [user, isUserLoading]);

  const tenantsQuery = useMemoFirebase(() => 
    (firestore && isAuthorized) ? collection(firestore, 'tenants') : null, 
  [firestore, isAuthorized]);
  const { data: tenants, isLoading: loadingTenants } = useCollection<Company>(tenantsQuery);

  const usersQuery = useMemoFirebase(() => 
    (firestore && isAuthorized) ? collection(firestore, 'users') : null, 
  [firestore, isAuthorized]);
  const { data: users, isLoading: loadingUsers } = useCollection<User>(usersQuery);

  const isLoading = isUserLoading || isAuthorized === null || (isAuthorized && (loadingTenants || loadingUsers));

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /> <p className="ml-4">Verificando permissões e carregando dados...</p></div>;
  }

  if (isAuthorized === false) {
    return (
        <Card className="m-6">
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
                        Você não tem permissão para acessar este painel.
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    );
  }

  const totalTenants = tenants?.length || 0;
  const activeTenants = tenants?.filter(t => t.status === 'Ativa').length || 0;
  const totalUsers = users?.length || 0;

  const filteredTenants = tenants?.filter(t => 
    t.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.cnpj?.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, ''))
  );

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold italic tracking-tight text-primary">ClockWise <span className="text-foreground text-sm font-normal not-italic">| Admin Master</span></h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Empresas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTenants}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Empresas Ativas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTenants}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Gestão de Tenants</CardTitle>
              <p className="text-sm text-muted-foreground">Monitorização de status e datas de faturação.</p>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Pesquisar por nome ou CNPJ..." 
                className="pl-8" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <CalendarDays className="h-4 w-4" /> Vencimento
                    </div>
                  </TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenants?.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell>{tenant.cnpj}</TableCell>
                    <TableCell className="capitalize">
                      <Badge variant={getPlanBadgeVariant(tenant.plan)}>
                        {getPlanDisplayName(tenant.plan)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                       {tenant.paymentDay ? `Dia ${tenant.paymentDay}` : 'Não definido'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={tenant.status === 'Ativa' ? 'default' : 'destructive'}>
                        {tenant.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
