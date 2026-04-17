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
import type { Role } from "@/lib/data";

const formSchema = z.object({
  name: z.string().min(1, "O nome do cargo é obrigatório."),
  description: z.string().min(1, "A descrição é obrigatória."),
});

type FormValues = z.infer<typeof formSchema>;

interface RoleFormProps {
  role?: Role | null;
  onSubmit: (data: Omit<Role, 'id'>) => void;
}

export function RoleForm({ role, onSubmit }: RoleFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  useEffect(() => {
    if (role) {
      form.reset(role);
    } else {
      form.reset({
        name: "",
        description: "",
      });
    }
  }, [role, form]);

  const handleFormSubmit: SubmitHandler<FormValues> = (data) => {
    onSubmit(data);
  };

  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{role ? "Editar Cargo" : "Adicionar Cargo"}</DialogTitle>
        <DialogDescription>
          {role ? "Edite as informações do cargo abaixo." : "Preencha os dados para adicionar um novo cargo."}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Cargo</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Desenvolvedor(a) Frontend" {...field} />
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
                    <Textarea placeholder="Descreva as responsabilidades do cargo." {...field} />
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
