"use client";

import { useEffect } from "react";
import { useForm, type SubmitHandler, useFieldArray } from "react-hook-form";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

import type { Schedule } from "@/lib/data";

const workWeekSchema = z.array(z.object({
      dayOfWeek: z.number(),
      name: z.string(),
      isDayOff: z.boolean(),
      entry1: z.string().optional(),
      exit1: z.string().optional(),
      entry2: z.string().optional(),
      exit2: z.string().optional(),
  })).length(7);

const formSchema = z.object({
  name: z.string().min(1, "O nome do horário é obrigatório."),
  automaticInterval: z.boolean().optional(),
  workWeek: workWeekSchema,
});

type FormValues = z.infer<typeof formSchema>;

interface ScheduleFormProps {
  schedule?: Schedule | null;
  onSubmit: (data: Omit<Schedule, 'id'>) => void;
}

const defaultWorkWeek = [
    { dayOfWeek: 1, name: 'Segunda-feira', isDayOff: false, entry1: '09:00', exit1: '12:00', entry2: '13:00', exit2: '18:00' },
    { dayOfWeek: 2, name: 'Terça-feira', isDayOff: false, entry1: '09:00', exit1: '12:00', entry2: '13:00', exit2: '18:00' },
    { dayOfWeek: 3, name: 'Quarta-feira', isDayOff: false, entry1: '09:00', exit1: '12:00', entry2: '13:00', exit2: '18:00' },
    { dayOfWeek: 4, name: 'Quinta-feira', isDayOff: false, entry1: '09:00', exit1: '12:00', entry2: '13:00', exit2: '18:00' },
    { dayOfWeek: 5, name: 'Sexta-feira', isDayOff: false, entry1: '09:00', exit1: '12:00', entry2: '13:00', exit2: '18:00' },
    { dayOfWeek: 6, name: 'Sábado', isDayOff: true, entry1: '', exit1: '', entry2: '', exit2: '' },
    { dayOfWeek: 0, name: 'Domingo', isDayOff: true, entry1: '', exit1: '', entry2: '', exit2: '' },
];

const sortWorkWeek = (workWeek: any[]) => {
    return [...workWeek].sort((a, b) => {
        const dayA = a.dayOfWeek === 0 ? 7 : a.dayOfWeek;
        const dayB = b.dayOfWeek === 0 ? 7 : b.dayOfWeek;
        return dayA - dayB;
    });
}

export function ScheduleForm({ schedule, onSubmit }: ScheduleFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: schedule?.name || '',
      automaticInterval: schedule?.automaticInterval || false,
      workWeek: schedule ? sortWorkWeek(schedule.workWeek) : sortWorkWeek(defaultWorkWeek),
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "workWeek"
  });

  useEffect(() => {
    if (schedule) {
      form.reset({
        name: schedule.name,
        automaticInterval: schedule.automaticInterval || false,
        workWeek: sortWorkWeek(schedule.workWeek)
      });
    } else {
      form.reset({
        name: "",
        automaticInterval: false,
        workWeek: sortWorkWeek(defaultWorkWeek),
      });
    }
  }, [schedule, form]);

  const handleFormSubmit: SubmitHandler<FormValues> = (data) => {
    onSubmit(data);
  };

  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{schedule ? "Editar Horário" : "Criar Horário"}</DialogTitle>
        <DialogDescription>
          {schedule ? "Edite as informações do horário abaixo." : "Preencha os dados para criar um novo horário."}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)}>
           <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nome do Horário</FormLabel>
                        <FormControl>
                        <Input placeholder="Ex: Horário Comercial" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />

                <FormField
                  control={form.control}
                  name="automaticInterval"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Intervalo Automático</FormLabel>
                        <FormDescription>
                          Basta a 1ª e a última batida do dia, o intervalo é inserido via sistema.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
            
            <Separator className="my-6" />

             <div className="space-y-2">
                 <FormLabel>Jornada Semanal</FormLabel>
                 <p className="text-sm text-muted-foreground">
                    Defina os horários para cada dia ou marque como folga.
                 </p>
            </div>
            <div className="space-y-4">
                {fields.map((field, index) => {
                    const isDayOff = form.watch(`workWeek.${index}.isDayOff`);
                    return(
                        <Card key={field.id} className="overflow-hidden">
                             <CardContent className="p-0">
                                <div className="flex flex-col md:flex-row items-center">
                                    <div className="p-4 bg-muted/50 w-full md:w-48 flex items-center justify-between">
                                        <p className="font-medium">{field.name}</p>
                                         <FormField
                                            control={form.control}
                                            name={`workWeek.${index}.isDayOff`}
                                            render={({ field }) => (
                                                <FormItem className="flex items-center space-x-2 space-y-0">
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                    <FormLabel className="font-normal text-sm">Folga</FormLabel>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-2 gap-y-4 p-4 w-full">
                                        <FormField control={form.control} name={`workWeek.${index}.entry1`} render={({ field }) => (<FormItem><FormLabel className="text-xs">Entrada 1</FormLabel><FormControl><Input type="time" {...field} disabled={isDayOff} value={field.value || ''} /></FormControl></FormItem>)} />
                                        <FormField control={form.control} name={`workWeek.${index}.exit1`} render={({ field }) => (<FormItem><FormLabel className="text-xs">Saída 1</FormLabel><FormControl><Input type="time" {...field} disabled={isDayOff} value={field.value || ''} /></FormControl></FormItem>)} />
                                        <FormField control={form.control} name={`workWeek.${index}.entry2`} render={({ field }) => (<FormItem><FormLabel className="text-xs">Entrada 2</FormLabel><FormControl><Input type="time" {...field} disabled={isDayOff} value={field.value || ''} /></FormControl></FormItem>)} />
                                        <FormField control={form.control} name={`workWeek.${index}.exit2`} render={({ field }) => (<FormItem><FormLabel className="text-xs">Saída 2</FormLabel><FormControl><Input type="time" {...field} disabled={isDayOff} value={field.value || ''} /></FormControl></FormItem>)} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
          </div>
          <DialogFooter className="pt-4 border-t">
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
