"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"

const chartData = [
  { day: "Segunda", worked: 8, extra: 1, absences: 0.25 },
  { day: "Terça", worked: 7.5, extra: 0, absences: 0.5 },
  { day: "Quarta", worked: 8, extra: 0.5, absences: 0 },
  { day: "Quinta", worked: 6, extra: 0, absences: 2 },
  { day: "Sexta", worked: 9, extra: 1, absences: 0 },
  { day: "Sábado", worked: 4, extra: 4, absences: 0 },
  { day: "Domingo", worked: 0, extra: 0, absences: 0 },
];

const chartConfig = {
  worked: {
    label: "Horas Trabalhadas",
    color: "hsl(var(--chart-1))",
  },
  extra: {
    label: "Horas Extras",
    color: "hsl(var(--chart-2))",
  },
  absences: {
    label: "Faltas/Atrasos",
    color: "hsl(var(--destructive))",
  },
} satisfies ChartConfig

export function WeeklyActivityChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Visão Geral da Semana</CardTitle>
        <CardDescription>Atividade da equipe nos últimos 7 dias.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-64 w-full">
          <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="day"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <YAxis
              tickFormatter={(value) => `${value}h`}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="worked" fill="var(--color-worked)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="extra" fill="var(--color-extra)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="absences" fill="var(--color-absences)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
