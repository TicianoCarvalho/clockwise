
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFoundPage({ searchParams }: { searchParams: { cpf: string } }) {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2 text-destructive">
            <AlertTriangle className="h-8 w-8" />
            Colaborador Não Encontrado
          </CardTitle>
          <CardDescription>
            Nenhum colaborador foi encontrado com o CPF: {searchParams.cpf || 'Não informado'}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Por favor, verifique se o CPF está correto ou entre em contato com o administrador.
          </p>
          <Button asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para a Página Inicial
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
