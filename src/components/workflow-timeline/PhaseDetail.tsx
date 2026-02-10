"use client";

import { Check, ChevronDown, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowSubPhase, ResponsibleType } from "@/lib/timeline";

// フェーズの状態
type PhaseStatus = "pending" | "in_progress" | "completed";
type PhaseColor = "blue" | "amber" | "purple" | "emerald" | "green";

// 担当者バッジの色定義
const responsibleColors: Record<ResponsibleType, string> = {
  '事務': 'bg-blue-600',
  '工務': 'bg-green-600',
  '設計': 'bg-purple-600',
  '営業': 'bg-orange-600',
};

// フェーズカラー取得
function getPhaseColors(_color: PhaseColor, status: PhaseStatus) {
  if (status === "completed") {
    return { light: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800" };
  }
  if (status === "in_progress") {
    const map: Record<PhaseColor, { light: string }> = {
      blue: { light: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800" },
      amber: { light: "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800" },
      purple: { light: "bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800" },
      emerald: { light: "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800" },
      green: { light: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800" },
    };
    return map[_color];
  }
  return { light: "bg-muted/30 border-border" };
}

export interface PhaseGroupData {
  id: string;
  label: string;
  color: PhaseColor;
  phases: readonly { key: string; title: string; phase: string; subPhases?: readonly WorkflowSubPhase[] }[];
  status: PhaseStatus;
  totalSubs: number;
  completedSubs: number;
}

export function PhaseDetail({ group, completedTitles }: {
  group: PhaseGroupData;
  completedTitles: Set<string>;
}) {
  const colors = getPhaseColors(group.color, group.status);

  return (
    <div className={cn(
      "rounded-xl border-2 p-4 animate-in fade-in slide-in-from-top-2 duration-300",
      colors.light,
    )}>
      <div className="flex items-center gap-2 mb-3">
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-base font-semibold">{group.id} {group.label} の工程</h3>
      </div>
      <div className="space-y-2">
        {group.phases.map((phase) => {
          const subs = phase.subPhases;
          return (
            <div key={phase.key} className="space-y-1.5">
              <div className="flex items-center gap-2 py-1">
                <StatusIcon completed={completedTitles.has(phase.title)} />
                <span className={cn(
                  "text-sm sm:text-base font-medium",
                  completedTitles.has(phase.title) ? "text-green-700 dark:text-green-300" : "text-foreground"
                )}>
                  {phase.title}
                </span>
              </div>
              {subs && subs.length > 0 && (
                <div className="ml-6 space-y-1 border-l-2 border-muted-foreground/20 pl-3">
                  {subs.map((sub) => (
                    <SubPhaseItem key={sub.key} sub={sub} completed={completedTitles.has(sub.title)} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SubPhaseItem({ sub, completed }: { sub: WorkflowSubPhase; completed: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-2 py-1.5 px-2 rounded-lg",
      completed ? "bg-green-100/50 dark:bg-green-900/20" : "hover:bg-muted/50"
    )}>
      <StatusIcon completed={completed} size="sm" />
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

function StatusIcon({ completed, size = "md" }: { completed: boolean; size?: "sm" | "md" }) {
  const sizeClass = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  if (completed) {
    return (
      <div className={cn("flex items-center justify-center rounded-full bg-green-500 shrink-0", sizeClass)}>
        <Check className={cn(size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3", "text-white")} />
      </div>
    );
  }
  return <Circle className={cn(sizeClass, "text-muted-foreground/40 shrink-0")} />;
}

export { responsibleColors };
