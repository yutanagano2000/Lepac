"use client";

import { useState, useMemo } from "react";
import { Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { WORKFLOW_PHASES, type WorkflowSubPhase } from "@/lib/timeline";
import type { Progress } from "@/db/schema";
import { PhaseDetail, responsibleColors } from "./workflow-timeline/PhaseDetail";

// フェーズグループ→色マッピング
const PHASE_COLOR_MAP: Record<string, string> = {
  "01 開始": "blue",
  "02 判断": "amber",
  "03 申請": "purple",
  "04 決済": "emerald",
  "05 完了": "green",
};

type PhaseStatus = "pending" | "in_progress" | "completed";

// 各フェーズの算出データ
export interface PhaseData {
  key: string;
  title: string;
  phase: string;
  color: string;
  status: PhaseStatus;
  totalSubs: number;
  completedSubs: number;
  subPhases?: readonly WorkflowSubPhase[];
}

interface WorkflowTimelineProps {
  progressList: Progress[];
}

export function WorkflowTimeline({ progressList }: WorkflowTimelineProps) {
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);

  const completedTitles = useMemo(
    () => new Set(progressList.filter((p) => p.status === "completed").map((p) => p.title)),
    [progressList]
  );

  // 10個の個別フェーズのステータスを算出
  const phases = useMemo(() => {
    return WORKFLOW_PHASES.map((wp) => {
      const color = PHASE_COLOR_MAP[wp.phase] || "blue";
      const subs = "subPhases" in wp ? (wp.subPhases as readonly WorkflowSubPhase[]) : undefined;
      let totalSubs = 0;
      let completedSubs = 0;

      if (subs && subs.length > 0) {
        subs.forEach((sub) => {
          totalSubs++;
          if (completedTitles.has(sub.title)) completedSubs++;
        });
      } else {
        totalSubs = 1;
        if (completedTitles.has(wp.title)) completedSubs = 1;
      }

      let status: PhaseStatus = "pending";
      if (completedSubs > 0 && completedSubs >= totalSubs) status = "completed";
      else if (completedSubs > 0) status = "in_progress";

      return {
        key: wp.key,
        title: wp.title,
        phase: wp.phase,
        color,
        status,
        totalSubs,
        completedSubs,
        subPhases: subs,
      } as PhaseData;
    });
  }, [completedTitles]);

  // 自動展開: 最初のin_progressフェーズ
  const activePhaseKey = useMemo(() => {
    const inProgress = phases.find((p) => p.status === "in_progress");
    return inProgress?.key ?? null;
  }, [phases]);

  const effectiveExpanded = expandedPhase ?? activePhaseKey;

  // 次に行うべきこと
  const nextAction = useMemo(() => {
    for (const phase of phases) {
      if (phase.status === "completed") continue;
      if (phase.subPhases && phase.subPhases.length > 0) {
        for (const sub of phase.subPhases) {
          if (!completedTitles.has(sub.title)) {
            return { title: sub.title, phase: phase.phase.split(" ")[1] };
          }
        }
      } else if (!completedTitles.has(phase.title)) {
        return { title: phase.title, phase: phase.phase.split(" ")[1] };
      }
    }
    return null;
  }, [phases, completedTitles]);

  return (
    <div className="space-y-3">
      {/* 次のアクション表示 */}
      {nextAction && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">次の工程:</span>
          <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">{nextAction.title}</span>
          <span className="text-xs text-blue-500 dark:text-blue-400">({nextAction.phase})</span>
        </div>
      )}

      {/* 横型10フェーズノード（モバイル横スクロール対応） */}
      <div className="overflow-x-auto -mx-2 px-2 pb-2">
        <div className="flex items-center min-w-[640px]">
          {phases.map((phase, index) => {
            const isExpanded = effectiveExpanded === phase.key;
            const isWaiting = phase.key === "waiting_period";

            return (
              <div key={phase.key} className="flex items-center flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => setExpandedPhase(isExpanded ? null : phase.key)}
                  className="flex flex-col items-center flex-1 group"
                >
                  {/* サークルノード */}
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
                      isExpanded && "ring-2 ring-offset-1 ring-primary/50",
                      isWaiting && phase.status !== "completed"
                        ? "border-secondary bg-secondary"
                        : phase.status === "completed"
                        ? "border-green-500 bg-green-500"
                        : phase.status === "in_progress"
                        ? "border-primary bg-primary/10"
                        : "border-muted-foreground/30 bg-muted/30",
                      "group-hover:shadow-md"
                    )}
                  >
                    {isWaiting && phase.status !== "completed" ? (
                      <Clock className="h-4 w-4 text-white" />
                    ) : phase.status === "completed" ? (
                      <Check className="h-4 w-4 text-white" />
                    ) : phase.status === "in_progress" ? (
                      <span className="text-xs font-bold text-primary">{index + 1}</span>
                    ) : (
                      <span className="text-xs font-bold text-muted-foreground">{index + 1}</span>
                    )}
                  </div>

                  {/* タイトル */}
                  <span className={cn(
                    "text-[10px] sm:text-xs mt-1.5 text-center leading-tight line-clamp-2 max-w-[72px] sm:max-w-[80px]",
                    phase.status === "completed" ? "text-green-700 dark:text-green-300 font-medium"
                      : phase.status === "in_progress" ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  )}>
                    {phase.title}
                  </span>

                  {/* 進捗カウント */}
                  {phase.totalSubs > 1 && (
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      {phase.completedSubs}/{phase.totalSubs}
                    </span>
                  )}
                </button>

                {/* 接続線 */}
                {index < phases.length - 1 && (
                  <div className={cn(
                    "h-0.5 w-3 -mx-0.5 shrink-0",
                    phase.status === "completed" ? "bg-green-500" : "bg-muted-foreground/20"
                  )} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 展開されたフェーズの詳細 */}
      {effectiveExpanded && (() => {
        const selectedPhase = phases.find((p) => p.key === effectiveExpanded);
        if (!selectedPhase || !selectedPhase.subPhases || selectedPhase.subPhases.length === 0) return null;
        return (
          <PhaseDetail
            phase={selectedPhase}
            completedTitles={completedTitles}
          />
        );
      })()}

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
