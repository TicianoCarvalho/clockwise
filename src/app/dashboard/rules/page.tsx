
"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Gavel, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

// This type would come from lib/data
export interface Rules {
  showCalculationsInReport: boolean;
  nightShiftStart: string;
  nightShiftEnd: string;
  overtime: {
    weekday: { firstHours: string; percentage: number; };
    saturday: { firstHours: string; percentage: number; };
    holidayAndDayOff: { percentage: number; };
  };
  additionalBreak: { enabled: boolean; duration: string; };
  tardinessTolerance: { rule: "tenMinutesDaily" | "none"; };
}

const rulesFormSchema = z.object({
  showCalculationsInReport: z.boolean(),
  nightShiftStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:mm inválido."),
  nightShiftEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:mm inválido."),
  overtime: z.object({
    weekday: z.object({
      firstHours: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:mm inválido."),
      percentage: z.coerce.number().min(0, "Deve ser positivo."),
    }),
    saturday: z.object({
      firstHours: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:mm inválido."),
      percentage: z.coerce.number().min(0, "Deve ser positivo."),
    }),
    holidayAndDayOff: z.object({
      percentage: z.coerce.number().min(0, "Deve ser positivo."),
    }),
  }),
  additionalBreak: z.object({
    enabled: z.boolean(),
    duration: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:mm inválido."),
  }),
  tardinessTolerance: z.object({
    rule: z.enum(["tenMinutesDaily", "none"]),
  }),
});

type RulesFormValues = z.infer<typeof rulesFormSchema>;

const defaultRules: RulesFormValues = {
  showCalculationsInReport: true,
  nightShiftStart: "22:00",
  nightShiftEnd: "05:00",
  overtime: {
    weekday: { firstHours: "02:00", percentage: 50 },
    saturday: { firstHours: "02:00", percentage: 50 },
    holidayAndDayOff: { percentage: 100 },
  },
  additionalBreak: { enabled: false, duration: "00:15" },
  tardinessTolerance: { rule: "tenMinutesDaily" },
};

export default function RulesPage() {
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const form = useForm<RulesFormValues>({
    resolver: zodResolver(rulesFormSchema),
    defaultValues: defaultRules,
  });

  useEffect(() => {
    const fetchRules = async () => {
        try {
            const res = await fetch('/api/v1/rules');
            if (!res.ok) throw new Error('Falha ao buscar as regras.');
            const data = await res.json();
            form.reset(data);
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro ao carregar regras",
                description: "Usando valores padrão.",
            });
        } finally {
            setLoading(false);
        }
    };
    fetchRules();
  }, [form, toast]);

  async function onSubmit(data: RulesFormValues) {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Falha ao salvar as regras.');
      toast({
        title: "Regras atualizadas!",
        description: "As regras de cálculo foram salvas com sucesso.",
      });
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "Não foi possível salvar as regras de cálculo.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Gavel className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold">Regras de Cálculo</h1>
          <p className="text-muted-foreground">
            Defina as regras para o cálculo de horas, extras e tolerâncias do espelho de ponto.
          </p>
        </div>
      </div>
      <Separator />

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-16 w-16 animate-spin text-muted-foreground" />
        </div>
      ) : (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Horas Extras e Adicional Noturno</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-8">
                <FormField
                  control={form.control}
                  name="nightShiftStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Início do Adicional Noturno</FormLabel>
                      <FormControl><Input type="time" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nightShiftEnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fim do Adicional Noturno</FormLabel>
                      <FormControl><Input type="time" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Separator />
              <p className="font-medium">Regras de Horas Extras</p>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="p-4 border rounded-lg space-y-4">
                    <p className="font-semibold">Segunda a Sexta</p>
                     <FormField
                      control={form.control}
                      name="overtime.weekday.firstHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primeiras</FormLabel>
                          <FormControl><Input type="time" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="overtime.weekday.percentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Acréscimo (%)</FormLabel>
                          <FormControl><Input type="number" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
                 <div className="p-4 border rounded-lg space-y-4">
                    <p className="font-semibold">Sábados</p>
                     <FormField
                      control={form.control}
                      name="overtime.saturday.firstHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primeiras</FormLabel>
                          <FormControl><Input type="time" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="overtime.saturday.percentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Acréscimo (%)</FormLabel>
                          <FormControl><Input type="number" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
                 <div className="p-4 border rounded-lg space-y-4">
                    <p className="font-semibold">Domingos, Folgas e Feriados</p>
                    <FormField
                      control={form.control}
                      name="overtime.holidayAndDayOff.percentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Acréscimo (%)</FormLabel>
                          <FormControl><Input type="number" {...field} /></FormControl>
                           <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Intervalos e Relatórios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="additionalBreak.enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Habilitar intervalo de lanche</FormLabel>
                        <FormDescription>Adiciona um segundo intervalo de ponto no dia.</FormDescription>
                      </div>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )}
                />
                 {form.watch("additionalBreak.enabled") && (
                  <FormField
                    control={form.control}
                    name="additionalBreak.duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duração do Lanche</FormLabel>
                        <FormControl><Input type="time" {...field} /></FormControl>
                         <FormMessage />
                      </FormItem>
                    )}
                  />
                 )}
                 <Separator />
                <FormField
                  control={form.control}
                  name="showCalculationsInReport"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Mostrar cálculos no relatório</FormLabel>
                        <FormDescription>Exibe/oculta o resumo de horas no PDF.</FormDescription>
                      </div>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Regra de Tolerância de Atraso</CardTitle>
                <CardDescription>Baseado no Art. 58 da CLT.</CardDescription>
              </CardHeader>
              <CardContent>
                 <FormField
                  control={form.control}
                  name="tardinessTolerance.rule"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl><RadioGroupItem value="tenMinutesDaily" /></FormControl>
                            <FormLabel className="font-normal">
                              Tolerância diária de 10 minutos para atrasos.
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl><RadioGroupItem value="none" /></FormControl>
                            <FormLabel className="font-normal">
                              Sem tolerância. Calcular todas as variações.
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Regras
            </Button>
          </div>
        </form>
      </Form>
      )}
    </div>
  );
}

    