"use client"

import * as React from "react"
import { format, parse, isValid } from "date-fns"
import { ja } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  value?: string | null
  onChange?: (value: string | null) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function DatePicker({
  value,
  onChange,
  placeholder = "日付を選択",
  className,
  disabled = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  // Parse string date to Date object
  const dateValue = React.useMemo(() => {
    if (!value) return undefined
    // Try multiple formats
    const formats = ["yyyy-MM-dd", "yyyy/MM/dd", "yyyy年MM月dd日"]
    for (const fmt of formats) {
      const parsed = parse(value, fmt, new Date())
      if (isValid(parsed)) {
        return parsed
      }
    }
    return undefined
  }, [value])

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onChange?.(format(date, "yyyy-MM-dd"))
    } else {
      onChange?.(null)
    }
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-[130px] justify-start text-left font-normal h-8 px-2",
            !dateValue && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-1 h-3 w-3" />
          {dateValue ? format(dateValue, "yyyy/MM/dd", { locale: ja }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={handleSelect}
          locale={ja}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
