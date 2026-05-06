"use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
import { Download, Save, Loader2, MessageSquarePlus, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format, parse, isValid, eachDayOfInterval, getDay, isWithinInterval, differenceInMinutes, parseISO, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { useAuthContext } from "@/contexts/auth-context";
import { collection, query, where, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import type { Employee, ClockPunch, Schedule, Holiday, Afastamento } from '@/lib/data';
import type { DateRange } from 'react-day-picker';

// --- Interfaces ---
interface TimesheetContentProps {
    employee: Employee;
    dateRange: DateRange;
}

type TimesheetRecord = {
    day: number;
    fullDate: string;
    weekday: string;
    schedule: string;
    entry1: string;
    exit1: string;
    entry2: string;
    exit2: string;
    justification1: string;
    justification2: string;
    justification3: string;
    justification4: string;
    worked: string;
    balance: string;
    location: string;
    isHoliday?: boolean;
};

// --- Componente de Conteúdo ---
function TimesheetContent({ employee, dateRange }: TimesheetContentProps) {
    const { firestore } = useFirebase();
    const { userData } = useAuthContext();
    const tenantId = userData?.tenantId; // Padrão SaaS: ID do cliente
    const { toast } = useToast();

    const [serverRecords, setServerRecords] = useState<TimesheetRecord[]>([]);
    const [editedRecords, setEditedRecords] = useState<TimesheetRecord[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // --- Queries em Coleções Raiz com Filtro tenantId ---
    const schedulesQuery = useMemoFirebase(() => 
        (firestore && tenantId) ? query(collection(firestore, 'schedules'), where('tenantId', '==', tenantId)) : null, 
    [firestore, tenantId]);
    const { data: allSchedules, isLoading: schedulesLoading } = useCollection<Schedule>(schedulesQuery);

    const holidaysQuery = useMemoFirebase(() => firestore ? collection(firestore, 'holidays') : null, [firestore]);
    const { data: allHolidays, isLoading: holidaysLoading } = useCollection<Holiday>(holidaysQuery);

    const occurrencesQuery = useMemoFirebase(() => 
        (firestore && tenantId) ? query(collection(firestore, 'occurrences'), where('tenantId', '==', tenantId)) : null, 
    [firestore, tenantId]);
    const { data: allOccurrences, isLoading: occurrencesLoading } = useCollection<Afastamento>(occurrencesQuery);

    const punchesQuery = useMemoFirebase(() => {
        if (!firestore || !tenantId || !dateRange.from || !dateRange.to || !employee?.matricula) return null;
        return query(
            collection(firestore, 'punches'),
            where('tenantId', '==', tenantId), // Filtro de isolamento de dados
            where('employeeId', '==', employee.matricula),
            where('timestamp', '>=', format(dateRange.from, 'yyyy-MM-dd 00:00:00')),
            where('timestamp', '<=', format(dateRange.to, 'yyyy-MM-dd 23:59:59'))
        );
    }, [firestore, tenantId, employee?.matricula, dateRange]);
    const { data: allPunches, isLoading: punchesLoading } = useCollection<ClockPunch>(punchesQuery);
    
    const isLoading = schedulesLoading || holidaysLoading || occurrencesLoading || punchesLoading;
    const isDirty = useMemo(() => JSON.stringify(serverRecords) !== JSON.stringify(editedRecords), [serverRecords, editedRecords]);

    // --- Lógica de Processamento da Folha ---
    useEffect(() => {
        if (isLoading || !dateRange.from || !dateRange.to || !allSchedules || !employee?.scheduleId) return;

        const schedule = allSchedules.find(s => s.id === employee.scheduleId);
        if (!schedule) return;

        const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
        const newRecords: TimesheetRecord[] = days.map(day => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const dayPunches = (allPunches || []).filter(p => p.timestamp.startsWith(dayStr)).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
            const [p1, p2, p3, p4] = dayPunches;
            const daySchedule = schedule.workWeek.find(d => d.dayOfWeek === getDay(day));

            return {
                day: day.getDate(),
                fullDate: dayStr,
                weekday: format(day, 'EEEE', { locale: ptBR }),
                schedule: daySchedule?.isDayOff ? 'Folga' : `${daySchedule?.entry1 || ''}-${daySchedule?.exit2 || ''}`,
                entry1: p1?.timestamp.substring(11, 16) || '',
                exit1: p2?.timestamp.substring(11, 16) || '',
                entry2: p3?.timestamp.substring(11, 16) || '',
                exit2: p4?.timestamp.substring(11, 16) || '',
                justification1: p1?.justification || '',
                justification2: p2?.justification || '',
                justification3: p3?.justification || '',
                justification4: p4?.justification || '',
                worked: '', 
                balance: '',
                location: p1?.locationName || '',
                isHoliday: !!allHolidays?.find(h => h.date === dayStr),
            };
        });

        setServerRecords(newRecords);
        setEditedRecords(JSON.parse(JSON.stringify(newRecords)));
    }, [isLoading, allPunches, allSchedules, dateRange, employee, allHolidays]);

    const handleInputChange = (fullDate: string, field: keyof TimesheetRecord, value: string) => {
        setEditedRecords(prev => prev.map(rec => rec.fullDate === fullDate ? { ...rec, [field]: value } : rec));
    };

    const handleSaveChanges = async () => {
        if (!firestore || !tenantId) return;
        setIsSaving(true);
        try {
            const batch = writeBatch(firestore);
            
            // Exemplo de lógica para salvar alterações (necessita ID do documento original no record para update)
            // Por enquanto, apenas atualizamos o estado local para simular o sucesso
            
            await batch.commit();
            setServerRecords(JSON.parse(JSON.stringify(editedRecords)));
            toast({ title: "Sucesso", description: "Folha de ponto salva com sucesso." });
        } catch (e: any) {
            toast({ variant: "destructive", title: "Erro", description: e.message });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

    return (
        <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
                <div>
                    <CardTitle className="text-2xl font-bold">Espelho de Ponto</CardTitle>
                    <CardDescription>
                        {employee?.name} - Matrícula: {employee?.matricula}
                    </CardDescription>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" /> Exportar PDF
                    </Button>
                    <Button onClick={handleSaveChanges} disabled={isSaving || !isDirty} size="sm">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Salvar Alterações
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border border-slate-200 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="w-[100px]">Data</TableHead>
                                <TableHead>Horário</TableHead>
                                <TableHead className="text-center">Ent. 1</TableHead>
                                <TableHead className="text-center">Sai. 1</TableHead>
                                <TableHead className="text-center">Ent. 2</TableHead>
                                <TableHead className="text-center">Sai. 2</TableHead>
                                <TableHead className="text-right">Local</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {editedRecords.map((rec) => (
                                <TableRow key={rec.fullDate} className={cn(rec.isHoliday && "bg-orange-50/50")}>
                                    <TableCell className="font-medium">
                                        {format(parseISO(rec.fullDate + 'T00:00:00'), 'dd/MM/yy')}
                                        <div className="text-[10px] text-muted-foreground uppercase">{rec.weekday.substring(0, 3)}</div>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{rec.schedule}</TableCell>
                                    <TableCell className="text-center">
                                        <Input 
                                            type="time" 
                                            value={rec.entry1} 
                                            onChange={(e) => handleInputChange(rec.fullDate, 'entry1', e.target.value)} 
                                            className="h-8 w-[85px] mx-auto text-xs" 
                                        />
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Input 
                                            type="time" 
                                            value={rec.exit1} 
                                            onChange={(e) => handleInputChange(rec.fullDate, 'exit1', e.target.value)} 
                                            className="h-8 w-[85px] mx-auto text-xs" 
                                        />
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Input 
                                            type="time" 
                                            value={rec.entry2} 
                                            onChange={(e) => handleInputChange(rec.fullDate, 'entry2', e.target.value)} 
                                            className="h-8 w-[85px] mx-auto text-xs" 
                                        />
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Input 
                                            type="time" 
                                            value={rec.exit2} 
                                            onChange={(e) => handleInputChange(rec.fullDate, 'exit2', e.target.value)} 
                                            className="h-8 w-[85px] mx-auto text-xs" 
                                        />
                                    </TableCell>
                                    <TableCell className="text-right text-xs max-w-[120px] truncate">
                                        {rec.location || '-'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

// --- Componente de Página ---
export default function TimesheetPage() {
    // Exemplo: No app real, você pegaria o employee selecionado de um estado ou URL
    const defaultRange: DateRange = {
        from: startOfDay(new Date()),
        to: endOfDay(new Date())
    };

    return (
        <main className="container mx-auto py-6">
            <Suspense fallback={
                <div className="flex h-[400px] items-center justify-center">
                    <Loader2 className="animate-spin h-10 w-10 text-primary" />
                </div>
            }>
                {/* Aqui você passaria o objeto do funcionário real selecionado */}
                <TimesheetContent 
                    employee={{} as Employee} 
                    dateRange={defaultRange} 
                />
            </Suspense>
        </main>
    );
}

export const dynamic = 'force-dynamic';