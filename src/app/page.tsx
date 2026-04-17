import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, LogIn, User, MonitorSmartphone } from 'lucide-react';

export default function Home() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <div className="flex flex-col items-center justify-center space-y-4 text-center">
        <div className="flex items-center gap-3">
          <Clock className="h-12 w-12 text-primary" />
          <h1 className="text-5xl font-bold tracking-tighter text-primary sm:text-6xl">
            ClockWise
          </h1>
        </div>
        <p className="max-w-md text-muted-foreground md:text-xl">
          Controle de ponto eletrônico inteligente e em conformidade port. 671
        </p>
      </div>

      <div className="mt-12 grid max-w-5xl gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <User className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="mt-4">Área do Colaborador</CardTitle>
            <CardDescription>
              Acesse para registrar seu ponto via CPF e senha em seu celular.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow" />
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/ponto/login">Login do Colaborador</Link>
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="flex flex-col">
          <CardHeader>
             <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                <MonitorSmartphone className="h-6 w-6 text-secondary-foreground" />
            </div>
            <CardTitle className="mt-4">Modo KIOSK</CardTitle>
            <CardDescription>
              Registro de ponto facial em dispositivos compartilhados e autorizados.
            </CardDescription>
          </CardHeader>
           <CardContent className="flex-grow" />
          <CardFooter>
            <Button asChild variant="secondary" className="w-full">
              <Link href="/quiosque/auth">Acessar KIOSK</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="flex flex-col md:col-span-2 lg:col-span-1">
          <CardHeader>
             <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                <LogIn className="h-6 w-6 text-accent" />
            </div>
            <CardTitle className="mt-4">Painel Administrativo</CardTitle>
            <CardDescription>
              Gerencie empresas, funcionários, relatórios e configurações.
            </CardDescription>
          </CardHeader>
           <CardContent className="flex-grow" />
          <CardFooter>
            <Button asChild variant="secondary" className="w-full bg-accent/90 text-accent-foreground hover:bg-accent">
              <Link href="/login">Login do Administrador</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
