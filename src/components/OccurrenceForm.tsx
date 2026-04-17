
"use client";

import { useEffect } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, startOfMonth, parseISO } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Textarea } from "@/components/ui/textarea";
import type { Afastamento, Employee } from "@/lib/data";

const afastamentoTypes = ['Férias', 'Licença Maternidade', 'Acidente/Atestado', 'Afastado INSS', 'Licença Médica', 'Outros'] as const;

const formSchema = z.object({
  employeeId: z.string().min(1, "O colaborador é obrigatório."),
  tipo: z.enum(afastamentoTypes, { required_error: "O tipo de afastamento é obrigatório."}),
  dateRange: z.object({
      from: z.date({ required_error: "A data de início é obrigatória."}),
      to: z.date().optional(),
  }),
  description: z.string().optional(),
  status: z.enum(['Ativo', 'Cancelado']).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AfastamentoFormProps {
  afastamento?: Afastamento | null;
  employees: Employee[];
  onSubmit: (data: Omit<Afastamento, 'id'>) => void;
}

export function AfastamentoForm({ afastamento, employees, onSubmit }: AfastamentoFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employeeId: "",
      tipo: undefined,
      dateRange: { from: new Date(), to: new Date() },
      description: "",
      status: 'Ativo',
    },
  });

  useEffect(() => {
    if (afastamento) {
      form.reset({
          ...afastamento,
          tipo: afastamento.tipo,
          dateRange: {
              from: parseISO(afastamento.startDate),
              to: parseISO(afastamento.endDate)
          },
          status: afastamento.status
      });
    } else {
      form.reset({
        employeeId: "",
        tipo: undefined,
        dateRange: { from: startOfMonth(new Date()), to: new Date() },
        description: "",
        status: 'Ativo'
      });
    }
  }, [afastamento, form]);

  const handleFormSubmit: SubmitHandler<FormValues> = (data) => {
    const finalData = {
        employeeId: data.employeeId,
        tipo: data.tipo,
        startDate: format(data.dateRange.from, 'yyyy-MM-dd'),
        endDate: format(data.dateRange.to || data.dateRange.from, 'yyyy-MM-dd'),
        description: data.description || '',
        status: data.status || 'Ativo',
    };
    onSubmit(finalData);
  };

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{afastamento ? "Editar Afastamento" : "Lançar Afastamento"}</DialogTitle>
        <DialogDescription>
          {afastamento ? "Edite as informações do afastamento." : "Preencha os dados para lançar um novo afastamento."}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)}>
            <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Colaborador</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione um colaborador" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {employees.map(emp => <SelectItem key={emp.id} value={emp.matricula}>{emp.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Afastamento</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger></FormControl>
                      <SelectContent>
                         {afastamentoTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Detalhes adicionais sobre o afastamento" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          <DialogFooter className="pt-4 border-t mt-4">
            <DialogClose asChild>
                <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
