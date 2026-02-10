"use client";

import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateJp, type WorkflowSubPhase, type ResponsibleType } from "@/lib/timeline";
import type { PhaseData } from "../WorkflowTimeline";

// 担当者バッジの色定義
const responsibleColors: Record<ResponsibleType, string> = {
  '事務': 'bg-blue-600',
  '工務': 'bg-green-600',
  '設計': 'bg-purple-600',
  '営業': 'bg-orange-600',
};

export function PhaseDetail({ phase, completedTitles }: {
  phase: PhaseData;
  completedTitles: Set<string>;
}) {
  return (
    <div className="rounded-xl border bg-card p-3 sm:p-4 animate-in fade-in slide-in-from-top-2 duration-300">
      {phase.subPhases && phase.subPhases.length > 0 && (
        <div className="space-y-1.5">
          {phase.subPhases.map((sub) => (
            <SubPhaseItem key={sub.key} sub={sub} completed={completedTitles.has(sub.title)} />
          ))}
        </div>
      )}
    </div>
  );
}

function SubPhaseItem({ sub, completed }: { sub: WorkflowSubPhase; completed: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-3 py-2.5 px-3 rounded-lg",
      completed ? "bg-green-50 dark:bg-green-900/20" : "hover:bg-muted/50"
    )}>
      <StatusIcon completed={completed} />
      <span className={cn(
        "text-sm sm:text-base flex-1 font-medium",
        completed ? "text-green-700 dark:text-green-300 line-through" : "text-foreground"
      )}>
        {sub.title}
      </span>
      {sub.date && (
        <span className={cn(
          "text-sm font-semibold shrink-0",
          completed ? "text-green-600 dark:text-green-400" : "text-primary"
        )}>
          {formatDateJp(sub.date)}
        </span>
      )}
      {sub.responsibles && sub.responsibles.length > 0 && (
        <div className="flex items-center gap-1 shrink-0">
          {sub.responsibles.map((r, i) => (
            <span
              key={i}
              className={cn(
                "px-2 py-1 rounded text-xs font-bold text-white",
                responsibleColors[r]
              )}
            >
              {r}
            </span>
          ))}
        </div>
      )}
      {sub.note && (
        <span className="text-sm text-amber-600 dark:text-amber-400 font-medium shrink-0">
          {sub.note}
        </span>
      )}
    </div>
  );
}

function StatusIcon({ completed }: { completed: boolean }) {
  if (completed) {
    return (
      <div className="flex items-center justify-center h-6 w-6 rounded-full bg-green-500 shrink-0">
        <Check className="h-3.5 w-3.5 text-white" />
      </div>
    );
  }
  return <Circle className="h-6 w-6 text-muted-foreground/50 shrink-0" />;
}

export { responsibleColors };
