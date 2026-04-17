"use client";

import { useState } from "react";
import Link from 'next/link';
import { useRouter } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Clock, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useFirebase } from "@/firebase";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, setDoc, collection, query, limit, getDocs } from "firebase/firestore";


const loginFormSchema = z.object({
  identifier: z.string().email("Por favor, insira um e-mail válido."),
  password: z.string().min(1, "A senha é obrigatória."),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { auth, firestore } = useFirebase();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const handleLogin: SubmitHandler<LoginFormValues> = async (data) => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, data.identifier, data.password);
      const user = userCredential.user;
      
      // Seed first company if master user and no tenants exist
      if (user.email === 'admin@clockwise.com') {
          const tenantsQuery = query(collection(firestore, 'tenants'), limit(1));
          const tenantsSnapshot = await getDocs(tenantsQuery);
          if (tenantsSnapshot.empty) {
              const defaultTenantId = "43058506000164"; // Default CNPJ as ID
              const defaultTenantRef = doc(firestore, "tenants", defaultTenantId);
              await setDoc(defaultTenantRef, {
                  id: defaultTenantId,
                  name: "Aleph IT (Empresa Teste)",
                  cnpj: "43.058.506/0001-64",
                  address: "Av. Barão de Studart, 1165 - Aldeota, Fortaleza - CE, 60120-001",
                  city: "Fortaleza",
                  state: "CE",
                  plan: "prime",
                  status: 'Ativa',
                  paymentStatus: 'Em dia',
                  paymentDay: 10,
                  ie: "",
                  cei: "",
              });
              toast({
                  title: "Empresa de Teste Criada",
                  description: "Como este é o primeiro acesso master, uma empresa de exemplo foi criada para você.",
                  duration: 6000,
              });
          }
          await user.getIdTokenResult(true);
      }

      toast({
        title: "Login bem-sucedido!",
        description: "Redirecionando para o seu painel...",
      });

      router.push('/dashboard');
      
    } catch (err: any) {
      let friendlyMessage = "Ocorreu um erro. Verifique seu e-mail e senha.";
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        friendlyMessage = "E-mail ou senha inválidos. Se este for o primeiro acesso master, por favor, use a página de cadastro.";
      }
      setError(friendlyMessage);
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    const email = form.getValues("identifier");
    if (!email) {
      toast({
        variant: "destructive",
        title: "E-mail necessário",
        description: "Por favor, digite seu e-mail no campo acima para redefinir a senha.",
      });
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "Link Enviado!",
        description: "Um link para redefinição de senha foi enviado para o seu e-mail.",
      });
    } catch (err: any) {
      let friendlyMessage = "Não foi possível enviar o e-mail de redefinição.";
      if (err.code === 'auth/user-not-found') {
        friendlyMessage = "Nenhum usuário encontrado com este e-mail.";
      }
      toast({
        variant: "destructive",
        title: "Erro",
        description: friendlyMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <Button asChild variant="ghost" className="absolute left-4 top-4">
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Home
        </Link>
      </Button>
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
                <Clock className="h-8 w-8 text-primary" />
                <span className="text-3xl font-bold text-primary">ClockWise</span>
            </div>
          <CardTitle>Acesso do Administrador</CardTitle>
          <CardDescription>
            Use seu e-mail de administrador para gerenciar sua empresa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-4">
              <FormField
                control={form.control}
                name="identifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="seu@email.com"
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
                    <div className="flex items-center justify-between">
                      <FormLabel>Senha</FormLabel>
                       <Button
                        type="button"
                        variant="link"
                        className="p-0 h-auto text-xs"
                        onClick={handlePasswordReset}
                        disabled={loading}
                      >
                        Esqueceu sua senha?
                      </Button>
                    </div>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Erro de Autenticação</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </Form>
        </CardContent>
         <CardFooter className="flex flex-col items-center gap-2 text-sm">
          <div>
            <span>Ainda não é cliente?&nbsp;</span>
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              Cadastre sua empresa aqui.
            </Link>
          </div>
        </CardFooter>
      </Card>
    </main>
  );
}
