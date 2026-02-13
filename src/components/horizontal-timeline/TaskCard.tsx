"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Check, Calendar, Clock, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateJp, type ResponsibleType } from "@/lib/timeline";

const responsibleColors: Record<ResponsibleType, string> = {
  "事務": "bg-blue-600",
  "工務": "bg-green-600",
  "設計": "bg-purple-600",
  "営業": "bg-orange-600",
};

export interface TaskCardData {
  id: string;         // subPhase.key
  title: string;
  date?: Date;
  duration?: number;
  unit?: "business_days" | "calendar_days";
  responsibles?: readonly ResponsibleType[];
  note?: string;
  isCompleted: boolean;
  phaseKey: string;   // 所属フェーズ
}

interface TaskCardProps {
  task: TaskCardData;
  isDragOverlay?: boolean;
}

export function TaskCard({ task, isDragOverlay }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: task.isCompleted,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-start gap-2 rounded-lg border p-2.5 bg-card transition-all",
        isDragging && "opacity-40 shadow-lg",
        isDragOverlay && "shadow-xl rotate-1 border-primary",
        task.isCompleted
          ? "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30"
          : "hover:border-primary/50 hover:shadow-sm",
      )}
    >
      {/* ドラッグハンドル */}
      {!task.isCompleted ? (
        <button
          type="button"
          className="mt-0.5 shrink-0 cursor-grab text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      ) : (
        <div className="mt-0.5 shrink-0">
          <Lock className="h-4 w-4 text-muted-foreground/30" />
        </div>
      )}

      {/* コンテンツ */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {task.isCompleted && (
            <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
          )}
          <span
            className={cn(
              "text-sm font-medium truncate",
              task.isCompleted && "line-through text-muted-foreground",
            )}
          >
            {task.title}
          </span>
        </div>

        {/* 日付・工数 */}
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          {task.date && (
            <span className="flex items-center gap-0.5">
              <Calendar className="h-3 w-3" />
              {formatDateJp(task.date)}
            </span>
          )}
          {task.duration != null && (
            <span className="flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
              {task.duration}{task.unit === "calendar_days" ? "日" : "営業日"}
            </span>
          )}
        </div>

        {/* 担当者バッジ */}
        {task.responsibles && task.responsibles.length > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {task.responsibles.map((r) => (
              <span
                key={r}
                className={cn(
                  "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium text-white",
                  responsibleColors[r] || "bg-gray-500",
                )}
              >
                {r}
              </span>
            ))}
          </div>
        )}

        {/* 注記 */}
        {task.note && (
          <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 truncate">
            {task.note}
          </p>
        )}
      </div>
    </div>
  );
}
