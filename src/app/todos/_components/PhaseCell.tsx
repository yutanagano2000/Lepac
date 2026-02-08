"use client";

import { memo } from "react";
import { Check, Clock, AlertTriangle, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AlertLevel } from "../_types";

interface PhaseCellProps {
  phaseKey: string;
  phaseTitle: string;
  index: number;
  status: "pending" | "planned" | "completed";
  date: Date | null;
  isCompleted: boolean;
  isCurrent: boolean;
  alertLevel: AlertLevel;
  onEdit: () => void;
}

function formatDateShort(date: Date | null): string {
  if (!date) return "-";
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${m}/${d}`;
}

function PhaseCellComponent({
  phaseKey,
  index,
  isCompleted,
  isCurrent,
  alertLevel,
  date,
  onEdit,
}: PhaseCellProps) {
  const isCritical = alertLevel === "critical";
  const isWarning = alertLevel === "warning";

  return (
    <td
      className={cn(
        "px-0 py-2 text-center",
        isCritical && "bg-red-500/10",
        isWarning && "bg-yellow-500/10"
      )}
    >
      <button
        onClick={onEdit}
        className="group relative w-full flex flex-col items-center gap-1 p-1 rounded hover:bg-muted/50 transition-colors"
      >
        {/* Progress indicator */}
        <div
          className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center transition-colors",
            isCompleted && "bg-green-500 text-white",
            isCritical && "bg-red-500 text-white",
            isWarning && "bg-yellow-500 text-white",
            isCurrent && !isCompleted && !isCritical && !isWarning && "bg-blue-500 text-white",
            !isCompleted && !isCurrent && !isCritical && !isWarning && "bg-zinc-200 dark:bg-zinc-700"
          )}
        >
          {isCompleted ? (
            <Check className="h-4 w-4" />
          ) : isCritical ? (
            <AlertTriangle className="h-4 w-4" />
          ) : isWarning ? (
            <Clock className="h-4 w-4" />
          ) : isCurrent ? (
            <Clock className="h-4 w-4" />
          ) : (
            <span className="text-xs text-muted-foreground font-bold">
              {index + 1}
            </span>
          )}
        </div>
        {/* Date */}
        <span
          className={cn(
            "text-xs font-semibold truncate w-full",
            isCompleted
              ? "text-green-600 dark:text-green-400"
              : isCritical
              ? "text-red-600 dark:text-red-400"
              : isWarning
              ? "text-yellow-600 dark:text-yellow-400"
              : "text-muted-foreground"
          )}
        >
          {date ? formatDateShort(date) : "-"}
        </span>
        {/* Edit icon on hover */}
        <Pencil className="absolute top-0 right-0 h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    </td>
  );
}

export const PhaseCell = memo(PhaseCellComponent);
