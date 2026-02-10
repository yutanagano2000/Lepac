"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Calendar as CalendarIcon,
  Clock,
  Trash2,
  ArrowRight,
  Search,
  ListTodo,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatDateJp } from "@/lib/timeline";
import { parseTodoMessages } from "@/lib/utils";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";

export type TodoWithProject = {
  id: number;
  projectId: number;
  content: string;
  dueDate: string;
  createdAt: string;
  completedAt: string | null;
  completedMemo: string | null;
  managementNumber: string | null;
};

interface TodosViewProps {
  initialTodos: TodoWithProject[];
}

function getDueDateInfo(dueDateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr + "T00:00:00");
  due.setHours(0, 0, 0, 0);
  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { group: "overdue" as const, label: `${Math.abs(diffDays)}日超過`, diffDays };
  if (diffDays === 0) return { group: "today" as const, label: "今日", diffDays };
  if (diffDays === 1) return { group: "upcoming" as const, label: "明日", diffDays };
  if (diffDays <= 7) return { group: "upcoming" as const, label: `あと${diffDays}日`, diffDays };
  return { group: "later" as const, label: `あと${diffDays}日`, diffDays };
}

export default function TodosView({ initialTodos }: TodosViewProps) {
  const [todos, setTodos] = useState<TodoWithProject[]>(initialTodos);
  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState<string>("all");

  // 削除確認ダイアログ用
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [todoToDelete, setTodoToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTodos = () => {
    fetch("/api/todos", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("API error");
        return res.json();
      })
      .then(setTodos)
      .catch((err) => console.error("TODO一覧の取得に失敗しました:", err));
  };

  const openDeleteDialog = (todoId: number) => {
    setTodoToDelete(todoId);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!todoToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/todos/${todoToDelete}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete TODO");
      fetchTodos();
    } catch (err) {
      console.error("TODO削除に失敗しました:", err);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setTodoToDelete(null);
    }
  };

  const projectOptions = useMemo(() => {
    const set = new Set(todos.map((t) => t.managementNumber).filter(Boolean));
    return Array.from(set) as string[];
  }, [todos]);

  const filteredTodos = useMemo(() => {
    let list = todos;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t) => t.content.toLowerCase().includes(q));
    }
    if (projectFilter !== "all") {
      list = list.filter((t) => t.managementNumber === projectFilter);
    }
    return list;
  }, [todos, searchQuery, projectFilter]);

  const grouped = useMemo(() => {
    const overdue: TodoWithProject[] = [];
    const today: TodoWithProject[] = [];
    const upcoming: TodoWithProject[] = [];
    const later: TodoWithProject[] = [];
    const completed: TodoWithProject[] = [];
    for (const t of filteredTodos) {
      if (t.completedAt) {
        completed.push(t);
        continue;
      }
      const info = getDueDateInfo(t.dueDate);
      if (info.group === "overdue") overdue.push(t);
      else if (info.group === "today") today.push(t);
      else if (info.group === "upcoming") upcoming.push(t);
      else later.push(t);
    }
    overdue.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    today.sort((a, b) => (a.managementNumber ?? "").localeCompare(b.managementNumber ?? ""));
    upcoming.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    later.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    completed.sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
    return { overdue, today, upcoming, later, completed };
  }, [filteredTodos]);

  const handleReopen = async (todo: TodoWithProject) => {
    try {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completedAt: null }),
      });
      if (!res.ok) throw new Error("Failed to reopen TODO");
      fetchTodos();
    } catch (err) {
      console.error("TODO再開に失敗しました:", err);
    }
  };

  const TodoItem = ({ todo }: { todo: TodoWithProject }) => {
    const info = getDueDateInfo(todo.dueDate);
    const dueDateFormatted = formatDateJp(new Date(todo.dueDate + "T00:00:00"));
    const isCompleted = !!todo.completedAt;
    return (
      <div className="flex items-start justify-between gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors">
        <Link
          href={`/projects/${todo.projectId}`}
          className="flex-1 min-w-0 group"
        >
          <p className={`text-sm font-medium group-hover:underline truncate ${isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
            {todo.content}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-muted-foreground">
              {dueDateFormatted}
              {!isCompleted && <span className="ml-1">({info.label})</span>}
              {isCompleted && todo.completedAt && (
                <span className="ml-1">· 完了: {formatDateJp(new Date(todo.completedAt))}</span>
              )}
            </span>
            {todo.managementNumber && (
              <span className="text-xs text-primary font-medium">
                {todo.managementNumber}
              </span>
            )}
          </div>
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
        </Link>
        <div className="flex items-center gap-1 shrink-0">
          {isCompleted ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={(e) => {
                e.preventDefault();
                handleReopen(todo);
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
                  openDeleteDialog(todo.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <Link href={`/projects/${todo.projectId}`}>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };

  const Section = ({
    title,
    description,
    icon: Icon,
    items,
    emptyMessage,
    badge,
  }: {
    title: string;
    description: string;
    icon: LucideIcon;
    items: TodoWithProject[];
    emptyMessage: string;
    badge?: React.ReactNode;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {title}
          </CardTitle>
          <CardDescription className="text-xs">{description}</CardDescription>
        </div>
        {badge}
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">{emptyMessage}</p>
        ) : (
          <div className="space-y-2">
            {items.map((todo) => (
              <TodoItem key={todo.id} todo={todo} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background px-6">
      <div className="mx-auto max-w-5xl py-10">
        <div className="space-y-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-muted-foreground" />
              <h1 className="text-xl font-semibold">TODO</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              今日やること・近日中のTODOを整理して確認できます
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="内容で検索"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="案件で絞り込み" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべての案件</SelectItem>
                  {projectOptions.map((mn) => (
                    <SelectItem key={mn} value={mn}>
                      {mn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Section
              title="超過"
              description="期限を過ぎたTODO"
              icon={AlertCircle}
              items={grouped.overdue}
              emptyMessage="超過したTODOはありません"
              badge={
                grouped.overdue.length > 0 ? (
                  <span className="text-xs font-bold text-destructive">優先</span>
                ) : undefined
              }
            />
            <Section
              title="今日"
              description="本日期限のTODO"
              icon={CalendarIcon}
              items={grouped.today}
              emptyMessage="本日のTODOはありません"
            />
            <Section
              title="近日中"
              description="7日以内に期限のTODO"
              icon={Clock}
              items={grouped.upcoming}
              emptyMessage="近日中のTODOはありません"
            />
          </div>

          {grouped.later.length > 0 && (
            <Section
              title="それ以降"
              description="8日以降に期限のTODO"
              icon={ListTodo}
              items={grouped.later}
              emptyMessage=""
            />
          )}

          {grouped.completed.length > 0 && (
            <Section
              title="完了済み"
              description="完了したTODO"
              icon={CheckCircle2}
              items={grouped.completed}
              emptyMessage=""
            />
          )}
        </div>
      </div>

      {/* 削除確認ダイアログ */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="TODOの削除"
        description="このTODOを削除してもよろしいですか？"
        isLoading={isDeleting}
      />
    </div>
  );
}
