"use client";

import { useEffect } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Holiday } from "@/lib/data";

const formSchema = z.object({
  name: z.string().min(1, "O nome do feriado é obrigatório."),
  day: z.string({ required_error: "O dia é obrigatório." }),
  month: z.string({ required_error: "O mês é obrigatório." }),
  year: z.string({ required_error: "O ano é obrigatório." }),
  type: z.enum(['Nacional', 'Local', 'Facultativo']),
});

type FormValues = z.infer<typeof formSchema>;

interface HolidayFormProps {
  holiday?: Holiday | null;
  onSubmit: (data: Omit<Holiday, 'id'>) => void;
}

export function HolidayForm({ holiday, onSubmit }: HolidayFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "Local",
    },
  });

  useEffect(() => {
    if (holiday) {
      const [year, month, day] = holiday.date.split('-');
      form.reset({
        ...holiday,
        day: String(parseInt(day, 10)),
        month: String(parseInt(month, 10)),
        year: year,
      });
    } else {
      const today = new Date();
      form.reset({
        name: "",
        day: String(today.getDate()),
        month: String(today.getMonth() + 1),
        year: String(today.getFullYear()),
        type: "Local",
      });
    }
  }, [holiday, form]);

  const handleFormSubmit: SubmitHandler<FormValues> = (data) => {
    const finalData = {
        name: data.name,
        date: `${data.year}-${String(data.month).padStart(2, '0')}-${String(data.day).padStart(2, '0')}`,
        type: data.type
    };
    onSubmit(finalData);
  };

  const years = Array.from({ length: 11 }, (_, i) => String(new Date().getFullYear() - 5 + i));
  const months = [
    { value: "1", label: "Janeiro" }, { value: "2", label: "Fevereiro" },
    { value: "3", label: "Março" }, { value: "4", label: "Abril" },
    { value: "5", label: "Maio" }, { value: "6", label: "Junho" },
    { value: "7", label: "Julho" }, { value: "8", label: "Agosto" },
    { value: "9", label: "Setembro" }, { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" }, { value: "12", label: "Dezembro" },
  ];
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1));

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{holiday ? "Editar Feriado" : "Adicionar Feriado"}</DialogTitle>
        <DialogDescription>
          {holiday ? "Edite as informações do feriado abaixo." : "Preencha os dados para adicionar um novo feriado."}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Feriado</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Aniversário da Cidade" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="day"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dia</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                    <SelectContent position="item-aligned">
                      {days.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="month"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mês</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                    <SelectContent position="item-aligned">
                      {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ano</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                    <SelectContent position="item-aligned">
                      {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Nacional">Nacional</SelectItem>
                    <SelectItem value="Local">Local</SelectItem>
                    <SelectItem value="Facultativo">Facultativo</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter>
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
