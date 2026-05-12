"use client";

import { useState } from "react";
import {
  Edit,
  PlusCircle,
  Trash2,
  Loader2,
  ClipboardCheck
} from "lucide-react";

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

import { JustificationForm } from "@/components/JustificationForm";

import { useToast } from "@/hooks/use-toast";

import type { Justification } from "@/lib/data";

import {
  useFirebase,
  useCollection,
  useMemoFirebase
} from "@/firebase";

import { useAuthContext } from "@/contexts/auth-context";

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp
} from "firebase/firestore";

export default function JustificationsPage() {

  const { toast } = useToast();

  const { firestore } = useFirebase();

  const { userData } = useAuthContext();

  // QUERY TENANT
  const justificationsQuery =
    useMemoFirebase(() => {

      if (!firestore || !userData?.tenantId) {
        return null;
      }

      return query(
        collection(
          firestore,
          "justifications"
        ),
        where(
          "tenantId",
          "==",
          userData.tenantId
        )
      );

    }, [
      firestore,
      userData?.tenantId
    ]);

  const {
    data: justifications,
    isLoading: loading
  } =
    useCollection<Justification>(
      justificationsQuery
    );

  const [
    isDialogOpen,
    setIsDialogOpen
  ] = useState(false);

  const [
    editingJustification,
    setEditingJustification
  ] = useState<Justification | null>(null);

  const [
    isConfirmDeleteDialogOpen,
    setIsConfirmDeleteDialogOpen
  ] = useState(false);

  const [
    deletingJustification,
    setDeletingJustification
  ] = useState<Justification | null>(null);

  // EDIT
  const handleOpenDialogForEdit = (
    justification: Justification
  ) => {

    setEditingJustification(
      justification
    );

    setIsDialogOpen(true);
  };

  // ADD
  const handleOpenDialogForAdd =
    () => {

      setEditingJustification(null);

      setIsDialogOpen(true);
    };

  // SUBMIT
  const handleSubmitJustification =
    async (
      formData:
      Omit<Justification, 'id'>
    ) => {

      if (
        !firestore ||
        !userData?.tenantId
      ) {

        toast({
          variant: 'destructive',
          title: 'Erro de Permissão',
          description:
            'Não foi possível identificar sua empresa.',
        });

        return;
      }

      const isEditing =
        !!editingJustification;

      try {

        const justificationData = {

          ...formData,

          tenantId:
            userData.tenantId,

          updatedAt:
            serverTimestamp(),
        };

        // UPDATE
        if (
          isEditing &&
          editingJustification?.id
        ) {

          const docRef = doc(
            firestore,
            "justifications",
            editingJustification.id
          );

          await updateDoc(
            docRef,
            justificationData
          );

        } else {

          // CREATE
          const collectionRef =
            collection(
              firestore,
              "justifications"
            );

          await addDoc(
            collectionRef,
            {
              ...justificationData,
              createdAt:
                serverTimestamp(),
            }
          );
        }

        toast({

          title:
            `Justificativa ${isEditing ? 'atualizada' : 'adicionada'}!`,

          description:
            `A justificativa "${formData.name}" foi salva com sucesso.`,
        });

        setIsDialogOpen(false);

      } catch (error: any) {

        console.error(error);

        toast({
          variant: "destructive",
          title: "Erro",
          description:
            "Falha ao salvar os dados.",
        });
      }
    };

  // DELETE
  const handleDeleteJustificationConfirm =
    async () => {

      if (
        !deletingJustification ||
        !firestore
      ) {
        return;
      }

      try {

        const docRef = doc(
          firestore,
          "justifications",
          deletingJustification.id
        );

        await deleteDoc(docRef);

        toast({

          title:
            "Justificativa removida!",

          description:
            `A justificativa "${deletingJustification.name}" foi removida.`,
        });

      } catch (error: any) {

        console.error(error);

        toast({
          variant: "destructive",
          title: "Erro",
          description:
            "Não foi possível remover o registro.",
        });
      }

      setIsConfirmDeleteDialogOpen(false);

      setDeletingJustification(null);
    };

  return (

    <>

      <Card>

        <CardHeader className="flex flex-row items-center justify-between">

          <div>

            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck />
              Justificativas
            </CardTitle>

            <CardDescription>
              Gerencie os motivos para abonos e ajustes de ponto.
            </CardDescription>

          </div>

          <Button
            onClick={
              handleOpenDialogForAdd
            }
          >

            <PlusCircle className="mr-2 h-4 w-4" />

            Nova Justificativa

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

                  <TableHead>
                    Nome
                  </TableHead>

                  <TableHead>
                    Descrição
                  </TableHead>

                  <TableHead className="text-right w-[100px]">
                    Ações
                  </TableHead>

                </TableRow>

              </TableHeader>

              <TableBody>

                {!justifications ||
                justifications.length === 0 ? (

                  <TableRow>

                    <TableCell
                      colSpan={3}
                      className="h-24 text-center text-muted-foreground"
                    >

                      Nenhuma justificativa cadastrada para esta empresa.

                    </TableCell>

                  </TableRow>

                ) : (

                  justifications.map(
                    (justification) => (

                      <TableRow
                        key={justification.id}
                      >

                        <TableCell className="font-medium">

                          {justification.name}

                        </TableCell>

                        <TableCell className="max-w-xs truncate">

                          {justification.description}

                        </TableCell>

                        <TableCell className="text-right">

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleOpenDialogForEdit(
                                justification
                              )
                            }
                          >

                            <Edit className="h-4 w-4" />

                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="hover:text-destructive"
                            onClick={() => {

                              setDeletingJustification(
                                justification
                              );

                              setIsConfirmDeleteDialogOpen(
                                true
                              );
                            }}
                          >

                            <Trash2 className="h-4 w-4" />

                          </Button>

                        </TableCell>

                      </TableRow>
                    )
                  )
                )}

              </TableBody>

            </Table>
          )}

        </CardContent>

      </Card>

      {/* FORM */}

      <Dialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      >

        <JustificationForm
          justification={
            editingJustification
          }
          onSubmit={
            handleSubmitJustification
          }
        />

      </Dialog>

      {/* DELETE */}

      <AlertDialog
        open={
          isConfirmDeleteDialogOpen
        }
        onOpenChange={
          setIsConfirmDeleteDialogOpen
        }
      >

        <AlertDialogContent>

          <AlertDialogHeader>

            <AlertDialogTitle>
              Excluir Justificativa?
            </AlertDialogTitle>

            <AlertDialogDescription>

              Tem certeza que deseja remover &quot;
              {deletingJustification?.name}
              &quot;?

              Ajustes de ponto que já utilizam esta justificativa podem ser afetados.

            </AlertDialogDescription>

          </AlertDialogHeader>

          <AlertDialogFooter>

            <AlertDialogCancel>
              Cancelar
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={
                handleDeleteJustificationConfirm
              }
            >

              Confirmar

            </AlertDialogAction>

          </AlertDialogFooter>

        </AlertDialogContent>

      </AlertDialog>

    </>
  );
}