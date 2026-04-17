
"use client";

import { useState, useEffect } from "react";
import { Edit, HardDrive, PlusCircle, Trash2, Loader2, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DeviceForm } from "@/components/DeviceForm";
import { useToast } from "@/hooks/use-toast";
import type { Device } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { useAuthContext } from "@/contexts/auth-context";
import { collection, doc, addDoc, updateDoc, deleteDoc } from "firebase/firestore";

export default function DevicesPage() {
    const { toast } = useToast();
    const { firestore } = useFirebase();
    const { tenantId } = useAuthContext();

    const devicesQuery = useMemoFirebase(() => tenantId ? collection(firestore, 'tenants', tenantId, 'devices') : null, [firestore, tenantId]);
    const { data: devices, isLoading: loading } = useCollection<Device>(devicesQuery);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingDevice, setEditingDevice] = useState<Device | null>(null);
    const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
    const [deletingDevice, setDeletingDevice] = useState<Device | null>(null);

    const handleOpenDialogForEdit = (device: Device) => {
        setEditingDevice(device);
        setIsDialogOpen(true);
    };
    
    const handleOpenDialogForAdd = () => {
        setEditingDevice(null);
        setIsDialogOpen(true);
    };

    const handleSubmitDevice = async (data: Device) => {
        if (!firestore || !tenantId) {
            toast({
                variant: 'destructive',
                title: 'Erro de Autenticação',
                description: 'Não foi possível identificar a empresa. Por favor, faça login novamente.',
            });
            return;
        }
        const isEditing = !!editingDevice;

        try {
            if (isEditing && editingDevice?.id) {
                const docRef = doc(firestore, 'tenants', tenantId, 'devices', editingDevice.id);
                const { id, ...dataToUpdate } = data;
                await updateDoc(docRef, dataToUpdate);
            } else {
                const collectionRef = collection(firestore, 'tenants', tenantId, 'devices');
                const { id, ...dataToAdd } = data;
                await addDoc(collectionRef, { ...dataToAdd, status: 'Offline', lastSeen: new Date().toISOString() });
            }
            toast({ title: `Dispositivo ${isEditing ? 'atualizado' : 'adicionado'}!`, description: `O dispositivo "${data.description}" foi salvo com sucesso.` });
            setIsDialogOpen(false);
            setEditingDevice(null);
        } catch (error: any) {
             toast({ variant: "destructive", title: "Erro ao salvar", description: error.message });
        }
    };

    const handleOpenConfirmDeleteDialog = (device: Device) => {
        setDeletingDevice(device);
        setIsConfirmDeleteDialogOpen(true);
    };

    const handleDeleteDeviceConfirm = async () => {
        if (!deletingDevice || !firestore || !tenantId) return;
        try {
            const docRef = doc(firestore, 'tenants', tenantId, 'devices', deletingDevice.id);
            await deleteDoc(docRef);
            toast({ title: "Dispositivo removido!", description: `O dispositivo "${deletingDevice.description}" foi removido com sucesso.` });
        } catch (error: any) {
             toast({ variant: "destructive", title: "Erro", description: "Não foi possível remover o dispositivo." });
        }
        setIsConfirmDeleteDialogOpen(false);
        setDeletingDevice(null);
    };
    
    const formatLastSeen = (lastSeen?: string) => {
        if (!lastSeen) return 'Nunca';
        const date = parseISO(lastSeen);
        if (!isValid(date)) return 'Data inválida';
        try {
            return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
        } catch (e) {
            return 'Data inválida';
        }
    };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-6 w-6" />
                Gerenciamento de Dispositivos (REP-C)
            </CardTitle>
            <CardDescription>Cadastre e gerencie os relógios de ponto da sua empresa.</CardDescription>
          </div>
          <Button onClick={handleOpenDialogForAdd}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Dispositivo
          </Button>
        </CardHeader>
        <CardContent>
            {loading ? (
                 <div className="flex items-center justify-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Apelido/Código</TableHead>
                        <TableHead>Modelo</TableHead>
                        <TableHead>Endereço IP</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Última Comunicação</TableHead>
                        <TableHead className="text-right w-[100px]">Ações</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {!devices || devices.length === 0 ? (
                         <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">
                                Nenhum dispositivo cadastrado.
                            </TableCell>
                        </TableRow>
                    ) : (
                        devices.map((device) => (
                        <TableRow key={device.id}>
                            <TableCell className="font-medium">{device.description}</TableCell>
                            <TableCell>{device.nickname}</TableCell>
                            <TableCell>{device.model}</TableCell>
                            <TableCell>{device.ipAddress}</TableCell>
                            <TableCell>
                                <Badge variant={device.status === 'Online' ? 'default' : 'outline'} className={cn("flex items-center gap-1.5 w-fit", device.status === 'Online' ? 'bg-green-100 text-green-800' : '')}>
                                    {device.status === 'Online' ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                                    {device.status}
                                </Badge>
                            </TableCell>
                            <TableCell>{formatLastSeen(device.lastSeen)}</TableCell>
                            <TableCell className="text-right space-x-1">
                                <Button variant="ghost" size="icon" onClick={() => handleOpenDialogForEdit(device)}>
                                    <Edit className="h-4 w-4" />
                                    <span className="sr-only">Editar</span>
                                </Button>
                                <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => handleOpenConfirmDeleteDialog(device)}>
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Remover</span>
                                </Button>
                            </TableCell>
                        </TableRow>
                        ))
                    )}
                    </TableBody>
                </Table>
            )}
        </CardContent>
      </Card>
      <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
          setIsDialogOpen(isOpen);
          if (!isOpen) {
            setEditingDevice(null);
          }
      }}>
        <DeviceForm
            device={editingDevice}
            onSubmit={handleSubmitDevice}
        />
      </Dialog>
      <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Isso removerá permanentemente o dispositivo
              &quot;{deletingDevice?.description}&quot; dos seus registros.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDeviceConfirm}>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
