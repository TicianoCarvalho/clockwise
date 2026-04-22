"use client";

import { useState, useEffect } from "react";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
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
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userTenantId, setUserTenantId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      setIsAuthorized(false);
      return;
    }

    user.getIdTokenResult(true).then(idTokenResult => {
      const claims = idTokenResult.claims;
      const role = claims.role as string || 'user';
      const tId = claims.tenantId as string;

      setUserRole(role);
      setUserTenantId(tId);

      // CORREÇÃO: Autoriza Master E Admin da Empresa
      if (role === 'master' || role === 'admin' || user.email === 'admin@clockwise.com' || user.email?.endsWith('@lideranca.com')) {
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
      }
    });
  }, [user, isUserLoading]);

  // CORREÇÃO: Consulta inteligente baseada no cargo
  const tenantsQuery = useMemoFirebase(() => {
    if (!firestore || !isAuthorized) return null;
    const baseRef = collection(firestore, 'tenants');
    
    // Se for Admin (não Master), ele só pode "ver" a si mesmo na lista
    if (userRole !== 'master' && userTenantId) {
      return query(baseRef, where("__name__", "==", userTenantId));
    }
    // Se for Master, lista tudo
    return baseRef;
  }, [firestore, isAuthorized, userRole, userTenantId]);

  const { data: tenants, isLoading: loadingTenants } = useCollection<Company>(tenantsQuery);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !isAuthorized) return null;
    const baseRef = collection(firestore, 'users');
    
    // Filtra usuários apenas da empresa do admin, se não for Master
    if (userRole !== 'master' && userTenantId) {
      return query(baseRef, where("tenantId", "==", userTenantId));
    }
    return baseRef;
  }, [firestore, isAuthorized, userRole, userTenantId]);

  const { data: users, isLoading: loadingUsers } = useCollection<User>(usersQuery);

  const isLoading = isUserLoading || isAuthorized === null || (isAuthorized && (loadingTenants || loadingUsers));

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin h-10 w-10 text-primary" /> 
        <p className="ml-4">Validando credenciais e carregando dados...</p>
      </div>
    );
  }

  if (isAuthorized === false) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Acesso Restrito</AlertTitle>
          <AlertDescription>
            Sua conta não possui privilégios de administrador para visualizar estes dados.
          </AlertDescription>
        </Alert>
      </div>
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold italic tracking-tight text-primary">
          ClockWise <span className="text-foreground text-sm font-normal not-italic">| Gestão {userRole === 'master' ? 'Master' : 'Empresarial'}</span>
        </h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Empresas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTenants}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Status Ativo</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTenants}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Colaboradores</CardTitle>
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
            <CardTitle>Unidades de Negócio</CardTitle>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Filtrar..." 
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
                  <TableHead>Nome</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenants?.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell>{tenant.cnpj}</TableCell>
                    <TableCell>
                      <Badge variant={getPlanBadgeVariant(tenant.plan)} className="capitalize">
                        {tenant.plan || 'N/A'}
                      </Badge>
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