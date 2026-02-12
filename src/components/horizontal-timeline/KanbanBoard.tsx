"use client";

import { useMemo, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import type { HorizontalPhaseData, PhaseOverrides, ProjectPhaseOverrides } from "./types";
import { TaskCard } from "./TaskCard";
import type { TaskCardData } from "./TaskCard";
import { PhaseColumn } from "./PhaseColumn";
import { useKanbanDnd, type KanbanColumns } from "./useKanbanDnd";
import type { ResponsibleType } from "@/lib/timeline";

interface KanbanBoardProps {
  phases: HorizontalPhaseData[];
  completedTitles: Set<string>;
  currentOverrides: PhaseOverrides;
  projectId: number;
  onSave: (overrides: ProjectPhaseOverrides) => Promise<void>;
  highlightedPhase?: string | null;
}

/** フェーズデータからカンバンカラムデータに変換 */
function buildColumns(
  phases: HorizontalPhaseData[],
  completedTitles: Set<string>
): KanbanColumns {
  const columns: KanbanColumns = {};
  for (const phase of phases) {
    const tasks: TaskCardData[] = [];
    if (phase.subPhases && phase.subPhases.length > 0) {
      for (const sp of phase.subPhases) {
        tasks.push({
          id: sp.key,
          title: sp.title,
          date: sp.date,
          duration: sp.duration,
          unit: sp.unit,
          responsibles: sp.responsibles as ResponsibleType[] | undefined,
          note: sp.note,
          isCompleted: completedTitles.has(sp.title),
          phaseKey: phase.key,
        });
      }
    }
    columns[phase.key] = tasks;
  }
  return columns;
}

export function KanbanBoard({
  phases,
  completedTitles,
  currentOverrides,
  projectId,
  onSave,
  highlightedPhase,
}: KanbanBoardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const initialColumns = useMemo(
    () => buildColumns(phases, completedTitles),
    [phases, completedTitles]
  );

  const {
    columns,
    activeTask,
    syncColumns,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  } = useKanbanDnd({
    initialColumns,
    currentOverrides,
    onSave,
  });

  // phases が更新されたらカラムを再同期（isDragging 中は hook 内でブロック済み）
  useEffect(() => {
    syncColumns(initialColumns);
  }, [initialColumns, syncColumns]);

  return (
    <div className="rounded-xl border bg-card p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold">カンバンボード</h3>
        <p className="text-[10px] text-muted-foreground">
          カードをドラッグして並べ替え・移動（隣接フェーズ間のみ）
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-2">
          {phases.map((phase) => (
            <PhaseColumn
              key={phase.key}
              phaseKey={phase.key}
              title={phase.title}
              status={phase.status}
              startDate={phase.startDate}
              endDate={phase.endDate}
              tasks={columns[phase.key] ?? []}
              isHighlighted={highlightedPhase === phase.key}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <TaskCard task={activeTask} isDragOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
