"use client";

import { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function formatYyyyMd(date: Date | undefined) {
  if (!date) return "";
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}.${m}.${d}`;
}

interface DatePickerFieldProps {
  label: string;
  value: string | null | undefined;
  onChange: (value: string | null) => Promise<void>;
  placeholder?: string;
}

export function DatePickerField({
  label,
  value,
  onChange,
  placeholder = "選択してください",
}: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = async (d: Date | undefined) => {
    const dateValue = d
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      : null;
    try {
      await onChange(dateValue);
    } catch (error) {
      console.error("DatePickerField: onChange failed", error);
    } finally {
      setOpen(false);
    }
  };

  const selectedDate = value ? new Date(value + "T00:00:00") : undefined;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? formatYyyyMd(selectedDate) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
