"use client";

import { useEffect, useState, useRef } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Camera, Upload, User, Loader2, AlertTriangle, Phone, Calendar, Fingerprint } from "lucide-react";
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
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres.").optional().or(z.literal('')),
  cpf: z.string().regex(cpfRegex, "Formato de CPF inválido. Use XXX.XXX.XXX-XX."),
  celular: z.string().min(1, "O número de celular é obrigatório."), // Campo: phone
  esocialMatricula: z.string().optional(), // Campo: eSocialId
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
  isLimitReached?: boolean;
  activeCount?: number; 
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
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraDialogOpen, setIsCameraDialogOpen] = useState(false);
  
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

  useEffect(() => {
    if (employee) {
      form.reset({
        ...employee,
        celular: (employee as any).phone || (employee as any).celular || "",
        esocialMatricula: (employee as any).eSocialId || (employee as any).esocialMatricula || "",
        password: "",
        admissionDate: employee.admissionDate ? parseISO(employee.admissionDate) : null,
        birthDate: (employee as any).birthDate ? parseISO((employee as any).birthDate) : null,
        terminationDate: (employee as any).terminationDate ? parseISO((employee as any).terminationDate) : null,
        scaleStartDate: (employee as any).scaleStartDate ? parseISO((employee as any).scaleStartDate) : null,
        scaleId: employee.scaleId || "__NONE__",
      });
    }
  }, [employee, form]);

  const handleFormSubmit: SubmitHandler<FormValues> = (data) => {
    const cleanedData = {
      ...data,
      phone: data.celular, // Mapeia para o campo correto do Firestore
      eSocialId: data.esocialMatricula, // Mapeia para o campo correto do Firestore
      admissionDate: data.admissionDate ? format(data.admissionDate, 'yyyy-MM-dd') : null,
      birthDate: data.birthDate ? format(data.birthDate, 'yyyy-MM-dd') : null,
      terminationDate: data.terminationDate ? format(data.terminationDate, 'yyyy-MM-dd') : null,
      scaleStartDate: data.scaleStartDate ? format(data.scaleStartDate, 'yyyy-MM-dd') : null,
      scaleId: (data.scaleId === '__NONE__' || data.scaleId === '') ? null : data.scaleId,
    };
    onSubmit(cleanedData as any);
  };

  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{employee ? "Editar Funcionário" : "Adicionar Funcionário"}</DialogTitle>
        <DialogDescription>
          {employee ? "Edite as informações abaixo." : "Preencha os dados para o novo cadastro."}
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)}>
          <div className="space-y-4 py-4 max-h-[65vh] overflow-y-auto pr-4">
            
            {/* Seção de Foto */}
            <FormField
              control={form.control}
              name="avatarUrl"
              render={() => (
                <FormItem className="flex flex-col items-center mb-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={avatarUrl || undefined} />
                    <AvatarFallback>{name ? name.slice(0, 2).toUpperCase() : <User className="h-8 w-8" />}</AvatarFallback>
                  </Avatar>
                  <div className="flex gap-2 pt-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setIsCameraDialogOpen(true)}><Camera className="mr-2 h-4 w-4" />Biometria</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Upload</Button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={() => {}} />
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
              <FormField control={form.control} name="cpf" render={({ field }) => (
                <FormItem><FormLabel>CPF*</FormLabel><FormControl><Input placeholder="000.000.000-00" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="celular" render={({ field }) => (
                <FormItem><FormLabel>Celular / WhatsApp*</FormLabel><FormControl><Input placeholder="(00) 00000-0000" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            <Separator />
            <p className="text-sm font-medium text-muted-foreground">Dados Contratuais</p>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="admissionDate" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data de Admissão</FormLabel>
                  <DatePicker date={field.value || undefined} setDate={field.onChange} />
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="esocialMatricula" render={({ field }) => (
                <FormItem><FormLabel>ID eSocial</FormLabel><FormControl><Input placeholder="Código eSocial" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

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
                  <FormLabel>Horário de Trabalho</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>{schedules.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>

            <Separator />
            <p className="text-sm font-medium text-muted-foreground">Configurações de Ponto</p>

            <div className="grid grid-cols-1 gap-4">
              <FormField control={form.control} name="allowMobilePunch" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <FormLabel>Permitir Ponto Mobile</FormLabel>
                    <FormDescription>Ativa GPS e Câmera no celular do colaborador</FormDescription>
                  </div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
            </div>

          </div>

          <DialogFooter className="pt-4 border-t">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={!employee && isLimitReached}>
              {employee ? "Salvar Alterações" : "Cadastrar Colaborador"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}