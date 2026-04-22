"use client";

import { useEffect, useState, useRef } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Camera, Upload, User, RefreshCw, ShieldCheck, UserCog, Ban } from "lucide-react";
import { format, parseISO } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  FormMessage,
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

const formSchema = z.object({
  matricula: z.string().min(1, "A matrícula é obrigatória."),
  name: z.string().min(1, "O nome é obrigatório."),
  email: z.string().email("O email é inválido."),
  password: z.string().optional(),
  cpf: z.string().regex(cpfRegex, "Formato de CPF inválido."),
  celular: z.string().min(1, "O celular é obrigatório."),
  esocialMatricula: z.string().min(1, "O eSocial é obrigatório."),
  admissionDate: z.date().optional().nullable(),
  birthDate: z.date().optional().nullable(),
  terminationDate: z.date().optional().nullable(),
  role: z.enum(['admin', 'supervisor', 'usuario']).default('usuario'),
  status: z.boolean().default(true),
  setor: z.string().min(1, "O setor é obrigatório."),
  localTrabalho: z.string().min(1, "O local é obrigatório."),
  scheduleId: z.string().min(1, "O horário é obrigatório."),
  scaleId: z.string().optional(),
  avatarUrl: z.string().optional(),
  allowMobilePunch: z.boolean().optional(),
  automaticInterval: z.boolean().optional(),
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
      matricula: "",
      name: "",
      email: "",
      password: "",
      cpf: "",
      celular: "",
      esocialMatricula: "",
      admissionDate: null,
      birthDate: null,
      terminationDate: null,
      role: 'usuario',
      status: true,
      setor: undefined,
      localTrabalho: undefined,
      scheduleId: undefined,
      scaleId: "__NONE__",
      avatarUrl: "",
      allowMobilePunch: true,
      automaticInterval: false,
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
          toast({ variant: "destructive", title: "Erro na Câmera", description: "Verifique as permissões." });
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
        celular: (employee as any).phone || "",
        esocialMatricula: (employee as any).eSocialId || "",
        admissionDate: employee.admissionDate ? parseISO(employee.admissionDate) : null,
        terminationDate: (employee as any).terminationDate ? parseISO((employee as any).terminationDate) : null,
        password: "", // Senha não é carregada por segurança
      });
    }
  }, [employee, form]);

  const handleResetPassword = () => {
    form.setValue("password", "");
    toast({ title: "Senha Resetada", description: "Campo limpo para nova definição." });
  };

  const handleFormSubmit: SubmitHandler<FormValues> = (data) => {
    const payload = {
      ...data,
      phone: data.celular,
      eSocialId: data.esocialMatricula,
      admissionDate: data.admissionDate ? format(data.admissionDate, 'yyyy-MM-dd') : null,
      terminationDate: data.terminationDate ? format(data.terminationDate, 'yyyy-MM-dd') : null,
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
            <div className="space-y-4 py-4 max-h-[65vh] overflow-y-auto pr-4">
              
              {/* Status e Perfil (Role) */}
              <div className="grid grid-cols-2 gap-4 bg-muted/40 p-3 rounded-lg border">
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem className="flex items-center justify-between space-y-0">
                    <div className="space-y-0.5">
                      <FormLabel>Status Ativo</FormLabel>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="role" render={({ field }) => (
                  <FormItem>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="usuario">Usuário Comum</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>

              {/* Avatar e Biometria */}
              <div className="flex flex-col items-center mb-4">
                <Avatar className="h-20 w-20 mb-2">
                  <AvatarImage src={form.watch("avatarUrl")} />
                  <AvatarFallback><User /></AvatarFallback>
                </Avatar>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsCameraDialogOpen(true)}><Camera className="h-4 w-4 mr-1" /> Biometria</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><Upload className="h-4 w-4 mr-1" /> Foto</Button>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" />
                </div>
              </div>

              {/* Dados Básicos */}
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Nome Completo*</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="cpf" render={({ field }) => (
                  <FormItem><FormLabel>CPF*</FormLabel><FormControl><Input placeholder="000.000.000-00" {...field} /></FormControl></FormItem>
                )} />
              </div>

              {/* Senha e Reset */}
              <div className="grid grid-cols-1 border p-3 rounded-md bg-slate-50">
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha do App (Ponto)</FormLabel>
                    <div className="flex gap-2">
                      <FormControl><Input type="password" placeholder="Definir nova senha" {...field} /></FormControl>
                      {employee && <Button type="button" variant="secondary" onClick={handleResetPassword}><RefreshCw className="h-4 w-4" /></Button>}
                    </div>
                  </FormItem>
                )} />
              </div>

              <Separator />

              {/* Datas: Admissão e Rescisão */}
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="admissionDate" render={({ field }) => (
                  <FormItem className="flex flex-col"><FormLabel>Admissão</FormLabel><DatePicker date={field.value || undefined} setDate={field.onChange} /></FormItem>
                )} />
                <FormField control={form.control} name="terminationDate" render={({ field }) => (
                  <FormItem className="flex flex-col"><FormLabel className="text-destructive">Rescisão (Desligamento)</FormLabel><DatePicker date={field.value || undefined} setDate={field.onChange} /></FormItem>
                )} />
              </div>

              {/* Dados Contratuais */}
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="matricula" render={({ field }) => (
                  <FormItem><FormLabel>Matrícula*</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="esocialMatricula" render={({ field }) => (
                  <FormItem><FormLabel>eSocial*</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
              </div>

              {/* Localização e Horário */}
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="localTrabalho" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Local</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                      <SelectContent>{locations.map(l => <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="scheduleId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário Base</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                      <SelectContent>{schedules.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
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

      <Dialog open={isCameraDialogOpen} onOpenChange={setIsCameraDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Biometria Facial</DialogTitle></DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            <div className="relative w-64 h-64 bg-black rounded-full overflow-hidden border-4 border-primary">
              <video ref={videoRef} autoPlay playsInline className="object-cover w-full h-full scale-x-[-1]" />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setIsCameraDialogOpen(false)}>Capturar</Button>
              <Button variant="secondary" onClick={() => setIsCameraDialogOpen(false)}>Fechar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}