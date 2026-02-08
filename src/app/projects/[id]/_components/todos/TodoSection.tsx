"use client";

import { useState } from "react";
import { Plus, CalendarIcon, Pencil, Trash2, CheckCircle2, ListTodo } from "lucide-react";
import { formatDateJp } from "@/lib/timeline";
import { cn, parseTodoMessages } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Todo } from "../../_types";

// ========================================
// TodoSection Props
// ========================================

interface TodoSectionProps {
  todos: Todo[];
  onAdd: (content: string, dueDate: string) => Promise<void>;
  onComplete: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
  onReopen: (todo: Todo) => Promise<void>;
  onAddMessage: (todo: Todo) => void;
}

// ========================================
// TodoSection Component
// ========================================

export function TodoSection({
  todos,
  onAdd,
  onComplete,
  onEdit,
  onDelete,
  onReopen,
  onAddMessage,
}: TodoSectionProps) {
  // フォーム状態
  const [content, setContent] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !dueDate) return;
    await onAdd(content.trim(), dueDate);
    // リセット
    setContent("");
    setDueDate("");
    setSelectedDate(undefined);
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      setDueDate(`${y}-${m}-${d}`);
      setCalendarOpen(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <ListTodo className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold">TODO</h2>
        </div>

        {/* 追加フォーム */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2 flex-wrap items-end">
            <div className="flex-1 min-w-[200px] space-y-1">
              <Label htmlFor="new-todo-content" className="text-xs text-muted-foreground">
                内容
              </Label>
              <Textarea
                id="new-todo-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="この日までに行うことを入力..."
                rows={2}
                className="resize-y"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">期日</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-[180px] justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? formatDateJp(selectedDate) : "期日を選択"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Button type="submit" size="default" disabled={!content.trim() || !dueDate}>
              追加
            </Button>
          </div>
        </form>

        {/* TODO一覧 */}
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {todos.length === 0 ? (
            <p className="text-sm text-muted-foreground">TODOはありません</p>
          ) : (
            todos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onComplete={onComplete}
                onEdit={onEdit}
                onDelete={onDelete}
                onReopen={onReopen}
                onAddMessage={onAddMessage}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ========================================
// TodoItem Component (内部用)
// ========================================

interface TodoItemProps {
  todo: Todo;
  onComplete: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
  onReopen: (todo: Todo) => Promise<void>;
  onAddMessage: (todo: Todo) => void;
}

function TodoItem({
  todo,
  onComplete,
  onEdit,
  onDelete,
  onReopen,
  onAddMessage,
}: TodoItemProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-2 p-3 rounded-lg border border-border",
        todo.completedAt ? "bg-muted/30 opacity-90" : "bg-muted/50"
      )}
    >
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm", todo.completedAt && "line-through text-muted-foreground")}>
          {todo.content}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          期日: {formatDateJp(new Date(todo.dueDate + "T00:00:00"))}
          {todo.completedAt && (
            <>
              {" · "}
              完了: {formatDateJp(new Date(todo.completedAt))}
            </>
          )}
        </p>
        {/* メッセージツリー表示 */}
        {todo.completedMemo && (
          <div className="mt-2 space-y-1">
            {parseTodoMessages(todo.completedMemo).map((msg, idx, arr) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-600 mt-1.5"></div>
                  {idx < arr.length - 1 && (
                    <div className="w-0.5 h-full bg-zinc-300 dark:bg-zinc-700 min-h-[16px]"></div>
                  )}
                </div>
                <div className="flex-1 p-2 rounded bg-background/50 border border-border/50">
                  <p className="text-xs">{msg.message}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                    {formatDateJp(new Date(msg.createdAt))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-1 shrink-0">
        {todo.completedAt ? (
          <div className="flex flex-col gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onAddMessage(todo)}
              title="メッセージを追加"
            >
              <Plus className="h-3 w-3 mr-1" />
              メモ
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onReopen(todo)}
            >
              再開
            </Button>
          </div>
        ) : (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onEdit(todo)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-green-600 hover:text-green-700"
              onClick={() => onComplete(todo)}
              title="完了"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDelete(todo)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
