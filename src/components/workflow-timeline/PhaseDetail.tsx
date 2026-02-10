"use client";

import { Check, ChevronDown, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowSubPhase, ResponsibleType } from "@/lib/timeline";
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
  const statusBg = phase.status === "completed"
    ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
    : phase.status === "in_progress"
    ? "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800"
    : "bg-muted/30 border-border";

  return (
    <div className={cn(
      "rounded-xl border-2 p-4 animate-in fade-in slide-in-from-top-2 duration-300",
      statusBg,
    )}>
      <div className="flex items-center gap-2 mb-3">
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-base font-semibold">{phase.title}</h3>
        <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
          {phase.phase}
        </span>
        {phase.totalSubs > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">
            {phase.completedSubs}/{phase.totalSubs} 完了
          </span>
        )}
      </div>
      {phase.subPhases && phase.subPhases.length > 0 && (
        <div className="space-y-1 border-l-2 border-muted-foreground/20 pl-4 ml-1">
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
      "flex items-center gap-2 py-1.5 px-2 rounded-lg",
      completed ? "bg-green-100/50 dark:bg-green-900/20" : "hover:bg-muted/50"
    )}>
      <StatusIcon completed={completed} />
      <span className={cn(
        "text-sm flex-1",
        completed ? "text-green-700 dark:text-green-300 line-through" : "text-foreground"
      )}>
        {sub.title}
      </span>
      {sub.responsibles && sub.responsibles.length > 0 && (
        <div className="flex items-center gap-1 shrink-0">
          {sub.responsibles.map((r, i) => (
            <span
              key={i}
              className={cn(
                "px-1.5 py-0.5 rounded text-[11px] font-medium text-white",
                responsibleColors[r]
              )}
            >
              {r}
            </span>
          ))}
        </div>
      )}
      {sub.note && (
        <span className="text-xs text-amber-600 dark:text-amber-400 shrink-0">
          {sub.note}
        </span>
      )}
    </div>
  );
}

function StatusIcon({ completed }: { completed: boolean }) {
  if (completed) {
    return (
      <div className="flex items-center justify-center h-4 w-4 rounded-full bg-green-500 shrink-0">
        <Check className="h-2.5 w-2.5 text-white" />
      </div>
    );
  }
  return <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />;
}

export { responsibleColors };
