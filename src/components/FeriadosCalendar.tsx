"use client"
import { useState, useEffect } from 'react'
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ptBR } from 'date-fns/locale'

interface FeriadosCalendarProps {
  initialDate?: Date;
  onDateChange: (date: Date | undefined) => void;
}

export default function FeriadosCalendar({ initialDate, onDateChange }: FeriadosCalendarProps) {
  const [date, setDate] = useState<Date | undefined>(initialDate);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setDate(initialDate);
  }, [initialDate]);

  const handleSelect = (d: Date | undefined) => {
    setDate(d);
    onDateChange(d);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP", { locale: ptBR }) : <span>Escolha uma data...</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          captionLayout="dropdown"
          fromYear={2020}
          toYear={2030}
          initialFocus
          className="rounded-md border"
          locale={ptBR}
        />
      </PopoverContent>
    </Popover>
  )
}
