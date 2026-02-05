"use client"

import * as React from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const STATUS_OPTIONS = [
  { value: "未着手", label: "未着手", color: "text-muted-foreground" },
  { value: "予定", label: "予定", color: "text-blue-600 dark:text-blue-400" },
  { value: "進行中", label: "進行中", color: "text-yellow-600 dark:text-yellow-400" },
  { value: "完了", label: "完了", color: "text-green-600 dark:text-green-400" },
] as const

interface StatusSelectProps {
  value?: string | null
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function StatusSelect({
  value,
  onChange,
  placeholder = "-",
  className,
  disabled = false,
}: StatusSelectProps) {
  const currentOption = STATUS_OPTIONS.find((opt) => opt.value === value)

  return (
    <Select
      value={value || ""}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          "w-[90px] h-8 text-xs",
          currentOption?.color,
          className
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className={cn("text-xs", option.color)}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
