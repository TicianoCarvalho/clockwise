"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Download, Save, Loader2, MessageSquarePlus, RefreshCw, AlertTriangle } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import type { Employee, Company, ClockPunch, Schedule, Holiday, Afastamento } from '@/lib/data';
import type { DateRange } from 'react-day-picker';
import { format, parse, isValid, eachDayOfInterval, getDay, isWithinInterval, differenceInMinutes, parseISO, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from './ui/textarea';
import { cn } from '@/lib/utils';
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { useAuthContext } from "@/contexts/auth-context";
import { collection, query, where, writeBatch, doc, getDocs } from 'firebase/firestore';

// Component Props
interface TimesheetPanelProps {
    employee: Employee;
    dateRange: DateRange;
    companyInfo: Company;
}

// Data types used in the component
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
    occurrences: string;
    location: string;
    isLate?: boolean;
    isHoliday?: boolean;
    isOccurrence?: boolean;
    isLocationAnomaly1?: boolean;
    actualLatitude1?: number;
    actualLongitude1?: number;
    isLocationAnomaly2?: boolean;
    actualLatitude2?: number;
    actualLongitude2?: number;
    isLocationAnomaly3?: boolean;
    actualLatitude3?: number;
    actualLongitude3?: number;
    isLocationAnomaly4?: boolean;
    actualLatitude4?: number;
    actualLongitude4?: number;
};

type TimesheetSummary = {
    totalWorkedMinutes: number;
    totalBalanceMinutes: number;
    totalPositiveBalanceMinutes: number;
    totalNegativeBalanceMinutes: number;
};

// Helper functions for time conversion
const minutesToTime = (minutes: number): string => {
    if (isNaN(minutes)) return '00:00';
    const sign = minutes < 0 ? '-' : '';
    const h = Math.floor(Math.abs(minutes) / 60).toString().padStart(2, '0');
    const m = (Math.abs(minutes) % 60).toString().padStart(2, '0');
    return `${sign}${h}:${m}`;
};

const timeToMinutes = (time?: string): number => {
    if (!time || !time.includes(':')) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return 0;
    return hours * 60 + minutes;
};

export function TimesheetPanel({ employee, dateRange, companyInfo }: TimesheetPanelProps) {
    const { firestore } = useFirebase();
    const { tenantId, userRole } = useAuthContext();
    const { toast } = useToast();

    // Component State
    const [serverRecords, setServerRecords] = useState<TimesheetRecord[]>([]);
    const [editedRecords, setEditedRecords] = useState<TimesheetRecord[]>([]);
    const [summary, setSummary] = useState<TimesheetSummary | null>(null);
    const [scheduleName, setScheduleName] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);

    // Data Fetching from Firestore
    const schedulesQuery = useMemoFirebase(() => (firestore && userRole) ? collection(firestore, 'schedules') : null, [firestore, userRole]);
    const { data: allSchedules, isLoading: schedulesLoading } = useCollection<Schedule>(schedulesQuery);

    const holidaysQuery = useMemoFirebase(() => (firestore && userRole) ? collection(firestore, 'holidays') : null, [firestore, userRole]);
    const { data: allHolidays, isLoading: holidaysLoading } = useCollection<Holiday>(holidaysQuery);

    const occurrencesQuery = useMemoFirebase(() => tenantId ? collection(firestore, 'tenants', tenantId, 'occurrences') : null, [firestore, tenantId]);
    const { data: allOccurrences, isLoading: occurrencesLoading } = useCollection<Afastamento>(occurrencesQuery);

    const punchesQuery = useMemoFirebase(() => {
        if (!firestore || !tenantId || !dateRange.from || !dateRange.to) return null;
        const start = format(dateRange.from, 'yyyy-MM-dd HH:mm:ss');
        const end = format(endOfDay(dateRange.to), 'yyyy-MM-dd HH:mm:ss');
        
        return query(
            collection(firestore, 'tenants', tenantId, 'punches'),
            where('employeeId', '==', employee.matricula),
            where('timestamp', '>=', start),
            where('timestamp', '<=', end)
        );
    }, [firestore, tenantId, employee.matricula, dateRange.from, dateRange.to]);
    const { data: allPunches, isLoading: punchesLoading } = useCollection<ClockPunch>(punchesQuery);

    const isLoading = schedulesLoading || holidaysLoading || occurrencesLoading || punchesLoading;
    const isDirty = useMemo(() => JSON.stringify(serverRecords) !== JSON.stringify(editedRecords), [serverRecords, editedRecords]);

    // Main calculation logic, runs when data changes
    useEffect(() => {
        if (isLoading || !dateRange.from || !dateRange.to || !allSchedules || !allHolidays || !allOccurrences || allPunches === null) {
            return;
        }

        const schedule = allSchedules.find(s => s.id === employee.scheduleId);
        if (!schedule) {
            setServerRecords([]);
            setEditedRecords([]);
            setSummary({ totalWorkedMinutes: 0, totalBalanceMinutes: 0, totalPositiveBalanceMinutes: 0, totalNegativeBalanceMinutes: 0 });
            setScheduleName('Não encontrado');
            return;
        }
        setScheduleName(schedule.name);
        
        const punchesForEmployee = allPunches || [];
        const occurrencesForEmployee = (allOccurrences || []).filter(o => o.employeeId === employee.matricula && o.status === 'Ativo');

        let totalWorkedMinutes = 0, totalBalanceMinutes = 0, totalPositiveBalanceMinutes = 0, totalNegativeBalanceMinutes = 0;
        const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
        const newRecords: TimesheetRecord[] = [];

        for (const day of days) {
            const dayStr = format(day, 'yyyy-MM-dd');
            const punchesToday = punchesForEmployee.filter(p => p.timestamp.startsWith(dayStr)).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
            const daySchedule = schedule.workWeek.find(d => d.dayOfWeek === getDay(day));

            let occurrencesText = '';
            let isDayOffByOccurrence = false;

            const activeOccurrence = occurrencesForEmployee.find(o => isWithinInterval(day, { start: startOfDay(parseISO(o.startDate)), end: endOfDay(parseISO(o.endDate)) }));
            if (activeOccurrence) {
                occurrencesText = activeOccurrence.tipo;
                isDayOffByOccurrence = true;
            }

            const holiday = allHolidays.find(h => h.date === dayStr);
            if (holiday) {
                occurrencesText = occurrencesText ? `${occurrencesText}, ${holiday.name}` : holiday.name;
            }

            const isWorkDay = daySchedule && !daySchedule.isDayOff && !isDayOffByOccurrence;
            const worksOnScale = !!employee.scaleId;
            const isHolidayForNonScaleWorker = holiday && !worksOnScale;

            let expectedWorkMinutes = 0;
            if (isWorkDay && !isHolidayForNonScaleWorker) {
                const expectedEntry1 = timeToMinutes(daySchedule?.entry1);
                const expectedExit1 = timeToMinutes(daySchedule?.exit1);
                const expectedEntry2 = timeToMinutes(daySchedule?.entry2);
                const expectedExit2 = timeToMinutes(daySchedule?.exit2);
                expectedWorkMinutes = (expectedExit1 - expectedEntry1) + (expectedExit2 - expectedEntry2);
            }

            let workedMinutes = 0;
            const [p1, p2, p3, p4] = punchesToday;
            if (p1 && p2) workedMinutes += differenceInMinutes(parseISO(p2.timestamp), parseISO(p1.timestamp));
            if (p3 && p4) workedMinutes += differenceInMinutes(parseISO(p4.timestamp), parseISO(p3.timestamp));

            if (schedule.automaticInterval && p1 && p2 && !p3 && !p4) {
                const totalDuration = differenceInMinutes(parseISO(p2.timestamp), parseISO(p1.timestamp));
                if (daySchedule && daySchedule.entry2 && daySchedule.exit1) {
                    const intervalDuration = (timeToMinutes(daySchedule.entry2) - timeToMinutes(daySchedule.exit1));
                    if (totalDuration > 6 * 60 && intervalDuration > 0) workedMinutes -= intervalDuration;
                }
            }
            
            const balanceMinutes = (isHolidayForNonScaleWorker && workedMinutes > 0) ? workedMinutes : workedMinutes - expectedWorkMinutes;
            
            totalWorkedMinutes += workedMinutes;
            totalBalanceMinutes += balanceMinutes;
            if (balanceMinutes > 0) totalPositiveBalanceMinutes += balanceMinutes;
            if (balanceMinutes < 0) totalNegativeBalanceMinutes += balanceMinutes;
            
            const isLate = !!(p1 && daySchedule && !daySchedule.isDayOff && timeToMinutes(p1.timestamp.substring(11, 16)) > timeToMinutes(daySchedule.entry1) + 5);

            newRecords.push({
                day: day.getDate(),
                fullDate: dayStr,
                weekday: format(day, 'EEEE', { locale: ptBR }),
                schedule: isWorkDay && daySchedule ? `${daySchedule.entry1}-${daySchedule.exit2}` : 'Folga',
                entry1: p1?.timestamp.substring(11, 16) || '',
                exit1: p2?.timestamp.substring(11, 16) || '',
                entry2: p3?.timestamp.substring(11, 16) || '',
                exit2: p4?.timestamp.substring(11, 16) || '',
                justification1: p1?.justification || '',
                justification2: p2?.justification || '',
                justification3: p3?.justification || '',
                justification4: p4?.justification || '',
                worked: workedMinutes > 0 ? minutesToTime(workedMinutes).substring(1) : '',
                balance: (balanceMinutes !== 0 || workedMinutes > 0) ? minutesToTime(balanceMinutes) : '',
                occurrences: occurrencesText,
                location: p1?.locationName || '',
                isLate,
                isHoliday: !!holiday,
                isOccurrence: !!activeOccurrence,
                isLocationAnomaly1: p1?.isLocationAnomaly, actualLatitude1: p1?.actualLatitude, actualLongitude1: p1?.actualLongitude,
                isLocationAnomaly2: p2?.isLocationAnomaly, actualLatitude2: p2?.actualLatitude, actualLongitude2: p2?.actualLongitude,
                isLocationAnomaly3: p3?.isLocationAnomaly, actualLatitude3: p3?.actualLatitude, actualLongitude3: p3?.actualLongitude,
                isLocationAnomaly4: p4?.isLocationAnomaly, actualLatitude4: p4?.actualLatitude, actualLongitude4: p4?.actualLongitude,
            });
        }
        
        // Only update state if there are no pending changes
        if (!isDirty) {
            setServerRecords(newRecords);
            setEditedRecords(JSON.parse(JSON.stringify(newRecords)));
            setSummary({ totalWorkedMinutes, totalBalanceMinutes, totalPositiveBalanceMinutes, totalNegativeBalanceMinutes });
        }

    }, [isLoading, dateRange, allSchedules, allHolidays, allOccurrences, allPunches, employee, isDirty]);

    const handleInputChange = (fullDate: string, field: keyof TimesheetRecord, value: string) => {
        setEditedRecords(prevRecords =>
            prevRecords.map(rec => {
                if (rec.fullDate === fullDate) {
                    return { ...rec, [field]: value };
                }
                return rec;
            })
        );
    };

    const handleSaveChanges = async () => {
        if (!firestore || !tenantId) return;
        setIsSaving(true);
        const batch = writeBatch(firestore);
        
        try {
            const dirtyRecords = editedRecords.filter((editedRec, index) => 
                JSON.stringify(editedRec) !== JSON.stringify(serverRecords[index])
            );

            if (dirtyRecords.length === 0) {
                toast({ title: "Nenhuma alteração para salvar." });
                setIsSaving(false);
                return;
            }
            
            const processedDates = new Set<string>();

            for (const rec of dirtyRecords) {
                const fullDate = rec.fullDate;
                if (processedDates.has(fullDate)) continue;
                
                const dayStart = `${fullDate} 00:00:00`;
                const dayEnd = `${fullDate} 23:59:59`;
                
                const q = query(
                    collection(firestore, 'tenants', tenantId, 'punches'),
                    where('employeeId', '==', employee.matricula),
                    where('timestamp', '>=', dayStart),
                    where('timestamp', '<=', dayEnd)
                );
                
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach(doc => batch.delete(doc.ref));
                
                const times = { entry1: rec.entry1, exit1: rec.exit1, entry2: rec.entry2, exit2: rec.exit2 };
                const types = { entry1: 'Entrada', exit1: 'SaidaAlmoco', entry2: 'EntradaAlmoco', exit2: 'Saída' };
                const justifications = { entry1: rec.justification1, exit1: rec.justification2, entry2: rec.justification3, exit2: rec.justification4 };
                
                for (const key of ['entry1', 'exit1', 'entry2', 'exit2']) {
                    const time = times[key as keyof typeof times];
                    if (time && time.includes(':')) {
                        const timestamp = parse(`${fullDate} ${time}`, 'yyyy-MM-dd HH:mm', new Date());
                        if (isValid(timestamp)) {
                            const newPunchDoc = doc(collection(firestore, 'tenants', tenantId, 'punches'));
                            batch.set(newPunchDoc, {
                                employeeId: employee.matricula,
                                timestamp: format(timestamp, 'yyyy-MM-dd HH:mm:ss'),
                                type: types[key as keyof typeof types],
                                locationName: rec.location,
                                justification: justifications[key as keyof typeof justifications] || '',
                            });
                        }
                    }
                }
                processedDates.add(fullDate);
            }

            await batch.commit();
            toast({ title: "Alterações Salvas!", description: "A folha de ponto foi atualizada com sucesso." });
            setServerRecords(JSON.parse(JSON.stringify(editedRecords)));
        } catch (error: any) {
            toast({ variant: "destructive", title: "Erro ao Salvar", description: error.message || "Verifique o console para mais detalhes." });
            console.error("Save error:", error);
        } finally {
            setIsSaving(false);
        }
    };
    
    const exportToPdf = () => {
        if (!summary || !dateRange.from || !dateRange.to) return;
        const doc = new jsPDF();
    
        const pageWidth = doc.internal.pageSize.getWidth();
    
        // Header
        doc.setFontSize(16);
        doc.text("Espelho de Ponto Eletrônico", pageWidth / 2, 15, { align: 'center' });
        const period = `${format(dateRange.from, 'dd/MM/yyyy')} a ${format(dateRange.to, 'dd/MM/yyyy')}`;
        doc.setFontSize(10);
        doc.text(`Período: ${period}`, pageWidth / 2, 22, { align: 'center' });
    
        // Employer and Employee Info
        autoTable(doc, {
            startY: 28,
            body: [
                [{ content: `Empregador: ${companyInfo.name}`, styles: { fontStyle: 'bold' } }, { content: `CNPJ: ${companyInfo.cnpj}`, styles: { fontStyle: 'bold' } }],
                [{ content: `Endereço: ${companyInfo.address}` }, ''],
                [{ content: `Colaborador: ${employee.name}`, styles: { fontStyle: 'bold' } }, { content: `Matrícula: ${employee.matricula}`, styles: { fontStyle: 'bold' } }],
                [{ content: `Função: ${employee.role}` }, { content: `Horário: ${scheduleName}` }],
            ],
            theme: 'plain',
            styles: { fontSize: 9, cellPadding: 1 }
        });
    
        // Timesheet table
        const head = [['Data', 'Dia', 'Jornada', 'Ent 1', 'Sai 1', 'Ent 2', 'Sai 2', 'H. Trab', 'Saldo', 'Ocorr.']];
        const body = editedRecords.map(rec => [
            format(parseISO(rec.fullDate + 'T00:00:00'), 'dd/MM/yy'),
            rec.weekday.substring(0, 3),
            rec.schedule,
            rec.entry1,
            rec.exit1,
            rec.entry2,
            rec.exit2,
            rec.worked,
            rec.balance,
            rec.occurrences
        ]);
    
        autoTable(doc, {
            head: head,
            body: body,
            startY: (doc as any).lastAutoTable.finalY + 5,
            theme: 'grid',
            headStyles: { fillColor: [38, 115, 221] },
            styles: { fontSize: 7, cellPadding: 1 },
            columnStyles: { 9: { cellWidth: 30 } }
        });
    
        // Summary
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 5,
            body: [
                [
                    `Horas Trabalhadas: ${minutesToTime(summary.totalWorkedMinutes).replace('-', '')}`,
                    `Horas Extras: ${minutesToTime(summary.totalPositiveBalanceMinutes).replace('-', '')}`,
                    `Horas Negativas: ${minutesToTime(summary.totalNegativeBalanceMinutes).replace('+', '')}`,
                    { content: `Saldo Final: ${minutesToTime(summary.totalBalanceMinutes)}`, styles: { fontStyle: 'bold' } }
                ]
            ],
            theme: 'grid'
        });
    
        // Signature
        const finalY = (doc as any).lastAutoTable.finalY + 20;
        doc.line(pageWidth / 2 - 40, finalY, pageWidth / 2 + 40, finalY);
        doc.text(employee.name, pageWidth / 2, finalY + 5, { align: 'center' });
        doc.text("Assinatura do Colaborador", pageWidth / 2, finalY + 10, { align: 'center' });
    
        doc.save(`espelho_ponto_${employee.name.replace(' ', '_')}.pdf`);
    };
    
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Espelho de Ponto - {employee.name}</CardTitle>
                    <CardDescription>Visualize e gerencie os registros de ponto do colaborador para o período selecionado.</CardDescription>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { setServerRecords([]); setEditedRecords([]); }} disabled={isLoading}><RefreshCw className="mr-2 h-4 w-4" /> Atualizar</Button>
                    <Button variant="outline" onClick={handleSaveChanges} disabled={isSaving || !isDirty}><Save className="mr-2 h-4 w-4" /> {isSaving ? "Salvando..." : "Salvar Alterações"}</Button>
                    <Button onClick={exportToPdf} disabled={!summary}><Download className="mr-2 h-4 w-4" /> Exportar PDF</Button>
                </div>
            </CardHeader>
            <CardContent>
                 {isLoading ? (
                    <div className="flex items-center justify-center h-60">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : !summary || editedRecords.length === 0 ? (
                     <div className="text-center h-60 flex items-center justify-center">
                        <p>Nenhum registro encontrado para este colaborador neste período.</p>
                    </div>
                ) : (
                <div className="border rounded-lg overflow-auto max-h-[60vh]">
                    <Table>
                        <TableHeader className="bg-muted/50 sticky top-0 z-10">
                            <TableRow>
                                <TableHead className="w-[100px]">Data</TableHead>
                                <TableHead>Dia</TableHead>
                                <TableHead>Jornada</TableHead>
                                <TableHead>Local</TableHead>
                                <TableHead>Ent 1</TableHead>
                                <TableHead>Sai 1</TableHead>
                                <TableHead>Ent 2</TableHead>
                                <TableHead>Sai 2</TableHead>
                                <TableHead>H. Trab.</TableHead>
                                <TableHead>Saldo</TableHead>
                                <TableHead>Ocorrências</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {editedRecords.map((rec) => (
                                <TableRow key={rec.fullDate} className={cn((rec.isHoliday || rec.isOccurrence) && 'bg-amber-100 dark:bg-amber-900/20')}>
                                    <TableCell className="font-medium">{format(parseISO(rec.fullDate + 'T00:00:00'), 'dd/MM/yy')}</TableCell>
                                    <TableCell>{rec.weekday}</TableCell>
                                    <TableCell>{rec.schedule}</TableCell>
                                    <TableCell>{rec.location}</TableCell>
                                    <PunchCell record={rec} field="entry1" justificationField="justification1" anomalyField="isLocationAnomaly1" latField="actualLatitude1" lonField="actualLongitude1" handleInputChange={handleInputChange} isSaving={isSaving}/>
                                    <PunchCell record={rec} field="exit1" justificationField="justification2" anomalyField="isLocationAnomaly2" latField="actualLatitude2" lonField="actualLongitude2" handleInputChange={handleInputChange} isSaving={isSaving}/>
                                    <PunchCell record={rec} field="entry2" justificationField="justification3" anomalyField="isLocationAnomaly3" latField="actualLatitude3" lonField="actualLongitude3" handleInputChange={handleInputChange} isSaving={isSaving}/>
                                    <PunchCell record={rec} field="exit2" justificationField="justification4" anomalyField="isLocationAnomaly4" latField="actualLatitude4" lonField="actualLongitude4" handleInputChange={handleInputChange} isSaving={isSaving}/>
                                    <TableCell>{rec.worked.replace('+', '')}</TableCell>
                                    <TableCell className={cn(rec.balance.startsWith('-') ? "text-destructive" : "text-green-600")}>{rec.balance}</TableCell>
                                    <TableCell className="max-w-[200px] truncate">{rec.occurrences}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                )}
            </CardContent>
            {summary && (
            <CardFooter>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm w-full">
                    <div className="p-2 border rounded-md">
                        <p className="text-muted-foreground">T. Horas Trab.</p>
                        <p className="font-bold text-lg">{minutesToTime(summary.totalWorkedMinutes).replace('-', '')}</p>
                    </div>
                     <div className="p-2 border rounded-md">
                        <p className="text-muted-foreground">Horas Extras</p>
                        <p className="font-bold text-lg text-green-600">{minutesToTime(summary.totalPositiveBalanceMinutes).replace('-', '')}</p>
                    </div>
                     <div className="p-2 border rounded-md">
                        <p className="text-muted-foreground">Total Horas Negativas</p>
                        <p className={`font-bold text-lg ${summary.totalNegativeBalanceMinutes < 0 ? 'text-destructive' : ''}`}>{minutesToTime(summary.totalNegativeBalanceMinutes).replace('+', '')}</p>
                    </div>
                     <div className="p-2 border rounded-md">
                        <p className="text-muted-foreground">Saldo Final</p>
                        <p className={`font-bold text-lg ${summary.totalBalanceMinutes < 0 ? 'text-destructive' : 'text-green-600'}`}>{minutesToTime(summary.totalBalanceMinutes)}</p>
                    </div>
                </div>
            </CardFooter>
            )}
        </Card>
    );
}

// Sub-component for individual punch cells - keeping it internal
const PunchCell = ({ 
    record, 
    field, 
    justificationField, 
    anomalyField, 
    latField, 
    lonField,
    handleInputChange,
    isSaving
}: { 
    record: TimesheetRecord; 
    field: 'entry1' | 'exit1' | 'entry2' | 'exit2'; 
    justificationField: 'justification1' | 'justification2' | 'justification3' | 'justification4';
    anomalyField: 'isLocationAnomaly1' | 'isLocationAnomaly2' | 'isLocationAnomaly3' | 'isLocationAnomaly4';
    latField: 'actualLatitude1' | 'actualLatitude2' | 'actualLatitude3' | 'actualLatitude4';
    lonField: 'actualLongitude1' | 'actualLongitude2' | 'actualLongitude3' | 'actualLongitude4';
    handleInputChange: (fullDate: string, field: keyof TimesheetRecord, value: string) => void;
    isSaving: boolean;
}) => {
    const [justification, setJustification] = useState(record[justificationField]);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    
    useEffect(() => {
        setJustification(record[justificationField]);
    }, [record, justificationField]);

    const handleSave = () => {
        handleInputChange(record.fullDate, justificationField, justification);
        setIsPopoverOpen(false);
    };

    const isLate = field === 'entry1' && record.isLate;
    const isAnomaly = record[anomalyField];
    const latitude = record[latField];
    const longitude = record[lonField];

    return (
        <TableCell>
            <div className="flex items-center gap-1">
                <Input
                    type="time"
                    className={cn("h-8 min-w-[70px]", isLate && "text-destructive border-destructive focus-visible:ring-destructive font-bold")}
                    value={record[field] as string}
                    onChange={(e) => handleInputChange(record.fullDate, field, e.target.value)}
                    disabled={isSaving}
                />
                {isAnomaly && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10">
                                    <AlertTriangle className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className='font-bold'>Ponto fora do local de trabalho!</p>
                                <p>Local: {latitude?.toFixed(5)}, {longitude?.toFixed(5)}</p>
                                <a href={`https://www.google.com/maps?q=${latitude},${longitude}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline">Ver no mapa</a>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
                <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                    <PopoverTrigger asChild>
                         <Button variant="ghost" size="icon" className="h-6 w-6" disabled={!record[field] && !record[justificationField]}>
                            <MessageSquarePlus className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-60">
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <h4 className="font-medium leading-none">Justificativa</h4>
                                <p className="text-sm text-muted-foreground">Adicione um motivo para a marcação.</p>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor={justificationField}>Motivo</Label>
                                <Textarea id={justificationField} value={justification} onChange={(e) => setJustification(e.target.value)} />
                                <Button size="sm" onClick={handleSave} className="mt-2">Salvar</Button>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </TableCell>
    )
};

    