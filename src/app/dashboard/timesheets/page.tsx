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
import { collection, doc } from "firebase/firestore";

export default function TimesheetsPage() {
    const { firestore } = useFirebase();
    const { tenantId } = useAuthContext();
    const { toast } = useToast();

    // Fetch employees and company info from Firestore
    const employeesQuery = useMemoFirebase(() => tenantId ? collection(firestore, 'tenants', tenantId, 'employees') : null, [firestore, tenantId]);
    const { data: employees, isLoading: employeesLoading } = useCollection<Employee>(employeesQuery);
    
    const companyQuery = useMemoFirebase(() => tenantId ? doc(firestore, 'tenants', tenantId) : null, [firestore, tenantId]);
    const { data: companyInfo, isLoading: companyLoading } = useDoc<Company>(companyQuery);

    const loading = employeesLoading || companyLoading;

    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(undefined);

    const [currentSearch, setCurrentSearch] = useState<{employee: Employee | null, dateRange: DateRange | undefined}>({
        employee: null,
        dateRange: undefined,
    });
    
    // Effect to set initial state once data is loaded
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
            <Card>
                <CardHeader>
                    <CardTitle>Folha de Ponto Eletrônica</CardTitle>
                    <CardDescription>Selecione o colaborador e o período para visualizar e gerenciar a folha de ponto.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-4">
                    {loading ? (
                        <div className="flex items-center justify-center w-full h-10">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <>
                            <div className="flex-1 space-y-2">
                                <label htmlFor="employee-select" className="text-sm font-medium">Colaborador</label>
                                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                                    <SelectTrigger id="employee-select">
                                        <SelectValue placeholder="Selecione um colaborador" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(employees || []).map(employee => (
                                            <SelectItem key={employee.matricula} value={employee.matricula}>{employee.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex-1 space-y-2">
                                <label htmlFor="month-select" className="text-sm font-medium">Período</label>
                                <DatePickerWithRange date={selectedDateRange} setDate={setSelectedDateRange} />
                            </div>
                            <div className="flex items-end">
                                <Button onClick={handleSearch} disabled={!selectedEmployeeId || !selectedDateRange}><Search className="mr-2 h-4 w-4"/>Buscar</Button>
                            </div>
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
