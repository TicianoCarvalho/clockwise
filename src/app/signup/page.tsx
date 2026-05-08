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

import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  Building
} from 'lucide-react';

import {
  Alert,
  AlertDescription,
  AlertTitle
} from '@/components/ui/alert';

import { useFirebase } from '@/firebase';

import {
  createUserWithEmailAndPassword
} from 'firebase/auth';

import {
  doc,
  setDoc,
  writeBatch
} from 'firebase/firestore';

import {
  RadioGroup,
  RadioGroupItem
} from '@/components/ui/radio-group';

import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

const signupFormSchema = z.object({

  // EMPRESA
  companyName: z.string()
    .min(2, "O nome da empresa é obrigatório."),

  cnpj: z.string()
    .min(14, "O CNPJ deve ter 14 dígitos.")
    .max(18, "Formato de CNPJ inválido."),

  address: z.string()
    .min(1, "O endereço é obrigatório."),

  ie: z.string().optional(),

  cei: z.string().optional(),

  city: z.string()
    .min(2, "A cidade é obrigatória."),

  state: z.string()
    .min(2, "UF obrigatória.")
    .max(2, "Use a sigla do estado."),

  plan: z.enum(['soft', 'plus', 'prime'], {
    required_error: 'Selecione um plano.'
  }),

  paymentDay: z.enum(
    ['5', '10', '15', '20', '25', '30'],
    {
      required_error: 'Selecione o dia de pagamento.'
    }
  ),

  // ADMIN
  name: z.string()
    .min(2, "O nome do administrador é obrigatório."),

  email: z.string()
    .email("E-mail inválido."),

  password: z.string()
    .min(6, "Senha mínima de 6 caracteres."),
});

type SignupFormValues = z.infer<typeof signupFormSchema>;

export default function SignupPage() {

  const router = useRouter();

  const { toast } = useToast();

  const { auth, firestore } = useFirebase();

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),

    defaultValues: {
      name: '',
      email: '',
      password: '',
      companyName: '',
      cnpj: '',
      address: '',
      city: '',
      state: '',
      plan: 'soft',
      paymentDay: '10',
    },
  });

  async function handleMasterAdminSignup(
    data: SignupFormValues
  ) {

    if (!auth || !firestore) {
      setError("Firebase não inicializado.");
      return;
    }

    try {

      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          data.email,
          data.password
        );

      const newUser = userCredential.user;

      const userDocRef =
        doc(firestore, "users", newUser.uid);

      await setDoc(userDocRef, {

        uid: newUser.uid,

        name: data.name,

        email: data.email,

        role: "master",

        status: "Ativo",

        createdAt: new Date().toISOString(),
      });

      toast({
        title: "Conta master criada.",
        description: "Agora faça login.",
      });

      router.push('/login');

    } catch (err: any) {

      console.error(err);

      let friendlyMessage =
        "Erro ao criar conta master.";

      if (err.code === 'auth/email-already-in-use') {
        friendlyMessage =
          "Conta master já existe.";
      }

      setError(friendlyMessage);
    }
  }

  async function onSubmit(
    data: SignupFormValues
  ) {

    setLoading(true);

    setError(null);

    try {

      if (!auth || !firestore) {
        throw new Error("Firebase não inicializado.");
      }

      // MASTER
      if (data.email === 'admin@clockwise.com') {

        await handleMasterAdminSignup(data);

        return;
      }

      // CREATE AUTH
      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          data.email,
          data.password
        );

      const newUser = userCredential.user;

      // TENANT ID
      const tenantId =
        data.cnpj.replace(/\D/g, '');

      if (!tenantId) {
        throw new Error("CNPJ inválido.");
      }

      // BATCH
      const batch = writeBatch(firestore);

      // REFS
      const tenantDocRef =
        doc(firestore, "tenants", tenantId);

      const userDocRef =
        doc(firestore, "users", newUser.uid);

      // ✅ COLLECTION ROOT
      const employeeDocRef =
        doc(firestore, "employees", newUser.uid);

      // TENANT
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

        createdAt: new Date().toISOString(),
      });

      // USER GLOBAL
      batch.set(userDocRef, {

        uid: newUser.uid,

        name: data.name,

        email: data.email,

        role: "admin",

        status: 'Ativo',

        tenantId,

        createdAt: new Date().toISOString(),
      });

      // ADMIN COMO FUNCIONÁRIO
      batch.set(employeeDocRef, {

        id: newUser.uid,

        uid: newUser.uid,

        matricula: "ADM-001",

        name: data.name,

        email: data.email,

        cpf: `ADMIN-${tenantId}`,

        celular: '',

        role: "Administrador Geral",

        setor: "Administração",

        localTrabalho: "Matriz",

        scheduleId: '',

        accessLevel: "admin",

        status: 'Ativo',

        admissionDate:
          new Date().toISOString().split('T')[0],

        tenantId,

        isFirstAdmin: true,

        createdAt: new Date().toISOString(),
      });

      // COMMIT
      await batch.commit();

      toast({
        title: "Sucesso",
        description:
          "Empresa criada com sucesso.",
      });

      router.push('/login');

    } catch (err: any) {

      console.error(err);

      let friendlyMessage =
        err.message ||
        "Erro ao criar conta.";

      if (err.code === 'auth/email-already-in-use') {
        friendlyMessage =
          "Este e-mail já está em uso.";
      }

      setError(friendlyMessage);

    } finally {

      setLoading(false);
    }
  }

  return (

    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-gray-50 p-4">

      <Button
        asChild
        variant="ghost"
        className="absolute left-4 top-4"
      >
        <Link href="/login">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Link>
      </Button>

      <Card className="w-full max-w-lg">

        <CardHeader className="text-center">

          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <Building />
            ClockWise
          </CardTitle>

          <CardDescription>
            Cadastro SaaS Multiempresa
          </CardDescription>

        </CardHeader>

        <CardContent>

          <Form {...form}>

            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6"
            >

              <h3 className="text-lg font-semibold border-b pb-2">
                Administrador
              </h3>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome*</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail*</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha*</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              <h3 className="text-lg font-semibold border-b pb-2">
                Empresa
              </h3>

              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Razão Social*</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cnpj"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CNPJ*</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>Endereço*</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <FormLabel>Cidade*</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                      <FormLabel>UF*</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </div>

              {/* PLANO */}

              <FormField
                control={form.control}
                name="plan"
                render={({ field }) => (

                  <FormItem className="space-y-3">

                    <FormLabel>
                      Plano
                    </FormLabel>

                    <FormControl>

                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="space-y-2"
                      >

                        <Label className="flex items-center gap-2 border rounded-md p-3 cursor-pointer">
                          <RadioGroupItem value="soft" />
                          Soft
                        </Label>

                        <Label className="flex items-center gap-2 border rounded-md p-3 cursor-pointer">
                          <RadioGroupItem value="plus" />
                          Plus
                        </Label>

                        <Label className="flex items-center gap-2 border rounded-md p-3 cursor-pointer">
                          <RadioGroupItem value="prime" />
                          Prime
                        </Label>

                      </RadioGroup>

                    </FormControl>

                    <FormMessage />

                  </FormItem>
                )}
              />

              {/* PAGAMENTO */}

              <FormField
                control={form.control}
                name="paymentDay"
                render={({ field }) => (

                  <FormItem>

                    <FormLabel>
                      Dia do Pagamento*
                    </FormLabel>

                    <FormControl>

                      <select
                        className="w-full border rounded-md h-10 px-3"
                        value={field.value}
                        onChange={field.onChange}
                      >
                        <option value="5">Dia 5</option>
                        <option value="10">Dia 10</option>
                        <option value="15">Dia 15</option>
                        <option value="20">Dia 20</option>
                        <option value="25">Dia 25</option>
                        <option value="30">Dia 30</option>
                      </select>

                    </FormControl>

                    <FormMessage />

                  </FormItem>
                )}
              />

              {error && (

                <Alert variant="destructive">

                  <AlertCircle className="h-4 w-4" />

                  <AlertTitle>
                    Erro
                  </AlertTitle>

                  <AlertDescription>
                    {error}
                  </AlertDescription>

                </Alert>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-lg"
                disabled={loading}
              >

                {loading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  'Criar Conta'
                )}

              </Button>

            </form>

          </Form>

        </CardContent>

      </Card>

    </main>
  );
}