"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { doc, getDoc, setDoc } from "firebase/firestore";
import { firestore } from "@/firebase";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Headset, Loader2, Copy } from "lucide-react";
import { Separator } from "@/components/ui/separator";

// ======================================================
// VALIDATION
// ======================================================

const supportSettingsSchema = z.object({
  whatsappNumber: z
    .string()
    .min(10, "Número inválido. Inclua o código do país, ex: +55119..."),
  widgetEnabled: z.boolean(),
});

type FormValues = z.infer<typeof supportSettingsSchema>;

// ======================================================
// PAGE
// ======================================================

export default function SupportPage() {
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(supportSettingsSchema),
    defaultValues: {
      whatsappNumber: "",
      widgetEnabled: false,
    },
  });

  // ======================================================
  // LOAD FROM FIRESTORE
  // ======================================================

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const ref = doc(firestore, "support_settings", "global");
        const snap = await getDoc(ref);

        if (snap.exists()) {
          form.reset(snap.data() as FormValues);
        }
      } catch (error) {
        console.error(error);

        toast({
          variant: "destructive",
          title: "Erro ao Carregar",
          description:
            "Não foi possível buscar as configurações de suporte.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [form, toast]);

  // ======================================================
  // SAVE TO FIRESTORE
  // ======================================================

  const onSubmit = async (data: FormValues) => {
    setLoading(true);

    try {
      const ref = doc(firestore, "support_settings", "global");

      await setDoc(ref, data, { merge: true });

      toast({
        title: "Configurações Salvas!",
        description: "As configurações de suporte foram atualizadas.",
      });
    } catch (error) {
      console.error(error);

      toast({
        variant: "destructive",
        title: "Erro ao Salvar",
        description:
          "Não foi possível salvar as configurações.",
      });
    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // COPY LINK
  // ======================================================

  const handleCopyLink = () => {
    const number = form.getValues("whatsappNumber").replace(/\D/g, "");

    const text = encodeURIComponent(
      "Olá! Preciso de ajuda com o sistema ClockWise."
    );

    const link = `https://wa.me/${number}?text=${text}`;

    navigator.clipboard.writeText(link);

    toast({
      title: "Link Copiado!",
      description: "O link de suporte do WhatsApp foi copiado.",
    });
  };

  // ======================================================
  // UI
  // ======================================================

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Headset /> Configurações de Suporte
        </CardTitle>

        <CardDescription>
          Gerencie as opções de suporte via WhatsApp para os seus usuários.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-8"
            >
              {/* ============================ */}
              {/* CANAL PRINCIPAL */}
              {/* ============================ */}

              <div>
                <h3 className="text-lg font-medium">
                  Canal Principal
                </h3>

                <p className="text-sm text-muted-foreground">
                  Configure o número principal para receber suporte.
                </p>
              </div>

              <FormField
                control={form.control}
                name="whatsappNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Número do WhatsApp
                    </FormLabel>

                    <FormControl>
                      <Input
                        placeholder="+5511999998888"
                        {...field}
                      />
                    </FormControl>

                    <FormDescription>
                      Inclua código do país (+55) e DDD.
                    </FormDescription>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="button"
                variant="outline"
                onClick={handleCopyLink}
                disabled={!form.watch("whatsappNumber")}
              >
                <Copy className="mr-2" /> Copiar Link de Suporte
              </Button>

              <Separator />

              {/* ============================ */}
              {/* WIDGET */}
              {/* ============================ */}

              <div>
                <h3 className="text-lg font-medium">
                  Widget de Chat Flutuante
                </h3>

                <p className="text-sm text-muted-foreground">
                  Ícone do WhatsApp no canto inferior direito.
                </p>
              </div>

              <FormField
                control={form.control}
                name="widgetEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Habilitar Widget
                      </FormLabel>

                      <FormDescription>
                        Exibe suporte flutuante em todas as páginas.
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

              {/* ============================ */}
              {/* SAVE */}
              {/* ============================ */}

              <div className="flex justify-end">
                <Button type="submit" disabled={loading}>
                  {loading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Salvar Configurações
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}