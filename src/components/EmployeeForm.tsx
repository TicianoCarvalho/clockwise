"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Camera, Upload, User, Loader2 } from "lucide-react";
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
import { Checkbox } from "./ui/checkbox";
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
}

export function EmployeeForm({ employee, onSubmit, locations, sectors, schedules, scales }: EmployeeFormProps) {
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
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.error("Error accessing camera: ", err);
          toast({ variant: "destructive", title: "Erro de Câmera", description: "Não foi possível acessar a câmera. Verifique as permissões do navegador." });
          setIsCameraDialogOpen(false);
        }
    };
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
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
        allowMobilePunch: employee.allowMobilePunch !== false, // Default to true if undefined
        automaticInterval: employee.automaticInterval || false,
        scaleId: employee.scaleId || "__NONE__",
        workModel: employee.workModel || 'standard',
        role: employee.role || 'usuario',
        setor: employee.setor || undefined,
        localTrabalho: employee.localTrabalho || undefined,
        scheduleId: employee.scheduleId || undefined,
        faceLandmarks: employee.faceLandmarks || ""
      });

    } else {
      form.reset({
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
      });
    }
  }, [employee, form]);

  const handleFormSubmit: SubmitHandler<FormValues> = (data) => {
    // Ensure optional date fields are null, not undefined
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
  
  const handleCapturePhoto = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) {
        toast({ variant: "destructive", title: "Câmera não pronta", description: "Aguarde o vídeo carregar ou verifique as permissões." });
        return;
    }
    
    setIsProcessingPhoto(true);

    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context?.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    form.setValue('avatarUrl', dataUrl, { shouldDirty: true });

    try {
        const landmarks = await getFaceLandmarks(canvas);
        if (landmarks.length === 0) {
             toast({
                variant: "destructive",
                title: 'Rosto não detectado.',
                description: "Tente uma foto com o rosto bem iluminado e sem obstruções.",
            });
            form.setValue('faceLandmarks', '', { shouldDirty: true });
        } else {
            form.setValue('faceLandmarks', JSON.stringify(landmarks), { shouldDirty: true });
            toast({ title: "Sucesso!", description: "Modelo facial gerado com sucesso." });
        }
    } catch (e: any) {
        console.error("Error during landmark generation:", e);
        toast({ variant: "destructive", title: "Erro na Detecção", description: e.message });
        form.setValue('faceLandmarks', '', { shouldDirty: true });
    } finally {
        setIsProcessingPhoto(false);
        setIsCameraDialogOpen(false);
    }
  };
  
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = async () => {
          const canvas = canvasRef.current;
          if (!canvas) return;

          setIsProcessingPhoto(true);
          canvas.width = img.width;
          canvas.height = img.height;
          const context = canvas.getContext('2d');
          context?.drawImage(img, 0, 0, img.width, img.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          form.setValue('avatarUrl', dataUrl, { shouldDirty: true });
          
           try {
            const landmarks = await getFaceLandmarks(canvas);
            if (landmarks.length > 0) {
                form.setValue('faceLandmarks', JSON.stringify(landmarks), { shouldDirty: true });
                toast({ title: "Sucesso!", description: "Modelo facial gerado com sucesso." });
            } else {
                 toast({
                    variant: "destructive",
                    title: 'Rosto não detectado no upload.',
                    description: "Por favor, use uma foto com iluminação frontal e sem obstruções.",
                });
                form.setValue('faceLandmarks', '', { shouldDirty: true });
            }
          } catch(e: any) {
            toast({ variant: "destructive", title: "Erro no Processamento", description: e.message });
            form.setValue('faceLandmarks', '', { shouldDirty: true });
          } finally {
            setIsProcessingPhoto(false);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{employee ? "Editar Funcionário" : "Adicionar Funcionário"}</DialogTitle>
          <DialogDescription>
            {employee ? "Edite as informações do funcionário abaixo." : "Preencha os dados para adicionar um novo funcionário."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)}>
            <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
              
              <FormField
                control={form.control}
                name="avatarUrl"
                render={() => (
                  <FormItem className="flex flex-col items-center">
                    <FormLabel>Foto do Colaborador</FormLabel>
                    <Avatar className="h-24 w-24">
                          <AvatarImage src={avatarUrl || undefined} alt={name} />
                          <AvatarFallback>
                            {name ? name.slice(0, 2).toUpperCase() : <User className="h-8 w-8" />}
                          </AvatarFallback>
                      </Avatar>
                    <FormControl>
                      <div className="flex gap-2">
                          <Button type="button" variant="outline" onClick={() => setIsCameraDialogOpen(true)}><Camera className="mr-2 h-4 w-4" />Tirar Foto</Button>
                          <Button type="button" variant="outline" onClick={handleUploadClick} disabled={isProcessingPhoto}>
                            {isProcessingPhoto ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4" />}
                            Importar Foto
                          </Button>
                          <Input 
                              type="file" 
                              ref={fileInputRef} 
                              className="hidden" 
                              accept="image/*"
                              onChange={handleFileChange} 
                          />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                  <FormField
                      control={form.control}
                      name="matricula"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Matrícula*</FormLabel>
                          <FormControl>
                              <Input placeholder="Ex: 00123" {...field} />
                          </FormControl>
                          <FormMessage />
                          </FormItem>
                      )}
                  />
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo*</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: João da Silva" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                  <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Email de Acesso</FormLabel>
                          <FormControl>
                              <Input type="email" placeholder="Ex: joao.silva@empresa.com" {...field} />
                          </FormControl>
                          <FormMessage />
                          </FormItem>
                      )}
                      />
                  <FormField
                  control={form.control}
                  name="celular"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Nº de Celular</FormLabel>
                      <FormControl>
                          <Input placeholder="(00) 90000-0000" {...field} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
                  />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="cpf"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>CPF*</FormLabel>
                        <FormControl>
                        <Input placeholder="000.000.000-00" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="esocialMatricula"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Matrícula e-Social</FormLabel>
                            <FormControl>
                                <Input placeholder="Matrícula e-Social" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
              </div>

               <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Endereço Residencial</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Endereço completo do colaborador" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

              <Separator />

              <div className="grid grid-cols-2 gap-4 pt-4">
                  <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nível de Permissão (Role)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o nível de permissão" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="usuario">👤 Usuário Comum (ponto + consulta)</SelectItem>
                                <SelectItem value="responsavel">🔑 Responsável (kiosk + relatórios)</SelectItem>
                                <SelectItem value="admin">👨‍💼 Admin (CRUD empresa)</SelectItem>
                                <SelectItem value="master">⭐ Master (tudo)</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                  )}
                  />
                  <FormField
                  control={form.control}
                  name="setor"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Setor</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                          <SelectTrigger>
                              <SelectValue placeholder="Selecione o setor" />
                          </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                          {sectors.filter(sector => sector.name).map((sector) => (
                              <SelectItem key={sector.id} value={sector.name}>
                              {sector.name}
                              </SelectItem>
                          ))}
                          </SelectContent>
                      </Select>
                      <FormMessage />
                      </FormItem>
                  )}
                  />
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <FormField
                  control={form.control}
                  name="localTrabalho"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Local de Trabalho</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                          <SelectTrigger>
                              <SelectValue placeholder="Selecione o local" />
                          </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                          {locations.filter(location => location.name).map((location) => (
                              <SelectItem key={location.id} value={location.name}>
                              {location.name}
                              </SelectItem>
                          ))}
                          </SelectContent>
                      </Select>
                      <FormMessage />
                      </FormItem>
                  )}
                  />
                  <FormField
                      control={form.control}
                      name="scheduleId"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Horário de Trabalho</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                              <SelectTrigger>
                                  <SelectValue placeholder="Selecione o horário" />
                              </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                              {schedules.filter(schedule => schedule.id).map((schedule) => (
                                  <SelectItem key={schedule.id} value={schedule.id}>
                                  {schedule.name}
                                  </SelectItem>
                              ))}
                              </SelectContent>
                          </Select>
                          <FormMessage />
                          </FormItem>
                      )}
                      />
              </div>

               <div className="grid grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="scaleId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Escala de Revezamento</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "__NONE__"}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Nenhuma" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__NONE__">Nenhuma</SelectItem>
                            {scales.filter(scale => scale.id).map((scale) => (
                              <SelectItem key={scale.id} value={scale.id}>
                                {scale.name} ({scale.type})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {scaleId && scaleId !== '__NONE__' && (
                    <FormField
                      control={form.control}
                      name="scaleStartDate"
                      render={({ field }) => (
                          <FormItem className="flex flex-col pt-2">
                              <FormLabel>Início da Escala</FormLabel>
                              <DatePicker 
                                  date={field.value}
                                  setDate={field.onChange}
                              />
                              <FormMessage />
                          </FormItem>
                      )}
                    />
                  )}
               </div>

                <FormField
                  control={form.control}
                  name="workModel"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Tipo de Vínculo</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex space-x-4"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="standard" />
                            </FormControl>
                            <FormLabel className="font-normal">Carga Horária (Padrão)</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="hourly" />
                            </FormControl>
                            <FormLabel className="font-normal">Horista</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
               
               <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="admissionDate"
                    render={({ field }) => (
                        <FormItem className="flex flex-col pt-2">
                            <FormLabel>Data de Admissão</FormLabel>
                            <DatePicker 
                                date={field.value}
                                setDate={field.onChange}
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="birthDate"
                    render={({ field }) => (
                        <FormItem className="flex flex-col pt-2">
                            <FormLabel>Data de Nascimento</FormLabel>
                            <DatePicker 
                                date={field.value}
                                setDate={field.onChange}
                            />
                             <FormMessage />
                        </FormItem>
                    )}
                />
               </div>
                <FormField
                    control={form.control}
                    name="terminationDate"
                    render={({ field }) => (
                        <FormItem className="flex flex-col pt-2">
                            <FormLabel>Data de Rescisão</FormLabel>
                            <DatePicker 
                                date={field.value}
                                setDate={field.onChange}
                            />
                            <FormDescription>Deixe em branco se o funcionário estiver ativo.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
              
              <Separator />

              <div className="space-y-4">
                 <FormField
                    control={form.control}
                    name="automaticInterval"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                            <FormLabel>Intervalo Automático Individual</FormLabel>
                            <FormDescription>
                                Ativar para que este funcionário sempre tenha o intervalo registrado automaticamente.
                            </FormDescription>
                        </div>
                        <FormControl>
                            <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            />
                        </FormControl>
                        </FormItem>
                    )}
                />
                
                <FormField
                    control={form.control}
                    name="allowMobilePunch"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <FormLabel>Permitir Ponto pelo Celular</FormLabel>
                                <FormDescription>
                                    Permite que o colaborador registre o ponto pelo navegador do celular.
                                </FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />
              </div>

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha de Acesso (para 1º Acesso)</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder={employee ? "Deixe em branco para não alterar" : "Mínimo 6 caracteres"} {...field} />
                    </FormControl>
                    <FormDescription>Esta senha é usada apenas para o primeiro acesso do colaborador.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="pt-4 border-t mt-4">
              <DialogClose asChild>
                  <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>

      <Dialog open={isCameraDialogOpen} onOpenChange={setIsCameraDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Tirar Foto</DialogTitle>
                <DialogDescription>Centralize seu rosto e capture a foto.</DialogDescription>
            </DialogHeader>
            <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted flex items-center justify-center">
                <video 
                  ref={videoRef} 
                  className="h-full w-full object-cover scale-x-[-1]" 
                  autoPlay 
                  muted 
                  playsInline
                  onCanPlay={() => setIsCameraReady(true)}
                />
                 <canvas ref={canvasRef} className="hidden"></canvas>
                {!isCameraReady && <Loader2 className="absolute h-8 w-8 animate-spin text-muted-foreground" />}
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsCameraDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleCapturePhoto} disabled={isProcessingPhoto || !isCameraReady}>
                    {isProcessingPhoto ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                    Capturar Foto
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
