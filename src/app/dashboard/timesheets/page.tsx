"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Loader2 } from "lucide-react";
import { startOfMonth, endOfMonth } from "date-fns";
import { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { TimesheetPanel } from "@/components/TimesheetPanel";
import type { Employee, Company } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { useFirebase, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { useAuthContext } from "@/contexts/auth-context";
import { collection, doc, query, where } from "firebase/firestore";

export default function TimesheetsPage() {
    const { firestore } = useFirebase();
    const { userData } = useAuthContext();
    const tenantId = userData?.tenantId;
    const { toast } = useToast();

    // 1. Alterado: Busca funcionários na coleção raiz com filtro de tenantId
    const employeesQuery = useMemoFirebase(() => {
        if (!firestore || !tenantId) return null;
        return query(
            collection(firestore, 'employees'), 
            where('tenantId', '==', tenantId)
        );
    }, [firestore, tenantId]);
    
    const { data: employees, isLoading: employeesLoading } = useCollection<Employee>(employeesQuery);
    
    // 2. Alterado: Busca info da empresa na coleção raiz 'companies' (ou 'tenants')
    const companyQuery = useMemoFirebase(() => 
        (firestore && tenantId) ? doc(firestore, 'companies', tenantId) : null, 
    [firestore, tenantId]);
    const { data: companyInfo, isLoading: companyLoading } = useDoc<Company>(companyQuery);

    const loading = employeesLoading || companyLoading;

    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(undefined);

    const [currentSearch, setCurrentSearch] = useState<{employee: Employee | null, dateRange: DateRange | undefined}>({
        employee: null,
        dateRange: undefined,
    });
    
    useEffect(() => {
        if (!loading && employees && employees.length > 0) {
            const initialDateRange = {
                from: startOfMonth(new Date()),
                to: endOfMonth(new Date()),
            };
            setSelectedDateRange(initialDateRange);

            if (employees.length > 0 && !selectedEmployeeId) {
                const defaultEmployee = employees[0];
                setSelectedEmployeeId(defaultEmployee.matricula);
                setCurrentSearch({
                    employee: defaultEmployee,
                    dateRange: initialDateRange
                });
            }
        }
    }, [loading, employees, selectedEmployeeId]);
    
    const handleSearch = () => {
        if (!employees) return;
        const employee = employees.find(e => e.matricula === selectedEmployeeId);
        setCurrentSearch({
            employee: employee || null,
            dateRange: selectedDateRange
        });
    }
    
    return (
        <div className="flex flex-col gap-4">
            <Card className="border-none shadow-sm">
                <CardHeader>
                    <CardTitle className="text-xl">Folha de Ponto Eletrônica</CardTitle>
                    <CardDescription>Selecione o colaborador e o período para gerenciar os registros.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col md:flex-row gap-4 items-end">
                    {loading ? (
                        <div className="flex items-center justify-center w-full h-10">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : (
                        <>
                            <div className="flex-1 space-y-2 w-full">
                                <label htmlFor="employee-select" className="text-sm font-semibold text-slate-700">Colaborador</label>
                                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                                    <SelectTrigger id="employee-select" className="bg-white">
                                        <SelectValue placeholder="Selecione um colaborador" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(employees || []).map(employee => (
                                            <SelectItem key={employee.matricula} value={employee.matricula}>
                                                {employee.name} ({employee.matricula})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex-1 space-y-2 w-full">
                                <label className="text-sm font-semibold text-slate-700">Período de Apuração</label>
                                <DatePickerWithRange date={selectedDateRange} setDate={setSelectedDateRange} />
                            </div>
                            <Button 
                                onClick={handleSearch} 
                                disabled={!selectedEmployeeId || !selectedDateRange}
                                className="w-full md:w-auto"
                            >
                                <Search className="mr-2 h-4 w-4"/>
                                Visualizar Ponto
                            </Button>
                        </>
                    )}
                </CardContent>
            </Card>
            
            {currentSearch.employee && currentSearch.dateRange?.from && companyInfo && (
                 <TimesheetPanel 
                    key={`${currentSearch.employee.matricula}-${currentSearch.dateRange.from.toISOString()}`}
                    employee={currentSearch.employee} 
                    dateRange={currentSearch.dateRange} 
                    companyInfo={companyInfo} 
                 />
            )}
        </div>
    )
}