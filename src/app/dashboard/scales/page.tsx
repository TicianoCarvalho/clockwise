"use client";

import { useState } from "react";
import { Edit, PlusCircle, Trash2, Loader2, Scaling } from "lucide-react";
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
import { ScaleForm } from "@/components/ScaleForm";
import { useToast } from "@/hooks/use-toast";
import type { Scale } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { useAuthContext } from "@/contexts/auth-context";
// Importes adicionais para filtro (query e where)
import { collection, doc, addDoc, updateDoc, deleteDoc, query, where, serverTimestamp } from "firebase/firestore";

export default function ScalesPage() {
    const { toast } = useToast();
    const { firestore } = useFirebase();
    // Recuperando userData para acessar o tenantId
    const { userRole, userData } = useAuthContext(); 

    // Query corrigida para filtrar pelo Tenant do usuário logado
    const scalesQuery = useMemoFirebase(() => {
        if (firestore && userRole && userData?.tenantId) {
            // Se for Master, pode listar tudo, caso contrário, filtra pela empresa
            if (userRole === 'master') {
                return collection(firestore, 'scales');
            }
            return query(
                collection(firestore, 'scales'), 
                where('tenantId', '==', userData.tenantId)
            );
        }
        return null;
    }, [firestore, userRole, userData?.tenantId]);

    const { data: scales, isLoading: loading } = useCollection<Scale>(scalesQuery);
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingScale, setEditingScale] = useState<Scale | null>(null);
    const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
    const [deletingScale, setDeletingScale] = useState<Scale | null>(null);
    
    const handleOpenDialogForEdit = (scale: Scale) => {
        setEditingScale(scale);
        setIsDialogOpen(true);
    };
    
    const handleOpenDialogForAdd = () => {
        setEditingScale(null);
        setIsDialogOpen(true);
    };

    const handleSubmitScale = async (data: Omit<Scale, 'id'>) => {
        if (!firestore || !userData?.tenantId) {
            toast({
                variant: 'destructive',
                title: 'Erro de Permissão',
                description: 'Não foi possível identificar sua empresa ou conexão.',
            });
            return;
        }
        const isEditing = !!editingScale;
        
        try {
            if (isEditing && editingScale?.id) {
                const docRef = doc(firestore, 'scales', editingScale.id);
                await updateDoc(docRef, data);
            } else {
                // Injeta o tenantId no novo documento para cumprir as regras de segurança
                const payload = {
                    ...data,
                    tenantId: userData.tenantId,
                    createdAt: serverTimestamp()
                };
                const collectionRef = collection(firestore, 'scales');
                await addDoc(collectionRef, payload);
            }
            toast({ title: `Escala ${isEditing ? 'atualizada' : 'adicionada'}!`, description: `A escala "${data.name}" foi salva com sucesso.` });
            setIsDialogOpen(false);
        } catch (error: any) {
             console.error("Erro ao salvar:", error);
             toast({ variant: "destructive", title: "Erro", description: "Não foi possível salvar a escala. Verifique as permissões." });
        }
    };

    const handleOpenConfirmDeleteDialog = (scale: Scale) => {
        setDeletingScale(scale);
        setIsConfirmDeleteDialogOpen(true);
    };

    const handleDeleteScaleConfirm = async () => {
        if (!deletingScale || !firestore) return;
        try {
            const docRef = doc(firestore, 'scales', deletingScale.id);
            await deleteDoc(docRef);
            toast({ title: "Escala removida!", description: `A escala "${deletingScale.name}" foi removida com sucesso.` });
        } catch (error: any) {
             toast({ variant: "destructive", title: "Erro", description: "Não foi possível remover a escala." });
        }
        setIsConfirmDeleteDialogOpen(false);
        setDeletingScale(null);
    };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Scaling /> Gerenciamento de Escalas</CardTitle>
            <CardDescription>Crie e gerencie as escalas de revezamento (ex: 12x36, 5x1).</CardDescription>
          </div>
          <Button onClick={handleOpenDialogForAdd}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Escala
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
                        <TableHead>Nome da Escala</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right w-[100px]">Ações</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                     {!scales || scales.length === 0 ? (
                         <TableRow>
                            <TableCell colSpan={3} className="h-24 text-center">
                                Nenhuma escala cadastrada.
                            </TableCell>
                        </TableRow>
                    ) : (
                        scales.map((scale) => (
                        <TableRow key={scale.id}>
                            <TableCell className="font-medium">{scale.name}</TableCell>
                            <TableCell><Badge variant="secondary">{scale.type}</Badge></TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => handleOpenDialogForEdit(scale)}>
                                    <Edit className="h-4 w-4" />
                                    <span className="sr-only">Editar</span>
                                </Button>
                                <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => handleOpenConfirmDeleteDialog(scale)}>
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
        <ScaleForm 
            scale={editingScale}
            onSubmit={handleSubmitScale}
        />
      </Dialog>
      <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Isso removerá permanentemente a escala
              &quot;{deletingScale?.name}&quot; dos seus registros.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteScaleConfirm}>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}