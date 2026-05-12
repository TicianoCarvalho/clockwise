"use client";

import { useState, useEffect, useMemo } from "react";

import {
  ChevronLeft,
  ChevronRight,
  Edit,
  EllipsisVertical,
  PlusCircle,
  Trash2,
  Upload,
  Users,
  Loader2,
  KeyRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

import { Dialog } from "@/components/ui/dialog";

import {
  AlertDialog,
  AlertDialogAction,
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

import { Badge } from "@/components/ui/badge";

import { EmployeeForm } from "@/components/EmployeeForm";
import { EmployeeImportDialog } from "@/components/EmployeeImportDialog";

import { useToast } from "@/hooks/use-toast";

import type {
  Employee,
  Location,
  Sector,
  Schedule,
  Scale,
  Company,
} from "@/lib/data";

import {
  useFirebase,
  useCollection,
} from "@/firebase";

import { useAuthContext } from "@/contexts/auth-context";

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

export default function EmployeesPage() {

  const { toast } = useToast();

  const { firestore } = useFirebase();

  const { userRole, userData } = useAuthContext();

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [editingEmployee, setEditingEmployee] =
    useState<Employee | null>(null);

  const [selectedEmployee, setSelectedEmployee] =
    useState<Employee | null>(null);

  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] =
    useState(false);

  const [isImportDialogOpen, setIsImportDialogOpen] =
    useState(false);

  const [currentPage, setCurrentPage] = useState(1);

  const [itemsPerPage] = useState(12);

  const [selectedTenantId, setSelectedTenantId] =
    useState<string>("");

  // =====================================================
  // TENANT FINAL
  // =====================================================

  const finalTenantId =
    userRole === "master"
      ? selectedTenantId
      : userData?.tenantId || "";

  // =====================================================
  // TENANTS
  // =====================================================

  const tenantsQuery =
    firestore && userRole === "master"
      ? query(collection(firestore, "tenants"))
      : null;

  const {
    data: tenantsData,
    isLoading: tenantsLoading,
  } = useCollection<Company>(tenantsQuery);

  const tenants = tenantsData || [];

  useEffect(() => {

    if (
      userRole === "master" &&
      tenants.length > 0 &&
      !selectedTenantId
    ) {
      setSelectedTenantId(tenants[0].id);
    }

  }, [
    userRole,
    tenants,
    selectedTenantId,
  ]);

  // =====================================================
  // EMPLOYEES
  // =====================================================

  const employeesQuery =
    firestore && finalTenantId
      ? query(
          collection(firestore, "employees"),
          where("tenantId", "==", finalTenantId)
        )
      : null;

  const {
    data: employeesData,
    isLoading: employeesLoading,
  } = useCollection<Employee>(employeesQuery);

  const employees = useMemo(
    () => employeesData || [],
    [employeesData]
  );

  // =====================================================
  // SUPPORT DATA
  // =====================================================

  const locationsQuery =
    firestore && finalTenantId
      ? query(
          collection(firestore, "locations"),
          where("tenantId", "==", finalTenantId)
        )
      : null;

  const sectorsQuery =
    firestore && finalTenantId
      ? query(
          collection(firestore, "sectors"),
          where("tenantId", "==", finalTenantId)
        )
      : null;

  const schedulesQuery =
    firestore && finalTenantId
      ? query(
          collection(firestore, "schedules"),
          where("tenantId", "==", finalTenantId)
        )
      : null;

  const scalesQuery =
    firestore && finalTenantId
      ? query(
          collection(firestore, "scales"),
          where("tenantId", "==", finalTenantId)
        )
      : null;

  const { data: locationsData } =
    useCollection<Location>(locationsQuery);

  const { data: sectorsData } =
    useCollection<Sector>(sectorsQuery);

  const { data: schedulesData } =
    useCollection<Schedule>(schedulesQuery);

  const { data: scalesData } =
    useCollection<Scale>(scalesQuery);

  const locations = locationsData || [];
  const sectors = sectorsData || [];
  const schedules = schedulesData || [];
  const scales = scalesData || [];

  // =====================================================
  // LOADING
  // =====================================================

  const isLoading =
    employeesLoading ||
    (userRole === "master" && tenantsLoading);

  // =====================================================
  // PAGINATION
  // =====================================================

  const totalPages = Math.max(
    1,
    Math.ceil(employees.length / itemsPerPage)
  );

  const paginatedEmployees = useMemo(() => {

    const start =
      (currentPage - 1) * itemsPerPage;

    const end =
      currentPage * itemsPerPage;

    return employees.slice(start, end);

  }, [
    employees,
    currentPage,
    itemsPerPage,
  ]);

  // =====================================================
  // PLAN
  // =====================================================

  const activeEmployeesCount =
    employees.filter(
      (emp) =>
        emp?.status !== "Inativo" &&
        !emp?.terminationDate
    ).length;

  const planLimit = 20;

  const isLimitReached =
    activeEmployeesCount >= planLimit;

  // =====================================================
  // SAVE
  // =====================================================

  const handleSubmitEmployee =
    async (formData: any) => {

      if (!firestore || !finalTenantId) {
        return;
      }

      const isEditing =
        !!editingEmployee;

      try {

        const employeeData = {
          ...formData,
          tenantId: finalTenantId,
          updatedAt: serverTimestamp(),
        };

        if (
          isEditing &&
          editingEmployee?.id
        ) {

          const docRef = doc(
            firestore,
            "employees",
            editingEmployee.id
          );

          await updateDoc(
            docRef,
            employeeData
          );

        } else {

          const docId =
            formData.cpf.replace(/\D/g, "");

          if (
            employees.some(
              (e) => e.cpf === formData.cpf
            )
          ) {

            toast({
              variant: "destructive",
              title: "CPF já cadastrado",
            });

            return;
          }

          const docRef = doc(
            firestore,
            "employees",
            docId
          );

          await setDoc(docRef, {
            ...employeeData,
            createdAt: serverTimestamp(),
          });
        }

        toast({
          title: "Sucesso",
          description:
            "Colaborador salvo com sucesso.",
        });

        setEditingEmployee(null);

        setIsDialogOpen(false);

      } catch (error) {

        console.error(error);

        toast({
          variant: "destructive",
          title: "Erro",
          description:
            "Falha ao salvar colaborador.",
        });
      }
    };

  return (
    <div className="flex flex-col h-full space-y-6">

      <header className="flex items-center justify-between">

        <div>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Users className="h-7 w-7 text-primary" />
            Colaboradores
          </CardTitle>

          <CardDescription>
            Gestão de funcionários.
          </CardDescription>
        </div>

        <div className="flex items-center gap-3">

          <Button
            variant="outline"
            onClick={() =>
              setIsImportDialogOpen(true)
            }
          >
            <Upload className="mr-2 h-4 w-4" />
            Importar
          </Button>

          <Button
            onClick={() => {
              setEditingEmployee(null);
              setIsDialogOpen(true);
            }}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Funcionário
          </Button>

        </div>

      </header>

      {userRole === "master" && (

        <Card className="border-primary/20 bg-primary/5">

          <CardContent className="pt-6">

            <div className="flex items-center gap-4">

              <span className="text-sm font-bold flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                Empresa:
              </span>

              <Select
                value={selectedTenantId}
                onValueChange={setSelectedTenantId}
              >

                <SelectTrigger className="w-[300px] bg-background">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>

                <SelectContent>

                  {tenants.map((tenant) => (
                    <SelectItem
                      key={tenant.id}
                      value={tenant.id}
                    >
                      {tenant.name}
                    </SelectItem>
                  ))}

                </SelectContent>

              </Select>

            </div>

          </CardContent>

        </Card>
      )}

      <div className="flex-grow">

        {isLoading ? (

          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-10 w-10 animate-spin" />
          </div>

        ) : paginatedEmployees.length === 0 ? (

          <div className="flex items-center justify-center h-64 border rounded-xl">
            Nenhum colaborador encontrado.
          </div>

        ) : (

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

            {paginatedEmployees.map((emp) => (

              <Card key={emp.id}>

                <CardContent className="p-6 relative">

                  <div className="absolute top-3 right-3">

                    <DropdownMenu>

                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                        >
                          <EllipsisVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end">

                        <DropdownMenuItem
                          onClick={() => {
                            setEditingEmployee(emp);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setIsConfirmDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remover
                        </DropdownMenuItem>

                      </DropdownMenuContent>

                    </DropdownMenu>

                  </div>

                  <div className="flex flex-col items-center">

                    <Avatar className="h-20 w-20">

                      <AvatarImage
                        src={emp.avatarUrl}
                      />

                      <AvatarFallback>
                        {emp.name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>

                    </Avatar>

                    <h3 className="mt-4 font-bold text-center">
                      {emp.name}
                    </h3>

                    <p className="text-xs text-muted-foreground">
                      {emp.cpf}
                    </p>

                    <div className="mt-3 flex gap-2 flex-wrap justify-center">

                      <Badge variant="secondary">
                        {emp.setor || "Geral"}
                      </Badge>

                      <Badge variant="outline">
                        {emp.matricula || "---"}
                      </Badge>

                    </div>

                  </div>

                </CardContent>

              </Card>

            ))}

          </div>
        )}

      </div>

      <Dialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      >

        <EmployeeForm
          employee={editingEmployee}
          onSubmit={handleSubmitEmployee}
          locations={locations}
          sectors={sectors}
          schedules={schedules}
          scales={scales}
          isLimitReached={isLimitReached}
        />

      </Dialog>

      <Dialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
      >

        <EmployeeImportDialog
          tenantId={finalTenantId}
          onOpenChange={setIsImportDialogOpen}
        />

      </Dialog>

      <AlertDialog
        open={isConfirmDeleteDialogOpen}
        onOpenChange={setIsConfirmDeleteDialogOpen}
      >

        <AlertDialogContent>

          <AlertDialogHeader>

            <AlertDialogTitle>
              Exclusão Bloqueada
            </AlertDialogTitle>

            <AlertDialogDescription>
              Funcionários não podem ser removidos
              por questões legais.
            </AlertDialogDescription>

          </AlertDialogHeader>

          <AlertDialogFooter>

            <AlertDialogAction>
              Entendi
            </AlertDialogAction>

          </AlertDialogFooter>

        </AlertDialogContent>

      </AlertDialog>

    </div>
  );
}