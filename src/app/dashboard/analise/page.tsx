
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DateRange } from 'react-day-picker';
import { startOfMonth, endOfMonth, format, eachMonthOfInterval, startOfDay, endOfDay, getDay, parseISO, differenceInMinutes, isWithinInterval, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import { Loader2, PieChart as PieChartIcon, BarChart2, Download } from 'lucide-react';
import type { Sector, Employee, ClockPunch, Schedule, Holiday, Afastamento } from '@/lib/data';

const METRIC_OPTIONS = [
    { id: 'faltas', label: 'Faltas' },
    { id: 'atrasos', label: 'Atrasos' },
    { id: 'saidasAntecipadas', label: 'Saídas Antecipadas' },
    { id: 'afastamentos', label: 'Afastamentos' },
    { id: 'atestados', label: 'Atestados' },
];

const SECTOR_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const total = payload.reduce((sum: number, item: any) => sum + item.value, 0);
        return (
            <div className="bg-background border p-2 rounded-md shadow-lg">
                <p className="font-bold">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <p key={`item-${index}`} style={{ color: entry.color }}>
                        {`${entry.name}: ${entry.value.toFixed(2)}h`}
                    </p>
                ))}
                <p className="font-bold mt-1">Total: {total.toFixed(2)}h</p>
            </div>
        );
    }
    return null;
};

const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-background border p-2 rounded-md shadow-lg">
                <p className="font-bold">{`${data.name}: ${data.value.toFixed(2)}h (${((data.percent || 0) * 100).toFixed(0)}%)`}</p>
            </div>
        );
    }
    return null;
};


export default function BiAnalysisPage() {
    const [date, setDate] = useState<DateRange | undefined>({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [selectedSector, setSelectedSector] = useState('all');
    const [selectedMetrics, setSelectedMetrics] = useState(METRIC_OPTIONS.reduce((acc, m) => ({ ...acc, [m.id]: true }), {}));
    const [loading, setLoading] = useState(false);
    const [barChartData, setBarChartData] = useState<any[]>([]);
    const [pieChartData, setPieChartData] = useState<any[]>([]);
    const [sectorKeys, setSectorKeys] = useState<string[]>([]);
    const { toast } = useToast();
    const reportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchSectorsData = async () => {
            try {
                const res = await fetch('/api/v1/sectors');
                if (!res.ok) throw new Error('Failed to fetch sectors');
                const sectorsData = await res.json();
                setSectors(sectorsData);
                setSectorKeys(sectorsData.map(s => s.name));
            } catch (error) {
                toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar os setores." });
            }
        };
        fetchSectorsData();
    }, [toast]);
    
    const handleGenerateAnalysis = useCallback(async () => {
        if (!date?.from || !date?.to) {
            toast({ variant: "destructive", title: "Erro", description: "Por favor, selecione um período." });
            return;
        }

        setLoading(true);

        try {
            const [
                employeesRes, 
                punchesRes, 
                schedulesRes, 
                holidaysRes, 
                afastamentosRes
            ] = await Promise.all([
                fetch('/api/v1/employees'),
                fetch('/api/v1/punches/all'),
                fetch('/api/v1/schedules'),
                fetch('/api/v1/holidays'),
                fetch('/api/v1/occurrences'),
            ]);

            if (!employeesRes.ok || !punchesRes.ok || !schedulesRes.ok || !holidaysRes.ok || !afastamentosRes.ok) {
                throw new Error('Falha ao carregar os dados para análise.');
            }

            const [allEmployees, allPunches, allSchedules, allHolidays, allAfastamentos] : [Employee[], ClockPunch[], Schedule[], Holiday[], Afastamento[]] = await Promise.all([
                employeesRes.json(),
                punchesRes.json(),
                schedulesRes.json(),
                holidaysRes.json(),
                afastamentosRes.json(),
            ]);
            
            const filteredEmployees = selectedSector === 'all'
                ? allEmployees
                : allEmployees.filter(e => e.setor === selectedSector);
            
            const intervalMonths = eachMonthOfInterval({ start: date.from, end: date.to });
            const monthlyData: { [key: string]: { [key: string]: { negativeHours: number; overtimeHours: number } } } = {};
            const sectorOvertime: { [key: string]: number } = {};
            sectors.forEach(s => sectorOvertime[s.name] = 0);

            intervalMonths.forEach(month => {
                const monthKey = format(month, 'MMM/yy', { locale: ptBR });
                monthlyData[monthKey] = {};
                sectors.forEach(s => {
                    monthlyData[monthKey][s.name] = { negativeHours: 0, overtimeHours: 0 };
                });
            });

            for (const employee of filteredEmployees) {
                const schedule = allSchedules.find(s => s.id === employee.scheduleId);
                if (!schedule || !employee.setor) continue;
                
                const punchesForEmployee = allPunches.filter(p => p.employeeId === employee.matricula && isWithinInterval(parseISO(p.timestamp), { start: startOfDay(date.from!), end: endOfDay(date.to!) }));
                const afastamentosForEmployee = allAfastamentos.filter(a => a.employeeId === employee.matricula && a.status === 'Ativo');

                const intervalDays = eachDayOfInterval({start: date.from, end: date.to});

                for(const day of intervalDays) {
                    const monthKey = format(day, 'MMM/yy', { locale: ptBR });
                    const dayOfWeek = getDay(day);
                    const daySchedule = schedule.workWeek.find(d => d.dayOfWeek === dayOfWeek);
                    const dayStr = format(day, 'yyyy-MM-dd');
                    
                    const isHoliday = allHolidays.some(h => h.date === dayStr);
                    const isAfastamento = afastamentosForEmployee.some(a => isWithinInterval(day, { start: startOfDay(parseISO(a.startDate)), end: endOfDay(parseISO(a.endDate)) }));

                    if (!daySchedule || daySchedule.isDayOff || isHoliday || isAfastamento) continue;

                    const timeToMinutes = (time?: string): number => time ? parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]) : 0;
                    
                    let expectedMinutes = (timeToMinutes(daySchedule.exit1) - timeToMinutes(daySchedule.entry1)) + (timeToMinutes(daySchedule.exit2) - timeToMinutes(daySchedule.entry2));
                    
                    const punchesToday = punchesForEmployee.filter(p => p.timestamp.startsWith(dayStr));
                    
                    let workedMinutes = 0;
                    if (punchesToday.length >= 2) {
                        const firstPunch = parseISO(punchesToday[0].timestamp);
                        const lastPunch = parseISO(punchesToday[punchesToday.length - 1].timestamp);
                        const totalDuration = differenceInMinutes(lastPunch, firstPunch);
                        
                        // Simple interval deduction for 2 punches
                        if (punchesToday.length < 4 && totalDuration > 6 * 60) {
                             workedMinutes = totalDuration - 60;
                        } else if (punchesToday.length >= 4) {
                             workedMinutes = (differenceInMinutes(parseISO(punchesToday[1].timestamp), firstPunch)) + (differenceInMinutes(lastPunch, parseISO(punchesToday[2].timestamp)));
                        } else {
                            workedMinutes = totalDuration;
                        }
                    }
                    
                    const balance = workedMinutes - expectedMinutes;

                    if (balance < 0) {
                       monthlyData[monthKey][employee.setor].negativeHours += Math.abs(balance) / 60;
                    } else {
                       sectorOvertime[employee.setor] += balance / 60;
                    }
                }
            }
            
            const finalBarData = Object.keys(monthlyData).map(month => {
                const entry: { [key: string]: any } = { month };
                sectors.forEach(sector => {
                    entry[sector.name] = monthlyData[month][sector.name]?.negativeHours || 0;
                });
                return entry;
            });
            
            const totalOvertime = Object.values(sectorOvertime).reduce((sum, v) => sum + v, 0);
            const finalPieData = Object.keys(sectorOvertime).map(sector => ({
                name: sector,
                value: sectorOvertime[sector],
                percent: totalOvertime > 0 ? (sectorOvertime[sector] / totalOvertime) : 0
            }));
            
            setBarChartData(finalBarData);
            setPieChartData(finalPieData.filter(d => d.value > 0));

        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro", description: "Falha ao gerar análise." });
        } finally {
            setLoading(false);
        }
    }, [date, selectedSector, sectors, toast]);

    const handleExportPDF = async () => {
        if (!reportRef.current) return;
        setLoading(true);
        try {
          const canvas = await html2canvas(reportRef.current, {
            scale: 3, // Higher resolution
            backgroundColor: '#ffffff',
            useCORS: true,
            logging: false,
            windowWidth: reportRef.current.scrollWidth,
            windowHeight: reportRef.current.scrollHeight
          });
    
          const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
          
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          const margin = 10;
          
          const headerHeight = 22;
          const footerHeight = 10;
          
          const availableWidth = pdfWidth - (margin * 2);
          const availableHeight = pdfHeight - headerHeight - footerHeight;
          
          const canvasAspectRatio = canvas.width / canvas.height;
          
          let imgWidth = availableWidth;
          let imgHeight = imgWidth / canvasAspectRatio;
    
          // If the image is taller than the available space, scale it down to fit
          if (imgHeight > availableHeight) {
            imgHeight = availableHeight;
            imgWidth = imgHeight * canvasAspectRatio;
          }
          
          const xOffset = (pdfWidth - imgWidth) / 2;
          const yOffset = headerHeight;
          const imgData = canvas.toDataURL('image/png');
    
          // Header
          pdf.setFontSize(16);
          pdf.text('Análise de Produtividade', pdfWidth / 2, 12, { align: 'center' });
          pdf.setFontSize(10);
          const period = date?.from && date?.to ? `${format(date.from, 'dd/MM/yyyy')} a ${format(date.to, 'dd/MM/yyyy')}` : 'Período não definido';
          pdf.text(`Período: ${period}`, pdfWidth / 2, 18, { align: 'center' });
    
          // Image
          pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight);
    
          // Footer
          pdf.setFontSize(8);
          pdf.text('Gerado por ClockWise BI', pdfWidth / 2, pdfHeight - 5, { align: 'center' });
    
          pdf.save(`analise_produtividade_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        } catch (error) {
          console.error('Erro ao gerar PDF:', error);
          toast({ variant: 'destructive', title: 'Erro ao Exportar', description: 'Não foi possível gerar o PDF.' });
        } finally {
          setLoading(false);
        }
      };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full p-6">
            {/* Filters */}
            <Card className="w-full lg:w-1/3 lg:max-w-sm">
                <CardHeader>
                    <CardTitle>Filtros de Análise</CardTitle>
                    <CardDescription>Selecione os parâmetros para sua análise.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Período</Label>
                        <DatePickerWithRange date={date} setDate={setDate} />
                    </div>
                    <div className="space-y-2">
                        <Label>Setor</Label>
                        <Select value={selectedSector} onValueChange={setSelectedSector}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione um setor" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os Setores</SelectItem>
                                {sectors.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Métricas (Horas Negativas)</Label>
                        <div className="space-y-2 rounded-md border p-4">
                            {METRIC_OPTIONS.map(metric => (
                                <div key={metric.id} className="flex items-center space-x-2">
                                    <Checkbox id={metric.id} checked={selectedMetrics[metric.id as keyof typeof selectedMetrics]} onCheckedChange={(checked) => setSelectedMetrics(prev => ({ ...prev, [metric.id]: checked }))} />
                                    <Label htmlFor={metric.id} className="font-normal">{metric.label}</Label>
                                </div>
                            ))}
                        </div>
                    </div>
                    <Button onClick={handleGenerateAnalysis} disabled={loading} className="w-full">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Gerar Análise
                    </Button>
                </CardContent>
            </Card>

            {/* Visualization */}
            <div className="flex-1 flex flex-col gap-6">
                 <div ref={reportRef} className='flex-1 gap-6 bg-card p-6 rounded-lg shadow-lg' style={{ minHeight: '650px' }}>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <Card className="h-[450px]">
                            <CardHeader>
                                <CardTitle className='flex items-center gap-2'><BarChart2/> Horas Negativas por Mês e Setor</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={350}>
                                    {loading ? <div className="h-full flex items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-muted-foreground" /></div> : barChartData.length === 0 ? <div className="h-full flex items-center justify-center"><p>Nenhum dado para exibir.</p></div> :
                                    <BarChart data={barChartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="month" />
                                        <YAxis label={{ value: 'Horas', angle: -90, position: 'insideLeft' }}/>
                                        <Tooltip content={<CustomBarTooltip />} />
                                        <Legend />
                                        {sectorKeys.map((key, index) => (
                                            <Bar key={key} dataKey={key} stackId="a" fill={SECTOR_COLORS[index % SECTOR_COLORS.length]} />
                                        ))}
                                    </BarChart>}
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                        <Card className="h-[450px]">
                            <CardHeader>
                                <CardTitle className='flex items-center gap-2'><PieChartIcon/> Horas Extras por Setor</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={350}>
                                    {loading ? <div className="h-full flex items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-muted-foreground" /></div> : pieChartData.length === 0 ? <div className="h-full flex items-center justify-center"><p>Nenhuma hora extra no período.</p></div> :
                                    <PieChart>
                                        <Pie data={pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
                                            {pieChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={SECTOR_COLORS[index % SECTOR_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomPieTooltip />} />
                                        <Legend />
                                    </PieChart>}
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                 </div>
                 <div className="flex justify-end pt-6 border-t">
                    <Button onClick={handleExportPDF} size="lg" className="gap-2" disabled={loading || barChartData.length === 0}>
                        <Download/> {loading ? 'Gerando...' : 'Exportar PDF'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

