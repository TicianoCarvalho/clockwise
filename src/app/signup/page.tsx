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
import { doc, setDoc } from 'firebase/firestore';
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
      } else if (err.code === 'auth/weak-password') {
        friendlyMessage = "A senha é muito fraca. Por favor, use uma senha com pelo menos 6 caracteres.";
      }
      setError(friendlyMessage);
    }
  }


  async function onSubmit(data: SignupFormValues) {
    setLoading(true);
    setError(null);

    // Special path for creating the master admin
    if (data.email === 'admin@clockwise.com') {
      await handleMasterAdminSignup(data);
      setLoading(false);
      return;
    }
    
    // Regular company signup
    if (!auth || !firestore || !data.cnpj || !data.companyName || !data.address || !data.city || !data.state || !data.plan || !data.paymentDay) {
        setError("Todos os campos da empresa são obrigatórios para um novo cadastro.");
        setLoading(false);
        return;
    }
    
    try {
      // 1. Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const newUser = userCredential.user;
      
      // 2. Generate a unique ID for the new company (tenant) from its CNPJ
      const tenantId = data.cnpj.replace(/\D/g, '');
      if(!tenantId) {
          throw new Error("CNPJ inválido, não foi possível gerar um ID para a empresa.");
      }

      // 3. Create the tenant document directly in Firestore
      const tenantDocRef = doc(firestore, "tenants", tenantId);
      await setDoc(tenantDocRef, {
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
      });

      // 4. Create the admin's user profile, linking them to the new tenant
      const userDocRef = doc(firestore, "users", newUser.uid);
      await setDoc(userDocRef, {
          uid: newUser.uid,
          name: data.name,
          email: data.email,
          role: "admin",
          status: 'Ativo',
          tenantId: tenantId
      });

      toast({
        title: "Conta e empresa criadas com sucesso!",
        description: "Você será redirecionado para o login.",
      });
      router.push('/login');

    } catch (err: any) {
        let friendlyMessage = err.message || "Não foi possível criar sua conta. Tente novamente.";
        if (err.code === 'auth/email-already-in-use') {
            friendlyMessage = "Este e-mail já está em uso por outra conta.";
        }
         if(err.code === 'auth/invalid-credential') {
             friendlyMessage = "As credenciais fornecidas são inválidas.";
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
            <Building /> Crie sua Conta e Empresa
            </CardTitle>
          <CardDescription>
            Cadastre sua empresa para começar a usar o ClockWise.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              <h3 className="text-lg font-semibold border-b pb-2">Dados do Administrador</h3>
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Seu Nome Completo*</FormLabel><FormControl><Input placeholder="João da Silva" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Seu E-mail de Acesso*</FormLabel><FormControl><Input placeholder="seu@email.com ou admin@clockwise.com" type="email" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
               <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem><FormLabel>Crie uma Senha*</FormLabel><FormControl><Input placeholder="Mínimo 6 caracteres" type="password" {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <Separator />

              <h3 className="text-lg font-semibold border-b pb-2">Dados da Empresa</h3>
              <p className="text-sm text-muted-foreground -mt-4">Preencha apenas se não estiver criando a conta Master.</p>
               <FormField control={form.control} name="companyName" render={({ field }) => (
                <FormItem><FormLabel>Razão Social*</FormLabel><FormControl><Input placeholder="Sua Empresa LTDA" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="cnpj" render={({ field }) => (
                    <FormItem><FormLabel>CNPJ*</FormLabel><FormControl><Input placeholder="00.000.000/0000-00" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                   <FormField control={form.control} name="ie" render={({ field }) => (
                    <FormItem><FormLabel>Inscrição Estadual (IE)</FormLabel><FormControl><Input placeholder="Opcional" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
               </div>
                <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Endereço Completo*</FormLabel>
                        <FormControl>
                            <Input
                                placeholder="Av. Principal, 123, Centro"
                                {...field}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <FormField control={form.control} name="city" render={({ field }) => (
                    <FormItem><FormLabel>Cidade*</FormLabel><FormControl><Input placeholder="Sua cidade" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                   <FormField control={form.control} name="state" render={({ field }) => (
                    <FormItem><FormLabel>Estado (UF)*</FormLabel><FormControl><Input placeholder="SP" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                 <FormField control={form.control} name="cei" render={({ field }) => (
                  <FormItem><FormLabel>CEI</FormLabel><FormControl><Input placeholder="Opcional p/ construtoras, etc." {...field} /></FormControl><FormMessage /></FormItem>
                )} />

              <FormField
                control={form.control}
                name="plan"
                render={({ field }) => (
                  <FormItem className="space-y-3 rounded-lg border p-4">
                    <FormLabel className="text-base font-semibold">Escolha o seu plano*</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Label htmlFor="plan-soft" className="flex flex-col items-start space-y-1 rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                          <RadioGroupItem value="soft" id="plan-soft" className="sr-only" />
                          <span className="font-bold text-lg">Soft</span>
                          <span className="text-2xl font-bold">R$ 59,90<span className="text-sm font-normal">/mês</span></span>
                          <span className="text-sm text-muted-foreground">Até 20 colaboradores</span>
                        </Label>
                         <Label htmlFor="plan-plus" className="flex flex-col items-start space-y-1 rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                          <RadioGroupItem value="plus" id="plan-plus" className="sr-only" />
                          <span className="font-bold text-lg">Plus</span>
                          <span className="text-2xl font-bold">R$ 79,90<span className="text-sm font-normal">/mês</span></span>
                          <span className="text-sm text-muted-foreground">De 21 a 50 colaboradores</span>
                        </Label>
                         <Label htmlFor="plan-prime" className="flex flex-col items-start space-y-1 rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                          <RadioGroupItem value="prime" id="plan-prime" className="sr-only" />
                          <span className="font-bold text-lg">Prime</span>
                          <span className="text-2xl font-bold">R$ 99,90<span className="text-sm font-normal">/mês</span></span>
                          <span className="text-sm text-muted-foreground">De 51 a 100 colaboradores</span>
                        </Label>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentDay"
                render={({ field }) => (
                  <FormItem className="space-y-3 rounded-lg border p-4">
                    <FormLabel className="text-base font-semibold">Escolha o dia de vencimento*</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-3 md:grid-cols-6 gap-4"
                      >
                        {['5', '10', '15', '20', '25', '30'].map((day) => (
                          <FormItem key={day} className="flex items-center justify-center">
                            <FormControl>
                              <RadioGroupItem value={day} id={`day-${day}`} className="sr-only" />
                            </FormControl>
                            <Label
                              htmlFor={`day-${day}`}
                              className="w-full text-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                            >
                              Dia {day}
                            </Label>
                          </FormItem>
                        ))}
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

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Criando conta...' : 'Criar Conta e Assinar'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}
