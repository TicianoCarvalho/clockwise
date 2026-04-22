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
import { collectionGroup, query, where, limit, getDocs, updateDoc } from "firebase/firestore";

// --- SCHEMAS ---
const loginFormSchema = z.object({
  cpf: z.string().min(14, "CPF incompleto."),
  password: z.string().optional(), // Senha opcional para permitir detecção de 1º acesso
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

  // --- BUSCA GLOBAL (FUNÇÃO ÚNICA) ---
  const findEmployee = async (cpf: string) => {
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

      // SE NÃO TIVER SENHA NO BANCO -> ABRE O MODAL DE 1º ACESSO AUTOMATICAMENTE
      if (!employeeData.password || employeeData.password === "") {
        setCpfForFirstAccess(data.cpf);
        setShowFirstAccessModal(true);
        toast({ title: "Primeiro Acesso Detectado", description: "Por favor, cadastre sua senha." });
        return;
      }

      // SE TIVER SENHA -> VALIDA A DIGITADA
      if (employeeData.password === data.password) {
        toast({ title: "Login realizado!" });
        router.push(`/ponto/registro?cpf=${data.cpf}`);
      } else {
        setError("Senha incorreta.");
      }
    } catch (err) {
      setError("Erro de conexão. Verifique o índice do Firebase.");
    } finally {
      setLoading(false);
    }
  };

  // --- GRAVAR SENHA (1º ACESSO) ---
  const handleFirstAccess: SubmitHandler<FirstAccessFormValues> = async (data) => {
    setLoading(true);
    try {
      const docSnap = await findEmployee(cpfForFirstAccess);
      if (docSnap) {
        await updateDoc(docSnap.ref, {
          password: data.newPassword,
          updatedAt: new Date().toISOString()
        });
        toast({ title: "Senha criada com sucesso!" });
        setShowFirstAccessModal(false);
        router.push(`/ponto/registro?cpf=${cpfForFirstAccess}`);
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Erro ao salvar senha" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-sm shadow-lg">
          <CardHeader className="text-center">
            <User className="mx-auto h-10 w-10 text-primary mb-2" />
            <CardTitle>Área do Colaborador</CardTitle>
            <CardDescription>Entre com seu CPF para bater o ponto</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <FormField control={loginForm.control} name="cpf" render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF</FormLabel>
                    <FormControl>
                      <Input placeholder="000.000.000-00" {...field} onChange={(e) => field.onChange(formatCpf(e.target.value))} maxLength={14} />
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
                {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                <Button type="submit" className="w-full h-12" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" /> : "Entrar"}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center border-t py-4">
             <Button variant="ghost" size="sm" onClick={() => {
               const cpf = loginForm.getValues("cpf");
               if (cpf.length === 14) { setCpfForFirstAccess(cpf); setShowFirstAccessModal(true); }
               else { toast({ title: "Atenção", description: "Digite seu CPF primeiro." }); }
             }}>
               É meu primeiro acesso
             </Button>
          </CardFooter>
        </Card>
      </main>

      <Dialog open={showFirstAccessModal} onOpenChange={setShowFirstAccessModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar Senha</DialogTitle>
            <DialogDescription>CPF: {cpfForFirstAccess}</DialogDescription>
          </DialogHeader>
          <Form {...firstAccessForm}>
            <form onSubmit={firstAccessForm.handleSubmit(handleFirstAccess)} className="space-y-4">
              <FormField control={firstAccessForm.control} name="newPassword" render={({ field }) => (
                <FormItem><FormLabel>Nova Senha</FormLabel><Input type="password" {...field} /></FormItem>
              )} />
              <FormField control={firstAccessForm.control} name="confirmPassword" render={({ field }) => (
                <FormItem><FormLabel>Confirmar Senha</FormLabel><Input type="password" {...field} /></FormItem>
              )} />
              <Button type="submit" className="w-full bg-green-600" disabled={loading}>Ativar meu acesso</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}