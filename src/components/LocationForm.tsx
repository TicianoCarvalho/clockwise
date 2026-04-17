
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

const formSchema = z.object({
  name: z.string().min(1, "O nome da filial/local é obrigatório."),
  address: z.string().min(1, "O endereço é obrigatório."),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface LocationFormProps {
  location?: Location | null;
  onSubmit: (data: Location) => void;
}

export function LocationForm({ location, onSubmit }: LocationFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      address: "",
    },
  });
  
  const addressValue = form.watch("address");

  useEffect(() => {
    if (location) {
      form.reset(location);
    } else {
      form.reset({
        name: "",
        address: "",
      });
    }
  }, [location, form]);

  const handleFormSubmit: SubmitHandler<FormValues> = (data) => {
    onSubmit({ ...data, id: location?.id } as Location);
  };

  return (
    <DialogContent className="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>{location ? "Editar Filial/Local" : "Adicionar Filial/Local"}</DialogTitle>
        <DialogDescription>
          {location ? "Edite as informações da filial/local abaixo." : "Preencha os dados para adicionar uma nova filial/local de trabalho."}
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
                  <FormLabel>Nome da Filial/Local</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Matriz - São Paulo" {...field} />
                  </FormControl>
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
                      <Textarea placeholder="Av. Exemplo, 123, Bairro, Cidade - Estado, CEP" {...field} rows={3} />
                    </FormControl>
                   <FormDescription>
                    O mapa será gerado a partir do endereço fornecido.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {addressValue && addressValue.toLowerCase() !== 'remoto' && (
              <div className="space-y-2">
                  <Label>Pré-visualização do Mapa</Label>
                  <div className="aspect-video w-full rounded-md overflow-hidden border">
                      <iframe
                          key={addressValue}
                          className="w-full h-full"
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
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
