"use client";

import { useState, useRef, useEffect } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { Camera, Users, Trash2, Upload, X, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { type Employee, type Location, type Sector, type Schedule, type Scale } from "@/lib/data";

const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;

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
  role: z.string().default("usuario"),
  scaleId: z.string().optional().nullable(),
  scaleStartDate: z.date().optional().nullable(),
  scheduleId: z.string().min(1, "O horário é obrigatório."),
  setor: z.string().min(1, "O setor é obrigatório."),
  status: z.boolean().default(true),
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
  locations = [], 
  sectors = [], 
  schedules = [], 
  scales = [],
  isLimitReached = false 
}: EmployeeFormProps) {
  
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
      scaleId: "",
      scaleStartDate: null,
      scheduleId: "",
      setor: "",
      status: true,
      terminationDate: null,
      workModel: 'standard',
    },
  });

  useEffect(() => {
    if (employee) {
      form.reset({
        ...employee,
        status: (employee as any).status === "Ativo",
        admissionDate: employee.admissionDate ? parseISO(employee.admissionDate) : null,
        birthDate: (employee as any).birthDate ? parseISO((employee as any).birthDate as string) : null,
        scaleId: employee.scaleId || "",
        role: (employee as any).role || "usuario"
      });
    }
  }, [employee, form]);

  // --- LÓGICA DE CÂMERA ---
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user", width: 400, height: 400 } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error("Erro ao acessar câmera:", err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Espelha a imagem para o canvas se estiver usando a frontal
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        form.setValue("avatarUrl", dataUrl);
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => form.setValue("avatarUrl", reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const handleFormSubmit: SubmitHandler<FormValues> = (data) => {
    const payload = {
      ...data,
      status: data.status ? "Ativo" : "Inativo",
      admissionDate: data.admissionDate ? format(data.admissionDate, 'yyyy-MM-dd') : null,
      birthDate: data.birthDate ? format(data.birthDate, 'yyyy-MM-dd') : null,
      scaleId: data.scaleId === "" || data.scaleId === "none" ? null : data.scaleId,
    };
    onSubmit(payload);
  };

  const getSafeLabel = (item: any) => item?.name || item?.nome || item?.descricao || "Sem nome";

  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{employee ? "Editar Colaborador" : "Novo Colaborador"}</DialogTitle>
        <DialogDescription>Cadastre a biometria facial e os dados do funcionário.</DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)}>
          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            
            {/* ÁREA DE BIOMETRIA DINÂMICA */}
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl bg-slate-50 mb-4 border-primary/20 relative">
              
              {!isCameraActive ? (
                <div className="flex flex-col items-center">
                  <div className="relative mb-4">
                    <Avatar className="h-28 w-28 border-4 border-white shadow-xl">
                      <AvatarImage src={form.watch("avatarUrl")} className="object-cover" />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        <Users className="h-10 w-10 opacity-20" />
                      </AvatarFallback>
                    </Avatar>
                    {form.watch("avatarUrl") && (
                      <div className="absolute -top-1 -right-1 bg-green-500 text-white p-1 rounded-full shadow-md">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button type="button" variant="default" size="sm" onClick={startCamera}>
                      <Camera className="mr-2 h-4 w-4" /> Abrir Câmera
                    </Button>
                    
                    <label className="cursor-pointer">
                      <Button type="button" variant="outline" size="sm" asChild>
                        <span><Upload className="mr-2 h-4 w-4" /> Importar</span>
                      </Button>
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                    </label>

                    {form.watch("avatarUrl") && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => form.setValue("avatarUrl", "")}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="relative w-full flex flex-col items-center">
                  <div className="relative h-48 w-64 bg-black rounded-lg overflow-hidden border-2 border-primary">
                    <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover scale-x-[-1]" />
                    <div className="absolute inset-0 border-[20px] border-black/40 rounded-full pointer-events-none" />
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="mt-4 flex gap-2">
                    <Button type="button" variant="default" className="bg-green-600 hover:bg-green-700" onClick={takePhoto}>
                      Capturar Foto
                    </Button>
                    <Button type="button" variant="outline" onClick={stopCamera}>
                      <X className="mr-2 h-4 w-4" /> Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* STATUS E NIVEL DE ACESSO */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border">
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem className="flex items-center justify-between space-y-0">
                  <FormLabel className="font-bold">Colaborador Ativo</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nível de Acesso</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Acesso" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="usuario">Colaborador</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>

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
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="celular" render={({ field }) => (
                <FormItem><FormLabel>Celular</FormLabel><FormControl><Input placeholder="(85) 9..." {...field} /></FormControl></FormItem>
              )} />
            </div>

            <Separator />

            {/* REGRAS DE PONTO */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 grid grid-cols-2 gap-4">
              <FormField control={form.control} name="allowMobilePunch" render={({ field }) => (
                <FormItem className="flex items-center justify-between p-2 bg-white rounded border">
                  <FormLabel className="text-xs">Ponto Mobile</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="automaticInterval" render={({ field }) => (
                <FormItem className="flex items-center justify-between p-2 bg-white rounded border">
                  <FormLabel className="text-xs">Intervalo Automático</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
            </div>

            {/* ALOCAÇÃO */}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="localTrabalho" render={({ field }) => (
                <FormItem>
                  <FormLabel>Local de Trabalho</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {locations.map(l => (
                        <SelectItem key={l.id} value={getSafeLabel(l)}>{getSafeLabel(l)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="setor" render={({ field }) => (
                <FormItem>
                  <FormLabel>Setor</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {sectors.map(s => (
                        <SelectItem key={s.id} value={getSafeLabel(s)}>{getSafeLabel(s)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>

            {/* HORÁRIOS */}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="scheduleId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Horário Base</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Horário" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {schedules.map(h => (
                        <SelectItem key={h.id} value={h.id}>{getSafeLabel(h)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="scaleId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Escala</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma Escala</SelectItem>
                      {scales.map(e => (
                        <SelectItem key={e.id} value={e.id}>{getSafeLabel(e)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>

            {/* DOCUMENTAÇÃO */}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="matricula" render={({ field }) => (
                <FormItem><FormLabel>Matrícula Interna</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="esocialMatricula" render={({ field }) => (
                <FormItem><FormLabel>Matrícula eSocial</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
            </div>

          </div>

          <DialogFooter className="pt-4 border-t gap-2">
            <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
            <Button type="submit" disabled={!employee && isLimitReached}>
              {employee ? "Salvar Alterações" : "Cadastrar Colaborador"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}