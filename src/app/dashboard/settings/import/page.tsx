
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UploadCloud, FileText, Loader2, AlertTriangle, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { Employee } from '@/lib/data';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ImportSummary {
    read: number;
    associated: number;
    failed: number;
    errors: string[];
}

const customLayoutSchema = z.object({
  matricula_start: z.coerce.number().min(1, "Posição inicial deve ser maior que 0."),
  matricula_length: z.coerce.number().min(1, "Comprimento deve ser maior que 0."),
  data_start: z.coerce.number().min(1, "Posição inicial deve ser maior que 0."),
  data_length: z.coerce.number().min(1, "Comprimento deve ser maior que 0."),
  data_format: z.enum(['DDMMYYYY', 'YYYYMMDD', 'MMDDYYYY']),
  hora_start: z.coerce.number().min(1, "Posição inicial deve ser maior que 0."),
  hora_length: z.coerce.number().min(1, "Comprimento deve ser maior que 0."),
  hora_format: z.enum(['HHMM', 'HHMMSS']),
});

type CustomLayoutFormValues = z.infer<typeof customLayoutSchema>;

export default function ImportacaoAfdPage() {
    const [file, setFile] = useState<File | null>(null);
    const [customFile, setCustomFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [summary, setSummary] = useState<ImportSummary | null>(null);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const { toast } = useToast();

    const form = useForm<CustomLayoutFormValues>({
        resolver: zodResolver(customLayoutSchema),
        defaultValues: {
            matricula_start: 23,
            matricula_length: 12,
            data_start: 11,
            data_length: 8,
            data_format: 'DDMMYYYY',
            hora_start: 19,
            hora_length: 4,
            hora_format: 'HHMM',
        }
    });

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const res = await fetch('/api/v1/employees');
                if (!res.ok) throw new Error("Falha ao buscar colaboradores");
                const data = await res.json();
                setEmployees(data);
            } catch (error) {
                 toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar a lista de colaboradores para associação." });
            }
        };
        fetchEmployees();
    }, [toast]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setFile(event.target.files[0]);
            setSummary(null);
        }
    };
    
    const handleCustomFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setCustomFile(event.target.files[0]);
            setSummary(null);
        }
    };

    const processAndPostRecords = async (recordsToPost: any[], lineCount: number, associatedCount: number, importErrors: string[]) => {
        if (recordsToPost.length > 0) {
            try {
                const res = await fetch('/api/v1/clock-events', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        cmd: 'send log',
                        sn: `AFD_IMPORT_${Date.now()}`,
                        record: recordsToPost,
                    }),
                });

                if (!res.ok) {
                    throw new Error("Falha ao enviar marcações para a API.");
                }
                toast({ title: "Importação Concluída!", description: `${associatedCount} marcações foram processadas.` });

            } catch (apiError: any) {
                toast({ variant: 'destructive', title: 'Erro na API', description: apiError.message });
                importErrors.push("Erro geral ao comunicar com o servidor.");
            }
        }

        setSummary({
            read: lineCount,
            associated: associatedCount,
            failed: importErrors.length,
            errors: importErrors,
        });
        setIsLoading(false);
    };

    const handleImportAFD = () => {
        if (!file) {
            toast({ variant: 'destructive', title: 'Nenhum arquivo selecionado' });
            return;
        }

        setIsLoading(true);
        setSummary(null);
        const reader = new FileReader();

        reader.onload = async (e) => {
            const content = e.target?.result as string;
            const lines = content.split(/\r\n|\n/);
            const recordsToPost = [];
            const importErrors: string[] = [];
            let associatedCount = 0;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line.length < 34) continue;

                const recordType = line.substring(9, 10);
                if (recordType === '2' || recordType === '3') {
                    const dateStr = line.substring(10, 18);
                    const timeStr = line.substring(18, 22);
                    const pisCpf = line.substring(22, 34).trim();

                    const day = dateStr.substring(0, 2);
                    const month = dateStr.substring(2, 4);
                    const year = dateStr.substring(4, 8);
                    const hour = timeStr.substring(0, 2);
                    const minute = timeStr.substring(2, 4);

                    const timestamp = `${year}-${month}-${day} ${hour}:${minute}:00`;
                    const employee = employees.find(emp => emp.cpf.replace(/\D/g, '') === pisCpf);

                    if (employee) {
                        recordsToPost.push({ enrollid: employee.matricula, time: timestamp });
                        associatedCount++;
                    } else {
                        importErrors.push(`Linha ${i + 1}: Colaborador com CPF/PIS ${pisCpf} não encontrado.`);
                    }
                }
            }
            await processAndPostRecords(recordsToPost, lines.length, associatedCount, importErrors);
            setFile(null);
        };
        reader.readAsText(file);
    };

    const handleImportCustom = (layout: CustomLayoutFormValues) => {
        if (!customFile) {
            toast({ variant: 'destructive', title: 'Nenhum arquivo selecionado' });
            return;
        }

        setIsLoading(true);
        setSummary(null);
        const reader = new FileReader();

        reader.onload = async (e) => {
            const content = e.target?.result as string;
            const lines = content.split(/\r\n|\n/);
            const recordsToPost = [];
            const importErrors: string[] = [];
            let associatedCount = 0;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line.trim() === '') continue;

                try {
                    const matricula = line.substring(layout.matricula_start - 1, layout.matricula_start - 1 + layout.matricula_length).trim();
                    const dateStrRaw = line.substring(layout.data_start - 1, layout.data_start - 1 + layout.data_length);
                    const timeStrRaw = line.substring(layout.hora_start - 1, layout.hora_start - 1 + layout.hora_length);

                    if (!matricula || !dateStrRaw || !timeStrRaw) {
                        importErrors.push(`Linha ${i + 1}: Dados insuficientes para o layout definido.`);
                        continue;
                    }
                    
                    let day: string, month: string, year: string;
                    switch (layout.data_format) {
                        case 'YYYYMMDD': year = dateStrRaw.substring(0, 4); month = dateStrRaw.substring(4, 6); day = dateStrRaw.substring(6, 8); break;
                        case 'MMDDYYYY': month = dateStrRaw.substring(0, 2); day = dateStrRaw.substring(2, 4); year = dateStrRaw.substring(4, 8); break;
                        default: day = dateStrRaw.substring(0, 2); month = dateStrRaw.substring(2, 4); year = dateStrRaw.substring(4, 8); break;
                    }

                    let hour: string, minute: string, second = '00';
                    switch (layout.hora_format) {
                        case 'HHMMSS': hour = timeStrRaw.substring(0, 2); minute = timeStrRaw.substring(2, 4); second = timeStrRaw.substring(4, 6); break;
                        default: hour = timeStrRaw.substring(0, 2); minute = timeStrRaw.substring(2, 4); break;
                    }

                    const timestamp = `${year}-${month}-${day} ${hour}:${minute}:${second}`;
                    const employee = employees.find(emp => String(emp.matricula) === matricula || emp.cpf.replace(/\D/g, '') === matricula);

                    if (employee) {
                        recordsToPost.push({ enrollid: employee.matricula, time: timestamp });
                        associatedCount++;
                    } else {
                        importErrors.push(`Linha ${i + 1}: Colaborador com ID ${matricula} não encontrado.`);
                    }
                } catch (parseError: any) {
                    importErrors.push(`Linha ${i + 1}: Erro ao processar. Verifique o layout. (${parseError.message})`);
                }
            }
            await processAndPostRecords(recordsToPost, lines.length, associatedCount, importErrors);
            setCustomFile(null);
        };
        reader.readAsText(customFile);
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <UploadCloud className="h-6 w-6" />
                    Importação de Arquivo de Ponto (AFD)
                </CardTitle>
                <CardDescription>
                    Importe marcações de ponto a partir de arquivos AFD (Portaria 671) ou de equipamentos com layout customizado.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="portaria-671">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="portaria-671">Portaria 671 (REP-C)</TabsTrigger>
                        <TabsTrigger value="custom-layout">Layout Customizado</TabsTrigger>
                    </TabsList>
                    <TabsContent value="portaria-671">
                        <Card>
                            <CardHeader>
                                <CardTitle>Importar AFD (Portaria 671)</CardTitle>
                                <CardDescription>Faça o upload de um arquivo .txt no formato padrão da Portaria 671.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="file-upload-afd">Arquivo AFD (.txt)</Label>
                                    <div className="flex items-center gap-4">
                                        <Label htmlFor="file-upload-afd" className="flex-1 cursor-pointer rounded-md border-2 border-dashed border-input p-10 text-center text-muted-foreground hover:border-primary">
                                            {file ? <div className="flex items-center justify-center gap-2 font-medium text-foreground"><FileText className="h-5 w-5" /><span>{file.name}</span></div> : <div className="flex flex-col items-center gap-2"><UploadCloud className="h-8 w-8" /><span>Clique ou arraste o arquivo</span></div>}
                                        </Label>
                                        <Input id="file-upload-afd" type="file" accept=".txt" onChange={handleFileChange} className="hidden" />
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <Button onClick={handleImportAFD} disabled={!file || isLoading}>
                                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {isLoading ? 'Importando...' : 'Importar Arquivo AFD'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="custom-layout">
                         <Card>
                            <CardHeader>
                                <CardTitle className='flex items-center gap-2'><Settings/>Importar com Layout Customizado</CardTitle>
                                <CardDescription>Defina as posições e comprimentos das colunas do seu arquivo de ponto.</CardDescription>
                            </CardHeader>
                             <CardContent className="space-y-6">
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(handleImportCustom)} className="space-y-6 border p-4 rounded-md">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <FormField control={form.control} name="matricula_start" render={({ field }) => (<FormItem><FormLabel>Matrícula Início</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name="matricula_length" render={({ field }) => (<FormItem><FormLabel>Matrícula Tam.</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name="data_start" render={({ field }) => (<FormItem><FormLabel>Data Início</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name="data_length" render={({ field }) => (<FormItem><FormLabel>Data Tam.</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name="data_format" render={({ field }) => (<FormItem><FormLabel>Formato Data</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="DDMMYYYY">DDMMYYYY</SelectItem><SelectItem value="YYYYMMDD">YYYYMMDD</SelectItem><SelectItem value="MMDDYYYY">MMDDYYYY</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name="hora_start" render={({ field }) => (<FormItem><FormLabel>Hora Início</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name="hora_length" render={({ field }) => (<FormItem><FormLabel>Hora Tam.</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name="hora_format" render={({ field }) => (<FormItem><FormLabel>Formato Hora</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="HHMM">HHMM</SelectItem><SelectItem value="HHMMSS">HHMMSS</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                                        </div>
                                         <div className="space-y-2">
                                            <Label htmlFor="file-upload-custom">Arquivo de Texto (.txt)</Label>
                                            <div className="flex items-center gap-4">
                                                <Label htmlFor="file-upload-custom" className="flex-1 cursor-pointer rounded-md border-2 border-dashed border-input p-10 text-center text-muted-foreground hover:border-primary">
                                                    {customFile ? <div className="flex items-center justify-center gap-2 font-medium text-foreground"><FileText className="h-5 w-5" /><span>{customFile.name}</span></div> : <div className="flex flex-col items-center gap-2"><UploadCloud className="h-8 w-8" /><span>Clique ou arraste o arquivo</span></div>}
                                                </Label>
                                                <Input id="file-upload-custom" type="file" accept=".txt" onChange={handleCustomFileChange} className="hidden" />
                                            </div>
                                        </div>
                                        <div className="flex justify-end">
                                            <Button type="submit" disabled={!customFile || isLoading}>
                                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                {isLoading ? 'Importando...' : 'Importar com Layout'}
                                            </Button>
                                        </div>
                                    </form>
                                </Form>
                             </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
                {summary && (
                     <Alert className="mt-6">
                        <AlertTitle>Resumo da Importação</AlertTitle>
                        <AlertDescription>
                            <p>Linhas lidas: {summary.read}</p>
                            <p>Marcações associadas: {summary.associated}</p>
                            <p className="text-destructive">Marcações com erro: {summary.failed}</p>
                            {summary.errors.length > 0 && (
                                <div className='mt-2'>
                                    <p className='font-bold'>Detalhes dos erros:</p>
                                    <ul className='text-xs list-disc pl-5 max-h-20 overflow-y-auto'>
                                        {summary.errors.slice(0, 10).map((err, i) => <li key={i}>{err}</li>)}
                                         {summary.errors.length > 10 && <li>... e mais {summary.errors.length - 10} erros.</li>}
                                    </ul>
                                </div>
                            )}
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}

    