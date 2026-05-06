import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MapPin, Users, UploadCloud, ArrowRight } from "lucide-react";

const settings = [
    {
        title: "Filiais (Locais)",
        description: "Cadastre e gerencie as unidades de trabalho.",
        href: "/dashboard/settings/locations",
        icon: MapPin,
    },
    {
        title: "Usuários e Permissões",
        description: "Gerencie os acessos de administradores.",
        href: "/dashboard/settings/users",
        icon: Users,
    },
    {
        title: "Suporte e Canais",
        description: "Configure WhatsApp, E-mail e Central de Ajuda.",
        href: "/dashboard/settings/support", // Caminho que chama a sua API v1
        icon: UploadCloud,
    },
]

export default function SettingsPage() {
    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold">Configurações</h1>
                <p className="text-muted-foreground">
                    Gerencie as configurações gerais do sistema.
                </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {settings.map((setting) => (
                    <Link href={setting.href} key={setting.href} className="flex">
                        <Card className="hover:border-primary/50 hover:shadow-md transition-all w-full flex flex-col">
                            <CardHeader>
                                <div className="flex items-center gap-4">
                                     <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                                        <setting.icon className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle>{setting.title}</CardTitle>
                                        <CardDescription>{setting.description}</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow flex items-end justify-end pt-0">
                                <ArrowRight className="h-5 w-5 text-muted-foreground" />
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}