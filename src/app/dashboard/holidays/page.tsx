"use client";

import { useState, useEffect } from "react";
import { Edit, PlusCircle, Trash2, Loader2, CalendarDays } from "lucide-react";
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
import { HolidayForm } from "@/components/HolidayForm";
import { useToast } from "@/hooks/use-toast";
import type { Holiday } from "@/lib/data";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { useAuthContext } from "@/contexts/auth-context";
import { collection, doc, addDoc, updateDoc, deleteDoc, query, orderBy, writeBatch } from "firebase/firestore";

export default function HolidaysPage() {
    const { toast } = useToast();
    const { firestore } = useFirebase();
    const { userRole } = useAuthContext();

    const holidaysQuery = useMemoFirebase(() => 
        (firestore && userRole) ? query(collection(firestore, 'holidays'), orderBy('date', 'asc')) : null, 
    [firestore, userRole]);
    const { data: holidays, isLoading: loading } = useCollection<Holiday>(holidaysQuery);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
    const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
    const [deletingHoliday, setDeletingHoliday] = useState<Holiday | null>(null);
    
    // Auto-seed holidays on first load if the collection is empty
    useEffect(() => {
        const seedHolidays = async () => {
            if (loading || !firestore || holidays === null || holidays.length > 0) {
                return; // Abort if still loading, firestore is unavailable, or holidays already exist.
            }

            const canSeed = userRole === 'admin' || userRole === 'master';
            if (!canSeed) {
                return; // Only admins or master can seed data.
            }

            toast({ title: "Inicializando Feriados...", description: "Nenhum feriado encontrado. Adicionando feriados nacionais ao sistema." });

            const nationalHolidays = [
                { date: "2026-01-01", name: "Confraternização Universal", type: "Nacional" },
                { date: "2026-04-21", name: "Tiradentes", type: "Nacional" },
                { date: "2026-05-01", name: "Dia do Trabalho", type: "Nacional" },
                { date: "2026-09-07", name: "Independência do Brasil", type: "Nacional" },
                { date: "2026-10-12", name: "Nossa Senhora Aparecida", type: "Nacional" },
                { date: "2026-11-02", name: "Finados", type: "Nacional" },
                { date: "2026-11-15", name: "Proclamação da República", type: "Nacional" },
                { date: "2026-12-25", name: "Natal", type: "Nacional" },
            ];

            try {
                const batch = writeBatch(firestore);
                const holidaysCollection = collection(firestore, 'holidays');
                
                nationalHolidays.forEach(holiday => {
                    const docRef = doc(holidaysCollection); // Create a new doc with a random ID
                    batch.set(docRef, holiday);
                });

                await batch.commit();
                toast({ title: "Feriados Nacionais Adicionados!", description: "A lista de feriados foi preenchida com sucesso." });
            } catch (error: any) {
                console.error("Error seeding holidays:", error);
                toast({ variant: "destructive", title: "Erro ao inicializar feriados", description: error.message });
            }
        };

        seedHolidays();
    }, [loading, holidays, firestore, toast, userRole]);


    const handleOpenDialogForEdit = (holiday: Holiday) => {
        setEditingHoliday(holiday);
        setIsDialogOpen(true);
    };
    
    const handleOpenDialogForAdd = () => {
        setEditingHoliday(null);
        setIsDialogOpen(true);
    };

    const handleSubmitHoliday = async (data: Omit<Holiday, 'id'>) => {
        if (!firestore) {
            toast({
                variant: 'destructive',
                title: 'Erro de Conexão',
                description: 'Não foi possível conectar ao banco de dados.',
            });
            return;
        }
        const isEditing = !!editingHoliday;
        
        try {
            if (isEditing && editingHoliday?.id) {
                const docRef = doc(firestore, 'holidays', editingHoliday.id);
                await updateDoc(docRef, data);
            } else {
                const collectionRef = collection(firestore, 'holidays');
                await addDoc(collectionRef, data);
            }
            toast({ title: `Feriado ${isEditing ? 'atualizado' : 'adicionado'}!`, description: `O feriado "${data.name}" foi salvo com sucesso.` });
            setIsDialogOpen(false);
        } catch (error: any) {
             toast({ variant: "destructive", title: "Erro", description: "Não foi possível salvar o feriado." });
        }
    };

    const handleOpenConfirmDeleteDialog = (holiday: Holiday) => {
        setDeletingHoliday(holiday);
        setIsConfirmDeleteDialogOpen(true);
    };

    const handleDeleteHolidayConfirm = async () => {
        if (!deletingHoliday || !firestore) return;
        try {
            const docRef = doc(firestore, 'holidays', deletingHoliday.id);
            await deleteDoc(docRef);
            toast({ title: "Feriado removido!", description: `O feriado "${deletingHoliday.name}" foi removido com sucesso.` });
        } catch (error: any) {
             toast({ variant: "destructive", title: "Erro", description: "Não foi possível remover o feriado." });
        }
        setIsConfirmDeleteDialogOpen(false);
        setDeletingHoliday(null);
    };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><CalendarDays /> Gerenciamento de Feriados</CardTitle>
            <CardDescription>Adicione, edite e gerencie os feriados nacionais, locais e pontos facultativos.</CardDescription>
          </div>
          <Button onClick={handleOpenDialogForAdd}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Feriado
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
                        <TableHead>Data</TableHead>
                        <TableHead>Feriado</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right w-[100px]">Ações</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                     {!holidays || holidays.length === 0 ? (
                         <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                                Nenhum feriado cadastrado.
                            </TableCell>
                        </TableRow>
                    ) : (
                        holidays.map((holiday) => (
                        <TableRow key={holiday.id}>
                            <TableCell className="font-medium">{format(parseISO(holiday.date), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                            <TableCell>{holiday.name}</TableCell>
                            <TableCell>
                                <Badge variant={holiday.type === 'Nacional' ? 'default' : 'secondary'}>{holiday.type}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => handleOpenDialogForEdit(holiday)}>
                                    <Edit className="h-4 w-4" />
                                    <span className="sr-only">Editar</span>
                                </Button>
                                <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => handleOpenConfirmDeleteDialog(holiday)}>
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
        <HolidayForm 
            holiday={editingHoliday}
            onSubmit={handleSubmitHoliday}
        />
      </Dialog>
      <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Isso removerá permanentemente o feriado
              &quot;{deletingHoliday?.name}&quot; dos seus registros.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteHolidayConfirm}>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
