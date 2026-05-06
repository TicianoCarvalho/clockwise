"use client";

import { useState } from "react";
import { Edit, PlusCircle, Trash2, Loader2, Network } from "lucide-react";
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
import { SectorForm } from "@/components/SectorForm";
import { useToast } from "@/hooks/use-toast";
import type { Sector } from "@/lib/data";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { useAuthContext } from "@/contexts/auth-context";
import { collection, doc, addDoc, updateDoc, deleteDoc, query, where, serverTimestamp } from "firebase/firestore";

export default function SectorsPage() {
    const { toast } = useToast();
    const { firestore } = useFirebase();
    const { userData } = useAuthContext(); // Pegando o tenantId do contexto de usuário

    // 1. Query filtrada por Tenant
    const sectorsQuery = useMemoFirebase(() => {
        if (!firestore || !userData?.tenantId) return null;
        return query(
            collection(firestore, 'sectors'), 
            where('tenantId', '==', userData.tenantId)
        );
    }, [firestore, userData?.tenantId]);

    const { data: sectors, isLoading: loading } = useCollection<Sector>(sectorsQuery);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingSector, setEditingSector] = useState<Sector | null>(null);
    const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
    const [deletingSector, setDeletingSector] = useState<Sector | null>(null);

    const handleOpenDialogForEdit = (sector: Sector) => {
        setEditingSector(sector);
        setIsDialogOpen(true);
    };
    
    const handleOpenDialogForAdd = () => {
        setEditingSector(null);
        setIsDialogOpen(true);
    };

    // 2. Submit Handler com injeção de TenantId
    const handleSubmitSector = async (formData: Omit<Sector, 'id'>) => {
        if (!firestore || !userData?.tenantId) {
            toast({
                variant: 'destructive',
                title: 'Erro de Permissão',
                description: 'ID da empresa não identificado.',
            });
            return;
        }

        const isEditing = !!editingSector;

        try {
            const sectorData = {
                ...formData,
                tenantId: userData.tenantId, // Vincula o setor à empresa atual
                updatedAt: serverTimestamp(),
            };

            if (isEditing && editingSector?.id) {
                const docRef = doc(firestore, 'sectors', editingSector.id);
                await updateDoc(docRef, sectorData);
            } else {
                const collectionRef = collection(firestore, 'sectors');
                await addDoc(collectionRef, {
                    ...sectorData,
                    createdAt: serverTimestamp()
                });
            }
            
            toast({ 
                title: `Setor ${isEditing ? 'atualizado' : 'adicionado'}!`, 
                description: `O setor "${formData.name}" foi salvo com sucesso.` 
            });
            setIsDialogOpen(false);
        } catch (error: any) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro", description: "Não foi possível salvar o setor." });
        }
    };

    const handleDeleteSectorConfirm = async () => {
        if (!deletingSector || !firestore) return;
        try {
            const docRef = doc(firestore, 'sectors', deletingSector.id);
            await deleteDoc(docRef);
            toast({ title: "Setor removido!", description: `O setor "${deletingSector.name}" foi removido com sucesso.` });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Erro", description: "Não foi possível remover o setor." });
        }
        setIsConfirmDeleteDialogOpen(false);
        setDeletingSector(null);
    };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Network /> Gerenciamento de Setores</CardTitle>
            <CardDescription>Adicione, edite e gerencie os setores da sua empresa.</CardDescription>
          </div>
          <Button onClick={handleOpenDialogForAdd}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Setor
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
                        <TableHead>Setor</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right w-[100px]">Ações</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!sectors || sectors.length === 0 ? (
                         <TableRow>
                            <TableCell colSpan={3} className="h-24 text-center">
                                Nenhum setor cadastrado.
                            </TableCell>
                        </TableRow>
                    ) : (
                        sectors.map((sector) => (
                        <TableRow key={sector.id}>
                            <TableCell className="font-medium">{sector.name}</TableCell>
                            <TableCell>{sector.description}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => handleOpenDialogForEdit(sector)}>
                                    <Edit className="h-4 w-4" />
                                    <span className="sr-only">Editar</span>
                                </Button>
                                <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => (setDeletingSector(sector), setIsConfirmDeleteDialogOpen(true))}>
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
        <SectorForm 
            sector={editingSector}
            onSubmit={handleSubmitSector}
        />
      </Dialog>

      <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Isso removerá permanentemente o setor
              &quot;{deletingSector?.name}&quot; dos seus registros.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSectorConfirm}>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}