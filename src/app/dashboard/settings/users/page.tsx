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
// ADICIONADO: 'where' importado para o filtro
import { collection, query, getDocs, where } from "firebase/firestore";


export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
    const [deletingUser, setDeletingUser] = useState<User | null>(null);
    const { toast } = useToast();
    // 'user' extraído para pegarmos o tenantId
    const { firestore, user: currentUser } = useFirebase();

    useEffect(() => {
        const fetchUsers = async () => {
            // Só executa se o firestore e o usuário logado estiverem prontos
            if (!firestore || !currentUser) {
                setLoading(false);
                return;
            };

            setLoading(true);
            try {
                // CORREÇÃO AQUI: Filtramos para trazer apenas usuários do mesmo tenantId
                // Se o usuário logado for Master, você pode remover o filtro se quiser ver todos,
                // mas para o Admin do cliente, o filtro é obrigatório.
                let q;
                
                if (currentUser.role === 'master') {
                    // Master vê tudo (ou você pode manter o filtro para testar como o cliente vê)
                    q = query(collection(firestore, "users"));
                } else {
                    // Admin vê apenas os usuários da sua própria empresa
                    q = query(
                        collection(firestore, "users"), 
                        where("tenantId", "==", currentUser.tenantId)
                    );
                }

                const querySnapshot = await getDocs(q);
                
                const fetchedUsers: User[] = [];
                querySnapshot.forEach((doc) => {
                    const userData = doc.data();
                    // Oculta usuários Master da lista se o visualizador for apenas Admin
                    if (currentUser.role !== 'master' && userData.role === 'master') {
                        return;
                    }
                    fetchedUsers.push({ id: doc.id, ...userData } as User);
                });
                setUsers(fetchedUsers);
            } catch (error: any) {
                toast({ variant: "destructive", title: "Erro ao Carregar Usuários", description: error.message || "Não foi possível buscar os usuários." });
            } finally {
                setLoading(false);
            }
        };
    
        fetchUsers();
    }, [firestore, currentUser, toast]);

    // ... restante das funções (handleOpenDialogForEdit, etc) permanecem iguais

    return (
        // ... restante do JSX permanece igual
        <Card>
            {/* O conteúdo do seu return aqui */}
        </Card>
    );
}