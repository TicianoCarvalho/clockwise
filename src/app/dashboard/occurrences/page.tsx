
"use client";

import { useState, useEffect, useMemo } from "react";
import { Edit, PlusCircle, Trash2, Loader2, UserX, XCircle } from "lucide-react";
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
import { AfastamentoForm } from "@/components/OccurrenceForm";
import { useToast } from "@/hooks/use-toast";
import type { Afastamento, Employee } from "@/lib/data";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { useAuthContext } from "@/contexts/auth-context";
import { collection, doc, addDoc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore";

export default function AfastamentosPage() {
    const { toast } = useToast();
    const { firestore } = useFirebase();
    const { tenantId } = useAuthContext();

    const occurrencesQuery = useMemoFirebase(() => tenantId ? query(collection(firestore, 'tenants', tenantId, 'occurrences'), orderBy('startDate', 'desc')) : null, [firestore, tenantId]);
    const { data: afastamentos, isLoading: occurrencesLoading } = useCollection<Afastamento>(occurrencesQuery);

    const employeesQuery = useMemoFirebase(() => tenantId ? collection(firestore, 'tenants', tenantId, 'employees') : null, [firestore, tenantId]);
    const { data: employeesData, isLoading: employeesLoading } = useCollection<Employee>(employeesQuery);
    const employees = useMemo(() => employeesData || [], [employeesData]);
    
    const loading = occurrencesLoading || employeesLoading;

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingAfastamento, setEditingAfastamento] = useState<Afastamento | null>(null);
    const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
    const [afastamentoToAction, setAfastamentoToAction] = useState<Afastamento | null>(null);

    const handleOpenDialogForEdit = (item: Afastamento) => {
        setEditingAfastamento(item);
        setIsDialogOpen(true);
    };
    
    const handleOpenDialogForAdd = () => {
        setEditingAfastamento(null);
        setIsDialogOpen(true);
    };

    const handleSubmit = async (data: Omit<Afastamento, 'id'>) => {
        if (!firestore || !tenantId) {
            toast({
                variant: 'destructive',
                title: 'Erro de Autenticação',
                description: 'Não foi possível identificar a empresa. Por favor, faça login novamente.',
            });
            return;
        }
        const isEditing = !!editingAfastamento;

        try {
            if (isEditing && editingAfastamento?.id) {
                const docRef = doc(firestore, 'tenants', tenantId, 'occurrences', editingAfastamento.id);
                await updateDoc(docRef, data);
            } else {
                const collectionRef = collection(firestore, 'tenants', tenantId, 'occurrences');
                await addDoc(collectionRef, data);
            }
            toast({ title: `Afastamento ${isEditing ? 'atualizado' : 'lançado'} com sucesso!` });
            setIsDialogOpen(false);
        } catch (error: any) {
             toast({ variant: "destructive", title: "Erro", description: "Não foi possível salvar o afastamento." });
        }
    };

    const handleOpenConfirmDialog = (item: Afastamento) => {
        setAfastamentoToAction(item);
        setIsConfirmDeleteDialogOpen(true);
    };

    const handleConfirmAction = async () => {
        if (!afastamentoToAction || !firestore || !tenantId) return;

        const isCancelAction = afastamentoToAction.status === 'Ativo';
        const newStatus = isCancelAction ? 'Cancelado' : 'Ativo';
        
        try {
            const docRef = doc(firestore, 'tenants', tenantId, 'occurrences', afastamentoToAction.id);
            await updateDoc(docRef, { status: newStatus });
            toast({ title: `Afastamento ${isCancelAction ? 'cancelado' : 'reativado'} com sucesso!` });
        } catch (error: any) {
             toast({ variant: "destructive", title: "Erro", description: "Não foi possível alterar o status do afastamento." });
        }
        setIsConfirmDeleteDialogOpen(false);
        setAfastamentoToAction(null);
    };

    const getEmployeeName = (employeeId: string) => employees.find(e => e.matricula === employeeId)?.name || 'Desconhecido';

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><UserX /> Lançamento de Afastamentos</CardTitle>
            <CardDescription>Lance e gerencie férias, licenças e outros afastamentos dos colaboradores.</CardDescription>
          </div>
          <Button onClick={handleOpenDialogForAdd}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Lançar Afastamento
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
                        <TableHead>Colaborador</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right w-[100px]">Ações</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                     {!afastamentos || afastamentos.length === 0 ? (
                         <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                Nenhum afastamento lançado.
                            </TableCell>
                        </TableRow>
                    ) : (
                        afastamentos.map((item) => (
                        <TableRow key={item.id} className={cn(item.status === 'Cancelado' && 'text-muted-foreground bg-muted/50')}>
                            <TableCell className="font-medium">{getEmployeeName(item.employeeId)}</TableCell>
                            <TableCell>{item.tipo}</TableCell>
                            <TableCell>
                                {format(parseISO(item.startDate), "dd/MM/yyyy", { locale: ptBR })} a {format(parseISO(item.endDate), "dd/MM/yyyy", { locale: ptBR })}
                            </TableCell>
                            <TableCell>
                                <Badge variant={item.status === 'Ativo' ? 'default' : 'destructive'}>{item.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => handleOpenDialogForEdit(item)} disabled={item.status === 'Cancelado'}>
                                    <Edit className="h-4 w-4" />
                                    <span className="sr-only">Editar</span>
                                </Button>
                                <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => handleOpenConfirmDialog(item)}>
                                    <XCircle className="h-4 w-4" />
                                    <span className="sr-only">Cancelar</span>
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
        <AfastamentoForm 
            afastamento={editingAfastamento}
            employees={employees}
            onSubmit={handleSubmit}
        />
      </Dialog>
      <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              {`Deseja realmente ${afastamentoToAction?.status === 'Ativo' ? 'cancelar' : 'reativar'} este afastamento? A integração com a folha de ponto será afetada.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
