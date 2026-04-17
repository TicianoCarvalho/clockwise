
"use client";

import { useState, useEffect } from "react";
import { addDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { Download, Calculator, Search, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import type { Company } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";


type AccountingReportData = {
  name: string;
  matricula: string;
  workedHours: string;
  absences: string;
  daytimeOvertime: string;
  nighttimeOvertime: string;
  missingEntries: number;
};

// Mock data
const reportData: AccountingReportData[] = [
  { name: 'Ana Costa', matricula: '1001', workedHours: '176:00', absences: '08:00', daytimeOvertime: '04:30', nighttimeOvertime: '00:00', missingEntries: 1 },
  { name: 'Bruno Gomes', matricula: '1002', workedHours: '168:00', absences: '00:00', daytimeOvertime: '02:00', nighttimeOvertime: '08:00', missingEntries: 0 },
  { name: 'Carla Dias', matricula: '1003', workedHours: '180:00', absences: '00:00', daytimeOvertime: '12:00', nighttimeOvertime: '00:00', missingEntries: 0 },
  { name: 'Daniel Martins', matricula: '1004', workedHours: '172:00', absences: '04:00', daytimeOvertime: '00:00', nighttimeOvertime: '00:00', missingEntries: 3 },
  { name: 'Eduarda Lima', matricula: '1005', workedHours: '160:00', absences: '16:00', daytimeOvertime: '00:00', nighttimeOvertime: '00:00', missingEntries: 2 },
];

export default function AccountingReportPage() {
    const [date, setDate] = useState<DateRange | undefined>({
        from: addDays(new Date(), -30),
        to: new Date(),
    });
    const [companyInfo, setCompanyInfo] = useState<Company | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();


    useEffect(() => {
        const fetchCompanyInfo = async () => {
            try {
                const res = await fetch('/api/v1/companies');
                const data = await res.json();
                if (data && data.length > 0) {
                  setCompanyInfo(data[0]);
                }
            } catch (error) {
                 toast({
                    variant: "destructive",
                    title: "Erro ao carregar dados",
                    description: "Não foi possível buscar as informações da empresa.",
                });
            } finally {
                setLoading(false);
            }
        };
        fetchCompanyInfo();
    }, [toast]);

    const exportToPdf = () => {
        if (!companyInfo) return;
        const doc = new jsPDF();
        const tableBody = reportData.map(d => [
            d.name,
            d.matricula,
            d.workedHours,
            d.absences,
            d.daytimeOvertime,
            d.nighttimeOvertime,
            d.missingEntries.toString(),
        ]);

        const pageWidth = doc.internal.pageSize.getWidth();
        const period = date?.from && date?.to ? `${date.from.toLocaleDateString('pt-BR')} a ${date.to.toLocaleDateString('pt-BR')}` : "Período não selecionado";


        // Title
        doc.setFontSize(16);
        doc.text("Relatório Resumo para Contabilidade", pageWidth / 2, 15, { align: 'center' });
        doc.setFontSize(10);
        doc.text(`Período: ${period}`, pageWidth / 2, 20, { align: 'center' });

        // Employer Info
        doc.setFontSize(12).setFont(undefined, 'bold');
        doc.text("Empregador", 14, 30);
        doc.setFontSize(10).setFont(undefined, 'normal');
        doc.text(`${companyInfo.name}`, 14, 35);
        doc.text(`CNPJ: ${companyInfo.cnpj}`, 14, 40);
        doc.text(`Endereço: ${companyInfo.address}`, 14, 45);

        // Table
        autoTable(doc, {
            head: [['Nome', 'Matrícula', 'H. Trab.', 'Faltas', 'H.E. Diurna', 'H.E. Noturna', 'Reg. Faltantes']],
            body: tableBody,
            startY: 55,
            theme: 'grid',
            headStyles: { fillColor: [37, 99, 235] },
            styles: { fontSize: 8, cellPadding: 1.5 },
        });

        const finalY = (doc as any).lastAutoTable.finalY;

        // Footer
        doc.setFontSize(8);
        doc.text(`Relatório gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, finalY + 10);

        doc.save(`relatorio_contabil_${date?.from?.toLocaleDateString('pt-BR')}-${date?.to?.toLocaleDateString('pt-BR')}.pdf`);
    };

    const handleSearch = () => {
        // Here you would typically filter the `reportData` based on the selected date range.
        // For this mock, we just log to the console.
        console.log("Filtering data for:", date);
    }

    if (loading) {
        return (
             <div className="flex items-center justify-center h-full">
                <Loader2 className="h-16 w-16 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <Card>
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Calculator className="h-6 w-6" />
                        Relatório Resumo para Contabilidade
                    </CardTitle>
                    <CardDescription>
                        Visualize o resumo de horas para fechamento da folha de pagamento.
                    </CardDescription>
                </div>
                <div className="flex items-center gap-2 w-full flex-wrap md:w-auto md:flex-nowrap">
                     <DatePickerWithRange date={date} setDate={setDate} />
                    <Button onClick={handleSearch} className="w-full sm:w-auto"><Search className="mr-2 h-4 w-4"/>Filtrar</Button>
                    <Button onClick={exportToPdf} className="w-full md:w-auto">
                        <Download className="mr-2 h-4 w-4" />
                        Exportar PDF
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Matrícula</TableHead>
                                <TableHead>Horas Trabalhadas</TableHead>
                                <TableHead>Faltas</TableHead>
                                <TableHead>H.E. Diurnas</TableHead>
                                <TableHead>H.E. Noturnas</TableHead>
                                <TableHead className="text-center">Registros Faltantes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reportData.map((data) => (
                                <TableRow key={data.matricula}>
                                    <TableCell className="font-medium">{data.name}</TableCell>
                                    <TableCell>{data.matricula}</TableCell>
                                    <TableCell>{data.workedHours}</TableCell>
                                    <TableCell className="text-destructive">{data.absences}</TableCell>
                                    <TableCell>{data.daytimeOvertime}</TableCell>
                                    <TableCell>{data.nighttimeOvertime}</TableCell>
                                    <TableCell className="text-center font-bold">{data.missingEntries}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
            <CardFooter>
                 <div className="text-sm text-muted-foreground">
                    Exibindo {reportData.length} funcionários.
                </div>
            </CardFooter>
        </Card>
    );
}
