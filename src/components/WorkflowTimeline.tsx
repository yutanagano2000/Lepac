"use client";

import { useState, useMemo } from "react";
import { Check, Clock, ChevronDown, ChevronRight, AlertTriangle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { WORKFLOW_PHASES, calculateWorkflowTimelineFromCompletion, formatDateJp, type WorkflowSubPhase, type WorkflowTimelinePhase } from "@/lib/timeline";
import type { Progress } from "@/db/schema";
import { PhaseDetail, responsibleColors } from "./workflow-timeline/PhaseDetail";

type PhaseStatus = "pending" | "in_progress" | "completed";

// 各フェーズの算出データ
export interface PhaseData {
  key: string;
  title: string;
  phase: string;
  status: PhaseStatus;
  totalSubs: number;
  completedSubs: number;
  subPhases?: readonly WorkflowSubPhase[];
  startDate?: Date;
  endDate?: Date;
  isOverdue?: boolean;
}

interface WorkflowTimelineProps {
  progressList: Progress[];
  completionMonth?: string | null;
}

export function WorkflowTimeline({ progressList, completionMonth }: WorkflowTimelineProps) {
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);
  const now = useMemo(() => new Date(), []);

  const completedTitles = useMemo(
    () => new Set(progressList.filter((p) => p.status === "completed").map((p) => p.title)),
    [progressList]
  );

  // 完工月からタイムライン日付を算出
  const calculatedTimeline = useMemo(() => {
    if (!completionMonth) return null;
    const timeline = calculateWorkflowTimelineFromCompletion(completionMonth);
    if (timeline.length === 0) return null;
    const map = new Map<string, WorkflowTimelinePhase>();
    for (const phase of timeline) {
      map.set(phase.key, phase);
    }
    return map;
  }, [completionMonth]);

  // 10個の個別フェーズのステータスを算出
  const phases = useMemo(() => {
    return WORKFLOW_PHASES.map((wp) => {
      const calculated = calculatedTimeline?.get(wp.key);
      const subs = calculated?.subPhases ?? ("subPhases" in wp ? (wp.subPhases as readonly WorkflowSubPhase[]) : undefined);
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

      // 予定日超過チェック
      const endDate = calculated?.endDate;
      const isOverdue = status !== "completed" && endDate ? endDate.getTime() < now.getTime() : false;

      return {
        key: wp.key,
        title: wp.title,
        phase: wp.phase,
        status,
        totalSubs,
        completedSubs,
        subPhases: subs,
        startDate: calculated?.startDate,
        endDate: calculated?.endDate,
        isOverdue,
      } as PhaseData;
    });
  }, [completedTitles, calculatedTimeline, now]);

  // 全体進捗率
  const overallProgress = useMemo(() => {
    const totalSubs = phases.reduce((acc, p) => acc + p.totalSubs, 0);
    const completedSubs = phases.reduce((acc, p) => acc + p.completedSubs, 0);
    return totalSubs > 0 ? Math.round((completedSubs / totalSubs) * 100) : 0;
  }, [phases]);

  // 最初のin_progressフェーズ or 最初のpendingフェーズ
  const currentPhase = useMemo(() => {
    return phases.find((p) => p.status === "in_progress") || phases.find((p) => p.status === "pending");
  }, [phases]);

  // 自動展開: 最初のin_progressフェーズ
  const activePhaseKey = useMemo(() => {
    return currentPhase?.key ?? null;
  }, [currentPhase]);

  const effectiveExpanded = expandedPhase ?? activePhaseKey;

  // 次に行うべきこと
  const nextAction = useMemo(() => {
    for (const phase of phases) {
      if (phase.status === "completed") continue;
      if (phase.subPhases && phase.subPhases.length > 0) {
        for (const sub of phase.subPhases) {
          if (!completedTitles.has(sub.title)) {
            return { title: sub.title, phase: phase.phase.split(" ")[1], phaseTitle: phase.title };
          }
        }
      } else if (!completedTitles.has(phase.title)) {
        return { title: phase.title, phase: phase.phase.split(" ")[1], phaseTitle: phase.title };
      }
    }
    return null;
  }, [phases, completedTitles]);

  // 遅延中のフェーズ数
  const overdueCount = useMemo(() => phases.filter((p) => p.isOverdue).length, [phases]);

  return (
    <div className="space-y-4">
      {/* === サマリーセクション === */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 全体進捗 */}
        <div className="rounded-xl border-2 border-border p-4 bg-card">
          <p className="text-sm font-medium text-muted-foreground mb-1">全体進捗</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-foreground">{overallProgress}%</span>
          </div>
          <div className="mt-2 h-3 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* 現在のフェーズ */}
        <div className={cn(
          "rounded-xl border-2 p-4",
          currentPhase?.isOverdue
            ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/50"
            : "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50"
        )}>
          <p className="text-sm font-medium text-muted-foreground mb-1">現在のフェーズ</p>
          <p className={cn(
            "text-lg font-bold",
            currentPhase?.isOverdue ? "text-red-700 dark:text-red-300" : "text-blue-700 dark:text-blue-300"
          )}>
            {currentPhase?.title || "全工程完了"}
          </p>
          {currentPhase && (
            <p className="text-sm text-muted-foreground mt-1">
              {currentPhase.completedSubs}/{currentPhase.totalSubs} タスク完了
            </p>
          )}
        </div>

        {/* 次のアクション / 遅延警告 */}
        {overdueCount > 0 ? (
          <div className="rounded-xl border-2 border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/50 p-4">
            <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              遅延警告
            </p>
            <p className="text-lg font-bold text-red-700 dark:text-red-300">
              {overdueCount}件のフェーズが遅延中
            </p>
          </div>
        ) : nextAction ? (
          <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/50 p-4">
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1.5">
              <ArrowRight className="h-4 w-4" />
              次のアクション
            </p>
            <p className="text-base font-bold text-emerald-700 dark:text-emerald-300">
              {nextAction.title}
            </p>
            <p className="text-sm text-muted-foreground">{nextAction.phaseTitle}</p>
          </div>
        ) : (
          <div className="rounded-xl border-2 border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/50 p-4">
            <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">ステータス</p>
            <p className="text-lg font-bold text-green-700 dark:text-green-300">全工程完了</p>
          </div>
        )}
      </div>

      {/* === 縦型フェーズリスト === */}
      <div className="space-y-2">
        {phases.map((phase, index) => {
          const isExpanded = effectiveExpanded === phase.key;
          const isWaiting = phase.key === "waiting_period";
          const isCurrent = currentPhase?.key === phase.key;
          const progressPercent = phase.totalSubs > 0
            ? Math.round((phase.completedSubs / phase.totalSubs) * 100) : 0;

          return (
            <div key={phase.key}>
              <button
                type="button"
                onClick={() => setExpandedPhase(isExpanded ? null : phase.key)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 sm:p-4 rounded-xl border-2 transition-all text-left",
                  // 現在のフェーズ: 強調
                  isCurrent && !phase.isOverdue && "border-blue-400 bg-blue-50/80 dark:border-blue-600 dark:bg-blue-950/50 shadow-sm",
                  // 遅延: 赤枠
                  phase.isOverdue && "border-red-400 bg-red-50/80 dark:border-red-700 dark:bg-red-950/50 shadow-sm",
                  // 完了: 緑
                  phase.status === "completed" && "border-green-300 bg-green-50/50 dark:border-green-800 dark:bg-green-950/30",
                  // 待機中
                  isWaiting && phase.status !== "completed" && !phase.isOverdue && "border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/30",
                  // 未着手（デフォルト）
                  !isCurrent && !phase.isOverdue && phase.status === "pending" && !isWaiting && "border-border bg-card hover:bg-muted/50",
                  // 進行中だが非カレント
                  !isCurrent && !phase.isOverdue && phase.status === "in_progress" && "border-blue-200 bg-blue-50/30 dark:border-blue-800 dark:bg-blue-950/20",
                )}
              >
                {/* ステップ番号 + ステータスアイコン */}
                <div className={cn(
                  "flex items-center justify-center h-12 w-12 rounded-full border-2 shrink-0 text-base font-bold",
                  phase.isOverdue
                    ? "border-red-500 bg-red-500 text-white"
                    : isWaiting && phase.status !== "completed"
                    ? "border-amber-500 bg-amber-500 text-white"
                    : phase.status === "completed"
                    ? "border-green-500 bg-green-500 text-white"
                    : isCurrent
                    ? "border-blue-500 bg-blue-500 text-white animate-pulse"
                    : phase.status === "in_progress"
                    ? "border-blue-400 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                    : "border-muted-foreground/40 bg-muted text-muted-foreground"
                )}>
                  {phase.isOverdue ? (
                    <AlertTriangle className="h-5 w-5" />
                  ) : isWaiting && phase.status !== "completed" ? (
                    <Clock className="h-5 w-5" />
                  ) : phase.status === "completed" ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>

                {/* メイン情報 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn(
                      "text-base font-bold",
                      phase.isOverdue ? "text-red-700 dark:text-red-300"
                        : phase.status === "completed" ? "text-green-700 dark:text-green-300"
                        : isCurrent ? "text-blue-700 dark:text-blue-200"
                        : "text-foreground"
                    )}>
                      {phase.title}
                    </span>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium",
                      phase.isOverdue ? "bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200"
                        : phase.status === "completed" ? "bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : phase.status === "in_progress" ? "bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {phase.isOverdue ? "遅延" : phase.status === "completed" ? "完了" : phase.status === "in_progress" ? "進行中" : "未着手"}
                    </span>
                  </div>

                  {/* 日付 + 進捗バー */}
                  <div className="flex items-center gap-3 mt-1.5">
                    {phase.startDate && (
                      <span className={cn(
                        "text-sm font-medium",
                        phase.isOverdue ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
                      )}>
                        {formatDateJp(phase.startDate)}
                        {phase.endDate && phase.startDate.getTime() !== phase.endDate.getTime() && (
                          <> ～ {formatDateJp(phase.endDate)}</>
                        )}
                      </span>
                    )}
                    {phase.totalSubs > 1 && (
                      <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-300",
                              phase.isOverdue ? "bg-red-500" : "bg-green-500"
                            )}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                          {phase.completedSubs}/{phase.totalSubs}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 展開アイコン */}
                {phase.subPhases && phase.subPhases.length > 0 && (
                  <div className="shrink-0">
                    {isExpanded ? (
                      <ChevronDown className="h-6 w-6 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                )}
              </button>

              {/* 展開されたフェーズの詳細 */}
              {isExpanded && phase.subPhases && phase.subPhases.length > 0 && (
                <div className="mt-1 ml-6 sm:ml-8">
                  <PhaseDetail
                    phase={phase}
                    completedTitles={completedTitles}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 凡例 */}
      <div className="flex flex-wrap items-center gap-4 px-2 pt-2 text-sm text-muted-foreground border-t">
        <span className="font-medium">担当:</span>
        {Object.entries(responsibleColors).map(([name, color]) => (
          <span key={name} className="flex items-center gap-1.5">
            <span className={cn("w-4 h-4 rounded", color)} />
            <span>{name}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
