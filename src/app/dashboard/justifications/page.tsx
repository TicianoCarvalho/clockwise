"use client";

import { useState, useEffect } from "react";
import { Edit, PlusCircle, Trash2, Loader2, ClipboardCheck } from "lucide-react";
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
import { JustificationForm } from "@/components/JustificationForm";
import { useToast } from "@/hooks/use-toast";
import type { Justification } from "@/lib/data";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { useAuthContext } from "@/contexts/auth-context";
import { collection, doc, addDoc, updateDoc, deleteDoc } from "firebase/firestore";

export default function JustificationsPage() {
    const { toast } = useToast();
    const { firestore } = useFirebase();
    const { userRole } = useAuthContext();

    const justificationsQuery = useMemoFirebase(() => (firestore && userRole) ? collection(firestore, 'justifications') : null, [firestore, userRole]);
    const { data: justifications, isLoading: loading } = useCollection<Justification>(justificationsQuery);
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingJustification, setEditingJustification] = useState<Justification | null>(null);
    const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
    const [deletingJustification, setDeletingJustification] = useState<Justification | null>(null);
    
    const handleOpenDialogForEdit = (justification: Justification) => {
        setEditingJustification(justification);
        setIsDialogOpen(true);
    };
    
    const handleOpenDialogForAdd = () => {
        setEditingJustification(null);
        setIsDialogOpen(true);
    };

    const handleSubmitJustification = async (data: Omit<Justification, 'id'>) => {
        if (!firestore) {
            toast({
                variant: 'destructive',
                title: 'Erro de Conexão',
                description: 'Não foi possível conectar ao banco de dados.',
            });
            return;
        }
        const isEditing = !!editingJustification;

        try {
            if (isEditing && editingJustification?.id) {
                const docRef = doc(firestore, 'justifications', editingJustification.id);
                await updateDoc(docRef, data);
            } else {
                const collectionRef = collection(firestore, 'justifications');
                await addDoc(collectionRef, data);
            }
            toast({ title: `Justificativa ${isEditing ? 'atualizada' : 'adicionada'}!`, description: `A justificativa "${data.name}" foi salva com sucesso.` });
            setIsDialogOpen(false);
        } catch (error: any) {
             toast({ variant: "destructive", title: "Erro", description: "Não foi possível salvar a justificativa." });
        }
    };

    const handleOpenConfirmDeleteDialog = (justification: Justification) => {
        setDeletingJustification(justification);
        setIsConfirmDeleteDialogOpen(true);
    };

    const handleDeleteJustificationConfirm = async () => {
        if (!deletingJustification || !firestore) return;
        try {
            const docRef = doc(firestore, 'justifications', deletingJustification.id);
            await deleteDoc(docRef);
            toast({ title: "Justificativa removida!", description: `A justificativa "${deletingJustification.name}" foi removida com sucesso.` });
        } catch (error: any) {
             toast({ variant: "destructive", title: "Erro", description: "Não foi possível remover a justificativa." });
        }
        setIsConfirmDeleteDialogOpen(false);
        setDeletingJustification(null);
    };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><ClipboardCheck /> Gerenciamento de Justificativas</CardTitle>
            <CardDescription>Adicione, edite e gerencie os tipos de justificativas para abonos e ocorrências.</CardDescription>
          </div>
          <Button onClick={handleOpenDialogForAdd}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Justificativa
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
                        <TableHead>Justificativa</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right w-[100px]">Ações</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                     {!justifications || justifications.length === 0 ? (
                         <TableRow>
                            <TableCell colSpan={3} className="h-24 text-center">
                                Nenhuma justificativa cadastrada.
                            </TableCell>
                        </TableRow>
                    ) : (
                        justifications.map((justification) => (
                        <TableRow key={justification.id}>
                            <TableCell className="font-medium">{justification.name}</TableCell>
                            <TableCell>{justification.description}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => handleOpenDialogForEdit(justification)}>
                                    <Edit className="h-4 w-4" />
                                    <span className="sr-only">Editar</span>
                                </Button>
                                <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => handleOpenConfirmDeleteDialog(justification)}>
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
        <JustificationForm 
            justification={editingJustification}
            onSubmit={handleSubmitJustification}
        />
      </Dialog>
      <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Isso removerá permanentemente a justificativa
              &quot;{deletingJustification?.name}&quot; dos seus registros.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteJustificationConfirm}>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
