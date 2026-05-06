"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, AlertCircle, ArrowLeft, Building } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useFirebase } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, writeBatch } from 'firebase/firestore'; // Importado writeBatch para segurança
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

const signupFormSchema = z.object({
  // Company Info
  companyName: z.string().min(2, "O nome da empresa é obrigatório.").optional(),
  cnpj: z.string().min(14, { message: "O CNPJ deve ter 14 dígitos." }).max(18, { message: "Formato de CNPJ inválido."}).optional(),
  address: z.string().min(1, "O endereço é obrigatório.").optional(),
  ie: z.string().optional(),
  cei: z.string().optional(),
  city: z.string().min(2, "A cidade é obrigatória.").optional(),
  state: z.string().min(2, "O estado (UF) é obrigatório.").max(2, "Use a sigla do estado (ex: SP).").optional(),
  plan: z.enum(['soft', 'plus', 'prime']).optional(),
  paymentDay: z.enum(['5', '10', '15', '20', '25', '30']).optional(),

  // Admin Info
  name: z.string().min(2, "O nome do administrador é obrigatório."),
  email: z.string().email("O e-mail do administrador é inválido."),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres."),
});

type SignupFormValues = z.infer<typeof signupFormSchema>;

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { auth, firestore } = useFirebase();

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  async function handleMasterAdminSignup(data: SignupFormValues) {
    if (!auth || !firestore) {
      setError("Serviços de autenticação não estão prontos.");
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const newUser = userCredential.user;

      const userDocRef = doc(firestore, "users", newUser.uid);
      await setDoc(userDocRef, {
        uid: newUser.uid,
        name: data.name || 'Admin Master',
        email: data.email,
        role: "master",
        status: 'Ativo',
      });
      
      toast({
        title: "Conta Master criada com sucesso!",
        description: "Você já pode fazer o login.",
      });
      router.push('/login');

    } catch (err: any) {
      let friendlyMessage = "Não foi possível criar a conta master.";
      if (err.code === 'auth/email-already-in-use') {
        friendlyMessage = "A conta master já existe. Por favor, faça login.";
      }
      setError(friendlyMessage);
    }
  }

  async function onSubmit(data: SignupFormValues) {
    setLoading(true);
    setError(null);

    if (data.email === 'admin@clockwise.com') {
      await handleMasterAdminSignup(data);
      setLoading(false);
      return;
    }
    
    if (!auth || !firestore || !data.cnpj || !data.companyName || !data.address || !data.city || !data.state || !data.plan || !data.paymentDay) {
        setError("Todos os campos da empresa são obrigatórios para um novo cadastro.");
        setLoading(false);
        return;
    }
    
    try {
      // 1. Criar usuário no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const newUser = userCredential.user;
      
      const tenantId = data.cnpj.replace(/\D/g, '');
      if(!tenantId) throw new Error("CNPJ inválido.");

      // 2. Usar um BATCH para garantir que ou salva tudo ou não salva nada
      const batch = writeBatch(firestore);

      // Referências dos documentos
      const tenantDocRef = doc(firestore, "tenants", tenantId);
      const userDocRef = doc(firestore, "users", newUser.uid);
      const employeeDocRef = doc(firestore, "tenants", tenantId, "employees", newUser.uid);

      // A) Grava o Tenant (Empresa)
      batch.set(tenantDocRef, {
            id: tenantId,
            name: data.companyName,
            cnpj: data.cnpj,
            address: data.address,
            ie: data.ie || '',
            cei: data.cei || '',
            city: data.city,
            state: data.state,
            plan: data.plan,
            paymentDay: Number(data.paymentDay),
            status: 'Ativa',
            paymentStatus: 'Em dia',
            createdAt: new Date().toISOString()
      });

      // B) Grava o Perfil de Usuário Global (Sistema)
      batch.set(userDocRef, {
          uid: newUser.uid,
          name: data.name,
          email: data.email,
          role: "admin",
          status: 'Ativo',
          tenantId: tenantId
      });

      // C) NOVIDADE: Grava o Administrador como o Primeiro Colaborador da Empresa
      // Isso resolve o problema de permissão e identifica o José como funcionário administrativo
      batch.set(employeeDocRef, {
          uid: newUser.uid,
          name: data.name,
          email: data.email,
          cpf: "ADMIN-" + tenantId, // Identificador temporário de admin
          role: "Administrador Geral", // Cargo visível no RH
          accessLevel: "admin",        // Nível de acesso que as regras do Firestore vão ler
          status: 'Ativo',
          admissionDate: new Date().toISOString().split('T')[0],
          tenantId: tenantId,
          isFirstAdmin: true
      });

      // Executa todas as gravações de uma vez
      await batch.commit();

      toast({
        title: "Sucesso!",
        description: "Conta e empresa criadas. Agora você é o administrador da empresa.",
      });
      router.push('/login');

    } catch (err: any) {
        let friendlyMessage = err.message || "Não foi possível criar sua conta.";
        if (err.code === 'auth/email-already-in-use') {
            friendlyMessage = "Este e-mail já está em uso.";
        }
        setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-gray-50 p-4">
      <Button asChild variant="ghost" className="absolute left-4 top-4">
        <Link href="/login">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para o Login
        </Link>
      </Button>
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <Building /> ClockWise - Novo Cadastro
            </CardTitle>
          <CardDescription>
            Crie sua conta e configure sua empresa em poucos segundos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              <h3 className="text-lg font-semibold border-b pb-2">Dados de Acesso (Administrador)</h3>
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Nome Completo*</FormLabel><FormControl><Input placeholder="Ex: José da Silva" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>E-mail Corporativo*</FormLabel><FormControl><Input placeholder="jose@empresa.com" type="email" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
               <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem><FormLabel>Senha de Acesso*</FormLabel><FormControl><Input placeholder="Mínimo 6 caracteres" type="password" {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <Separator />

              <h3 className="text-lg font-semibold border-b pb-2">Dados Jurídicos da Empresa</h3>
               <FormField control={form.control} name="companyName" render={({ field }) => (
                <FormItem><FormLabel>Razão Social*</FormLabel><FormControl><Input placeholder="Sua Empresa LTDA" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="cnpj" render={({ field }) => (
                    <FormItem><FormLabel>CNPJ*</FormLabel><FormControl><Input placeholder="00.000.000/0000-00" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                   <FormField control={form.control} name="ie" render={({ field }) => (
                    <FormItem><FormLabel>IE (Opcional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
               </div>
                <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Endereço Sede*</FormLabel>
                        <FormControl><Input placeholder="Rua, Número, Bairro" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <FormField control={form.control} name="city" render={({ field }) => (
                    <FormItem><FormLabel>Cidade*</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                   <FormField control={form.control} name="state" render={({ field }) => (
                    <FormItem><FormLabel>UF*</FormLabel><FormControl><Input placeholder="Ex: CE" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>

              <FormField
                control={form.control}
                name="plan"
                render={({ field }) => (
                  <FormItem className="space-y-3 rounded-lg border p-4 bg-white shadow-sm">
                    <FormLabel className="text-base font-semibold text-primary">Selecione seu Plano</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-1 gap-2">
                        <Label htmlFor="plan-soft" className="flex items-center justify-between p-3 rounded-md border cursor-pointer hover:bg-slate-50">
                          <div className="flex items-center gap-2">
                             <RadioGroupItem value="soft" id="plan-soft" />
                             <span className="font-medium">Soft (Até 20 colab.)</span>
                          </div>
                          <span className="font-bold text-primary">R$ 59,90</span>
                        </Label>
                         <Label htmlFor="plan-plus" className="flex items-center justify-between p-3 rounded-md border cursor-pointer hover:bg-slate-50">
                          <div className="flex items-center gap-2">
                             <RadioGroupItem value="plus" id="plan-plus" />
                             <span className="font-medium">Plus (Até 50 colab.)</span>
                          </div>
                          <span className="font-bold text-primary">R$ 79,90</span>
                        </Label>
                         <Label htmlFor="plan-prime" className="flex items-center justify-between p-3 rounded-md border cursor-pointer hover:bg-slate-50">
                          <div className="flex items-center gap-2">
                             <RadioGroupItem value="prime" id="plan-prime" />
                             <span className="font-medium">Prime (Até 100 colab.)</span>
                          </div>
                          <span className="font-bold text-primary">R$ 99,90</span>
                        </Label>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Erro no Cadastro</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full h-12 text-lg" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Finalizar Cadastro'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}