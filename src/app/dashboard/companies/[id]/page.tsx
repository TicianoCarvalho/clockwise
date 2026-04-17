"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter } from 'next/navigation';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Building, Loader2, BadgeDollarSign, ArrowLeft } from "lucide-react";
import type { Company } from "@/lib/data";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

import { useFirebase, useDoc, useMemoFirebase } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";

const companyFormSchema = z.object({
  name: z.string().min(1, "A razão social é obrigatória."),
  cnpj: z.string().min(1, "O CNPJ é obrigatório."),
  address: z.string().min(1, "O endereço é obrigatório."),
  ie: z.string().optional(),
  cei: z.string().optional(),
  city: z.string().min(1, "A cidade é obrigatória."),
  state: z.string().min(1, "O estado (UF) é obrigatório."),
  plan: z.string().optional(),
});

type CompanyFormValues = z.infer<typeof companyFormSchema>;

export default function EditCompanyPage() {
    const { toast } = useToast();
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    
    const { firestore, user } = useFirebase();
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (user) {
            user.getIdTokenResult().then(token => {
                setUserRole(token.claims.role as string);
            });
        }
    }, [user]);
    
    const companyQuery = useMemoFirebase(() => 
        (firestore && id) ? doc(firestore, 'tenants', id) : null,
    [firestore, id]);
    
    const { data: company, isLoading } = useDoc<Company>(companyQuery);

    const form = useForm<CompanyFormValues>({
        resolver: zodResolver(companyFormSchema),
    });

    useEffect(() => {
        if (company) {
            form.reset(company);
        }
    }, [company, form]);
    
    async function onSubmit(data: CompanyFormValues) {
        if (!firestore || !id) {
            toast({ variant: "destructive", title: "Erro", description: "ID da empresa não encontrado." });
            return;
        }
        setIsSaving(true);
        try {
            const companyRef = doc(firestore, 'tenants', id);
            await updateDoc(companyRef, data);
            toast({
                title: "Empresa atualizada!",
                description: "As informações da empresa foram salvas com sucesso.",
            });
            const backLink = userRole === 'master' ? '/dashboard/companies' : '/dashboard';
            router.push(backLink);
        } catch (error) {
             toast({
                variant: "destructive",
                title: "Erro ao salvar",
                description: "Não foi possível salvar as informações da empresa.",
            });
        } finally {
            setIsSaving(false);
        }
    }
    
    const backLink = userRole === 'master' ? '/dashboard/companies' : '/dashboard';
    const backLinkText = userRole === 'master' ? 'Voltar para o Painel Master' : 'Voltar para o Dashboard';

    return (
        <>
        <Button asChild variant="outline" className="mb-4">
            <Link href={backLink}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {backLinkText}
            </Link>
        </Button>
        <Card>
             <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Building className="h-6 w-6" />
                    Editar Dados da Empresa
                </CardTitle>
                <CardDescription>
                    Gerencie as informações da empresa que aparecerão nos relatórios.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center justify-center h-40">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : !company ? (
                     <div className="flex items-center justify-center h-40">
                        <p>Nenhuma empresa encontrada com este ID.</p>
                    </div>
                ) : (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Razão Social</FormLabel>
                                <FormControl>
                                    <Input placeholder="Nome da sua empresa" {...field} disabled={isSaving}/>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="cnpj" render={({ field }) => (
                                <FormItem><FormLabel>CNPJ</FormLabel><FormControl><Input placeholder="00.000.000/0000-00" {...field} disabled={isSaving}/></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="ie" render={({ field }) => (
                                <FormItem><FormLabel>Inscrição Estadual (IE)</FormLabel><FormControl><Input placeholder="Opcional" {...field} value={field.value ?? ""} disabled={isSaving}/></FormControl><FormMessage /></FormItem>
                            )} />
                         </div>
                        <FormField control={form.control} name="address" render={({ field }) => (
                            <FormItem><FormLabel>Endereço Completo</FormLabel><FormControl><Textarea placeholder="Rua, número, bairro, cidade, estado" className="resize-none" {...field} disabled={isSaving}/></FormControl><FormMessage /></FormItem>
                        )}/>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="city" render={({ field }) => (
                                <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input placeholder="Sua cidade" {...field} disabled={isSaving}/></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="state" render={({ field }) => (
                                <FormItem><FormLabel>Estado (UF)</FormLabel><FormControl><Input placeholder="SP" {...field} disabled={isSaving}/></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                        <FormField control={form.control} name="cei" render={({ field }) => (
                            <FormItem><FormLabel>CEI</FormLabel><FormControl><Input placeholder="Opcional p/ construtoras, etc." {...field} value={field.value ?? ""} disabled={isSaving}/></FormControl><FormMessage /></FormItem>
                        )} />

                        {company?.plan && (
                             <FormItem>
                                <FormLabel>Plano Contratado</FormLabel>
                                <div>
                                    <Badge variant="secondary" className="text-base py-2 px-4 capitalize flex items-center gap-2">
                                        <BadgeDollarSign className="h-5 w-5"/>
                                        {company.plan}
                                    </Badge>
                                </div>
                                <FormDescription>Para alterar seu plano, entre em contato com o suporte.</FormDescription>
                             </FormItem>
                        )}
                        
                        <div className="flex justify-end">
                            <Button type="submit" disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar Alterações
                            </Button>
                        </div>
                    </form>
                </Form>
                )}
            </CardContent>
        </Card>
        </>
    );
}
