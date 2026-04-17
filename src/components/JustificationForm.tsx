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
import { Textarea } from "@/components/ui/textarea";
import type { Justification } from "@/lib/data";

const formSchema = z.object({
  name: z.string().min(1, "O nome da justificativa é obrigatório."),
  description: z.string().min(1, "A descrição é obrigatória."),
});

type FormValues = z.infer<typeof formSchema>;

interface JustificationFormProps {
  justification?: Justification | null;
  onSubmit: (data: Omit<Justification, 'id'>) => void;
}

export function JustificationForm({ justification, onSubmit }: JustificationFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  useEffect(() => {
    if (justification) {
      form.reset(justification);
    } else {
      form.reset({
        name: "",
        description: "",
      });
    }
  }, [justification, form]);

  const handleFormSubmit: SubmitHandler<FormValues> = (data) => {
    onSubmit(data);
  };

  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{justification ? "Editar Justificativa" : "Adicionar Justificativa"}</DialogTitle>
        <DialogDescription>
          {justification ? "Edite as informações da justificativa abaixo." : "Preencha os dados para adicionar um novo tipo de justificativa."}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome da Justificativa</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Atestado Médico" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                    <Textarea placeholder="Descreva quando esta justificativa se aplica." {...field} />
                </FormControl>
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
