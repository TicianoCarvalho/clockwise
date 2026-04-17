
'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Wrench } from "lucide-react";

export default function AbsencesReportPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Wrench />
            Página em Manutenção
        </CardTitle>
        <CardDescription>
            Esta área de relatórios está sendo reconstruída para melhor atendê-lo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>Em breve, você encontrará aqui novos relatórios de produtividade e análises. Agradecemos a sua compreensão.</p>
      </CardContent>
    </Card>
  );
}
