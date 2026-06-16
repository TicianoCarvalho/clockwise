'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Wrench } from "lucide-react";

// Adicionamos um export padrão limpo e garantimos que o componente seja exportado corretamente
export default function AbsencesReportPage() {
  return (
    <div className="p-6"> {/* Adicionado um wrapper para garantir o espaçamento no layout */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Página em Manutenção
          </CardTitle>
          <CardDescription>
              Esta área de relatórios está sendo reconstruída para melhor atendê-lo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Em breve, você encontrará aqui novos relatórios de produtividade e análises. 
            Agradecemos a sua compreensão.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}