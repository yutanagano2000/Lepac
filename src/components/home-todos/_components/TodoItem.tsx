"use client";

import Link from "next/link";
import { Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateJp } from "@/lib/timeline";
import { parseTodoMessages } from "@/lib/utils";
import type { TodoWithProject } from "../_types";
import { getDueDateInfo } from "../_utils";

interface TodoItemProps {
  todo: TodoWithProject;
  onDelete: (todoId: number) => void;
  onReopen: (todo: TodoWithProject) => void;
}

export function TodoItem({ todo, onDelete, onReopen }: TodoItemProps) {
  const info = getDueDateInfo(todo.dueDate);
  const dueDateFormatted = formatDateJp(new Date(todo.dueDate + "T00:00:00"));
  const isCompleted = !!todo.completedAt;
  const hasProject = todo.projectId !== null;

  const innerContent = (
    <>
      <p
        className={`text-sm font-medium ${hasProject ? "group-hover:underline" : ""} truncate ${isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}
      >
        {todo.content}
      </p>
      <div className="flex items-center gap-2 mt-1 flex-wrap">
        <span className="text-xs text-muted-foreground">
          {dueDateFormatted}
          {!isCompleted && <span className="ml-1">({info.label})</span>}
          {isCompleted && todo.completedAt && (
            <span className="ml-1">
              · 完了: {formatDateJp(new Date(todo.completedAt))}
            </span>
          )}
        </span>
        {todo.managementNumber ? (
          <span className="text-xs text-primary font-medium">
            {todo.managementNumber}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/70 italic">個人TODO</span>
        )}
        {todo.userName && (
          <span className="text-xs text-muted-foreground">· {todo.userName}</span>
        )}
      </div>
      {todo.completedMemo && (
        <div className="mt-2 space-y-1">
          {parseTodoMessages(todo.completedMemo).map((msg, idx, arr) => (
            <div
              key={idx}
              className="flex items-start gap-2 text-xs text-muted-foreground"
            >
              <div className="flex flex-col items-center">
                <div className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-600 mt-1.5"></div>
                {idx < arr.length - 1 && (
                  <div className="w-0.5 h-full bg-zinc-300 dark:bg-zinc-700 min-h-[16px]"></div>
                )}
              </div>
              <div className="flex-1 p-2 rounded bg-muted/50 border border-border/50">
                <p className="text-xs">{msg.message}</p>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                  {formatDateJp(new Date(msg.createdAt))}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  return (
    <div className="flex items-start justify-between gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors">
      {hasProject ? (
        <Link href={`/projects/${todo.projectId}`} className="flex-1 min-w-0 group">
          {innerContent}
        </Link>
      ) : (
        <div className="flex-1 min-w-0">{innerContent}</div>
      )}
      <div className="flex items-center gap-1 shrink-0">
        {isCompleted ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={(e) => {
              e.preventDefault();
              onReopen(todo);
            }}
          >
            再開
          </Button>
        ) : (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.preventDefault();
                onDelete(todo.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            {hasProject && (
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <Link href={`/projects/${todo.projectId}`}>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
