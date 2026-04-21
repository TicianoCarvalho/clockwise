"use client";

import { useState, useEffect, useMemo } from "react";
import { Edit, MapPin, PlusCircle, Trash2, Loader2, Building } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { LocationForm } from "@/components/LocationForm";
import { useToast } from "@/hooks/use-toast";
import type { Location, Company } from "@/lib/data";
import { geocodeAddress } from '@/ai/flows/geocode-address';
import { retryWithBackoff } from '@/lib/utils';
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { useAuthContext } from "@/contexts/auth-context";
import { collection, doc, addDoc, updateDoc, deleteDoc, query } from "firebase/firestore";

// Interface estendida para garantir que o TS aceite os novos campos fiscais
interface ExtendedLocation extends Location {
    cnpj?: string;
    razaoSocial?: string;
    inscricaoEstadual?: string;
}

export default function LocationsSettingsPage() {
    const { toast } = useToast();
    const { firestore } = useFirebase();
    const { userRole, tenantId: authTenantId } = useAuthContext();
    const [error, setError] = useState<string | null>(null);

    const masterTenantsQuery = useMemoFirebase(() => 
        (firestore && userRole === 'master') ? query(collection(firestore, 'tenants')) : null, 
    [firestore, userRole]);
    const { data: tenants, isLoading: tenantsLoading } = useCollection<Company>(masterTenantsQuery);
    
    const [selectedTenantId, setSelectedTenantId] = useState<string>('');
    useEffect(() => {
        if (userRole === 'master' && tenants && tenants.length > 0 && !selectedTenantId) {
            setSelectedTenantId(tenants[0].id);
        }
    }, [userRole, tenants, selectedTenantId]);

    const finalTenantId = userRole === 'master' ? selectedTenantId : authTenantId;

    const locationsQuery = useMemoFirebase(() => finalTenantId ? collection(firestore, 'tenants', finalTenantId, 'locations') : null, [firestore, finalTenantId]);
    const { data: locations, isLoading: locationsLoading, error: locationsError } = useCollection<ExtendedLocation>(locationsQuery);

    const isLoading = locationsLoading || (userRole === 'master' && tenantsLoading);

    useEffect(() => {
        if (locationsError) {
            setError('Falha ao carregar os locais. Verifique as permissões.');
            console.error(locationsError);
        }
    }, [locationsError]);
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingLocation, setEditingLocation] = useState<ExtendedLocation | null>(null);
    const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
    const [deletingLocation, setDeletingLocation] = useState<ExtendedLocation | null>(null);

    const handleOpenDialogForEdit = (location: ExtendedLocation) => {
        setEditingLocation(location);
        setIsDialogOpen(true);
    };
    
    const handleOpenDialogForAdd = () => {
        if (!finalTenantId) {
          toast({ variant: 'destructive', title: 'Nenhuma empresa selecionada', description: 'Selecione uma empresa antes de adicionar um local.' });
          return;
        }
        setEditingLocation(null);
        setIsDialogOpen(true);
    };

    const handleSubmitLocation = async (data: any) => { // Alterado para any para aceitar os campos do form
        if (!firestore || !finalTenantId) {
            toast({
                variant: 'destructive',
                title: 'Erro de Autenticação',
                description: 'Não foi possível identificar a empresa. Por favor, faça login novamente.',
            });
            return;
        }

        const isEditing = !!editingLocation;

        try {
            // A localização continua funcionando via Geocode
            const { latitude, longitude } = await retryWithBackoff(() => geocodeAddress({ address: data.address }));

            // Objeto agora contempla os dados fiscais solicitados
            const locationData = {
                name: data.name,
                address: data.address,
                cnpj: data.cnpj || "",               // NOVO: CNPJ
                razaoSocial: data.razaoSocial || "", // NOVO: Razão Social
                inscricaoEstadual: data.inscricaoEstadual || "", // NOVO: IE
                latitude,
                longitude,
                updatedAt: new Date().toISOString()
            };

            if (isEditing && editingLocation?.id) {
                const docRef = doc(firestore, 'tenants', finalTenantId, 'locations', editingLocation.id);
                await updateDoc(docRef, locationData);
            } else {
                const collectionRef = collection(firestore, 'tenants', finalTenantId, 'locations');
                await addDoc(collectionRef, { ...locationData, createdAt: new Date().toISOString() });
            }
            
            toast({ title: `Filial ${isEditing ? 'atualizada' : 'adicionada'}!`, description: `A unidade "${data.razaoSocial || data.name}" foi salva com sucesso.` });
            setIsDialogOpen(false);
        } catch (error: any) {
             toast({ variant: "destructive", title: "Erro ao salvar", description: error.message });
        }
    };

    const handleOpenConfirmDeleteDialog = (location: ExtendedLocation) => {
        setDeletingLocation(location);
        setIsConfirmDeleteDialogOpen(true);
    };

    const handleDeleteLocationConfirm = async () => {
        if (!deletingLocation || !firestore || !finalTenantId) return;
        try {
            await deleteDoc(doc(firestore, 'tenants', finalTenantId, 'locations', deletingLocation.id));
            toast({ title: "Removido!", description: "Os dados foram removidos com sucesso." });
        } catch (error: any) {
             toast({ variant: "destructive", title: "Erro", description: "Não foi possível remover." });
        }
        setIsConfirmDeleteDialogOpen(false);
        setDeletingLocation(null);
    };

  return (
    <>
      {userRole === 'master' && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className='flex items-center gap-2'><Building/>Seleção de Empresa (Master)</CardTitle>
            <CardDescription>Selecione a empresa para gerenciar as filiais.</CardDescription>
          </CardHeader>
          <CardContent>
            {tenantsLoading ? (
              <p className='text-sm text-muted-foreground'>Carregando empresas...</p>
            ) : tenants && tenants.length > 0 ? (
                <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione uma empresa..." />
                    </SelectTrigger>
                    <SelectContent>
                        {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            ) : (
                <p className='text-sm text-muted-foreground'>Nenhuma empresa encontrada.</p>
            )}
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><MapPin /> Gerenciamento de Filiais e Locais</CardTitle>
            <CardDescription>Configure os dados fiscais e a geolocalização das unidades.</CardDescription>
          </div>
          <Button onClick={handleOpenDialogForAdd} disabled={!finalTenantId}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Unidade
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !finalTenantId ? (
             <div className="text-center h-40 flex items-center justify-center">
                <p>Selecione uma empresa para ver as filiais.</p>
            </div>
          ) : (
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Razão Social / Nome</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead className="hidden md:table-cell">Endereço</TableHead>
                    <TableHead className="text-right w-[100px]">Ações</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {!locations || locations.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            Nenhuma unidade cadastrada.
                        </TableCell>
                    </TableRow>
                ) : (
                    locations.map((location) => (
                    <TableRow key={location.id}>
                        <TableCell className="font-medium">
                            <div className="flex flex-col">
                                <span>{location.razaoSocial || location.name}</span>
                                <span className="text-xs text-muted-foreground">{location.name}</span>
                            </div>
                        </TableCell>
                        <TableCell>{location.cnpj || "Não informado"}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm italic">
                            {location.address}
                        </TableCell>
                        <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialogForEdit(location)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => handleOpenConfirmDeleteDialog(location)}>
                                <Trash2 className="h-4 w-4" />
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
          if (!isOpen) setEditingLocation(null);
      }}>
        <LocationForm
            location={editingLocation}
            onSubmit={handleSubmitLocation}
        />
      </Dialog>

      <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Unidade?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso removerá a filial "{deletingLocation?.razaoSocial || deletingLocation?.name}" permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLocationConfirm}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}