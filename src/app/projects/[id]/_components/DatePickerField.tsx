"use client";

import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";

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
  const handleChange = async (val: string | null) => {
    try {
      await onChange(val);
    } catch (error) {
      console.error("DatePickerField: onChange failed", error);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <DatePicker
        value={value ?? null}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full"
      />
    </div>
  );
}
