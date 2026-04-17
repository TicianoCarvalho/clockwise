'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Archive } from "lucide-react";

export default function DeprecatedAiReportsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Archive />
            Página Arquivada
        </CardTitle>
        <CardDescription>
            Esta funcionalidade foi movida ou substituída.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>Por favor, utilize as novas opções de relatório no menu de navegação.</p>
      </CardContent>
    </Card>
  );
}
