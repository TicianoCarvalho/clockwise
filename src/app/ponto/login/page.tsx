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
import { Clock, Loader2, ArrowLeft, User, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useFirebase } from "@/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { collection, query, where, limit, getDocs } from "firebase/firestore";

// Main login form schema
const loginFormSchema = z.object({
  cpf: z.string().min(14, "CPF deve ter 11 dígitos.").max(14, "Formato de CPF inválido."),
  password: z.string().min(1, "A senha é obrigatória."),
});
type LoginFormValues = z.infer<typeof loginFormSchema>;

// First access modal schema
const firstAccessSchema = z.object({
    newPassword: z.string().min(6, "A senha deve ter no mínimo 6 caracteres."),
    confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
});
type FirstAccessFormValues = z.infer<typeof firstAccessSchema>;


export default function ColaboradorLoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFirstAccessModal, setShowFirstAccessModal] = useState(false);
  const [cpfForFirstAccess, setCpfForFirstAccess] = useState("");
  const { auth, firestore } = useFirebase();

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { cpf: "", password: "" },
  });

  const firstAccessForm = useForm<FirstAccessFormValues>({
    resolver: zodResolver(firstAccessSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const formatCpf = (value: string) => {
    const onlyDigits = value.replace(/\D/g, '').slice(0, 11);
    if (onlyDigits.length > 9) {
        return `${onlyDigits.slice(0, 3)}.${onlyDigits.slice(3, 6)}.${onlyDigits.slice(6, 9)}-${onlyDigits.slice(9)}`;
    } else if (onlyDigits.length > 6) {
        return `${onlyDigits.slice(0, 3)}.${onlyDigits.slice(3, 6)}.${onlyDigits.slice(6)}`;
    } else if (onlyDigits.length > 3) {
        return `${onlyDigits.slice(0, 3)}.${onlyDigits.slice(3)}`;
    }
    return onlyDigits;
  };
  
  const handleLogin: SubmitHandler<LoginFormValues> = async (data) => {
    setLoading(true);
    setError(null);
    if (!auth) {
        setError("Serviço de autenticação indisponível.");
        setLoading(false);
        return;
    }

    const cleanedCpf = data.cpf.replace(/\D/g, '');
    const maskedEmail = `${cleanedCpf}@ponto.clockwise`;

    try {
        await signInWithEmailAndPassword(auth, maskedEmail, data.password);
        router.push(`/ponto/registro?cpf=${data.cpf}`);
    } catch (err: any) {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
            setError("CPF não cadastrado ou primeiro acesso não realizado.");
        } else if (err.code === 'auth/wrong-password') {
            setError("Senha incorreta.");
        } else {
            console.error("Login Error:", err);
            setError("Erro de conexão. Tente novamente.");
        }
    } finally {
        setLoading(false);
    }
  };

  const checkCpfExists = async (cpf: string): Promise<boolean> => {
    if (!firestore) return false;
  
    const tenantId = "43058506000164"; 
    const employeesRef = collection(firestore, 'tenants', tenantId, 'employees');
    
    const q = query(employeesRef, where("cpf", "==", cpf), limit(1));
    
    try {
        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
    } catch (e) {
        console.error("Error checking CPF existence:", e);
        toast({ 
            variant: 'destructive', 
            title: 'Erro de Permissão', 
            description: 'Acesse o Console do Firebase e publique as regras de listagem.' 
        });
        return false;
    }
  };


  const handleFirstAccess: SubmitHandler<FirstAccessFormValues> = async (data) => {
      setLoading(true);
      setError(null);
      if (!auth) {
        firstAccessForm.setError("root", { message: "Serviço de autenticação indisponível." });
        setLoading(false);
        return;
      }

      const cleanedCpf = cpfForFirstAccess.replace(/\D/g, '');
      const maskedEmail = `${cleanedCpf}@ponto.clockwise`;
      
      try {
          await createUserWithEmailAndPassword(auth, maskedEmail, data.newPassword);
          toast({ title: "Senha criada com sucesso!", description: "Você será redirecionado para o registro de ponto." });
          router.push(`/ponto/registro?cpf=${cpfForFirstAccess}`);
      } catch (err: any) {
          if (err.code === 'auth/email-already-in-use') {
              firstAccessForm.setError("root", { message: "Uma senha já foi criada para este CPF. Use a tela de login." });
          } else {
              console.error("First Access Error:", err);
              firstAccessForm.setError("root", { message: "Não foi possível criar a senha. Tente novamente." });
          }
      } finally {
          setLoading(false);
      }
  };
  
  const handleOpenFirstAccessModal = async () => {
        const cpf = loginForm.getValues("cpf");
        if (!cpf || cpf.replace(/\D/g, '').length !== 11) {
            toast({ variant: 'destructive', title: 'CPF Inválido', description: 'Por favor, digite um CPF válido com 11 dígitos.'});
            return;
        }
        setLoading(true);
        setError(null);
        const exists = await checkCpfExists(cpf);
        setLoading(false);
        
        if (exists) {
            setCpfForFirstAccess(cpf);
            setShowFirstAccessModal(true);
        } else {
            setError("CPF não cadastrado pelo administrador. Verifique o número digitado ou contate o RH.");
        }
  };
  
  const handleForgotPassword = () => {
    toast({
        title: "Recuperação de Senha",
        description: "Por favor, contate o seu administrador ou o RH para resetar sua senha.",
        duration: 6000,
    });
  }

  return (
    <>
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <Button asChild variant="ghost" className="absolute left-4 top-4">
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Home
        </Link>
      </Button>
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4 text-primary">
                <User className="h-8 w-8" />
            </div>
          <CardTitle className="text-2xl">👤 Área do Colaborador</CardTitle>
           <CardDescription>Registro de Ponto</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
              <FormField control={loginForm.control} name="cpf" render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="000.000.000-00" 
                        {...field}
                        onChange={(e) => {
                            const formatted = formatCpf(e.target.value);
                            field.onChange(formatted);
                        }}
                        maxLength={14}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
              )} />
              <FormField control={loginForm.control} name="password" render={({ field }) => (
                <FormItem>
                    <div className="flex items-center justify-between">
                        <FormLabel>Senha</FormLabel>
                        <Button type="button" variant="link" className="p-0 h-auto text-xs" onClick={handleForgotPassword}>
                            Esqueci minha senha
                        </Button>
                    </div>
                    <FormControl>
                      <Input type="password" placeholder="Mínimo 6 caracteres" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
              )} />
              
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Erro de Acesso</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full h-12 text-lg" disabled={loading}>
                {loading && loginForm.formState.isSubmitting ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : "👆 Entrar e Registrar Ponto"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col items-center gap-2 text-sm border-t pt-6">
            <p className="font-semibold text-muted-foreground">👤 PRIMEIRO ACESSO?</p>
            <p className="text-xs text-muted-foreground text-center">Seu CPF já deve estar cadastrado pelo administrador.</p>
            <Button variant="link" className="p-0 h-auto" onClick={handleOpenFirstAccessModal} disabled={loading}>
                {loading && !loginForm.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Cadastrar 1º Acesso"}
            </Button>
        </CardFooter>
      </Card>
    </main>

    <Dialog open={showFirstAccessModal} onOpenChange={setShowFirstAccessModal}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>1º Acesso - Crie sua senha</DialogTitle>
                <DialogDescription>
                   Crie uma senha segura para acessar o registro de ponto.
                </DialogDescription>
            </DialogHeader>
            <Form {...firstAccessForm}>
                <form onSubmit={firstAccessForm.handleSubmit(handleFirstAccess)} className="space-y-4">
                    <div>
                        <Label>CPF</Label>
                        <Input value={cpfForFirstAccess} disabled />
                    </div>
                    <FormField control={firstAccessForm.control} name="newPassword" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nova Senha</FormLabel>
                            <FormControl>
                            <Input type="password" placeholder="Mínimo 6 caracteres" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={firstAccessForm.control} name="confirmPassword" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Confirmar Nova Senha</FormLabel>
                            <FormControl>
                            <Input type="password" placeholder="Repita a nova senha" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    {firstAccessForm.formState.errors.root && (
                         <p className="text-sm font-medium text-destructive">{firstAccessForm.formState.errors.root.message}</p>
                    )}
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline">Cancelar</Button>
                        </DialogClose>
                        <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700">
                             {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "✅ Confirmar"}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    </Dialog>
    </>
  );
}
