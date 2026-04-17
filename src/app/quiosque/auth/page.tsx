
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { useToast } from '@/hooks/use-toast';
import { Clock, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useFirebase } from '@/firebase';
import { signInWithEmailAndPassword, signOut, getIdTokenResult } from 'firebase/auth';

const authFormSchema = z.object({
  email: z.string().email('Por favor, insira um e-mail válido.'),
  password: z.string().min(1, 'A senha é obrigatória.'),
});

type AuthFormValues = z.infer<typeof authFormSchema>;

export default function KioskAuthPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { auth } = useFirebase();

  const form = useForm<AuthFormValues>({
    resolver: zodResolver(authFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleAuthorize: SubmitHandler<AuthFormValues> = async (data) => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      if (!user) {
        throw new Error("Usuário não encontrado após a autenticação.");
      }

      // Function to get claims with retry to handle Cloud Function latency
      const getClaimsWithRetry = async (retries = 5, delay = 1500) => {
        for (let i = 0; i < retries; i++) {
          // Force refresh the token to get the latest claims.
          const idTokenResult = await user.getIdTokenResult(true);
          const claims = idTokenResult.claims;

          if (claims.role && claims.tenantId) {
            console.log(`Claims found on attempt ${i + 1}:`, claims);
            return claims;
          }
          if (i < retries - 1) {
            console.log(`Claims not ready, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
        return null; // Return null if claims are not found after retries
      };

      const claims = await getClaimsWithRetry();

      if (!claims) {
        // Fallback logic if claims are not found after retries
        const tenantId = 'clookengenharia';
        const sessionExpires = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours session
        sessionStorage.setItem(
          'kioskSession',
          JSON.stringify({
            authorized: true,
            expires: sessionExpires.toISOString(),
            companyName: `Empresa ${tenantId}`, // Using fallback name
            tenantId: tenantId,
          })
        );
        toast({
          title: 'Quiosque Ativado (Modo Fallback)!',
          description: `Permissões demoraram a carregar. Usando acesso padrão.`,
        });
        router.push('/quiosque');
        return;
      }

      const userRole = claims.role as string;
      const tenantId = claims.tenantId as string;

      // Check if the role is authorized for Kiosk activation
      const authorizedRoles = ['responsavel', 'admin', 'master'];
      if (!userRole || !authorizedRoles.includes(userRole.toLowerCase())) {
        await signOut(auth); // Sign out unauthorized user
        throw new Error('Acesso negado. Apenas administradores ou responsáveis podem ativar o quiosque.');
      }

      // Set session storage and redirect
      const sessionExpires = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours session

      sessionStorage.setItem(
        'kioskSession',
        JSON.stringify({
          authorized: true,
          expires: sessionExpires.toISOString(),
          companyName: `Empresa ${tenantId}`,
          tenantId: tenantId,
        })
      );

      toast({
        title: 'Quiosque Ativado!',
        description: `O quiosque está ativo por 8 horas.`,
      });

      router.push('/quiosque');

    } catch (err: any) {
      let friendlyMessage = err.message || 'Ocorreu um erro. Tente novamente.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        friendlyMessage = "E-mail ou senha inválidos.";
      }
      setError(friendlyMessage);
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
          <CardTitle>Ativar Modo Quiosque</CardTitle>
          <CardDescription>
            Insira suas credenciais de gestor para iniciar a sessão do quiosque.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleAuthorize)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input placeholder="seu@email.com" {...field} />
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
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
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
                {loading ? 'Autorizando...' : 'Ativar Quiosque'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}
