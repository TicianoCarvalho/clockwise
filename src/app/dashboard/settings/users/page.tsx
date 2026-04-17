
"use client";

import { useState, useEffect } from "react";
import Link from 'next/link';
import { Edit, PlusCircle, Trash2, Loader2, Users } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";
import { UserForm } from "@/components/UserForm";
import type { User } from "@/lib/data";
import { useFirebase } from "@/firebase";
import { collection, query, getDocs } from "firebase/firestore";


export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
    const [deletingUser, setDeletingUser] = useState<User | null>(null);
    const { toast } = useToast();
    const { firestore } = useFirebase();

    useEffect(() => {
        const fetchUsers = async () => {
            if (!firestore) {
                setLoading(false);
                return;
            };

            setLoading(true);
            try {
                const q = query(collection(firestore, "users"));
                const querySnapshot = await getDocs(q);
                
                const fetchedUsers: User[] = [];
                querySnapshot.forEach((doc) => {
                    fetchedUsers.push({ id: doc.id, ...doc.data() } as User);
                });
                setUsers(fetchedUsers);
            } catch (error: any) {
                toast({ variant: "destructive", title: "Erro ao Carregar Usuários", description: error.message || "Não foi possível buscar os usuários." });
            } finally {
                setLoading(false);
            }
        };
    
        fetchUsers();
    }, [firestore, toast]);

    const handleOpenDialogForEdit = (user: User) => {
        toast({ title: "Funcionalidade em desenvolvimento", description: "A edição de usuários será implementada em breve."})
    };

    const handleOpenConfirmDeleteDialog = (user: User) => {
        toast({ title: "Funcionalidade em desenvolvimento", description: "A remoção de usuários será implementada em breve."})
    };
    
    // Placeholder functions
    const handleSubmitUser = async (data: User) => {
        console.log("Submitting user:", data);
        setIsDialogOpen(false);
    };
    const handleDeleteUserConfirm = async () => {
        console.log("Deleting user:", deletingUser);
        setIsConfirmDeleteDialogOpen(false);
    };
    
    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2"><Users className="h-6 w-6" />Usuários e Permissões</CardTitle>
                        <CardDescription>Gerencie os usuários com acesso ao painel. Novos administradores são criados na página de cadastro.</CardDescription>
                    </div>
                    <Button asChild>
                        <Link href="/signup">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Novo Administrador
                        </Link>
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
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Nível de Acesso</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right w-[100px]">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            Nenhum usuário cadastrado. Crie um na página de cadastro.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    users.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">{user.name}</TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{user.role}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={user.status === 'Ativo' ? 'default' : 'outline'}>
                                                    {user.status || 'Ativo'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => handleOpenDialogForEdit(user)} disabled>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => handleOpenConfirmDeleteDialog(user)} disabled>
                                                    <Trash2 className="h-4 w-4" />
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
            
            <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
                setIsDialogOpen(isOpen);
                if (!isOpen) {
                    setEditingUser(null);
                }
            }}>
                <UserForm user={editingUser} onSubmit={handleSubmitUser} />
            </Dialog>

            <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                    Essa ação não pode ser desfeita. Isso removerá permanentemente o usuário
                    &quot;{deletingUser?.name}&quot;.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteUserConfirm}>Continuar</AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
