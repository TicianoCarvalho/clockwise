
"use client";

import { useState } from 'react';
import { UploadCloud, FileText, Loader2, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { Employee } from '@/lib/data';

interface EmployeeImportDialogProps {
    onImport: (employees: Employee[]) => void;
    onClose: () => void;
}

const expectedHeaders = ['matricula', 'name', 'email', 'cpf', 'celular', 'role', 'setor', 'localTrabalho', 'password', 'scheduleId', 'esocialMatricula', 'admissionDate', 'address'];

export function EmployeeImportDialog({ onImport, onClose }: EmployeeImportDialogProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            const uploadedFile = event.target.files[0];
            if (uploadedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || uploadedFile.type === 'application/vnd.ms-excel') {
                setFile(uploadedFile);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Formato de arquivo inválido',
                    description: 'Por favor, selecione um arquivo Excel (.xlsx ou .xls).',
                });
            }
        }
    };

    const handleDownloadTemplate = () => {
        const worksheet = XLSX.utils.json_to_sheet([
            {
                matricula: '1013',
                name: 'Funcionario Exemplo',
                email: 'exemplo@empresa.com',
                cpf: '123.456.789-00',
                celular: '(11) 98765-4321',
                role: 'Cargo Exemplo',
                setor: 'Setor Exemplo',
                localTrabalho: 'Local Exemplo',
                password: 'senha_segura_123',
                scheduleId: '1',
                esocialMatricula: 'PIS123456789',
                admissionDate: '2024-01-15',
                address: 'Rua Exemplo, 123, Bairro, Cidade'
            }
        ]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Funcionarios');
        XLSX.writeFile(workbook, 'modelo_importacao_funcionarios.xlsx');
    };

    const handleImport = () => {
        if (!file) {
            toast({
                variant: 'destructive',
                title: 'Nenhum arquivo selecionado',
                description: 'Por favor, selecione um arquivo Excel para importar.',
            });
            return;
        }

        setIsLoading(true);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: any[] = XLSX.utils.sheet_to_json(worksheet);

                if (json.length === 0) {
                     toast({ variant: 'destructive', title: 'Arquivo vazio', description: 'O arquivo selecionado não contém dados.' });
                     setIsLoading(false);
                     return;
                }

                const headers = Object.keys(json[0]);
                const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
                if (missingHeaders.length > 0) {
                    toast({ variant: 'destructive', title: 'Cabeçalhos ausentes', description: `O arquivo não contém as colunas necessárias: ${missingHeaders.join(', ')}.` });
                    setIsLoading(false);
                    return;
                }
                
                const employees: Employee[] = json.map(row => ({
                    matricula: String(row.matricula),
                    name: String(row.name),
                    email: String(row.email),
                    cpf: String(row.cpf),
                    celular: String(row.celular),
                    role: String(row.role),
                    setor: String(row.setor),
                    localTrabalho: String(row.localTrabalho),
                    password: String(row.password),
                    scheduleId: String(row.scheduleId),
                    status: 'Ativo',
                    esocialMatricula: row.esocialMatricula ? String(row.esocialMatricula) : undefined,
                    admissionDate: row.admissionDate ? String(row.admissionDate) : undefined,
                    address: row.address ? String(row.address) : undefined,
                }));
                
                onImport(employees);
                onClose();

            } catch (error) {
                 toast({ variant: 'destructive', title: 'Erro ao processar o arquivo', description: 'Ocorreu um erro ao ler o arquivo. Verifique se o formato está correto.' });
            } finally {
                setIsLoading(false);
            }
        };
        reader.onerror = () => {
             toast({ variant: 'destructive', title: 'Erro de leitura', description: 'Não foi possível ler o arquivo selecionado.' });
             setIsLoading(false);
        }
        reader.readAsBinaryString(file);
    };

    return (
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Importar Funcionários em Massa</DialogTitle>
                <DialogDescription>
                    Faça o upload de um arquivo Excel (.xlsx) para adicionar múltiplos funcionários de uma vez.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label>1. Baixar modelo</Label>
                    <p className="text-sm text-muted-foreground">
                        Use nosso modelo para garantir que seus dados estejam no formato correto.
                    </p>
                    <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                        <Download className="mr-2 h-4 w-4" />
                        Baixar Modelo
                    </Button>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="file-upload">2. Fazer upload do arquivo</Label>
                    <div className="flex items-center gap-4">
                        <Label
                            htmlFor="file-upload"
                            className="flex-1 cursor-pointer rounded-md border-2 border-dashed border-input p-10 text-center text-muted-foreground hover:border-primary"
                        >
                            {file ? (
                                <div className="flex items-center justify-center gap-2 font-medium text-foreground">
                                    <FileText className="h-5 w-5" />
                                    <span>{file.name}</span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <UploadCloud className="h-8 w-8" />
                                    <span>Clique ou arraste o arquivo Excel</span>
                                </div>
                            )}
                        </Label>
                         <Input
                            id="file-upload"
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </div>
                </div>
            </div>
            <DialogFooter>
                 <DialogClose asChild>
                    <Button type="button" variant="outline">Cancelar</Button>
                </DialogClose>
                <Button onClick={handleImport} disabled={!file || isLoading}>
                    {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {isLoading ? 'Importando...' : 'Importar'}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}
