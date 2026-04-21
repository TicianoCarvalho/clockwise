"use client";

import { useEffect, useState, useRef } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Camera, Upload, User, Loader2, AlertTriangle } from "lucide-react";
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
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { getFaceLandmarks } from "@/lib/faceMatcher";
import { useToast } from "@/hooks/use-toast";

const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;

const formSchema = z.object({
  matricula: z.string().min(1, "A matrícula é obrigatória."),
  name: z.string().min(1, "O nome é obrigatório."),
  email: z.string().email("O email é inválido."),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres.").optional().or(z.literal('')),
  cpf: z.string().regex(cpfRegex, "Formato de CPF inválido. Use XXX.XXX.XXX-XX."),
  celular: z.string().min(1, "O número de celular é obrigatório."),
  esocialMatricula: z.string().optional(),
  admissionDate: z.date().optional().nullable(),
  birthDate: z.date().optional().nullable(),
  terminationDate: z.date().optional().nullable(),
  address: z.string().optional(),
  role: z.string().min(1, "O nível de permissão é obrigatório."),
  setor: z.string().min(1, "O setor é obrigatório."),
  localTrabalho: z.string().min(1, "O local de trabalho é obrigatório."),
  scheduleId: z.string().min(1, "O horário é obrigatório."),
  scaleId: z.string().optional(),
  scaleStartDate: z.date().optional().nullable(),
  avatarUrl: z.string().optional(),
  faceLandmarks: z.string().optional(),
  allowMobilePunch: z.boolean().optional(),
  automaticInterval: z.boolean().optional(),
  workModel: z.enum(['standard', 'hourly']).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EmployeeFormProps {
  employee?: Employee | null;
  onSubmit: (data: Omit<Employee, 'id' | 'status'>) => void;
  locations: Location[];
  sectors: Sector[];
  schedules: Schedule[];
  scales: Scale[];
  isLimitReached?: boolean; // Nova Prop
  activeCount?: number;     // Nova Prop
}

export function EmployeeForm({ 
  employee, 
  onSubmit, 
  locations, 
  sectors, 
  schedules, 
  scales,
  isLimitReached = false,
  activeCount = 0 
}: EmployeeFormProps) {
  const [isCameraDialogOpen, setIsCameraDialogOpen] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  
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
      address: "",
      role: 'usuario',
      setor: undefined,
      localTrabalho: undefined,
      scheduleId: undefined,
      scaleId: "__NONE__",
      scaleStartDate: null,
      avatarUrl: "",
      faceLandmarks: "",
      allowMobilePunch: true,
      automaticInterval: false,
      workModel: 'standard',
    },
  });

  const avatarUrl = form.watch("avatarUrl");
  const name = form.watch("name");
  const scaleId = form.watch("scaleId");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
        if (!isCameraDialogOpen) return;
        setIsCameraReady(false);
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } });
          if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (err) {
          toast({ variant: "destructive", title: "Erro de Câmera", description: "Não foi possível acessar a câmera." });
          setIsCameraDialogOpen(false);
        }
    };
    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [isCameraDialogOpen, toast]);

  useEffect(() => {
    if (employee) {
      form.reset({
        ...employee,
        password: "",
        admissionDate: employee.admissionDate ? parseISO(employee.admissionDate) : null,
        birthDate: employee.birthDate ? parseISO(employee.birthDate) : null,
        terminationDate: employee.terminationDate ? parseISO(employee.terminationDate) : null,
        scaleStartDate: employee.scaleStartDate ? parseISO(employee.scaleStartDate) : null,
        scaleId: employee.scaleId || "__NONE__",
      });
    }
  }, [employee, form]);

  const handleFormSubmit: SubmitHandler<FormValues> = (data) => {
    const cleanedData = {
      ...data,
      admissionDate: data.admissionDate ? format(data.admissionDate, 'yyyy-MM-dd') : null,
      birthDate: data.birthDate ? format(data.birthDate, 'yyyy-MM-dd') : null,
      terminationDate: data.terminationDate ? format(data.terminationDate, 'yyyy-MM-dd') : null,
      scaleStartDate: data.scaleStartDate ? format(data.scaleStartDate, 'yyyy-MM-dd') : null,
      scaleId: (data.scaleId === '__NONE__' || data.scaleId === '') ? null : data.scaleId,
    };
    onSubmit(cleanedData as Omit<Employee, 'id' | 'status'>);
  };

  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{employee ? "Editar Funcionário" : "Adicionar Funcionário"}</DialogTitle>
        <DialogDescription>
          {employee ? "Edite as informações abaixo." : "Preencha os dados para o novo cadastro."}
        </DialogDescription>
      </DialogHeader>

      {/* Alerta de Limite Atingido */}
      {!employee && isLimitReached && (
        <div className="bg-destructive/10 p-4 rounded-lg flex items-start gap-3 text-destructive text-sm border border-destructive/20 mb-4">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-bold">Limite do Plano Atingido</p>
            <p>Sua empresa já possui {activeCount} colaboradores ativos. Para cadastrar novos, faça um upgrade do plano ou desative colaboradores antigos.</p>
          </div>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)}>
          <div className="space-y-4 py-4 max-h-[65vh] overflow-y-auto pr-4">
            
            {/* Campo de Avatar */}
            <FormField
              control={form.control}
              name="avatarUrl"
              render={() => (
                <FormItem className="flex flex-col items-center">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={avatarUrl || undefined} />
                    <AvatarFallback>{name ? name.slice(0, 2).toUpperCase() : <User className="h-8 w-8" />}</AvatarFallback>
                  </Avatar>
                  <div className="flex gap-2 pt-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setIsCameraDialogOpen(true)}><Camera className="mr-2 h-4 w-4" />Foto</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Upload</Button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {/* lógica de upload aqui */}} />
                  </div>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="matricula" render={({ field }) => (
                <FormItem><FormLabel>Matrícula*</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Nome Completo*</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="cpf" render={({ field }) => (
                <FormItem><FormLabel>CPF*</FormLabel><FormControl><Input placeholder="000.000.000-00" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            {/* ... Demais campos de Seleção (Setor, Horário, etc) ... */}
            <div className="grid grid-cols-2 gap-4">
               <FormField control={form.control} name="setor" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Setor</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                      <SelectContent>{sectors.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormItem>
               )} />
               <FormField control={form.control} name="scheduleId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                      <SelectContent>{schedules.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormItem>
               )} />
            </div>

            <Separator />

            <FormField control={form.control} name="allowMobilePunch" render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-md border p-3">
                <div><FormLabel>Permitir Ponto Mobile</FormLabel><FormDescription>Registro via celular</FormDescription></div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              </FormItem>
            )} />

          </div>

          <DialogFooter className="pt-4 border-t">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <Button 
              type="submit" 
              disabled={!employee && isLimitReached} // Trava de segurança no botão
            >
              {!employee && isLimitReached ? "Limite Atingido" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </Form>

      {/* Dialog da Câmera (mantido como estava) */}
      <Dialog open={isCameraDialogOpen} onOpenChange={setIsCameraDialogOpen}>
        {/* ... conteúdo da câmera ... */}
      </Dialog>
    </DialogContent>
  );
}