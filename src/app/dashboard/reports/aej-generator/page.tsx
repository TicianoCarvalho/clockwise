
"use client";

import { useState, useEffect } from "react";
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


export default function AejGeneratorPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
    const [isFetchingCompany, setIsFetchingCompany] = useState(true);

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
    
    useEffect(() => {
        const fetchCompany = async () => {
            setIsFetchingCompany(true);
            try {
                const res = await fetch('/api/v1/company');
                if (!res.ok) throw new Error("Failed to fetch company info");
                const data = await res.json();
                setCompanyInfo(data);
            } catch (error) {
                toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar os dados da empresa." });
            } finally {
                setIsFetchingCompany(false);
            }
        };
        fetchCompany();
    }, [toast]);


  const pad = (value: string, length: number) => value.padEnd(length, ' ');
  const padNum = (value: string, length: number) => value.padStart(length, '0');

  const generateAejContent = (data: FormValues): string => {
    if (!companyInfo) return "";
    const header = [
        padNum("1", 9),
        pad("1", 1), 
        pad(companyInfo.cnpj.replace(/\D/g, ''), 14),
        pad("", 14), 
        pad(companyInfo.name, 150),
        padNum(format(data.dateRange.from, "ddMMyyyy"), 8),
        padNum(format(data.dateRange.to, "ddMMyyyy"), 8),
        padNum(format(new Date(), "ddMMyyyyHHmmss"), 14),
        pad(data.responsibleEmail, 100),
        pad("ClockWise", 50),
        pad("1.0.0", 30),
        pad("G123456789", 17)
    ].join("");

    // For simplicity, we are only generating the header and trailer with mock data.
    const trailer = [ padNum("9", 9), padNum("0", 9), padNum("0", 9), padNum("0", 9), padNum("0", 9) ].join("");
    return [ header, trailer ].join("\r\n");
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
      await new Promise(resolve => setTimeout(resolve, 500));
      const aejContent = generateAejContent(data);
      if (!aejContent) {
          throw new Error("Informações da empresa não carregadas. Não é possível gerar o arquivo.");
      }
      handleDownload(aejContent);
      toast({ title: "Arquivo AEJ Gerado!", description: "O download do arquivo AEJ.TXT foi iniciado." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao gerar arquivo", description: error.message || "Ocorreu um problema ao gerar o arquivo AEJ." });
    } finally {
      setLoading(false);
    }
  };
    
    if (isFetchingCompany) {
        return (
            <div className="flex items-center justify-center h-96">
               <Loader2 className="h-16 w-16 animate-spin text-muted-foreground" />
           </div>
        )
    }

  return (
    <Card className="max-w-2xl mx-auto">
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
