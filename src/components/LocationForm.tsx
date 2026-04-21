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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Location } from "@/lib/data";
import { Label } from "./ui/label";

// Esquema atualizado com os novos campos fiscais
const formSchema = z.object({
  name: z.string().min(1, "O nome do local é obrigatório."),
  razaoSocial: z.string().min(1, "A Razão Social é obrigatória."),
  cnpj: z.string().min(1, "O CNPJ é obrigatório."),
  inscricaoEstadual: z.string().optional(),
  address: z.string().min(1, "O endereço é obrigatório."),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface LocationFormProps {
  location?: any | null; // Usando any para facilitar a compatibilidade com campos novos
  onSubmit: (data: any) => void;
}

export function LocationForm({ location, onSubmit }: LocationFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      razaoSocial: "",
      cnpj: "",
      inscricaoEstadual: "",
      address: "",
    },
  });
  
  const addressValue = form.watch("address");

  useEffect(() => {
    if (location) {
      form.reset({
        name: location.name || "",
        razaoSocial: location.razaoSocial || "",
        cnpj: location.cnpj || "",
        inscricaoEstadual: location.inscricaoEstadual || "",
        address: location.address || "",
      });
    } else {
      form.reset({
        name: "",
        razaoSocial: "",
        cnpj: "",
        inscricaoEstadual: "",
        address: "",
      });
    }
  }, [location, form]);

  const handleFormSubmit: SubmitHandler<FormValues> = (data) => {
    onSubmit({ ...data, id: location?.id });
  };

  return (
    <DialogContent className="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>{location ? "Editar Unidade" : "Adicionar Unidade"}</DialogTitle>
        <DialogDescription>
          {location ? "Edite as informações fiscais e de localização abaixo." : "Preencha os dados fiscais para adicionar uma nova unidade."}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)}>
          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
            
            {/* NOVO: Razão Social */}
            <FormField
              control={form.control}
              name="razaoSocial"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Razão Social</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome oficial da empresa" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* LINHA COM CNPJ E IE */}
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="cnpj"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>CNPJ</FormLabel>
                    <FormControl>
                        <Input placeholder="00.000.000/0001-00" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="inscricaoEstadual"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Insc. Estadual</FormLabel>
                    <FormControl>
                        <Input placeholder="Isento" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Fantasia / Nome do Local</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Matriz - Centro" {...field} />
                  </FormControl>
                  <FormDescription>Identificação interna do local.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereço Completo</FormLabel>
                   <FormControl>
                      <Textarea placeholder="Av. Exemplo, 123, Bairro, Cidade - Estado, CEP" {...field} rows={2} />
                    </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {addressValue && addressValue.toLowerCase() !== 'remoto' && (
              <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Localização Geográfica</Label>
                  <div className="aspect-video w-full rounded-md overflow-hidden border">
                      <iframe
                          key={addressValue}
                          className="w-full h-full grayscale opacity-70"
                          loading="lazy"
                          allowFullScreen
                          referrerPolicy="no-referrer-when-downgrade"
                          src={`https://maps.google.com/maps?q=${encodeURIComponent(addressValue)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                      ></iframe>
                  </div>
              </div>
            )}
          </div>
          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <Button type="submit">Salvar Unidade</Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}