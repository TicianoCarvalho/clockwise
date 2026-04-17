"use client";

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function RecuperarSenhaPage() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2">
            <AlertCircle className="h-8 w-8" />
            Recuperação de Senha
          </CardTitle>
          <CardDescription>
            Funcionalidade em manutenção.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Por favor, contate o administrador do sistema ou o seu RH para solicitar o reset da sua senha.
          </p>
          <Button asChild>
            <Link href="/ponto/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para a Página de Login
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

    