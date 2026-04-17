
"use client";

import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { addDays, format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Download, FileArchive, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import type { CompanyInfo } from "@/lib/data";

const formSchema = z.object({
  responsibleEmail: z.string().email("O e-mail do responsável é inválido."),
  dateRange: z.object({
    from: z.date({ required_error: "A data de início é obrigatória." }),
    to: z.date({ required_error: "A data de fim é obrigatória." }),
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface AejGeneratorFormProps {
    companyInfo: CompanyInfo;
}

export function AejGeneratorForm({ companyInfo }: AejGeneratorFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      responsibleEmail: "responsavel@empresa.com",
      dateRange: {
        from: addDays(new Date(), -30),
        to: new Date(),
      },
    },
  });

  const pad = (value: string, length: number) => value.padEnd(length, ' ');
  const padNum = (value: string, length: number) => value.padStart(length, '0');

  // Function to generate the AEJ content based on Portaria 671 layout
  const generateAejContent = (data: FormValues): string => {
    // Registro Tipo 1: Cabeçalho
    const header = [
        padNum("1", 9), // 1 - Tipo de Registro
        pad("1", 1), // 2 - Tipo de Identificador (1: CNPJ)
        pad(companyInfo.cnpj.replace(/\D/g, ''), 14), // 3 - CNPJ do Empregador
        pad("", 14), // 4 - CEI/CNO/CAEPF (Opcional)
        pad(companyInfo.name, 150), // 5 - Razão Social
        padNum(format(data.dateRange.from, "ddMMyyyy"), 8), // 6 - Data Início
        padNum(format(data.dateRange.to, "ddMMyyyy"), 8), // 7 - Data Fim
        padNum(format(new Date(), "ddMMyyyyHHmmss"), 14), // 8 - Data e Hora da Geração
        pad(data.responsibleEmail, 100), // 9 - Email do responsável
        pad("ClockWise", 50), // 10 - Nome do Software
        pad("1.0.0", 30), // 11 - Versão do Software
        pad("G123456789", 17) // 12 - Hash do Arquivo
    ].join("");

    // --- DADOS MOCKADOS - SUBSTITUIR POR DADOS REAIS DO BANCO ---
    
    // Registro Tipo 2: Horário Contratual (Exemplo)
    const employee1Schedule = [
        padNum("2", 9), // 1 - Tipo de Registro
        padNum("1001", 12), // 2 - Código do Horário
        pad("0900", 4), // 3 - Entrada 1
        pad("1200", 4), // 4 - Saída 1
        pad("1300", 4), // 5 - Entrada 2
        pad("1800", 4), // 6 - Saída 2
        pad("0000", 4), // 7 - Entrada 3
        pad("0000", 4), // 8 - Saída 3
        "0800" // 9 - Duração Jornada (HHMM)
    ].join("");
    
    // Registro Tipo 3: Dados do Empregado (Exemplo)
    const employee1Data = [
        padNum("3", 9), // 1 - Tipo de Registro
        pad("11122233344", 11), // 2 - CPF
        pad("Ana Costa", 150), // 3 - Nome
        padNum("1001", 12), // 4 - Código do Horário
        padNum(format(new Date('2023-01-15'), "ddMMyyyy"), 8) // 5 - Data de Admissão
    ].join("");

    // Registro Tipo 5: Marcações (Exemplo para um dia)
    const employee1Markings = [
        padNum("5", 9), // 1 - Tipo de Registro
        padNum(format(data.dateRange.from, "ddMMyyyy"), 8), // 2 - Data da Marcação
        pad("11122233344", 11), // 3 - CPF
        padNum("1", 9), // 4 - Número Sequencial do Registro (NSR)
        pad("0902", 4), // 5 - Horário da Marcação (HHMM)
        pad("I", 1), // 6 - Tipo (I: Incluída)
        pad("123", 30), // 7 - Motivo (Opcional)
        pad("REP-C", 50), // 8 - Modelo do Equipamento
        padNum("12345678901234567", 17) // 9 - Número de série do equipamento
    ].join("");

    // Registro Tipo 9: Trailer
    const trailer = [
      padNum("9", 9), // 1 - Tipo de Registro
      padNum("1", 9), // 2 - Quantidade de registros tipo 2
      padNum("1", 9), // 3 - Quantidade de registros tipo 3
      padNum("0", 9), // 4 - Quantidade de registros tipo 4
      padNum("1", 9)  // 5 - Quantidade de registros tipo 5
    ].join("");
     // --- FIM DOS DADOS MOCKADOS ---

    return [
        header,
        employee1Schedule,
        employee1Data,
        employee1Markings,
        trailer
    ].join("\r\n");
  };

  const handleDownload = (content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'AEJ.TXT';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setLoading(true);
    try {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const aejContent = generateAejContent(data);
      handleDownload(aejContent);

      toast({
        title: "Arquivo AEJ Gerado!",
        description: "O download do arquivo AEJ.TXT foi iniciado.",
      });
    } catch (error) {
      console.error("Error generating AEJ file:", error);
      toast({
        variant: "destructive",
        title: "Erro ao gerar arquivo",
        description: "Ocorreu um problema ao gerar o arquivo AEJ. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <FileArchive className="h-6 w-6" />
            Gerar Arquivo Eletrônico de Jornada (AEJ)
        </CardTitle>
        <CardDescription>
          Selecione o período e informe o e-mail do responsável para gerar o arquivo no formato da Portaria 671.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="dateRange"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Período</FormLabel>
                  <DatePickerWithRange 
                    date={field.value}
                    setDate={(newDate) => field.onChange(newDate as { from: Date; to: Date; })}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="responsibleEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail do Responsável</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="email.responsavel@empresa.com" />
                  </FormControl>
                   <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Gerando Arquivo..." : <> <Download className="mr-2 h-4 w-4" /> Gerar e Baixar AEJ.TXT</>}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
