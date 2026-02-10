"use client";

import { useState, useMemo } from "react";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { WORKFLOW_PHASES, type WorkflowSubPhase } from "@/lib/timeline";
import type { Progress } from "@/db/schema";
import { PhaseDetail, responsibleColors, type PhaseGroupData } from "./workflow-timeline/PhaseDetail";

// フェーズグループ定義
const PHASE_GROUPS = [
  { id: "01", label: "開始", color: "blue" as const },
  { id: "02", label: "判断", color: "amber" as const },
  { id: "03", label: "申請", color: "purple" as const },
  { id: "04", label: "決済", color: "emerald" as const },
  { id: "05", label: "完了", color: "green" as const },
];

type PhaseColor = typeof PHASE_GROUPS[number]["color"];
type PhaseStatus = "pending" | "in_progress" | "completed";

// フェーズカラー取得（メインバー用）
function getPhaseColors(color: PhaseColor, status: PhaseStatus) {
  if (status === "completed") {
    return { bg: "bg-green-500", light: "border-green-400 bg-green-50 dark:bg-green-950/50" };
  }
  if (status === "in_progress") {
    const map: Record<PhaseColor, { bg: string; light: string }> = {
      blue: { bg: "bg-blue-500", light: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800" },
      amber: { bg: "bg-amber-500", light: "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800" },
      purple: { bg: "bg-purple-500", light: "bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800" },
      emerald: { bg: "bg-emerald-500", light: "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800" },
      green: { bg: "bg-green-500", light: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800" },
    };
    return map[color];
  }
  return { bg: "bg-muted", light: "border-muted-foreground/20 bg-muted/20" };
}

interface WorkflowTimelineProps {
  progressList: Progress[];
}

export function WorkflowTimeline({ progressList }: WorkflowTimelineProps) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const completedTitles = useMemo(
    () => new Set(progressList.filter((p) => p.status === "completed").map((p) => p.title)),
    [progressList]
  );

  const groupedPhases = useMemo(() => {
    return PHASE_GROUPS.map((group) => {
      const phases = WORKFLOW_PHASES.filter((wp) => wp.phase === `${group.id} ${group.label}`);
      let totalSubs = 0;
      let completedSubs = 0;

      phases.forEach((phase) => {
        const subs = "subPhases" in phase ? (phase.subPhases as readonly WorkflowSubPhase[]) : undefined;
        if (subs) {
          subs.forEach((sub: WorkflowSubPhase) => {
            totalSubs++;
            if (completedTitles.has(sub.title) || completedTitles.has(phase.title)) completedSubs++;
          });
        } else {
          totalSubs++;
          if (completedTitles.has(phase.title)) completedSubs++;
        }
      });

      let status: PhaseStatus = "pending";
      if (completedSubs > 0 && completedSubs >= totalSubs) status = "completed";
      else if (completedSubs > 0) status = "in_progress";

      return { ...group, phases, status, totalSubs, completedSubs } as PhaseGroupData;
    });
  }, [completedTitles]);

  const activeGroupId = useMemo(() => {
    const inProgress = groupedPhases.find((g) => g.status === "in_progress");
    return inProgress?.id ?? null;
  }, [groupedPhases]);

  const effectiveExpanded = expandedGroup ?? activeGroupId;

  // 次に行うべきこと
  const nextAction = useMemo(() => {
    for (const group of groupedPhases) {
      if (group.status === "completed") continue;
      for (const phase of group.phases) {
        const subs = "subPhases" in phase ? (phase.subPhases as readonly WorkflowSubPhase[]) : undefined;
        if (subs) {
          for (const sub of subs) {
            if (!completedTitles.has(sub.title)) return { title: sub.title, group: group.label };
          }
        } else if (!completedTitles.has(phase.title)) {
          return { title: phase.title, group: group.label };
        }
      }
    }
    return null;
  }, [groupedPhases, completedTitles]);

  return (
    <div className="space-y-3">
      {/* 次のアクション表示 */}
      {nextAction && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">次の工程:</span>
          <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">{nextAction.title}</span>
          <span className="text-xs text-blue-500 dark:text-blue-400">({nextAction.group})</span>
        </div>
      )}

      {/* 横型フェーズバー */}
      <div className="flex items-center gap-0">
        {groupedPhases.map((group, index) => {
          const colors = getPhaseColors(group.color, group.status);
          const isExpanded = effectiveExpanded === group.id;

          return (
            <div key={group.id} className="flex items-center flex-1 min-w-0">
              <button
                type="button"
                onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
                className={cn(
                  "flex flex-col items-center justify-center w-full py-3 px-2 rounded-xl border-2 transition-all cursor-pointer hover:shadow-md",
                  isExpanded ? "ring-2 ring-offset-2 ring-primary/50" : "",
                  group.status === "completed" ? colors.light : group.status === "in_progress" ? colors.light : "border-muted-foreground/20 bg-muted/20"
                )}
              >
                <div className={cn("flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full mb-2", colors.bg)}>
                  {group.status === "completed" ? (
                    <Check className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  ) : (
                    <span className={cn("text-base sm:text-lg font-bold", group.status === "in_progress" ? "text-white" : "text-muted-foreground")}>
                      {group.id}
                    </span>
                  )}
                </div>
                <span className={cn(
                  "text-sm sm:text-base font-semibold",
                  group.status === "completed" ? "text-green-700 dark:text-green-300"
                    : group.status === "in_progress" ? "text-foreground"
                    : "text-muted-foreground"
                )}>
                  {group.label}
                </span>
                {group.totalSubs > 0 && (
                  <span className="text-xs text-muted-foreground mt-0.5">
                    {group.completedSubs}/{group.totalSubs}
                  </span>
                )}
              </button>
              {index < groupedPhases.length - 1 && (
                <div className={cn("flex items-center mx-1 shrink-0", group.status === "completed" ? "text-green-500" : "text-muted-foreground/30")}>
                  <ChevronRight className="h-5 w-5" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 展開されたフェーズグループの詳細 */}
      {effectiveExpanded && (
        <PhaseDetail
          group={groupedPhases.find((g) => g.id === effectiveExpanded)!}
          completedTitles={completedTitles}
        />
      )}

      {/* 凡例 */}
      {effectiveExpanded && (
        <div className="flex flex-wrap items-center gap-3 px-2 pt-1 text-xs text-muted-foreground">
          <span className="font-medium">担当:</span>
          {Object.entries(responsibleColors).map(([name, color]) => (
            <span key={name} className="flex items-center gap-1">
              <span className={cn("w-3 h-3 rounded", color)} />
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
