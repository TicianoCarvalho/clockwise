"use client";

import { useParams, useRouter } from "next/navigation";
import { useFirebase, useDocument } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage,
  FormDescription // <--- Isso corrige o ReferenceError
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import type { Company } from "@/lib/data";

const companySchema = z.object({
  name: z.string().min(2, "Nome muito curto"),
  cnpj: z.string().min(14, "CNPJ inválido"),
  plan: z.enum(["soft", "plus", "prime"]),
  paymentDay: z.coerce.number().min(1).max(31),
});

export default function EditCompanyPage() {
  const { id } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { firestore } = useFirebase();
  
  const { data: company, isLoading } = useDocument<Company>(
    firestore ? doc(firestore, "tenants", id as string) : null
  );

  const form = useForm<z.infer<typeof companySchema>>({
    resolver: zodResolver(companySchema),
    values: company ? {
      name: company.name,
      cnpj: company.cnpj,
      plan: company.plan || "soft",
      paymentDay: company.paymentDay || 5,
    } : undefined,
  });

  async function onSubmit(values: z.infer<typeof companySchema>) {
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, "tenants", id as string), values);
      toast({ title: "Sucesso", description: "Configurações atualizadas." });
      router.back();
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Erro de Permissão", 
        description: "Verifique suas permissões no Firestore." 
      });
    }
  }

  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <Button variant="ghost" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
      <Card>
        <CardHeader><CardTitle>Editar Empresa</CardTitle></CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Razão Social</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="plan" render={({ field }) => (
                <FormItem>
                  <FormLabel>Plano</FormLabel>
                  <FormControl>
                    <select {...field} className="w-full p-2 border rounded-md text-sm">
                      <option value="soft">Soft (20 colab.)</option>
                      <option value="plus">Plus (50 colab.)</option>
                      <option value="prime">Prime (100 colab.)</option>
                    </select>
                  </FormControl>
                  <FormDescription>Define o limite de colaboradores do tenant.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : "Salvar Alterações"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}