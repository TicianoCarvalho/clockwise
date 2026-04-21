"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, Edit, EllipsisVertical, PlusCircle, Trash2, Upload, User, Users, Loader2, AlertTriangle, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmployeeForm } from "@/components/EmployeeForm";
import { EmployeeImportDialog } from "@/components/EmployeeImportDialog";
import { useToast } from "@/hooks/use-toast";
import type { Employee, Location, Sector, Schedule, Scale, Company } from "@/lib/data";
import { Badge } from "@/components/ui/badge";

// Firebase Imports
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { useAuthContext } from "@/contexts/auth-context";
import { collection, doc, setDoc, updateDoc, query } from "firebase/firestore";

export default function EmployeesPage() {
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const { userRole, tenantId } = useAuthContext();
  const [error, setError] = useState<string | null>(null);
  
  // 2. Fetch tenants for master user reactively
  const masterTenantsQuery = useMemoFirebase(() => 
    (firestore && userRole === 'master') ? query(collection(firestore, 'tenants')) : null, 
  [firestore, userRole]);
  const { data: tenants, isLoading: tenantsLoading } = useCollection<Company>(masterTenantsQuery);

  // 3. Set selected tenant for master user
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  useEffect(() => {
    if (userRole === 'master' && tenants && tenants.length > 0 && !selectedTenantId) {
        setSelectedTenantId(tenants[0].id);
    }
  }, [userRole, tenants, selectedTenantId]);

  // 4. Determine final tenantId for queries
  const finalTenantId = userRole === 'master' ? selectedTenantId : tenantId;
  
  // 5. Fetch tenant-specific and global data
  const employeesQuery = useMemoFirebase(() => finalTenantId ? collection(firestore, 'tenants', finalTenantId, 'employees') : null, [firestore, finalTenantId]);
  const { data: employeesData, isLoading: employeesLoading, error: employeesError } = useCollection<Employee>(employeesQuery);
  const employees = useMemo(() => employeesData || [], [employeesData]);

  // --- Lógica de Controle de Vagas ---
  const activeEmployeesCount = useMemo(() => {
    return employees.filter(emp => {
      if (!emp.terminationDate) return true;
      // Considera ativo se a data de rescisão for futura
      return new Date(emp.terminationDate) > new Date();
    }).length;
  }, [employees]);

  const planLimit = 20; // Pode ser substituído por t.planLimit vindo do tenant
  const isLimitReached = activeEmployeesCount >= planLimit;
  // -----------------------------------

  const locationsQuery = useMemoFirebase(() => finalTenantId ? collection(firestore, 'tenants', finalTenantId, 'locations') : null, [firestore, finalTenantId]);
  const { data: locationsData } = useCollection<Location>(locationsQuery);
  const locations = useMemo(() => locationsData || [], [locationsData]);
  
  const sectorsQuery = useMemoFirebase(() => (firestore && userRole) ? collection(firestore, 'sectors') : null, [firestore, userRole]);
  const { data: sectorsData } = useCollection<Sector>(sectorsQuery);
  const sectors = useMemo(() => sectorsData || [], [sectorsData]);

  const schedulesQuery = useMemoFirebase(() => (firestore && userRole) ? collection(firestore, 'schedules') : null, [firestore, userRole]);
  const { data: schedulesData } = useCollection<Schedule>(schedulesQuery);
  const schedules = useMemo(() => schedulesData || [], [schedulesData]);

  const scalesQuery = useMemoFirebase(() => (firestore && userRole) ? collection(firestore, 'scales') : null, [firestore, userRole]);
  const { data: scalesData } = useCollection<Scale>(scalesQuery);
  const scales = useMemo(() => scalesData || [], [scalesData]);
  
  const isLoading = employeesLoading || tenantsLoading || !userRole;
  
  useEffect(() => {
    if (employeesError) {
      setError('Falha ao carregar a lista de colaboradores.');
      console.error(employeesError);
    }
  }, [employeesError]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  const totalPages = Math.ceil(employees.length / itemsPerPage);
  const paginatedEmployees = employees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  const handleSubmitEmployee = async (data: Omit<Employee, 'id' | 'status'>) => {
    if (!firestore || !finalTenantId) return;

    const isEditing = !!editingEmployee;
    
    // Verificação de Limite de Vagas (Apenas para novos cadastros)
    if (!isEditing && isLimitReached) {
      toast({ 
        variant: "destructive", 
        title: "Limite atingido", 
        description: `O plano desta empresa permite apenas ${planLimit} colaboradores ativos.` 
      });
      return;
    }

    // Determine status based on termination date
    const terminationDate = (data as any).terminationDate;
    const newStatus = (terminationDate && new Date(terminationDate) < new Date()) ? 'Inativo' : 'Ativo';
    
    const employeeData = { ...data, status: newStatus };

    try {
      if (isEditing && editingEmployee?.id) {
          const docRef = doc(firestore, 'tenants', finalTenantId, 'employees', editingEmployee.id);
          await updateDoc(docRef, employeeData);
      } else {
          // Verificação de Duplicidade por CPF (ID Único)
          const docRef = doc(firestore, 'tenants', finalTenantId, 'employees', employeeData.cpf);
          
          // Verifica no estado local se o CPF já existe para evitar sobrescrita indesejada
          const existingEmp = employees.find(e => e.cpf === employeeData.cpf);
          if (existingEmp) {
            toast({ 
              variant: "destructive", 
              title: "CPF já cadastrado", 
              description: `O CPF ${employeeData.cpf} já pertence a ${existingEmp.name}.` 
            });
            return;
          }

          await setDoc(docRef, employeeData);
      }
      
      toast({ title: `Colaborador ${isEditing ? 'atualizado' : 'adicionado'}!`, description: `"${data.name}" foi salvo com sucesso.` });
      setIsDialogOpen(false);
      setEditingEmployee(null);

    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao salvar", description: error.message });
      console.error("Error saving employee:", error);
    }
  };

  const handleOpenDialogForEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsDialogOpen(true);
  };
  
  const handleOpenDialogForAdd = () => {
    if (!finalTenantId) {
      toast({ variant: 'destructive', title: 'Nenhuma empresa selecionada', description: 'Selecione uma empresa antes de adicionar um colaborador.' });
      return;
    }
    setEditingEmployee(null);
    setIsDialogOpen(true);
  };

  const handleOpenConfirmDeleteDialog = (employee: Employee) => {
    setDeletingEmployee(employee);
    setIsConfirmDeleteDialogOpen(true);
  };

  const handleDeleteEmployeeConfirm = async () => {
    if (!deletingEmployee) return;
    toast({ variant: "destructive", title: "Ação Bloqueada", description: "A exclusão de funcionários foi desativada para garantir a integridade dos dados." });
    setIsConfirmDeleteDialogOpen(false);
    setDeletingEmployee(null);
  };

  const handleOpenResetPasswordDialog = (employee: Employee) => {
    toast({
        variant: "destructive",
        title: "Funcionalidade Desativada",
        description: "O reset de senha por administrador foi desativado na arquitetura atual.",
    });
  };

  const handleBulkImport = async (newEmployees: Employee[]) => {
    toast({ title: "Funcionalidade em desenvolvimento", description: "A importação em massa precisa ser atualizada para o novo sistema." });
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  const goToPreviousPage = () => {
    setCurrentPage((prev) => (prev > 1 ? prev - 1 : prev));
  };

  const goToNextPage = () => {
    setCurrentPage((prev) => (prev < totalPages && prev * itemsPerPage < employees.length ? prev + 1 : prev));
  };
  
  return (
    <>
      <div className="flex flex-col h-full">
        <header className="flex items-center justify-between mb-6">
            <div>
                <CardTitle className="flex items-center gap-2">
                    <Users className="h-6 w-6"/>
                    Painel de Colaboradores
                </CardTitle>
                <CardDescription>Adicione, edite e gerencie seus colaboradores.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    Importar
                </Button>
                <Button onClick={handleOpenDialogForAdd}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Funcionário
                </Button>
            </div>
        </header>

        {userRole === 'master' && (
            <Card className="mb-6">
            <CardHeader>
                <CardTitle>Seleção de Empresa (Master)</CardTitle>
                <CardDescription>Gerencie os dados da empresa selecionada.</CardDescription>
            </CardHeader>
            <CardContent>
                {tenantsLoading ? (
                  <p className='text-sm text-muted-foreground'>Carregando empresas...</p>
                ) : tenants && tenants.length > 0 ? (
                    <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione uma empresa..." />
                        </SelectTrigger>
                        <SelectContent>
                            {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name} (CNPJ: {t.cnpj})</SelectItem>)}
                        </SelectContent>
                    </Select>
                ) : (
                    <p className='text-sm text-muted-foreground'>Nenhuma empresa encontrada.</p>
                )}
            </CardContent>
            </Card>
        )}
        
        <div className="flex-grow">
            {isLoading ? (
                <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-16 w-16 animate-spin text-muted-foreground" />
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center h-full rounded-lg border-2 border-dashed border-destructive text-destructive">
                    <AlertTriangle className="h-16 w-16" />
                    <p className="mt-4 text-lg font-semibold">Erro ao Carregar Dados</p>
                    <p className="text-center max-w-md">{error}</p>
                </div>
            ) : !finalTenantId ? (
                <div className="flex flex-col items-center justify-center h-full rounded-lg border-2 border-dashed">
                    <Users className="h-16 w-16 text-muted-foreground" />
                    <p className="mt-4 text-lg font-semibold">Nenhuma empresa selecionada</p>
                    <p className="text-muted-foreground">{userRole === 'master' ? 'Selecione uma empresa acima para ver os colaboradores.' : 'Sua conta não parece estar vinculada a uma empresa.'}</p>
                </div>
            ) : paginatedEmployees.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-full rounded-lg border-2 border-dashed">
                    <Users className="h-16 w-16 text-muted-foreground" />
                    <p className="mt-4 text-lg font-semibold">Nenhum colaborador encontrado</p>
                    <p className="text-muted-foreground">Comece adicionando um novo funcionário para a empresa selecionada.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {paginatedEmployees.map((employee, index) => (
                        <Card key={employee.id || `${employee.matricula}-${index}`} className="flex flex-col items-center justify-center text-center p-6 relative">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7">
                                        <EllipsisVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleOpenDialogForEdit(employee)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        <span>Editar</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleOpenResetPasswordDialog(employee)}>
                                        <KeyRound className="mr-2 h-4 w-4" />
                                        <span>Resetar Senha</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleOpenConfirmDeleteDialog(employee)} className="text-destructive focus:text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span>Remover</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {employee.status === 'Inativo' && (
                                <Badge variant="outline" className="absolute top-2 left-2 bg-destructive text-destructive-foreground">Inativo</Badge>
                            )}

                            <Avatar className="h-24 w-24 mb-4 border-2 border-primary/20">
                                <AvatarImage src={employee.avatarUrl || undefined} data-ai-hint="profile picture" alt={employee.name} />
                                <AvatarFallback>
                                    {employee.name ? employee.name.slice(0, 2).toUpperCase() : <User className="h-8 w-8" />}
                                </AvatarFallback>
                            </Avatar>
                            <p className="font-bold text-lg">{employee.name}</p>
                            <p className="text-sm text-muted-foreground capitalize">{employee.role}</p>
                            <p className="text-xs text-muted-foreground mt-1">Matrícula: {employee.matricula}</p>
                        </Card>
                    ))}
                </div>
            )}
        </div>

        <footer className="flex items-center justify-between py-4 mt-auto border-t">
            <div className="text-sm text-muted-foreground">
                Total de {employees.length} funcionários ({activeEmployeesCount} ativos / limite {planLimit}).
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">Itens por página</p>
                    <Select value={`${itemsPerPage}`} onValueChange={handleItemsPerPageChange}>
                        <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue placeholder={`${itemsPerPage}`} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            <SelectItem value="12">12</SelectItem>
                            <SelectItem value="24">24</SelectItem>
                            <SelectItem value="36">36</SelectItem>
                            <SelectItem value="48">48</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex w-[120px] items-center justify-center text-sm font-medium">
                    Página {currentPage} de {totalPages > 0 ? totalPages : 1}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={goToPreviousPage}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages || totalPages === 0}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </footer>
      </div>

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
          <EmployeeImportDialog 
              onImport={handleBulkImport}
              onClose={() => setIsImportDialogOpen(false)}
          />
      </Dialog>
      
      <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              A exclusão de funcionários foi permanentemente desativada. Use a edição para inativar um funcionário.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={() => setIsConfirmDeleteDialogOpen(false)}>Entendi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}