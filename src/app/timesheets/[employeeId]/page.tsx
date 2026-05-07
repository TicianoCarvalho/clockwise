"use client";

import {
  useState,
  useEffect,
  useMemo,
  Suspense
} from "react";

import {
  Download,
  Save,
  Loader2
} from "lucide-react";

import {
  format,
  eachDayOfInterval,
  getDay,
  parseISO,
  startOfDay,
  endOfDay
} from "date-fns";

import { ptBR } from "date-fns/locale";

import type { DateRange } from "react-day-picker";

import {
  collection,
  query,
  where,
  writeBatch
} from "firebase/firestore";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

import { Input } from "@/components/ui/input";

import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

import {
  useFirebase,
  useCollection,
  useMemoFirebase
} from "@/firebase";

import {
  useAuthContext
} from "@/contexts/auth-context";

import {
  useToast
} from "@/hooks/use-toast";

import type {
  Employee,
  ClockPunch,
  Schedule,
  Holiday,
  Afastamento
} from "@/lib/data";

// ======================================================
// TYPES
// ======================================================

interface TimesheetContentProps {
  employee: Employee;
  dateRange: DateRange;
}

type TimesheetRecord = {
  day: number;
  fullDate: string;
  weekday: string;
  schedule: string;
  entry1: string;
  exit1: string;
  entry2: string;
  exit2: string;
  justification1: string;
  justification2: string;
  justification3: string;
  justification4: string;
  worked: string;
  balance: string;
  location: string;
  isHoliday?: boolean;
};

// ======================================================
// COMPONENT
// ======================================================

function TimesheetContent({
  employee,
  dateRange
}: TimesheetContentProps) {

  const { firestore } = useFirebase();

  const { tenantId } =
    useAuthContext();

  const { toast } = useToast();

  // ======================================================
  // STATES
  // ======================================================

  const [
    serverRecords,
    setServerRecords
  ] = useState<
    TimesheetRecord[]
  >([]);

  const [
    editedRecords,
    setEditedRecords
  ] = useState<
    TimesheetRecord[]
  >([]);

  const [
    isSaving,
    setIsSaving
  ] = useState(false);

  // ======================================================
  // SCHEDULES
  // ======================================================

  const schedulesQuery =
    useMemoFirebase(() => {

      if (
        !firestore ||
        !tenantId
      ) {
        return null;
      }

      return collection(
        firestore,
        "tenants",
        tenantId,
        "schedules"
      );

    }, [firestore, tenantId]);

  const {
    data: allSchedules,
    isLoading:
      schedulesLoading
  } = useCollection<Schedule>(
    schedulesQuery
  );

  // ======================================================
  // HOLIDAYS
  // ======================================================

  const holidaysQuery =
    useMemoFirebase(() => {

      if (!firestore) {
        return null;
      }

      return collection(
        firestore,
        "holidays"
      );

    }, [firestore]);

  const {
    data: allHolidays,
    isLoading:
      holidaysLoading
  } = useCollection<Holiday>(
    holidaysQuery
  );

  // ======================================================
  // OCCURRENCES
  // ======================================================

  const occurrencesQuery =
    useMemoFirebase(() => {

      if (
        !firestore ||
        !tenantId
      ) {
        return null;
      }

      return collection(
        firestore,
        "tenants",
        tenantId,
        "occurrences"
      );

    }, [firestore, tenantId]);

  const {
    data: allOccurrences,
    isLoading:
      occurrencesLoading
  } = useCollection<Afastamento>(
    occurrencesQuery
  );

  // ======================================================
  // PUNCHES
  // ======================================================

  const punchesQuery =
    useMemoFirebase(() => {

      if (
        !firestore ||
        !tenantId ||
        !dateRange.from ||
        !dateRange.to ||
        !employee?.id
      ) {
        return null;
      }

      return query(

        collection(
          firestore,
          "tenants",
          tenantId,
          "punches"
        ),

        where(
          "employeeId",
          "==",
          employee.id
        ),

        where(
          "date",
          ">=",
          format(
            dateRange.from,
            "yyyy-MM-dd"
          )
        ),

        where(
          "date",
          "<=",
          format(
            dateRange.to,
            "yyyy-MM-dd"
          )
        )

      );

    }, [
      firestore,
      tenantId,
      employee?.id,
      dateRange
    ]);

  const {
    data: allPunches,
    isLoading:
      punchesLoading
  } = useCollection<ClockPunch>(
    punchesQuery
  );

  // ======================================================
  // LOADING
  // ======================================================

  const isLoading =
    schedulesLoading ||
    holidaysLoading ||
    occurrencesLoading ||
    punchesLoading;

  // ======================================================
  // DIRTY CHECK
  // ======================================================

  const isDirty = useMemo(() => {

    return JSON.stringify(
      serverRecords
    ) !== JSON.stringify(
      editedRecords
    );

  }, [
    serverRecords,
    editedRecords
  ]);

  // ======================================================
  // PROCESS TIMESHEET
  // ======================================================

  useEffect(() => {

    if (
      isLoading ||
      !dateRange.from ||
      !dateRange.to ||
      !allSchedules ||
      !employee?.scheduleId
    ) {
      return;
    }

    const schedule =
      allSchedules.find(
        (s) =>
          s.id ===
          employee.scheduleId
      );

    if (!schedule) {
      return;
    }

    const days =
      eachDayOfInterval({
        start: dateRange.from,
        end: dateRange.to
      });

    const newRecords:
      TimesheetRecord[] =
      days.map((day) => {

        const dayStr =
          format(
            day,
            "yyyy-MM-dd"
          );

        const dayPunches =
          (allPunches || [])
            .filter(
              (p) =>
                p.date === dayStr
            )
            .sort(
              (a, b) =>
                a.timestamp.localeCompare(
                  b.timestamp
                )
            );

        const [
          p1,
          p2,
          p3,
          p4
        ] = dayPunches;

        const daySchedule =
          schedule.workWeek?.find(
            (d: any) =>
              d.dayOfWeek ===
              getDay(day)
          );

        return {

          day:
            day.getDate(),

          fullDate:
            dayStr,

          weekday:
            format(
              day,
              "EEEE",
              {
                locale: ptBR
              }
            ),

          schedule:
            daySchedule?.isDayOff
              ? "Folga"
              : `${daySchedule?.entry1 || ""}-${daySchedule?.exit2 || ""}`,

          entry1:
            p1?.timestamp?.substring(
              11,
              16
            ) || "",

          exit1:
            p2?.timestamp?.substring(
              11,
              16
            ) || "",

          entry2:
            p3?.timestamp?.substring(
              11,
              16
            ) || "",

          exit2:
            p4?.timestamp?.substring(
              11,
              16
            ) || "",

          justification1:
            p1?.justification || "",

          justification2:
            p2?.justification || "",

          justification3:
            p3?.justification || "",

          justification4:
            p4?.justification || "",

          worked: "",

          balance: "",

          location:
            p1?.locationName || "",

          isHoliday:
            !!allHolidays?.find(
              (h) =>
                h.date === dayStr
            )
        };

      });

    setServerRecords(
      newRecords
    );

    setEditedRecords(
      JSON.parse(
        JSON.stringify(
          newRecords
        )
      )
    );

  }, [
    isLoading,
    allPunches,
    allSchedules,
    dateRange,
    employee,
    allHolidays
  ]);

  // ======================================================
  // INPUT CHANGE
  // ======================================================

  const handleInputChange = (
    fullDate: string,
    field: keyof TimesheetRecord,
    value: string
  ) => {

    setEditedRecords(
      (prev) =>
        prev.map((rec) =>
          rec.fullDate ===
          fullDate
            ? {
                ...rec,
                [field]: value
              }
            : rec
        )
    );
  };

  // ======================================================
  // SAVE
  // ======================================================

  const handleSaveChanges =
    async () => {

      if (
        !firestore ||
        !tenantId
      ) {
        return;
      }

      setIsSaving(true);

      try {

        const batch =
          writeBatch(
            firestore
          );

        // futura implementação

        await batch.commit();

        setServerRecords(
          JSON.parse(
            JSON.stringify(
              editedRecords
            )
          )
        );

        toast({
          title: "Sucesso",
          description:
            "Folha salva com sucesso."
        });

      } catch (e: any) {

        toast({
          variant:
            "destructive",
          title: "Erro",
          description:
            e.message
        });

      } finally {

        setIsSaving(false);

      }
    };

  // ======================================================
  // LOADING
  // ======================================================

  if (isLoading) {

    return (
      <div className="flex justify-center p-12">

        <Loader2 className="animate-spin h-8 w-8 text-primary" />

      </div>
    );
  }

  // ======================================================
  // RENDER
  // ======================================================

  return (

    <Card className="shadow-md">

      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">

        <div>

          <CardTitle className="text-2xl font-bold">

            Espelho de Ponto

          </CardTitle>

          <CardDescription>

            {employee?.name}
            {" "}-
            {" "}Matrícula:
            {" "}
            {employee?.matricula}

          </CardDescription>

        </div>

        <div className="flex gap-2">

          <Button
            variant="outline"
            size="sm"
          >

            <Download className="mr-2 h-4 w-4" />

            Exportar PDF

          </Button>

          <Button
            onClick={
              handleSaveChanges
            }
            disabled={
              isSaving ||
              !isDirty
            }
            size="sm"
          >

            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}

            Salvar Alterações

          </Button>

        </div>

      </CardHeader>

      <CardContent>

        <div className="rounded-md border border-slate-200 overflow-hidden">

          <Table>

            <TableHeader className="bg-slate-50">

              <TableRow>

                <TableHead className="w-[100px]">
                  Data
                </TableHead>

                <TableHead>
                  Horário
                </TableHead>

                <TableHead className="text-center">
                  Ent. 1
                </TableHead>

                <TableHead className="text-center">
                  Sai. 1
                </TableHead>

                <TableHead className="text-center">
                  Ent. 2
                </TableHead>

                <TableHead className="text-center">
                  Sai. 2
                </TableHead>

                <TableHead className="text-right">
                  Local
                </TableHead>

              </TableRow>

            </TableHeader>

            <TableBody>

              {editedRecords.map(
                (rec) => (

                  <TableRow
                    key={
                      rec.fullDate
                    }
                    className={cn(
                      rec.isHoliday &&
                        "bg-orange-50/50"
                    )}
                  >

                    <TableCell className="font-medium">

                      {format(
                        parseISO(
                          rec.fullDate +
                            "T00:00:00"
                        ),
                        "dd/MM/yy"
                      )}

                      <div className="text-[10px] text-muted-foreground uppercase">

                        {rec.weekday.substring(
                          0,
                          3
                        )}

                      </div>

                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">

                      {rec.schedule}

                    </TableCell>

                    {[
                      "entry1",
                      "exit1",
                      "entry2",
                      "exit2"
                    ].map((field) => (

                      <TableCell
                        key={field}
                        className="text-center"
                      >

                        <Input
                          type="time"
                          value={
                            rec[
                              field as keyof TimesheetRecord
                            ] as string
                          }
                          onChange={(e) =>
                            handleInputChange(
                              rec.fullDate,
                              field as keyof TimesheetRecord,
                              e.target.value
                            )
                          }
                          className="h-8 w-[85px] mx-auto text-xs"
                        />

                      </TableCell>

                    ))}

                    <TableCell className="text-right text-xs max-w-[120px] truncate">

                      {rec.location || "-"}

                    </TableCell>

                  </TableRow>

                )
              )}

            </TableBody>

          </Table>

        </div>

      </CardContent>

    </Card>
  );
}

// ======================================================
// PAGE
// ======================================================

export default function TimesheetPage() {

  const defaultRange: DateRange = {
    from: startOfDay(
      new Date()
    ),
    to: endOfDay(
      new Date()
    )
  };

  return (

    <main className="container mx-auto py-6">

      <Suspense
        fallback={
          <div className="flex h-[400px] items-center justify-center">

            <Loader2 className="animate-spin h-10 w-10 text-primary" />

          </div>
        }
      >

        {/* substituir futuramente */}
        <TimesheetContent
          employee={
            {} as Employee
          }
          dateRange={
            defaultRange
          }
        />

      </Suspense>

    </main>
  );
}

export const dynamic =
  "force-dynamic";