"use client";

import { useEffect, useState, useRef } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Camera, Upload, User, RefreshCw, ShieldCheck } from "lucide-react";
import { format, parseISO } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type Employee, type Location, type Sector, type Schedule, type Scale } from "@/lib/data";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Separator } from "./ui/separator";
import { DatePicker } from "./ui/date-picker";
import { Switch } from "./ui/switch";
import { useToast } from "@/hooks/use-toast";

const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;

// Schema alinhado com TODOS os campos da coleção do Firestore
const formSchema = z.object({
  address: z.string().default(""),
  admissionDate: z.date().optional().nullable(),
  allowMobilePunch: z.boolean().default(true),
  automaticInterval: z.boolean().default(true),
  avatarUrl: z.string().default(""),
  birthDate: z.date().optional().nullable(),
  celular: z.string().min(1, "O celular é obrigatório."),
  cpf: z.string().regex(cpfRegex, "Formato de CPF inválido."),
  email: z.string().email("O email é inválido."),
  esocialMatricula: z.string().min(1, "O eSocial é obrigatório."),
  faceLandmarks: z.string().default(""),
  localTrabalho: z.string().min(1, "O local é obrigatório."),
  matricula: z.string().min(1, "A matrícula é obrigatória."),
  name: z.string().min(1, "O nome é obrigatório."),
  password: z.string().default(""),
  role: z.enum(['admin', 'supervisor', 'usuario']).default('usuario'),
  scaleId: z.string().optional().nullable(),
  scaleStartDate: z.date().optional().nullable(),
  scheduleId: z.string().min(1, "O horário é obrigatório."),
  setor: z.string().min(1, "O setor é obrigatório."),
  status: z.boolean().default(true), // Usamos boolean no form para o Switch
  terminationDate: z.date().optional().nullable(),
  workModel: z.string().default("standard"),
});

type FormValues = z.infer<typeof formSchema>;

interface EmployeeFormProps {
  employee?: Employee | null;
  onSubmit: (data: any) => void;
  locations: Location[];
  sectors: Sector[];
  schedules: Schedule[];
  scales: Scale[];
  isLimitReached?: boolean;
}

export function EmployeeForm({ 
  employee, 
  onSubmit, 
  locations, 
  sectors, 
  schedules, 
  scales,
  isLimitReached = false 
}: EmployeeFormProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraDialogOpen, setIsCameraDialogOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      address: "",
      admissionDate: null,
      allowMobilePunch: true,
      automaticInterval: true,
      avatarUrl: "",
      birthDate: null,
      celular: "",
      cpf: "",
      email: "",
      esocialMatricula: "",
      faceLandmarks: "",
      localTrabalho: "",
      matricula: "",
      name: "",
      password: "",
      role: 'usuario',
      scaleId: null,
      scaleStartDate: null,
      scheduleId: "",
      setor: "",
      status: true,
      terminationDate: null,
      workModel: 'standard',
    },
  });

  useEffect(() => {
    async function setupCamera() {
      if (isCameraDialogOpen) {
        try {
          const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
          setStream(s);
          if (videoRef.current) videoRef.current.srcObject = s;
        } catch (err) {
          toast({ variant: "destructive", title: "Erro na Câmera", description: "Verifique permissões." });
          setIsCameraDialogOpen(false);
        }
      } else {
        stream?.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }
    setupCamera();
  }, [isCameraDialogOpen]);

  useEffect(() => {
    if (employee) {
      form.reset({
        ...employee,
        status: (employee as any).status === "Ativo" ? true : false,
        admissionDate: employee.admissionDate ? parseISO(employee.admissionDate) : null,
        birthDate: (employee as any).birthDate ? parseISO((employee as any).birthDate) : null,
        terminationDate: (employee as any).terminationDate ? parseISO((employee as any).terminationDate) : null,
        scaleStartDate: (employee as any).scaleStartDate ? parseISO((employee as any).scaleStartDate) : null,
        password: "", 
      });
    }
  }, [employee, form]);

  const handleResetPassword = () => {
    form.setValue("password", "");
    toast({ title: "Senha Resetada", description: "O campo de senha foi limpo." });
  };

  const handleFormSubmit: SubmitHandler<FormValues> = (data) => {
    // Payload final com campos formatados para o Firestore
    const payload = {
      ...data,
      status: data.status ? "Ativo" : "Inativo", // Converte boolean para a String que o banco espera
      admissionDate: data.admissionDate ? format(data.admissionDate, 'yyyy-MM-dd') : null,
      birthDate: data.birthDate ? format(data.birthDate, 'yyyy-MM-dd') : null,
      terminationDate: data.terminationDate ? format(data.terminationDate, 'yyyy-MM-dd') : null,
      scaleStartDate: data.scaleStartDate ? format(data.scaleStartDate, 'yyyy-MM-dd') : null,
      scaleId: data.scaleId === '__NONE__' ? null : data.scaleId,
    };
    onSubmit(payload);
  };

  return (
    <>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{employee ? "Editar Funcionário" : "Adicionar Funcionário"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)}>
            <div className="space-y-4 py-4 max-h-[65vh] overflow-y-auto pr-2">
              
              {/* STATUS E PERFIL */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border">
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem className="flex items-center justify-between space-y-0">
                    <FormLabel className="font-bold">Status do Colaborador</FormLabel>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="role" render={({ field }) => (
                  <FormItem>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Nível de Acesso" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="usuario">Usuário Comum</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>

              {/* AVATAR E BIOMETRIA */}
              <div className="flex flex-col items-center py-2">
                <Avatar className="h-20 w-20 mb-2 border-2 border-primary/20">
                  <AvatarImage src={form.watch("avatarUrl")} />
                  <AvatarFallback><User className="h-10 w-10" /></AvatarFallback>
                </Avatar>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsCameraDialogOpen(true)}><Camera className="mr-2 h-4 w-4" /> Biometria</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><Upload className="mr-2 h-4 w-4" /> Foto</Button>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" />
                </div>
              </div>

              <Separator />

              {/* DADOS PESSOAIS */}
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Nome Completo*</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="cpf" render={({ field }) => (
                  <FormItem><FormLabel>CPF*</FormLabel><FormControl><Input placeholder="000.000.000-00" {...field} /></FormControl></FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email*</FormLabel><FormControl><Input type="email" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="celular" render={({ field }) => (
                  <FormItem><FormLabel>Celular / WhatsApp*</FormLabel><FormControl><Input placeholder="85999999999" {...field} /></FormControl></FormItem>
                )} />
              </div>

              {/* GESTÃO DE SENHA */}
              <div className="bg-slate-50 p-3 rounded-lg border">
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha de Acesso (App Ponto)</FormLabel>
                    <div className="flex gap-2">
                      <FormControl><Input type="password" placeholder="Defina a senha" {...field} /></FormControl>
                      {employee && <Button type="button" variant="ghost" onClick={handleResetPassword} title="Resetar Senha"><RefreshCw className="h-4 w-4" /></Button>}
                    </div>
                  </FormItem>
                )} />
              </div>

              <Separator />

              {/* DADOS CONTRATUAIS */}
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="admissionDate" render={({ field }) => (
                  <FormItem className="flex flex-col"><FormLabel>Data de Admissão</FormLabel><DatePicker date={field.value || undefined} setDate={field.onChange} /></FormItem>
                )} />
                <FormField control={form.control} name="terminationDate" render={({ field }) => (
                  <FormItem className="flex flex-col"><FormLabel className="text-destructive">Data de Rescisão</FormLabel><DatePicker date={field.value || undefined} setDate={field.onChange} /></FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="matricula" render={({ field }) => (
                  <FormItem><FormLabel>Matrícula*</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="esocialMatricula" render={({ field }) => (
                  <FormItem><FormLabel>Matrícula eSocial*</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
              </div>

              {/* LOCAL E HORÁRIO */}
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="localTrabalho" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Local de Trabalho</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                      <SelectContent>{locations.map(l => <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="setor" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Setor</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                      <SelectContent>{sectors.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <FormField control={form.control} name="scheduleId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário Base (Regra de Ponto)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione o Horário" /></SelectTrigger></FormControl>
                      <SelectContent>{schedules.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>

              {/* CONFIGURAÇÕES DE PONTO */}
              <div className="grid grid-cols-2 gap-4 border p-3 rounded-lg">
                <FormField control={form.control} name="allowMobilePunch" render={({ field }) => (
                  <FormItem className="flex items-center justify-between space-y-0">
                    <FormLabel className="text-xs">Ponto via Mobile</FormLabel>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="automaticInterval" render={({ field }) => (
                  <FormItem className="flex items-center justify-between space-y-0">
                    <FormLabel className="text-xs">Intervalo Automático</FormLabel>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
              </div>

            </div>

            <DialogFooter className="pt-4 border-t">
              <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
              <Button type="submit" disabled={!employee && isLimitReached}>
                {employee ? "Salvar Alterações" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>

      {/* CÂMERA */}
      <Dialog open={isCameraDialogOpen} onOpenChange={setIsCameraDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Captura de Biometria Facial</DialogTitle></DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            <div className="relative w-64 h-64 bg-black rounded-full overflow-hidden border-4 border-primary">
              <video ref={videoRef} autoPlay playsInline className="object-cover w-full h-full scale-x-[-1]" />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setIsCameraDialogOpen(false)}>Capturar Foto</Button>
              <Button variant="secondary" onClick={() => setIsCameraDialogOpen(false)}>Fechar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}