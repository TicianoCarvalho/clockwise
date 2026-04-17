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
import type { Company } from "@/lib/data";

const formSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "A razão social é obrigatória."),
  cnpj: z.string().min(1, "O CNPJ é obrigatório."),
  address: z.string().min(1, "O endereço é obrigatório."),
  ie: z.string().optional(),
  cei: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CompanyFormProps {
  company?: Company | null;
  onSubmit: (data: Company) => void;
}

export function CompanyForm({ company, onSubmit }: CompanyFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: '',
      name: "",
      cnpj: "",
      address: "",
      ie: "",
      cei: "",
      city: "",
      state: "",
    },
  });

  useEffect(() => {
    if (company) {
      form.reset(company);
    } else {
      form.reset({
        id: String(Date.now()),
        name: "",
        cnpj: "",
        address: "",
        ie: "",
        cei: "",
        city: "",
        state: "",
      });
    }
  }, [company, form]);

  const handleFormSubmit: SubmitHandler<FormValues> = (data) => {
    onSubmit(data as Company);
  };

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{company ? "Editar Empresa" : "Adicionar Empresa"}</DialogTitle>
        <DialogDescription>
          {company ? "Edite as informações da empresa." : "Preencha os dados para adicionar uma nova empresa."}
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
                  <FormLabel>Razão Social</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome da empresa" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cnpj"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CNPJ</FormLabel>
                    <FormControl>
                      <Input placeholder="00.000.000/0000-00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ie"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inscrição Estadual (IE)</FormLabel>
                    <FormControl>
                      <Input placeholder="Opcional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereço Completo</FormLabel>
                  <FormControl>
                    <Textarea
                        placeholder="Rua, número, bairro, cidade, estado, CEP"
                        className="resize-none"
                        {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input placeholder="Fortaleza" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado (UF)</FormLabel>
                      <FormControl>
                        <Input placeholder="CE" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
             <FormField
                control={form.control}
                name="cei"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEI</FormLabel>
                    <FormControl>
                      <Input placeholder="Opcional p/ construtoras, etc." {...field} />
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
