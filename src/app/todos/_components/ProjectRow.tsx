"use client";

import { memo, useCallback } from "react";
import Link from "next/link";
import { ChevronRight, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { PhaseCell } from "./PhaseCell";
import { PHASES } from "../_constants";
import type { ProjectWithProgress, AlertLevel } from "../_types";
import type { Progress } from "@/db/schema";

interface ProjectRowProps {
  project: ProjectWithProgress;
  today: Date;
  onOpenEditDialog: (project: ProjectWithProgress, phase: (typeof PHASES)[number]) => void;
}

// フェーズ状況をサブフェーズから集約して取得
// phase.title（親フェーズ名）と phase.subTitles（子タスク名）の両方でマッチ
function getPhaseStatus(progressItems: Progress[], phase: (typeof PHASES)[number]) {
  const subTitles = phase.subTitles;
  let completedCount = 0;
  let latestDate: Date | null = null;
  let hasAnyProgress = false;

  for (const subTitle of subTitles) {
    const item = progressItems.find((p) => p.title === subTitle);
    if (!item) continue;
    hasAnyProgress = true;

    if (item.status === "completed" && item.completedAt) {
      completedCount++;
      const d = new Date(item.completedAt);
      if (!latestDate || d > latestDate) latestDate = d;
    } else if (item.createdAt) {
      const d = new Date(item.createdAt);
      if (!latestDate || d > latestDate) latestDate = d;
    }
  }

  // subTitles でマッチしなかった場合、phase.title でもフォールバック検索
  if (!hasAnyProgress) {
    const phaseItem = progressItems.find((p) => p.title === phase.title);
    if (phaseItem) {
      hasAnyProgress = true;
      if (phaseItem.status === "completed" && phaseItem.completedAt) {
        completedCount = subTitles.length;
        latestDate = new Date(phaseItem.completedAt);
      } else if (phaseItem.createdAt) {
        latestDate = new Date(phaseItem.createdAt);
      }
    }
  }

  if (completedCount === subTitles.length && subTitles.length > 0) {
    return { status: "completed" as const, date: latestDate };
  }
  if (hasAnyProgress) {
    return { status: "planned" as const, date: latestDate };
  }
  return { status: "pending" as const, date: null };
}

// 現在のフェーズを特定
function getCurrentPhaseIndex(progressItems: Progress[]): number {
  for (let i = PHASES.length - 1; i >= 0; i--) {
    const status = getPhaseStatus(progressItems, PHASES[i]);
    if (status.status === "completed") {
      return i + 1;
    }
  }
  return 0;
}

// アラート種別判定
function getPhaseAlertLevel(
  progressItems: Progress[],
  phase: (typeof PHASES)[number],
  today: Date
): AlertLevel {
  const phaseStatus = getPhaseStatus(progressItems, phase);

  if (phaseStatus.status === "completed") return null;
  if (!phaseStatus.date) return "critical";

  const dueDate = new Date(phaseStatus.date);
  dueDate.setHours(0, 0, 0, 0);

  if (dueDate < today) return "critical";

  const oneWeekLater = new Date(today);
  oneWeekLater.setDate(oneWeekLater.getDate() + 7);
  if (dueDate <= oneWeekLater) return "warning";

  return null;
}

function ProjectRowComponent({ project, today, onOpenEditDialog }: ProjectRowProps) {
  const currentPhaseIndex = getCurrentPhaseIndex(project.progressItems);
  const hasAlert = PHASES.some(
    (phase) => getPhaseAlertLevel(project.progressItems, phase, today) === "critical"
  );

  const handleOpenEditDialog = useCallback(
    (phase: (typeof PHASES)[number]) => {
      onOpenEditDialog(project, phase);
    },
    [project, onOpenEditDialog]
  );

  return (
    <tr
      className={cn(
        "border-b hover:bg-muted/30 transition-colors",
        hasAlert && "bg-red-500/5"
      )}
    >
      <td
        className={cn(
          "sticky left-0 z-10 px-2 py-3 w-[140px]",
          hasAlert ? "bg-red-500/10" : "bg-card"
        )}
      >
        <Link
          href={`/projects/${project.id}`}
          className="group flex items-center gap-1"
        >
          {hasAlert && (
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mr-1" />
          )}
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "text-sm font-bold group-hover:underline truncate",
                hasAlert && "text-red-600 dark:text-red-400"
              )}
            >
              {project.managementNumber}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {project.client}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </Link>
      </td>
      {PHASES.map((phase, index) => {
        const phaseStatus = getPhaseStatus(project.progressItems, phase);
        const isCompleted = phaseStatus.status === "completed";
        const isCurrent = index === currentPhaseIndex;
        const alertLevel = getPhaseAlertLevel(project.progressItems, phase, today);

        return (
          <PhaseCell
            key={phase.key}
            phaseKey={phase.key}
            phaseTitle={phase.title}
            index={index}
            status={phaseStatus.status}
            date={phaseStatus.date}
            isCompleted={isCompleted}
            isCurrent={isCurrent}
            alertLevel={alertLevel}
            onEdit={() => handleOpenEditDialog(phase)}
          />
        );
      })}
    </tr>
  );
}

export const ProjectRow = memo(ProjectRowComponent);
