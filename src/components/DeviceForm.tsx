
"use client";

import { useEffect, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Wifi, WifiOff } from "lucide-react";

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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { Device } from "@/lib/data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Separator } from "./ui/separator";
import { Alert, AlertTitle, AlertDescription } from "./ui/alert";


const ipAddressRegex = /^(\d{1,3}\.){3}\d{1,3}$/;

const formSchema = z.object({
  description: z.string().min(1, "A descrição do produto é obrigatória."),
  nickname: z.string().min(1, "O apelido/código é obrigatório.").max(10, "O apelido deve ter no máximo 10 caracteres."),
  model: z.enum(["iDClass - REP-C", "iDClass - REP-TE", "Outro"]),
  serialNumber: z.string().min(1, "O número de série é obrigatório.").max(30, "O número de série deve ter no máximo 30 caracteres."),
  ipAddress: z.string().regex(ipAddressRegex, "Endereço IP inválido."),
  port: z.coerce.number().min(1, "A porta deve ser maior que 0.").max(65535, "A porta deve ser menor que 65535."),
  protocol: z.enum(["HTTPS", "HTTP"]),
  repUsername: z.string().min(1, "O usuário do REP-C é obrigatório."),
  repPassword: z.string().min(1, "A senha do REP-C é obrigatória.").optional().or(z.literal('')),
  location_building: z.string().optional(),
  location_floor: z.coerce.number().optional(),
  location_area: z.string().optional(),
  syncFrequency: z.enum(["every_10_min", "every_30_min", "hourly"]),
});


type FormValues = z.infer<typeof formSchema>;

interface DeviceFormProps {
  device?: Device | null;
  onSubmit: (data: Device) => void;
}

export function DeviceForm({ device, onSubmit }: DeviceFormProps) {
  const isEditing = !!device;
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; device?: any } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      nickname: "",
      model: "iDClass - REP-C",
      serialNumber: "",
      ipAddress: "",
      port: 443,
      protocol: "HTTPS",
      repUsername: "admin",
      repPassword: "",
      location_building: "",
      location_floor: undefined,
      location_area: "",
      syncFrequency: "every_10_min",
    },
  });

  useEffect(() => {
    if (device) {
      form.reset({
        ...device,
        port: device.port || 443,
        repPassword: '', 
      });
    } else {
      form.reset({
        description: "",
        nickname: "",
        model: "iDClass - REP-C",
        serialNumber: "",
        ipAddress: "",
        port: 443,
        protocol: "HTTPS",
        repUsername: "admin",
        repPassword: "",
        location_building: "",
        location_floor: undefined,
        location_area: "",
        syncFrequency: "every_10_min",
      });
    }
  }, [device, form]);

  const handleFormSubmit: SubmitHandler<FormValues> = (data) => {
    const passwordToSubmit = data.repPassword ? data.repPassword : device?.repPassword;

    onSubmit({
      ...device, 
      ...data,
      id: device?.id || undefined,
      repPassword: passwordToSubmit,
    } as Device);
  };
  
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult({ success: false, message: "Funcionalidade desativada na versão atual. O teste de conexão direta do navegador não é possível por razões de segurança (CORS)." });
    setIsTesting(false);
  };


  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{device ? "Editar Dispositivo" : "Adicionar Dispositivo"}</DialogTitle>
        <DialogDescription>
          {device ? "Edite as informações do dispositivo REP-C." : "Preencha os dados para adicionar um novo relógio de ponto."}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)}>
          <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-4">
            
            <h3 className="text-lg font-medium">📋 Identificação</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Descrição do Produto*</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="nickname" render={({ field }) => (
                <FormItem><FormLabel>Apelido/Código*</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            <Separator className="my-6" />

            <h3 className="text-lg font-medium">🔧 Especificações</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="model" render={({ field }) => (
                <FormItem><FormLabel>Modelo*</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="iDClass - REP-C">iDClass - REP-C</SelectItem>
                      <SelectItem value="iDClass - REP-TE">iDClass - REP-TE</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="serialNumber" render={({ field }) => (
                <FormItem><FormLabel>Número de Série*</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            
            <Separator className="my-6" />

            <h3 className="text-lg font-medium">🌐 Comunicação</h3>
            <div className="p-4 border rounded-lg bg-yellow-50/50 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <FormField control={form.control} name="ipAddress" render={({ field }) => (
                    <FormItem className="col-span-2"><FormLabel>IP do Dispositivo*</FormLabel><FormControl><Input placeholder="192.168.0.145" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="port" render={({ field }) => (
                    <FormItem><FormLabel>Porta*</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="protocol" render={({ field }) => (
                    <FormItem><FormLabel>Protocolo*</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value="HTTPS">HTTPS</SelectItem><SelectItem value="HTTP">HTTP</SelectItem></SelectContent>
                        </Select><FormMessage /></FormItem>
                    )} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="repUsername" render={({ field }) => (
                    <FormItem><FormLabel>Usuário REP-C*</FormLabel><FormControl><Input {...field} /></FormControl><FormDescription>Geralmente 'admin'</FormDescription><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="repPassword" render={({ field }) => (
                    <FormItem><FormLabel>Senha REP-C*</FormLabel><FormControl><Input type="password" placeholder={isEditing ? "Deixe em branco para não alterar" : ""} {...field} /></FormControl><FormDescription>Será armazenada de forma segura.</FormDescription><FormMessage /></FormItem>
                )} />
                </div>
                <div className="pt-2">
                    <Button type="button" variant="outline" onClick={handleTestConnection} disabled>
                        <WifiOff className="mr-2 h-4 w-4" />
                        Testar Conexão (Desativado)
                    </Button>
                </div>
                {testResult && (
                    <Alert variant={testResult.success ? 'default' : 'destructive'} className="mt-4 bg-background">
                        {testResult.success ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                        <AlertTitle>{testResult.success ? 'Conexão Bem-Sucedida' : 'Falha na Conexão'}</AlertTitle>
                        <AlertDescription>
                            {testResult.message}
                        </AlertDescription>
                    </Alert>
                )}
            </div>

            <Separator className="my-6" />

            <h3 className="text-lg font-medium">📍 Localização (Opcional)</h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="location_building" render={({ field }) => (
                  <FormItem><FormLabel>Prédio/Bloco</FormLabel><FormControl><Input placeholder="Ex: Prédio A" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="location_floor" render={({ field }) => (
                  <FormItem><FormLabel>Andar</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="location_area" render={({ field }) => (
                  <FormItem><FormLabel>Área/Setor</FormLabel><FormControl><Input placeholder="Ex: Recepção" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
            
            <Separator className="my-6" />

            <h3 className="text-lg font-medium">🔄 Sincronização</h3>
            <FormField control={form.control} name="syncFrequency" render={({ field }) => (
              <FormItem><FormLabel>Frequência de Coleta*</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="every_10_min">A cada 10 minutos ⭐</SelectItem>
                    <SelectItem value="every_30_min">A cada 30 minutos</SelectItem>
                    <SelectItem value="hourly">A cada hora</SelectItem>
                  </SelectContent>
                </Select><FormMessage /></FormItem>
            )} />

          </div>
          <DialogFooter className="pt-4 border-t mt-4">
            <DialogClose asChild>
                <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <Button type="submit">Salvar Dispositivo</Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
