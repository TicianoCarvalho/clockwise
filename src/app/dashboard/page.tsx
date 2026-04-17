
"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, Clock, CheckCircle, AlertTriangle, TrendingDown, FileText } from "lucide-react";
import { WeeklyActivityChart } from "@/components/WeeklyActivityChart";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { isToday, parseISO } from 'date-fns';
import type { ClockPunch, Employee } from "@/lib/data";

// Import data directly since API routes are not available in a static export
import employeesData from '@/lib/data/json/employees.json';
import allPunches from '@/lib/data/json/punches.json';

export default function DashboardPage() {
    const [totalEmployees, setTotalEmployees] = useState(0);
    const [presentToday, setPresentToday] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        try {
            // Use imported data directly
            const employees: Employee[] = employeesData;
            setTotalEmployees(employees.length);

            const presentTodayIds = new Set(
                (allPunches as ClockPunch[])
                .filter((punch: ClockPunch) => {
                    if (!punch.timestamp) return false;
                    try {
                        // Ensure timestamp is valid ISO-8601 by replacing space with 'T'
                        const punchDate = parseISO(punch.timestamp.replace(' ', 'T'));
                        return isToday(punchDate);
                    } catch (e) { 
                        console.warn(`Invalid timestamp format for punch: ${punch.timestamp}`);
                        return false; 
                    }
                })
                .map((punch: ClockPunch) => punch.employeeId)
            );
            setPresentToday(presentTodayIds.size);

        } catch (e) {
            console.error("Error processing dashboard stats:", e);
            setTotalEmployees(0);
            setPresentToday(0);
        } finally {
            setLoading(false);
        }
    }, []);

  const stats = [
    {
      title: "Total de Colaboradores",
      value: loading ? "..." : String(totalEmployees),
      icon: Users,
      description: "Colaboradores ativos na plataforma",
    },
    {
      title: "Presentes Hoje",
      value: loading ? "..." : String(presentToday),
      icon: CheckCircle,
      description: "Colaboradores que registraram ponto",
    },
    {
      title: "Média de Horas (Sem.)",
      value: "41.5h",
      icon: Clock,
      description: "Média de horas trabalhadas por funcionário",
    },
     {
      title: "Horas Não Trabalhadas (Mês)",
      value: "48h 20m",
      icon: TrendingDown,
      description: "Soma de faltas e atrasos no mês",
      valueClassName: "text-destructive",
    },
     {
      title: "Ocorrências Encontradas",
      value: "3",
      icon: AlertTriangle,
      description: "Alertas de ponto na última semana",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Bem-vindo ao painel administrativo da ClockWise.
            </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/docs/SYSTEM_OVERVIEW.md" target="_blank">
            <FileText className="mr-2" /> Ver Documentação do Sistema
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.valueClassName || ''}`}>{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
       <WeeklyActivityChart />
    </div>
  );
}
