"use client";

import { useState, useEffect } from "react";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, doc, getDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, CheckCircle, Loader2, ShieldAlert, Search } from "lucide-react";
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
    if (isUserLoading || !firestore) return;
    
    if (!user) {
      setIsAuthorized(false);
      return;
    }

    const validateAccess = async () => {
      try {
        // 1. Tenta obter dados do Token (Claims)
        const idTokenResult = await user.getIdTokenResult(true);
        const claims = idTokenResult.claims;
        
        let role = claims.role as string;
        let tId = claims.tenantId as string;

        // 2. FALLBACK: Se o token não tem tenantId (caso de admins de confiança como o José),
        // buscamos diretamente no documento do usuário na coleção 'users'
        if (!tId && user.uid) {
          const userDoc = await getDoc(doc(firestore, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            tId = userData.tenantId;
            role = role || userData.role || 'admin';
          }
        }

        setUserRole(role || 'user');
        setUserTenantId(tId);

        // 3. Lógica de Autorização (Bypass para José, Administradores e ClockWise)
        const isLideranca = user.email?.toLowerCase().endsWith('@lideranca.com');
        const isMasterEmail = user.email === 'admin@clockwise.com';

        if (role === 'master' || role === 'admin' || isMasterEmail || isLideranca) {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
        }
      } catch (error) {
        console.error("Erro ao validar acesso:", error);
        setIsAuthorized(false);
      }
    };

    validateAccess();
  }, [user, isUserLoading, firestore]);

  // Consulta de Empresas: Só dispara quando o tenantId estiver pronto (para não-masters)
  const tenantsQuery = useMemoFirebase(() => {
    if (!firestore || !isAuthorized) return null;
    
    const baseRef = collection(firestore, 'tenants');
    
    // Se for Master, lista todas as empresas
    if (userRole === 'master') return baseRef;

    // Se for Admin, filtra pelo tenantId recuperado (ID do documento/CNPJ)
    if (userTenantId) {
      return query(baseRef, where("__name__", "==", userTenantId));
    }
    
    return null;
  }, [firestore, isAuthorized, userRole, userTenantId]);

  const { data: tenants, isLoading: loadingTenants } = useCollection<Company>(tenantsQuery);

  // Consulta de Usuários: Filtra apenas colaboradores da empresa do Admin
  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !isAuthorized) return null;
    
    const baseRef = collection(firestore, 'users');
    
    if (userRole === 'master') return baseRef;

    if (userTenantId) {
      return query(baseRef, where("tenantId", "==", userTenantId));
    }

    return null;
  }, [firestore, isAuthorized, userRole, userTenantId]);

  const { data: users, isLoading: loadingUsers } = useCollection<User>(usersQuery);

  // Estado de carregamento unificado
  const isLoading = isUserLoading || isAuthorized === null || (isAuthorized && (loadingTenants || loadingUsers));

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin h-10 w-10 text-primary" /> 
        <p className="ml-4 text-muted-foreground">Sincronizando credenciais e dados da unidade...</p>
      </div>
    );
  }

  if (isAuthorized === false) {
    return (
      <div className="p-6">
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Acesso Restrito</AlertTitle>
          <AlertDescription>
            A conta {user?.email} não possui privilégios administrativos vinculados a uma unidade ativa.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const filteredTenants = tenants?.filter(t => 
    t.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.cnpj?.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, ''))
  );

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
            <div className="text-2xl font-bold">{tenants?.length || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Status Ativo</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenants?.filter(t => t.status === 'Ativa').length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Colaboradores</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users?.length || 0}</div>
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
                placeholder="Filtrar por nome ou CNPJ..." 
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
                      <Badge variant="outline" className="capitalize">
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
                {filteredTenants?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                      Nenhuma unidade encontrada para os critérios informados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}