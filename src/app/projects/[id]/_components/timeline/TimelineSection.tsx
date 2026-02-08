"use client";

import { useMemo } from "react";
import { Clock, Plus, Check, Circle, Pencil } from "lucide-react";
import { formatDateJp } from "@/lib/timeline";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import type { Progress } from "../../_types";

export interface TimelineItem {
  id: number;
  title: string;
  description?: string;
  date: Date;
  completedAt?: Date;
  status: "completed" | "planned";
}

interface TimelineSectionProps {
  /** 進捗リスト */
  progressList: Progress[];
  /** 進捗追加ダイアログの開閉状態 */
  addDialogOpen: boolean;
  /** 進捗追加ダイアログの開閉ハンドラ */
  onAddDialogOpenChange: (open: boolean) => void;
  /** 進捗編集時のコールバック */
  onEdit: (progress: Progress) => void;
  /** 進捗完了時のコールバック */
  onMarkCompleted: (progressId: number) => void;
  /** 進捗未完了に戻す時のコールバック */
  onMarkIncomplete: (progressId: number) => void;
}

/**
 * タイムライン表示セクション（横型）
 */
export function TimelineSection({
  progressList,
  addDialogOpen,
  onAddDialogOpenChange,
  onEdit,
  onMarkCompleted,
  onMarkIncomplete,
}: TimelineSectionProps) {
  // 進捗を日付でソート
  const sortedTimeline = useMemo<TimelineItem[]>(() => {
    return [...progressList]
      .map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description ?? undefined,
        date: new Date(p.createdAt),
        completedAt: p.completedAt ? new Date(p.completedAt) : undefined,
        status: p.status as "completed" | "planned",
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [progressList]);

  // 直近の未完了項目のインデックス
  const firstPendingIndex = useMemo(
    () => sortedTimeline.findIndex((item) => item.status !== "completed"),
    [sortedTimeline]
  );

  if (sortedTimeline.length === 0) {
    return (
      <div className="relative">
        <TimelineHeader
          addDialogOpen={addDialogOpen}
          onAddDialogOpenChange={onAddDialogOpenChange}
        />
        <p className="text-sm text-muted-foreground">タイムラインがありません</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <TimelineHeader
        addDialogOpen={addDialogOpen}
        onAddDialogOpenChange={onAddDialogOpenChange}
      />
      <div className="w-full">
        <div className="flex items-start gap-0 py-4">
          {sortedTimeline.map((item, index) => (
            <TimelineNode
              key={item.id}
              item={item}
              index={index}
              totalCount={sortedTimeline.length}
              firstPendingIndex={firstPendingIndex}
              previousItem={index > 0 ? sortedTimeline[index - 1] : undefined}
              onEdit={() => {
                const p = progressList.find((pr) => pr.id === item.id);
                if (p) onEdit(p);
              }}
              onMarkCompleted={() => onMarkCompleted(item.id)}
              onMarkIncomplete={() => onMarkIncomplete(item.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface TimelineHeaderProps {
  addDialogOpen: boolean;
  onAddDialogOpenChange: (open: boolean) => void;
}

function TimelineHeader({ addDialogOpen, onAddDialogOpenChange }: TimelineHeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-semibold">タイムライン</h2>
      </div>
      <Dialog open={addDialogOpen} onOpenChange={onAddDialogOpenChange}>
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus className="h-4 w-4" />
            進捗を追加
          </Button>
        </DialogTrigger>
      </Dialog>
    </div>
  );
}

interface TimelineNodeProps {
  item: TimelineItem;
  index: number;
  totalCount: number;
  firstPendingIndex: number;
  previousItem?: TimelineItem;
  onEdit: () => void;
  onMarkCompleted: () => void;
  onMarkIncomplete: () => void;
}

function TimelineNode({
  item,
  index,
  totalCount,
  firstPendingIndex,
  previousItem,
  onEdit,
  onMarkCompleted,
  onMarkIncomplete,
}: TimelineNodeProps) {
  const isCompleted = item.status === "completed";
  const isFirstPending = index === firstPendingIndex;

  // 予定日までの日数を計算
  const now = new Date();
  const daysUntilDue = Math.ceil(
    (item.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  const isOverdue = !isCompleted && daysUntilDue < 0;

  // 直近の完了タスクかどうか（未完了に戻せるか）
  const canRevert =
    isCompleted &&
    (firstPendingIndex === -1
      ? index === totalCount - 1
      : index === firstPendingIndex - 1);

  return (
    <div className="flex flex-col items-center flex-1 min-w-0">
      {/* 上部：タイトルと編集ボタン */}
      <div className="text-center mb-2 px-0.5">
        <div className="flex items-center justify-center gap-0.5">
          <p
            className={`text-[10px] sm:text-xs font-medium truncate max-w-full ${
              isCompleted ? "" : "text-muted-foreground"
            }`}
            title={item.title}
          >
            {item.title}
          </p>
          <button
            type="button"
            onClick={onEdit}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground shrink-0"
          >
            <Pencil className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
          </button>
        </div>
      </div>

      {/* 中央：ノードと横線 */}
      <div className="flex items-center w-full">
        {/* 左側の線 */}
        {index > 0 && previousItem ? (
          <div
            className={`flex-1 h-0.5 ${
              previousItem.status === "completed"
                ? "bg-green-500"
                : "border-t-2 border-dashed border-muted-foreground"
            }`}
          />
        ) : (
          <div className="flex-1" />
        )}

        {/* ノード */}
        <div
          className={`flex h-6 w-6 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full border-2 ${
            isCompleted
              ? "border-green-500 bg-green-500"
              : isOverdue
              ? "border-red-500 bg-background"
              : "border-muted-foreground bg-background"
          }`}
        >
          {isCompleted ? (
            <Check className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
          ) : (
            <Circle
              className={`h-3 w-3 sm:h-4 sm:w-4 ${
                isOverdue ? "text-red-500" : "text-muted-foreground"
              }`}
            />
          )}
        </div>

        {/* 右側の線 */}
        {index < totalCount - 1 ? (
          <div
            className={`flex-1 h-0.5 ${
              isCompleted
                ? "bg-green-500"
                : "border-t-2 border-dashed border-muted-foreground"
            }`}
          />
        ) : (
          <div className="flex-1" />
        )}
      </div>

      {/* 下部：日付と説明、アクションボタン */}
      <div className="text-center mt-2 px-0.5">
        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
          {formatDateJp(item.date)}
        </p>
        {item.completedAt && (
          <p
            className={`text-[9px] sm:text-[10px] ${
              item.completedAt > item.date ? "text-red-500" : "text-green-500"
            }`}
          >
            → {formatDateJp(item.completedAt)}
          </p>
        )}
        {item.description && (
          <p
            className="mt-1 text-[9px] sm:text-[10px] text-muted-foreground truncate max-w-full"
            title={item.description}
          >
            {item.description}
          </p>
        )}

        {/* アクションボタン */}
        <div className="mt-2 flex flex-col gap-1">
          {canRevert && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 px-2 border-orange-300 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
              onClick={onMarkIncomplete}
            >
              未完了
            </Button>
          )}
          {isFirstPending && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 px-2"
              onClick={onMarkCompleted}
            >
              完了
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
