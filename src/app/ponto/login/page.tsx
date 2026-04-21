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
import { Loader2, ArrowLeft, User, AlertCircle } from "lucide-react";
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
import { collectionGroup, query, where, limit, getDocs, updateDoc } from "firebase/firestore";

// Schema do formulário de login
const loginFormSchema = z.object({
  cpf: z.string().min(14, "CPF deve ter 11 dígitos.").max(14, "Formato de CPF inválido."),
  password: z.string().min(1, "A senha é obrigatória."),
});
type LoginFormValues = z.infer<typeof loginFormSchema>;

// Schema do primeiro acesso
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
  const { firestore } = useFirebase(); // Removido o 'auth' pois não usaremos para colaboradores

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
  
  // --- LOGIN VIA FIRESTORE (SEM ERRO 400) ---
  const handleLogin: SubmitHandler<LoginFormValues> = async (data) => {
    setLoading(true);
    setError(null);
    if (!firestore) {
        setError("Serviço de banco de dados indisponível.");
        setLoading(false);
        return;
    }

    try {
        // Busca global em todas as empresas pelo CPF formatado
        const employeesGroup = collectionGroup(firestore, 'employees');
        const q = query(employeesGroup, where("cpf", "==", data.cpf), limit(1));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            setError("CPF não cadastrado ou empresa não encontrada.");
            return;
        }

        const employeeDoc = querySnapshot.docs[0];
        const employeeData = employeeDoc.data();

        // Verifica se a senha bate (comparando com o campo salvo no Firestore)
        if (employeeData.password === data.password) {
            toast({ title: "Login realizado!", description: "Acessando área de ponto..." });
            router.push(`/ponto/registro?cpf=${data.cpf}`);
        } else {
            setError("Senha incorreta. Se for seu primeiro acesso, clique no botão abaixo.");
        }

    } catch (err: any) {
        console.error("Login Error:", err);
        setError("Erro ao validar acesso. Verifique sua conexão.");
    } finally {
        setLoading(false);
    }
  };

  // --- BUSCA GLOBAL PARA PRIMEIRO ACESSO ---
  const checkCpfExistsGlobal = async (cpf: string) => {
    if (!firestore) return null;
    const employeesGroup = collectionGroup(firestore, 'employees');
    const q = query(employeesGroup, where("cpf", "==", cpf), limit(1));
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty ? null : querySnapshot.docs[0];
  };


  const handleFirstAccess: SubmitHandler<FirstAccessFormValues> = async (data) => {
      setLoading(true);
      if (!firestore) return;
      
      try {
          const docSnap = await checkCpfExistsGlobal(cpfForFirstAccess);
          
          if (docSnap) {
              // Grava a senha diretamente no documento do colaborador
              await updateDoc(docSnap.ref, {
                  password: data.newPassword,
                  updatedAt: new Date().toISOString()
              });

              toast({ title: "Senha criada!", description: "Agora você já pode registrar seu ponto." });
              setShowFirstAccessModal(false);
              router.push(`/ponto/registro?cpf=${cpfForFirstAccess}`);
          }
      } catch (err: any) {
          console.error("First Access Error:", err);
          firstAccessForm.setError("root", { message: "Erro ao salvar senha. Tente novamente." });
      } finally {
          setLoading(false);
      }
  };
  
  const handleOpenFirstAccessModal = async () => {
        const cpf = loginForm.getValues("cpf");
        if (!cpf || cpf.replace(/\D/g, '').length !== 11) {
            toast({ variant: 'destructive', title: 'CPF Inválido', description: 'Digite o CPF completo antes de prosseguir.'});
            return;
        }
        setLoading(true);
        const employeeDoc = await checkCpfExistsGlobal(cpf);
        setLoading(false);
        
        if (employeeDoc) {
            setCpfForFirstAccess(cpf);
            setShowFirstAccessModal(true);
        } else {
            setError("CPF não localizado. Verifique com seu RH.");
        }
  };
  
  const handleForgotPassword = () => {
    toast({
        title: "Recuperação de Senha",
        description: "Por favor, contate o RH da sua empresa para resetar sua senha.",
    });
  }

  return (
    <>
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4 text-primary">
                <User className="h-8 w-8" />
            </div>
          <CardTitle className="text-2xl">👤 Área do Colaborador</CardTitle>
           <CardDescription>Registro de Ponto Biométrico</CardDescription>
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
                      <Input type="password" placeholder="Sua senha cadastrada" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
              )} />
              
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full h-12 text-lg" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : "👆 Entrar para Bater Ponto"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col items-center gap-2 text-sm border-t pt-6">
            <p className="font-semibold text-muted-foreground uppercase text-xs">Ainda não tem senha?</p>
            <Button variant="outline" className="w-full" onClick={handleOpenFirstAccessModal} disabled={loading}>
                 Cadastrar 1º Acesso
            </Button>
        </CardFooter>
      </Card>
    </main>

    <Dialog open={showFirstAccessModal} onOpenChange={setShowFirstAccessModal}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>1º Acesso - Crie sua senha</DialogTitle>
                <DialogDescription>
                   Defina uma senha para realizar seus registros de ponto.
                </DialogDescription>
            </DialogHeader>
            <Form {...firstAccessForm}>
                <form onSubmit={firstAccessForm.handleSubmit(handleFirstAccess)} className="space-y-4">
                    <div>
                        <Label>CPF identificado</Label>
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
                    <DialogFooter>
                        <Button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-700">
                             {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "✅ Ativar Acesso"}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    </Dialog>
    </>
  );
}