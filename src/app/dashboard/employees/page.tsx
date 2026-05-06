"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Edit, EllipsisVertical, PlusCircle, Trash2, Upload, Users, Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmployeeForm } from "@/components/EmployeeForm";
import { EmployeeImportDialog } from "@/components/EmployeeImportDialog";
import { useToast } from "@/hooks/use-toast";
import type { Employee, Location, Sector, Schedule, Scale, Company } from "@/lib/data";
import { Badge } from "@/components/ui/badge";

// Firebase Imports
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { useAuthContext } from "@/contexts/auth-context";
import { collection, doc, setDoc, updateDoc, query, where, serverTimestamp } from "firebase/firestore";

export default function EmployeesPage() {
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const { userRole, userData } = useAuthContext(); // Usando userData para pegar o tenantId consistente
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  // 1. Fetch de Empresas (Apenas para Master poder trocar de contexto)
  const masterTenantsQuery = useMemoFirebase(() => 
    (firestore && userRole === 'master') ? collection(firestore, 'tenants') : null, 
  [firestore, userRole]);
  const { data: tenants, isLoading: tenantsLoading } = useCollection<Company>(masterTenantsQuery);

  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  
  useEffect(() => {
    if (userRole === 'master' && tenants?.length && !selectedTenantId) {
        setSelectedTenantId(tenants[0].id);
    }
  }, [userRole, tenants, selectedTenantId]);

  // Define qual tenantId será usado para as queries abaixo
  const finalTenantId = userRole === 'master' ? selectedTenantId : userData?.tenantId;
  
  // 2. Query de Colaboradores com FILTRO DE TENANT (Essencial para permissões)
  const employeesQuery = useMemoFirebase(() => {
    if (!firestore || !finalTenantId) return null;
    return query(
        collection(firestore, 'employees'), 
        where('tenantId', '==', finalTenantId)
    );
  }, [firestore, finalTenantId]);
  
  const { data: employeesData, isLoading: employeesLoading } = useCollection<Employee>(employeesQuery);
  const employees = useMemo(() => employeesData || [], [employeesData]);

  const activeEmployeesCount = useMemo(() => {
    return employees.filter(emp => (emp?.status === "Ativo" || !emp?.status) && !emp?.terminationDate).length;
  }, [employees]);

  const planLimit = 20; 
  const isLimitReached = activeEmployeesCount >= planLimit;

  // 3. Queries de Apoio (Filtro por Tenant em locais e Global/Tenant em setores/escalas)
  const locationsQuery = useMemoFirebase(() => 
    (firestore && finalTenantId) ? query(collection(firestore, 'locations'), where('tenantId', '==', finalTenantId)) : null, 
  [firestore, finalTenantId]);
  const { data: locations } = useCollection<Location>(locationsQuery);
  
  const sectorsQuery = useMemoFirebase(() => 
    (firestore && finalTenantId) ? query(collection(firestore, 'sectors'), where('tenantId', '==', finalTenantId)) : null, 
  [firestore, finalTenantId]);
  const { data: sectors } = useCollection<Sector>(sectorsQuery);

  const schedulesQuery = useMemoFirebase(() => 
    (firestore && finalTenantId) ? query(collection(firestore, 'schedules'), where('tenantId', '==', finalTenantId)) : null, 
  [firestore, finalTenantId]);
  const { data: schedules } = useCollection<Schedule>(schedulesQuery);

  const scalesQuery = useMemoFirebase(() => 
    (firestore && finalTenantId) ? query(collection(firestore, 'scales'), where('tenantId', '==', finalTenantId)) : null, 
  [firestore, finalTenantId]);
  const { data: scales } = useCollection<Scale>(scalesQuery);
  
  const isLoading = employeesLoading || (userRole === 'master' && tenantsLoading);
  
  const totalPages = Math.ceil(employees.length / itemsPerPage);
  const paginatedEmployees = useMemo(() => {
    return employees.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [employees, currentPage, itemsPerPage]);

  // 4. SUBMIT HANDLER (Injeção de TenantId e Timestamps)
  const handleSubmitEmployee = async (formData: any) => {
    if (!firestore || !finalTenantId) return;

    const isEditing = !!editingEmployee;
    
    if (!isEditing && isLimitReached) {
      toast({ 
        variant: "destructive", 
        title: "Limite atingido", 
        description: `Seu plano atingiu o limite de ${planLimit} funcionários ativos.` 
      });
      return;
    }

    try {
      const employeeData = { 
          ...formData, 
          tenantId: finalTenantId,
          updatedAt: serverTimestamp() // Recomendado usar serverTimestamp para auditoria
      };

      if (isEditing && editingEmployee?.id) {
          const docRef = doc(firestore, 'employees', editingEmployee.id);
          await updateDoc(docRef, employeeData);
      } else {
          const docId = formData.cpf.replace(/\D/g, "");
          const docRef = doc(firestore, 'employees', docId);
          
          if (employees.some(e => e.cpf === formData.cpf)) {
            toast({ variant: "destructive", title: "CPF já cadastrado" });
            return;
          }
          await setDoc(docRef, { ...employeeData, createdAt: serverTimestamp() });
      }
      
      toast({ title: "Sucesso!", description: "Colaborador salvo com sucesso." });
      setIsDialogOpen(false);
      setEditingEmployee(null);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao salvar", description: "Verifique suas permissões de acesso." });
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Users className="h-7 w-7 text-primary"/>
            Colaboradores
          </CardTitle>
          <CardDescription>Gestão de funcionários e permissões de acesso.</CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Importar
          </Button>
          <Button onClick={() => { setEditingEmployee(null); setIsDialogOpen(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" /> Novo Funcionário
          </Button>
        </div>
      </header>

      {userRole === 'master' && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
               <span className="text-sm font-bold flex items-center gap-2"><KeyRound className="h-4 w-4"/> Empresa:</span>
               <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                  <SelectTrigger className="w-[300px] bg-background">
                    <SelectValue placeholder="Selecione a empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants?.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
               </Select>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="flex-grow">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Carregando dados...</p>
          </div>
        ) : paginatedEmployees.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-80 border-2 border-dashed rounded-xl bg-muted/30">
            <Users className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Nenhum colaborador encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedEmployees.map((emp) => (
              <Card key={emp?.id} className={`group hover:shadow-md transition-all ${emp?.status === 'Inativo' ? 'opacity-60 grayscale' : ''}`}>
                <CardContent className="p-6 relative">
                  <div className="absolute top-3 right-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><EllipsisVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditingEmployee(emp); setIsDialogOpen(true); }}>
                          <Edit className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setIsConfirmDeleteDialogOpen(true)} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" /> Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <Avatar className="h-20 w-20 border shadow-sm">
                        <AvatarImage src={emp?.avatarUrl} alt={emp?.name} />
                        <AvatarFallback className="bg-primary/5 text-primary font-bold">
                          {emp?.name?.slice(0, 2).toUpperCase() || "??"}
                        </AvatarFallback>
                      </Avatar>
                      {emp?.status === 'Inativo' && (
                        <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-destructive text-[10px]">INATIVO</Badge>
                      )}
                    </div>
                    <h3 className="mt-4 font-bold text-center line-clamp-1">{emp?.name || "Sem Nome"}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{emp?.cpf || "000.000.000-00"}</p>
                    <div className="mt-4 flex flex-wrap justify-center gap-1">
                      <Badge variant="secondary" className="text-[10px]">{emp?.setor || 'Geral'}</Badge>
                      <Badge variant="outline" className="text-[10px]">Mat: {emp?.matricula || "---"}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <footer className="flex items-center justify-between pt-6 border-t mt-auto">
        <div className="flex flex-col">
          <p className="text-sm font-medium">Total: {employees.length} registros</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
               <div 
                className={`h-full ${isLimitReached ? 'bg-destructive' : 'bg-primary'} transition-all`} 
                style={{ width: `${Math.min((activeEmployeesCount / planLimit) * 100, 100)}%` }}
               />
            </div>
            <span className="text-[10px] text-muted-foreground">{activeEmployeesCount}/{planLimit} Vagas Ativas</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>
            <ChevronLeft className="h-4 w-4" /> Anterior
          </Button>
          <span className="text-xs font-medium px-2">Página {currentPage}</span>
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages}>
            Próximo <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </footer>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <EmployeeForm 
            employee={editingEmployee}
            onSubmit={handleSubmitEmployee}
            locations={locations || []}
            sectors={sectors || []}
            schedules={schedules || []}
            scales={scales || []}
            isLimitReached={isLimitReached}
          />
      </Dialog>

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <EmployeeImportDialog tenantId={finalTenantId || ''} onOpenChange={setIsImportDialogOpen} />
      </Dialog>

      <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ação Restrita</AlertDialogTitle>
            <AlertDialogDescription>
              Para conformidade legal, funcionários não podem ser excluídos. 
              Use o campo <strong>Data de Rescisão</strong> no formulário para inativar o colaborador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsConfirmDeleteDialogOpen(false)}>Entendi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}