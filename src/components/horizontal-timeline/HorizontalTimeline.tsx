"use client";

import { useState, useCallback } from "react";
import { AlertTriangle, AlertCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { type ResponsibleType } from "@/lib/timeline";
import type { Progress } from "@/db/schema";
import { useTimelineData } from "./useTimelineData";
import { TimelineNode } from "./TimelineNode";
import { PhaseEditDialog } from "./PhaseEditDialog";
import { KanbanBoard } from "./KanbanBoard";
import type { PhaseOverride, PhaseOverrides, ProjectPhaseOverrides } from "./types";

// 担当者バッジの色定義（凡例用）
const responsibleColors: Record<ResponsibleType, string> = {
  "事務": "bg-blue-600",
  "工務": "bg-green-600",
  "設計": "bg-purple-600",
  "営業": "bg-orange-600",
};

interface HorizontalTimelineProps {
  progressList: Progress[];
  completionMonth?: string | null;
  projectId: number;
  phaseOverrides?: string | null;
  onUpdate?: () => void;
}

export function HorizontalTimeline({
  progressList,
  completionMonth,
  projectId,
  phaseOverrides: phaseOverridesJson,
  onUpdate,
}: HorizontalTimelineProps) {
  const {
    phases,
    overallProgress,
    currentPhase,
    overdueCount,
    upcomingCount,
    nextAction,
    completedTitles,
  } = useTimelineData(completionMonth, progressList, phaseOverridesJson);

  const [editingPhaseKey, setEditingPhaseKey] = useState<string | null>(null);
  const [highlightedPhase, setHighlightedPhase] = useState<string | null>(null);

  // 現在のフェーズ上書きデータをパース
  const currentOverrides: PhaseOverrides = (() => {
    if (!phaseOverridesJson) return {};
    try {
      const parsed = JSON.parse(phaseOverridesJson);
      // 新形式対応
      if (parsed.phases && typeof parsed.phases === "object") return parsed.phases;
      return parsed;
    } catch { return {}; }
  })();

  const editingPhase = phases.find((p) => p.key === editingPhaseKey) || null;

  // PhaseEditDialogからの保存（旧形式互換）
  const handleSaveOverride = useCallback(async (phaseKey: string, override: PhaseOverride) => {
    const updatedOverrides = { ...currentOverrides, [phaseKey]: override };
    // 空のオーバーライドを削除
    if (!override.startDate && !override.endDate && !override.note &&
        !override.subPhaseOrder?.length && !override.skippedSubPhases?.length) {
      delete updatedOverrides[phaseKey];
    }

    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phaseOverrides: Object.keys(updatedOverrides).length > 0
          ? JSON.stringify(updatedOverrides)
          : null,
      }),
    });
    if (!res.ok) throw new Error("Failed to save phase override");
    onUpdate?.();
  }, [currentOverrides, projectId, onUpdate]);

  // KanbanBoardからの保存（新形式: ProjectPhaseOverrides）
  const handleSaveKanbanOverrides = useCallback(async (overrides: ProjectPhaseOverrides) => {
    const payload = overrides.taskAssignments && Object.keys(overrides.taskAssignments).length > 0
      ? JSON.stringify(overrides)
      : JSON.stringify(overrides.phases); // taskAssignmentsがない場合は旧形式互換で保存

    const isEmpty = payload === "{}" || payload === '{"phases":{}}';

    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phaseOverrides: isEmpty ? null : payload,
      }),
    });
    if (!res.ok) throw new Error("Failed to save kanban overrides");
    onUpdate?.();
  }, [projectId, onUpdate]);

  // ノードクリック → カンバンのフェーズハイライト
  const handleNodeClick = useCallback((phaseKey: string) => {
    setEditingPhaseKey(phaseKey);
    setHighlightedPhase(phaseKey);
    // 3秒後にハイライト解除
    setTimeout(() => setHighlightedPhase(null), 3000);
  }, []);

  return (
    <div className="space-y-4">
      {/* サマリーセクション */}
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

        {/* アラート / 次のアクション */}
        {overdueCount > 0 ? (
          <div className="rounded-xl border-2 border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/50 p-4">
            <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              遅延警告
            </p>
            <p className="text-lg font-bold text-red-700 dark:text-red-300">
              {overdueCount}件のフェーズが遅延中
            </p>
            {upcomingCount > 0 && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                {upcomingCount}件が期日間近
              </p>
            )}
          </div>
        ) : upcomingCount > 0 ? (
          <div className="rounded-xl border-2 border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50 p-4">
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" />
              期日間近
            </p>
            <p className="text-lg font-bold text-amber-700 dark:text-amber-300">
              {upcomingCount}件が1週間以内
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

      {/* 横型タイムライン */}
      <div className="rounded-xl border bg-card p-4 sm:p-6">
        <div className="overflow-x-auto pb-2">
          <div className="flex items-start min-w-[700px]">
            {phases.map((phase, index) => (
              <TimelineNode
                key={phase.key}
                phase={phase}
                index={index}
                isLast={index === phases.length - 1}
                isCurrent={currentPhase?.key === phase.key}
                onClick={() => handleNodeClick(phase.key)}
              />
            ))}
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-3 text-center">
          ノードをクリックしてフェーズ詳細を表示・編集
        </p>
      </div>

      {/* カンバンボード */}
      <KanbanBoard
        phases={phases}
        completedTitles={completedTitles}
        currentOverrides={currentOverrides}
        projectId={projectId}
        onSave={handleSaveKanbanOverrides}
        highlightedPhase={highlightedPhase}
      />

      {/* 凡例 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-2 pt-2 text-sm text-muted-foreground border-t">
        <span className="font-medium mr-1">ステータス:</span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-500" />
          完了
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
          進行中
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          遅延
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-500" />
          期日間近
        </span>
        <span className="border-l pl-4 font-medium mr-1">担当:</span>
        {Object.entries(responsibleColors).map(([name, color]) => (
          <span key={name} className="flex items-center gap-1.5">
            <span className={cn("w-4 h-4 rounded", color)} />
            <span>{name}</span>
          </span>
        ))}
      </div>

      {/* フェーズ編集ダイアログ */}
      <PhaseEditDialog
        open={editingPhaseKey !== null}
        onOpenChange={(v) => { if (!v) setEditingPhaseKey(null); }}
        phase={editingPhase}
        completedTitles={completedTitles}
        projectId={projectId}
        currentOverride={editingPhaseKey ? currentOverrides[editingPhaseKey] : undefined}
        onSave={handleSaveOverride}
      />
    </div>
  );
}
