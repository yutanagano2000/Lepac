"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];

interface TimeInputProps {
  value: string | null;
  onChange: (time: string | null) => void;
  label: string;
  className?: string;
}

export function TimeInput({ value, onChange, label, className }: TimeInputProps) {
  const [hour, minute] = value ? value.split(":") : ["", ""];

  const handleHourChange = (h: string) => {
    if (h === "none") {
      onChange(null);
      return;
    }
    const m = minute || "00";
    onChange(`${h}:${m}`);
  };

  const handleMinuteChange = (m: string) => {
    const h = hour || "09";
    onChange(`${h}:${m}`);
  };

  return (
    <div className={className}>
      <Label className="text-sm mb-1.5 block">{label}</Label>
      <div className="flex items-center gap-1">
        <Select value={hour || "none"} onValueChange={handleHourChange}>
          <SelectTrigger className="h-9 w-[70px]">
            <SelectValue placeholder="--" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">--</SelectItem>
            {HOURS.map((h) => (
              <SelectItem key={h} value={h}>{h}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-muted-foreground font-bold">:</span>
        <Select value={minute || "00"} onValueChange={handleMinuteChange} disabled={!hour}>
          <SelectTrigger className="h-9 w-[70px]">
            <SelectValue placeholder="00" />
          </SelectTrigger>
          <SelectContent>
            {MINUTES.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
