"use client";

import { useState } from "react";
import { addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { Loader2, Wand2, AlertTriangle } from "lucide-react";
import { remark } from 'remark';
import html from 'remark-html';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { useToast } from "@/hooks/use-toast";
import { generateProductivityReport } from "@/ai/flows/generate-productivity-report";
import type { Employee, Schedule, ClockPunch } from "@/lib/data";
import { ScrollArea } from "./ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

export function ProductivityReportView() {
    const [date, setDate] = useState<DateRange | undefined>({
        from: addDays(new Date(), -30),
        to: new Date(),
    });
    const [loading, setLoading] = useState(false);
    const [reportHtml, setReportHtml] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    const handleGenerateReport = async () => {
        if (!date || !date.from || !date.to) {
            toast({
                variant: "destructive",
                title: "Período Inválido",
                description: "Por favor, selecione uma data de início e fim.",
            });
            return;
        }

        setLoading(true);
        setReportHtml(null);
        setError(null);

        try {
            const [empRes, schRes, punRes] = await Promise.all([
                fetch('/api/v1/employees'),
                fetch('/api/v1/schedules'),
                fetch('/api/v1/punches/all')
            ]);

            if (!empRes.ok || !schRes.ok || !punRes.ok) {
                throw new Error('Falha ao buscar dados para o relatório.');
            }

            const employees: Employee[] = await empRes.json();
            const schedules: Schedule[] = await schRes.json();
            const allPunches: ClockPunch[] = await punRes.json();
            
            const punches = allPunches.filter(p => {
                const pDate = new Date(p.timestamp.replace(' ', 'T'));
                return pDate >= date.from! && pDate <= date.to!;
            });

            const period = `${format(date.from, "dd/MM/yyyy", { locale: ptBR })} a ${format(date.to, "dd/MM/yyyy", { locale: ptBR })}`;

            const result = await generateProductivityReport({
                employees: JSON.stringify(employees.map(({ name, setor, scheduleId }) => ({ name, setor, scheduleId }))),
                schedules: JSON.stringify(schedules),
                punches: JSON.stringify(punches),
                period,
            });

            if (!result.report) {
                throw new Error("A IA não conseguiu gerar o relatório.");
            }
            
            const processedHtml = await remark().use(html).process(result.report);
            setReportHtml(processedHtml.toString());

        } catch (err: any) {
            console.error("Error generating productivity report:", err);
            setError(err.message || "Ocorreu um erro desconhecido ao gerar o relatório.");
            toast({
                variant: "destructive",
                title: "Erro na Geração",
                description: err.message,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Relatório de Perda de Produtividade</CardTitle>
                <CardDescription>
                    Selecione um período para a IA analisar as faltas, atrasos e saídas antecipadas, e calcular o impacto na produtividade por setor.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row items-end gap-4">
                    <div className="flex-1 w-full">
                        <label className="text-sm font-medium">Período de Análise</label>
                        <DatePickerWithRange date={date} setDate={setDate} />
                    </div>
                    <Button onClick={handleGenerateReport} disabled={loading} className="w-full sm:w-auto">
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                        {loading ? "Analisando..." : "Gerar Relatório"}
                    </Button>
                </div>
                {error && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Erro</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                {reportHtml && (
                    <div className="pt-4">
                        <h3 className="text-lg font-semibold mb-2">Resultado da Análise</h3>
                        <ScrollArea className="h-[50vh] rounded-md border bg-muted/50">
                            <div className="prose dark:prose-invert max-w-none p-6" dangerouslySetInnerHTML={{ __html: reportHtml }} />
                        </ScrollArea>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
