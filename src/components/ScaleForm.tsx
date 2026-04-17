
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
import type { Scale } from "@/lib/data";

const formSchema = z.object({
  name: z.string().min(1, "O nome da escala é obrigatório."),
  type: z.enum(['12x36', '5x1', '6x1'], {
    required_error: "O tipo de escala é obrigatório.",
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface ScaleFormProps {
  scale?: Scale | null;
  onSubmit: (data: Omit<Scale, "id">) => void;
}

export function ScaleForm({ scale, onSubmit }: ScaleFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "12x36",
    },
  });

  useEffect(() => {
    if (scale) {
      form.reset(scale);
    } else {
      form.reset({
        name: "",
        type: "12x36",
      });
    }
  }, [scale, form]);

  const handleFormSubmit: SubmitHandler<FormValues> = (data) => {
    onSubmit(data);
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{scale ? "Editar Escala" : "Adicionar Escala"}</DialogTitle>
        <DialogDescription>
          {scale ? "Edite as informações da escala." : "Preencha os dados para criar uma nova escala de revezamento."}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 py-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome da Escala</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: 12x36 Diurna" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Escala</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo de revezamento" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="12x36">12 x 36</SelectItem>
                        <SelectItem value="5x1">5 x 1</SelectItem>
                        <SelectItem value="6x1">6 x 1</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
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
