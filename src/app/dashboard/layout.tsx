"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookCheck,
  Briefcase,
  Building,
  CalendarClock,
  Calculator,
  Clock,
  Cog,
  HardDrive,
  LayoutDashboard,
  LogOut,
  Network,
  ShieldAlert,
  Users,
  UserX,
  FileArchive,
  ClipboardCheck,
  CalendarDays,
  ClipboardEdit,
  Scaling,
  Gavel,
  BarChart,
  UploadCloud,
  PieChart,
  Headset,
  Loader2,
} from "lucide-react";

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { useFirebase } from "@/firebase";
import { signOut } from "firebase/auth";
import { AuthProvider, type AuthContextType } from '@/contexts/auth-context';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";


const allMenuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ['master', 'admin', 'responsavel', 'usuario'] },
  { href: "/dashboard/admin/stats", label: "Painel Master", icon: BarChart, roles: ['master'] },
  { href: "/dashboard/companies", label: "Gerenciar Empresas", icon: ShieldAlert, roles: ['master'] },
  { href: "/dashboard/company", label: "Dados da Empresa", icon: Building, roles: ['admin'] },
  { href: "/dashboard/employees", label: "Funcionários", icon: Users, roles: ['master', 'admin'] },
  { href: "/dashboard/sectors", label: "Setores", icon: Network, roles: ['master', 'admin'] },
  { href: "/dashboard/schedules", label: "Horários", icon: CalendarClock, roles: ['master', 'admin'] },
  { href: "/dashboard/scales", label: "Escalas", icon: Scaling, roles: ['master', 'admin'] },
  { href: "/dashboard/roles", label: "Funções (Cargos)", icon: Briefcase, roles: ['master', 'admin'] },
  { href: "/dashboard/devices", label: "Dispositivos", icon: HardDrive, roles: ['master', 'admin'] },
  { href: "/dashboard/timesheets", label: "Folhas de Ponto", icon: BookCheck, roles: ['master', 'admin', 'responsavel'] },
  { href: "/dashboard/occurrences", label: "Afastamentos", icon: UserX, roles: ['master', 'admin', 'responsavel'] },
  { href: "/dashboard/justifications", label: "Justificativas", icon: ClipboardCheck, roles: ['master', 'admin'] },
  { href: "/dashboard/holidays", label: "Feriados", icon: CalendarDays, roles: ['master', 'admin'] },
  { href: "/dashboard/reports/accounting", label: "Relatório Contábil", icon: Calculator, roles: ['master', 'admin', 'responsavel'] },
  { href: "/dashboard/reports/aej-generator", label: "Gerador AEJ", icon: FileArchive, roles: ['master', 'admin'] },
  { href: "/dashboard/analise", label: "Análise de Produtividade", icon: PieChart, roles: ['master', 'admin', 'responsavel'] },
  { href: "/dashboard/settings/import", label: "Importação AFD", icon: UploadCloud, roles: ['master', 'admin'] },
  { href: "/dashboard/rules", label: "Regras de Cálculo", icon: Gavel, roles: ['master', 'admin'] },
  { href: "/dashboard/support", label: "Suporte WhatsApp", icon: Headset, roles: ['master', 'admin'] },
  { href: "/dashboard/settings", label: "Configurações", icon: Cog, roles: ['master', 'admin'] },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const { auth, firestore, user, isUserLoading } = useFirebase();
  const { toast } = useToast();

  const [authContextValue, setAuthContextValue] = useState<AuthContextType>({
    userRole: null,
    tenantId: null,
    isAuthLoading: true,
  });

  useEffect(() => {
    setIsClient(true);
    if (user && firestore && auth) {
      // Fast path for superuser
      if (user.email === 'admin@clockwise.com') {
        setAuthContextValue({ userRole: 'master', tenantId: null, isAuthLoading: false });
        return;
      }
      
      // For other users, get profile directly from Firestore for reliability
      getDoc(doc(firestore, 'users', user.uid)).then((docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setAuthContextValue({
            userRole: userData.role || 'usuario',
            tenantId: userData.tenantId || null,
            isAuthLoading: false,
          });
        } else {
          console.error("User profile not found in Firestore. Logging out.");
          toast({
            variant: "destructive",
            title: "Erro de Perfil",
            description: "Seu perfil de usuário não foi encontrado ou está incompleto. Contate o suporte.",
            duration: 8000
          });
          signOut(auth);
        }
      }).catch(error => {
        console.error("Error fetching user profile:", error);
        toast({
            variant: "destructive",
            title: "Erro de Conexão",
            description: "Não foi possível verificar seu perfil. Tente novamente.",
        });
        signOut(auth);
      });

    } else if (!isUserLoading) {
      setAuthContextValue({ userRole: null, tenantId: null, isAuthLoading: false });
      router.push('/login');
    }
  }, [user, isUserLoading, firestore, auth, router, toast]);

  const handleLogout = () => {
    if (auth) {
        signOut(auth).then(() => {
            router.push('/');
        });
    }
  };
  
  const menuItems = allMenuItems.filter(item => {
    if (!authContextValue.userRole) return false;
    // The master user should not see the singular company data link.
    if (authContextValue.userRole === 'master' && item.href === '/dashboard/company') {
        return false;
    }
    // A regular admin should not see the master admin panels.
    if (authContextValue.userRole !== 'master' && (item.href === '/dashboard/admin/stats' || item.href === '/dashboard/companies')) {
        return false;
    }
    return item.roles.includes(authContextValue.userRole);
  });

  if (authContextValue.isAuthLoading) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-16 w-16 animate-spin" />
        </div>
    );
  }

  return (
    <AuthProvider value={authContextValue}>
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-7 w-7 text-primary" />
              <span className="text-xl font-semibold text-primary" suppressHydrationWarning>ClockWise</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isClient ? (pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard')) : false}
                    tooltip={item.label}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <div className="flex items-center justify-between gap-3 rounded-md border p-2">
              <div className="flex items-center gap-3 overflow-hidden">
                  <Avatar className="h-9 w-9">
                  <AvatarImage src={user?.photoURL || undefined} data-ai-hint="profile picture" alt="Admin avatar" />
                  <AvatarFallback>{user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'A'}</AvatarFallback>
                  </Avatar>
                  <div className="overflow-hidden">
                      <p className="truncate text-sm font-medium">{user?.displayName || "Administrador"}</p>
                      <p className="truncate text-xs text-muted-foreground">{user?.email || "admin@empresa.com"}</p>
                  </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="shrink-0">
                  <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6 md:hidden">
              <SidebarTrigger />
              <div className="flex items-center gap-2">
                <Clock className="h-6 w-6 text-primary" />
                <span className="text-lg font-semibold text-primary" suppressHydrationWarning>ClockWise</span>
              </div>
          </header>
          <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </AuthProvider>
  );
}
