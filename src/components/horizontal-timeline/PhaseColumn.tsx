"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { formatDateJp } from "@/lib/timeline";
import { TaskCard, type TaskCardData } from "./TaskCard";
import type { PhaseStatus } from "./types";
import { COLUMN_PREFIX } from "./useKanbanDnd";

interface PhaseColumnProps {
  phaseKey: string;
  title: string;
  status: PhaseStatus;
  startDate?: Date;
  endDate?: Date;
  tasks: TaskCardData[];
  isHighlighted?: boolean;
}

const statusConfig: Record<PhaseStatus, { label: string; color: string; bg: string }> = {
  completed: { label: "完了", color: "text-green-700 dark:text-green-300", bg: "bg-green-100 dark:bg-green-900/50" },
  in_progress: { label: "進行中", color: "text-blue-700 dark:text-blue-300", bg: "bg-blue-100 dark:bg-blue-900/50" },
  pending: { label: "未着手", color: "text-muted-foreground", bg: "bg-muted/50" },
};

export function PhaseColumn({
  phaseKey,
  title,
  status,
  startDate,
  endDate,
  tasks,
  isHighlighted,
}: PhaseColumnProps) {
  // droppable ID にプレフィックスを付けて sortable ID との衝突を回避
  const droppableId = `${COLUMN_PREFIX}${phaseKey}`;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });
  const config = statusConfig[status];
  const taskIds = tasks.map((t) => t.id);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-xl border-2 bg-card min-w-[220px] max-w-[280px] w-full transition-all",
        isOver && "border-primary/60 bg-primary/5",
        isHighlighted && "ring-2 ring-primary ring-offset-2",
        !isOver && !isHighlighted && "border-border",
      )}
    >
      {/* ヘッダー */}
      <div className={cn("px-3 py-2 rounded-t-[10px] border-b", config.bg)}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold truncate">{title}</h3>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
              config.color,
              config.bg,
            )}
          >
            {config.label}
          </span>
        </div>

        {/* 日付範囲 */}
        {startDate && (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {formatDateJp(startDate)}
            {endDate && ` ~ ${formatDateJp(endDate)}`}
          </p>
        )}

        {/* タスク数 */}
        <p className="text-[10px] text-muted-foreground">
          {tasks.filter((t) => t.isCompleted).length}/{tasks.length} タスク
        </p>
      </div>

      {/* カードリスト */}
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-1.5 p-2 min-h-[60px]">
          {tasks.length > 0 ? (
            tasks.map((task) => <TaskCard key={task.id} task={task} />)
          ) : (
            <div className="flex items-center justify-center h-12 text-xs text-muted-foreground border border-dashed rounded-lg">
              タスクなし
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
