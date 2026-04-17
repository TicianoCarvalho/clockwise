"use client";

import { useState, useEffect } from "react";
import { Edit, PlusCircle, Trash2, Loader2, Briefcase } from "lucide-react";
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
import { RoleForm } from "@/components/RoleForm";
import { useToast } from "@/hooks/use-toast";
import type { Role } from "@/lib/data";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { useAuthContext } from "@/contexts/auth-context";
import { collection, doc, addDoc, updateDoc, deleteDoc } from "firebase/firestore";

export default function RolesPage() {
    const { toast } = useToast();
    const { firestore } = useFirebase();
    const { userRole } = useAuthContext();

    const rolesQuery = useMemoFirebase(() => (firestore && userRole) ? collection(firestore, 'roles') : null, [firestore, userRole]);
    const { data: roles, isLoading: loading } = useCollection<Role>(rolesQuery);
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
    const [deletingRole, setDeletingRole] = useState<Role | null>(null);
    
    const handleOpenDialogForEdit = (role: Role) => {
        setEditingRole(role);
        setIsDialogOpen(true);
    };
    
    const handleOpenDialogForAdd = () => {
        setEditingRole(null);
        setIsDialogOpen(true);
    };

    const handleSubmitRole = async (data: Omit<Role, 'id'>) => {
        if (!firestore) {
            toast({
                variant: 'destructive',
                title: 'Erro de Conexão',
                description: 'Não foi possível conectar ao banco de dados.',
            });
            return;
        }
        const isEditing = !!editingRole;

        try {
            if (isEditing && editingRole?.id) {
                const docRef = doc(firestore, 'roles', editingRole.id);
                await updateDoc(docRef, data);
            } else {
                const collectionRef = collection(firestore, 'roles');
                await addDoc(collectionRef, data);
            }
            toast({ title: `Cargo ${isEditing ? 'atualizado' : 'adicionado'}!`, description: `O cargo "${data.name}" foi salvo com sucesso.` });
            setIsDialogOpen(false);
        } catch (error: any) {
             toast({ variant: "destructive", title: "Erro", description: "Não foi possível salvar o cargo." });
        }
    };

    const handleOpenConfirmDeleteDialog = (role: Role) => {
        setDeletingRole(role);
        setIsConfirmDeleteDialogOpen(true);
    };

    const handleDeleteRoleConfirm = async () => {
        if (!deletingRole || !firestore) return;
        try {
            const docRef = doc(firestore, 'roles', deletingRole.id);
            await deleteDoc(docRef);
            toast({ title: "Cargo removido!", description: `O cargo "${deletingRole.name}" foi removido com sucesso.` });
        } catch (error: any) {
             toast({ variant: "destructive", title: "Erro", description: "Não foi possível remover o cargo." });
        }
        setIsConfirmDeleteDialogOpen(false);
        setDeletingRole(null);
    };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Briefcase /> Gerenciamento de Cargos</CardTitle>
            <CardDescription>Adicione, edite e gerencie os cargos da sua empresa.</CardDescription>
          </div>
          <Button onClick={handleOpenDialogForAdd}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Cargo
          </Button>
        </CardHeader>
        <CardContent>
            {loading ? (
                 <div className="flex items-center justify-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Cargo</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right w-[100px]">Ações</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                     {!roles || roles.length === 0 ? (
                         <TableRow>
                            <TableCell colSpan={3} className="h-24 text-center">
                                Nenhum cargo cadastrado.
                            </TableCell>
                        </TableRow>
                    ) : (
                        roles.map((role) => (
                        <TableRow key={role.id}>
                            <TableCell className="font-medium">{role.name}</TableCell>
                            <TableCell>{role.description}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => handleOpenDialogForEdit(role)}>
                                    <Edit className="h-4 w-4" />
                                    <span className="sr-only">Editar</span>
                                </Button>
                                <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => handleOpenConfirmDeleteDialog(role)}>
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Remover</span>
                                </Button>
                            </TableCell>
                        </TableRow>
                        ))
                     )}
                    </TableBody>
                </Table>
            )}
        </CardContent>
      </Card>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <RoleForm 
            role={editingRole}
            onSubmit={handleSubmitRole}
        />
      </Dialog>
      <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Isso removerá permanentemente o cargo
              &quot;{deletingRole?.name}&quot; dos seus registros.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRoleConfirm}>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
