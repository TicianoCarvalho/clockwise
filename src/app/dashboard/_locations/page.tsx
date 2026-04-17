"use client";

import { useState } from "react";
import { Edit, MapPin, PlusCircle, Trash2 } from "lucide-react";
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
import { LocationForm } from "@/components/LocationForm";
import { useToast } from "@/hooks/use-toast";

export type Location = {
  id: string;
  name: string;
  address: string;
};

const initialLocations: Location[] = [
    { id: '1', name: 'Matriz - São Paulo', address: 'Av. Paulista, 1000, São Paulo, SP' },
    { id: '2', name: 'Filial - Rio de Janeiro', address: 'Av. Rio Branco, 1, Rio de Janeiro, RJ' },
    { id: '3', name: 'Escritório - Home Office', address: 'Remoto' },
];

export default function LocationsPage() {
    const [locations, setLocations] = useState<Location[]>(initialLocations);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingLocation, setEditingLocation] = useState<Location | null>(null);
    const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
    const [deletingLocation, setDeletingLocation] = useState<Location | null>(null);
    const { toast } = useToast();

    const handleOpenDialogForEdit = (location: Location) => {
        setEditingLocation(location);
        setIsDialogOpen(true);
    };
    
    const handleOpenDialogForAdd = () => {
        setEditingLocation(null);
        setIsDialogOpen(true);
    };

    const handleSubmitLocation = (data: Omit<Location, 'id'>) => {
        if (editingLocation) {
            setLocations(locations.map(l => l.id === editingLocation.id ? { ...editingLocation, ...data } : l));
            toast({ title: "Local atualizado!", description: `O local "${data.name}" foi atualizado com sucesso.` });
        } else {
            const newLocation = { ...data, id: String(Date.now()) };
            setLocations([...locations, newLocation]);
            toast({ title: "Local adicionado!", description: `O local "${data.name}" foi adicionado com sucesso.` });
        }
        setIsDialogOpen(false);
    };

    const handleOpenConfirmDeleteDialog = (location: Location) => {
        setDeletingLocation(location);
        setIsConfirmDeleteDialogOpen(true);
    };

    const handleDeleteLocation = () => {
        if (!deletingLocation) return;
        setLocations(locations.filter(l => l.id !== deletingLocation.id));
        toast({ title: "Local removido!", description: `O local "${deletingLocation.name}" foi removido com sucesso.` });
        setIsConfirmDeleteDialogOpen(false);
        setDeletingLocation(null);
    };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Gerenciamento de Locais</CardTitle>
            <CardDescription>Adicione, edite e gerencie os locais de trabalho.</CardDescription>
          </div>
          <Button onClick={handleOpenDialogForAdd}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Local
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome do Local</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead className="hidden md:table-cell">Mapa</TableHead>
                <TableHead className="text-right w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((location) => (
                  <TableRow key={location.id}>
                      <TableCell className="font-medium">{location.name}</TableCell>
                      <TableCell>{location.address}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {location.address !== 'Remoto' ? (
                            <a 
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address)}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary hover:underline"
                            >
                                <MapPin className="h-4 w-4" />
                                <span>Ver no mapa</span>
                            </a>
                        ) : (
                            <span className="text-sm text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialogForEdit(location)}>
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                        </Button>
                        <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => handleOpenConfirmDeleteDialog(location)}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Remover</span>
                        </Button>
                      </TableCell>
                  </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <LocationForm
            location={editingLocation}
            onSubmit={handleSubmitLocation}
        />
      </Dialog>
      <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Isso removerá permanentemente o local
              &quot;{deletingLocation?.name}&quot; dos seus registros.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLocation}>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
