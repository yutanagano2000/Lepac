"use client";

import { useMemo, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  pointerWithin,
  type CollisionDetection,
} from "@dnd-kit/core";
import { COLUMN_PREFIX } from "./useKanbanDnd";
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

/** フェーズデータからカンバンカラムデータに変換（日付昇順） */
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
    // 日付昇順ソート
    tasks.sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0));
    columns[phase.key] = tasks;
  }
  return columns;
}

/**
 * カスタム衝突検出:
 * 1. pointerWithin でポインタが入っているカラムを検出（空カラムも検出可能）
 * 2. カラム内にアイテムがあれば closestCorners で細かい位置を特定
 * 3. 空カラムならカラム自体をドロップ先として返す
 */
const customCollisionDetection: CollisionDetection = (args) => {
  // pointerWithin: ポインタ座標が rect 内にある droppable を全て返す
  const pointerCollisions = pointerWithin(args);

  if (pointerCollisions.length > 0) {
    // カラム droppable にヒットしているか
    const columnHit = pointerCollisions.find((c) =>
      String(c.id).startsWith(COLUMN_PREFIX)
    );
    // カラム内の sortable アイテムにもヒットしているか
    const itemHits = pointerCollisions.filter(
      (c) => !String(c.id).startsWith(COLUMN_PREFIX)
    );

    if (itemHits.length > 0) return itemHits;
    if (columnHit) return [columnHit]; // 空カラム
  }

  // ポインタがどのカラムにも入っていない場合は closestCorners で最寄りを返す
  return closestCorners(args);
};

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
        collisionDetection={customCollisionDetection}
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
