"use client";

import { useState } from "react";
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
import { Loader2, User, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useFirebase } from "@/firebase";
import { 
  collectionGroup, 
  query, 
  where, 
  limit, 
  getDocs, 
  setDoc // Importado setDoc para maior robustez
} from "firebase/firestore";

// --- SCHEMAS ---
const loginFormSchema = z.object({
  cpf: z.string().min(14, "CPF incompleto."),
  password: z.string().optional(),
});

const firstAccessSchema = z.object({
  newPassword: z.string().min(6, "A senha deve ter no mínimo 6 caracteres."),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginFormSchema>;
type FirstAccessFormValues = z.infer<typeof firstAccessSchema>;

export default function ColaboradorLoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFirstAccessModal, setShowFirstAccessModal] = useState(false);
  const [cpfForFirstAccess, setCpfForFirstAccess] = useState("");
  const { firestore } = useFirebase();

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
    if (onlyDigits.length > 9) return `${onlyDigits.slice(0, 3)}.${onlyDigits.slice(3, 6)}.${onlyDigits.slice(6, 9)}-${onlyDigits.slice(9)}`;
    if (onlyDigits.length > 6) return `${onlyDigits.slice(0, 3)}.${onlyDigits.slice(3, 6)}.${onlyDigits.slice(6)}`;
    if (onlyDigits.length > 3) return `${onlyDigits.slice(0, 3)}.${onlyDigits.slice(3)}`;
    return onlyDigits;
  };

  // --- BUSCA GLOBAL ---
  const findEmployee = async (cpf: string) => {
    if (!firestore) return null;
    const q = query(collectionGroup(firestore, 'employees'), where("cpf", "==", cpf), limit(1));
    const snap = await getDocs(q);
    return snap.empty ? null : snap.docs[0];
  };

  // --- LÓGICA DE LOGIN ---
  const handleLogin: SubmitHandler<LoginFormValues> = async (data) => {
    setLoading(true);
    setError(null);
    try {
      const docSnap = await findEmployee(data.cpf);

      if (!docSnap) {
        setError("CPF não localizado no sistema.");
        return;
      }

      const employeeData = docSnap.data();

      // Detecção de 1º acesso (sem senha ou senha vazia)
      if (!employeeData.password || employeeData.password === "") {
        setCpfForFirstAccess(data.cpf);
        setShowFirstAccessModal(true);
        toast({ title: "Bem-vindo!", description: "Crie sua senha de acesso." });
        return;
      }

      if (employeeData.password === data.password) {
        toast({ title: "Login realizado!" });
        router.push(`/ponto/registro?cpf=${data.cpf}`);
      } else {
        setError("Senha incorreta.");
      }
    } catch (err: any) {
      console.error(err);
      setError("Erro ao validar acesso. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  };

  // --- GRAVAR SENHA (1º ACESSO) ---
  const handleFirstAccess: SubmitHandler<FirstAccessFormValues> = async (data) => {
    setLoading(true);
    try {
      // Re-valida o documento para garantir a referência (ref)
      const docSnap = await findEmployee(cpfForFirstAccess);
      
      if (docSnap) {
        // Usamos setDoc com merge: true para garantir a criação do campo password
        await setDoc(docSnap.ref, {
          password: data.newPassword,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        toast({ title: "Senha criada com sucesso!" });
        setShowFirstAccessModal(false);
        router.push(`/ponto/registro?cpf=${cpfForFirstAccess}`);
      } else {
        toast({ variant: "destructive", title: "Erro", description: "Colaborador não encontrado." });
      }
    } catch (err: any) {
      console.error("Erro ao salvar senha:", err);
      toast({ 
        variant: "destructive", 
        title: "Erro ao salvar", 
        description: "Verifique as permissões do Firebase." 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-sm shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
              <User className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Área do Colaborador</CardTitle>
            <CardDescription>Acesse para registrar seu ponto</CardDescription>
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
                        onChange={(e) => field.onChange(formatCpf(e.target.value))} 
                        maxLength={14} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={loginForm.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Digite sua senha" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                {error && (
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin mr-2" /> : "Entrar"}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center border-t py-4">
             <Button 
                variant="link" 
                size="sm" 
                className="text-muted-foreground"
                onClick={() => {
                  const cpf = loginForm.getValues("cpf");
                  if (cpf.length === 14) { 
                    setCpfForFirstAccess(cpf); 
                    setShowFirstAccessModal(true); 
                  } else { 
                    toast({ title: "Atenção", description: "Digite seu CPF completo primeiro." }); 
                  }
                }}
              >
               Primeiro acesso? Cadastre sua senha
             </Button>
          </CardFooter>
        </Card>
      </main>

      <Dialog open={showFirstAccessModal} onOpenChange={setShowFirstAccessModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Configurar Senha</DialogTitle>
            <DialogDescription>
              Defina uma senha para o CPF {cpfForFirstAccess}
            </DialogDescription>
          </DialogHeader>
          <Form {...firstAccessForm}>
            <form onSubmit={firstAccessForm.handleSubmit(handleFirstAccess)} className="space-y-4 pt-4">
              <FormField control={firstAccessForm.control} name="newPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nova Senha</FormLabel>
                  <FormControl><Input type="password" placeholder="Mínimo 6 dígitos" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={firstAccessForm.control} name="confirmPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar Senha</FormLabel>
                  <FormControl><Input type="password" placeholder="Repita a senha" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={loading}>
                {loading ? <Loader2 className="animate-spin mr-2" /> : "Ativar meu acesso"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}