"use client";

import { useState } from "react";
import { Edit, PlusCircle, Trash2, Loader2, CalendarClock } from "lucide-react";
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
import { ScheduleForm } from "@/components/ScheduleForm";
import { useToast } from "@/hooks/use-toast";
import type { Schedule } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { useAuthContext } from "@/contexts/auth-context";
import { collection, doc, addDoc, updateDoc, deleteDoc, query, where } from "firebase/firestore";

export default function SchedulesPage() {
    const { toast } = useToast();
    const { firestore } = useFirebase();
    const { userData } = useAuthContext(); // Alterado: Usando userData para pegar tenantId
    const tenantId = userData?.tenantId;

    // 1. Alterado: Query com filtro de tenantId para listar apenas os horários da empresa
    const schedulesQuery = useMemoFirebase(() => {
        if (!firestore || !tenantId) return null;
        return query(
            collection(firestore, 'schedules'), 
            where('tenantId', '==', tenantId)
        );
    }, [firestore, tenantId]);
    
    const { data: schedules, isLoading: loading } = useCollection<Schedule>(schedulesQuery);
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
    const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
    const [deletingSchedule, setDeletingSchedule] = useState<Schedule | null>(null);
    
    const handleOpenDialogForEdit = (schedule: Schedule) => {
        setEditingSchedule(schedule);
        setIsDialogOpen(true);
    };
    
    const handleOpenDialogForAdd = () => {
        setEditingSchedule(null);
        setIsDialogOpen(true);
    };

    const handleSubmitSchedule = async (data: Omit<Schedule, 'id'>) => {
        if (!firestore || !tenantId) {
            toast({
                variant: 'destructive',
                title: 'Erro de Conexão',
                description: 'Não foi possível identificar sua empresa ou conectar ao banco.',
            });
            return;
        }
        const isEditing = !!editingSchedule;

        try {
            // 2. Alterado: Injetando o tenantId nos dados ao salvar
            const payload = {
                ...data,
                tenantId: tenantId
            };

            if (isEditing && editingSchedule?.id) {
                const docRef = doc(firestore, 'schedules', editingSchedule.id);
                await updateDoc(docRef, payload);
            } else {
                const collectionRef = collection(firestore, 'schedules');
                await addDoc(collectionRef, payload);
            }
            
            toast({ title: `Horário ${isEditing ? 'atualizado' : 'adicionado'}!`, description: `O horário "${data.name}" foi salvo com sucesso.` });
            setIsDialogOpen(false);
            setEditingSchedule(null);
        } catch (error: any) {
             toast({ variant: "destructive", title: "Erro", description: "Não foi possível salvar o horário." });
        }
    };

    const handleOpenConfirmDeleteDialog = (schedule: Schedule) => {
        setDeletingSchedule(schedule);
        setIsConfirmDeleteDialogOpen(true);
    };

    const handleDeleteScheduleConfirm = async () => {
        if (!deletingSchedule || !firestore) return;
        try {
            const docRef = doc(firestore, 'schedules', deletingSchedule.id);
            await deleteDoc(docRef);
            toast({ title: "Horário removido!", description: `O horário "${deletingSchedule.name}" foi removido com sucesso.` });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Erro", description: "Não foi possível remover o horário." });
        }
        setIsConfirmDeleteDialogOpen(false);
        setDeletingSchedule(null);
    };

    // Lógica de cálculo de minutos (permanece idêntica)
    const calculateTotalWeeklyMinutes = (schedule: Schedule): number => {
        const timeToMinutes = (time: string): number => {
            if (!time || !time.includes(':')) return 0;
            const [hours, minutes] = time.split(':').map(Number);
            if (isNaN(hours) || isNaN(minutes)) return 0;
            return hours * 60 + minutes;
        };

        const calculateDuration = (start: string, end: string): number => {
            const startMinutes = timeToMinutes(start);
            const endMinutes = timeToMinutes(end);
            if (startMinutes === 0 || endMinutes === 0) return 0;
            if (endMinutes < startMinutes) return (24 * 60 - startMinutes) + endMinutes;
            return endMinutes - startMinutes;
        };

        return schedule.workWeek.reduce((acc, day) => {
            if (day.isDayOff) return acc;
            const duration1 = calculateDuration(day.entry1 || '', day.exit1 || '');
            const duration2 = calculateDuration(day.entry2 || '', day.exit2 || '');
            return acc + duration1 + duration2;
        }, 0);
    };

    const formatMinutesToHours = (totalMinutes: number): string => {
         if (totalMinutes <= 0) return '0h';
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return minutes === 0 ? `${hours}h` : `${hours}h ${minutes.toString().padStart(2, '0')}m`;
    }

  return (
    <>
      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><CalendarClock className="text-primary" /> Gerenciamento de Horários</CardTitle>
            <CardDescription>Crie e gerencie os quadros de horários e escalas.</CardDescription>
          </div>
          <Button onClick={handleOpenDialogForAdd}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Criar Horário
          </Button>
        </CardHeader>
        <CardContent>
           {loading ? (
                 <div className="flex items-center justify-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Nome do Horário</TableHead>
                        <TableHead>Carga Semanal</TableHead>
                        <TableHead>Intervalo Automático</TableHead>
                        <TableHead className="text-right w-[100px]">Ações</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                     {!schedules || schedules.length === 0 ? (
                         <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                                Nenhum horário cadastrado para sua empresa.
                            </TableCell>
                        </TableRow>
                    ) : (
                        schedules.map((schedule) => {
                            const totalMinutes = calculateTotalWeeklyMinutes(schedule);
                            const weeklyHoursFormatted = formatMinutesToHours(totalMinutes);
                            const exceedsLimit = totalMinutes > 44 * 60;

                            return (
                                <TableRow key={schedule.id}>
                                    <TableCell className="font-medium">{schedule.name}</TableCell>
                                    <TableCell className={cn("font-medium", exceedsLimit && "text-destructive")}>
                                        {weeklyHoursFormatted}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={schedule.automaticInterval ? "default" : "outline"}>
                                            {schedule.automaticInterval ? "Sim" : "Não"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialogForEdit(schedule)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => handleOpenConfirmDeleteDialog(schedule)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )
                        })
                    )}
                    </TableBody>
                </Table>
            )}
        </CardContent>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
          setIsDialogOpen(isOpen);
          if (!isOpen) setEditingSchedule(null);
      }}>
        <ScheduleForm 
            schedule={editingSchedule}
            onSubmit={handleSubmitSchedule}
        />
      </Dialog>

      <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso removerá permanentemente o horário &quot;{deletingSchedule?.name}&quot;. 
              Funcionários vinculados a este horário poderão ter problemas no cálculo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteScheduleConfirm}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}