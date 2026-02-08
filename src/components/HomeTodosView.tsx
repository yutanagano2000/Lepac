"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Calendar as CalendarIcon,
  Clock,
  ArrowRight,
  Search,
  ListTodo,
  CheckCircle2,
  LayoutDashboard,
  Plus,
  User,
  Users,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDateJp } from "@/lib/timeline";
import { cn } from "@/lib/utils";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { TodoItem } from "@/components/home-todos/TodoItem";
import { TodoSection } from "@/components/home-todos/TodoSection";

export type TodoWithProject = {
  id: number;
  projectId: number | null; // nullの場合は案件に紐づかないプレーンTODO
  content: string;
  dueDate: string;
  createdAt: string;
  completedAt: string | null;
  completedMemo: string | null;
  userId: number | null;
  userName: string | null;
  managementNumber: string | null;
};

// 組織内ユーザー
type OrganizationUser = {
  id: number;
  name: string | null;
  username: string;
};

interface HomeTodosViewProps {
  initialTodos: TodoWithProject[];
  showCreateForm?: boolean; // プレーンTODO作成フォームを表示するか（TODO画面のみ）
  currentUserId?: number | null; // 現在ログイン中のユーザーID
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
  if (diffDays <= 3) return { group: "upcoming" as const, label: `あと${diffDays}日`, diffDays };
  return { group: "later" as const, label: `あと${diffDays}日`, diffDays };
}

export function HomeTodosView({ initialTodos, showCreateForm = false, currentUserId }: HomeTodosViewProps) {
  const [todos, setTodos] = useState<TodoWithProject[]>(initialTodos);
  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<"all" | "mine">("all");

  // プレーンTODO作成フォーム用のstate
  const [newTodoContent, setNewTodoContent] = useState("");
  const [newTodoDueDate, setNewTodoDueDate] = useState("");
  const [newTodoSelectedDate, setNewTodoSelectedDate] = useState<Date | undefined>(undefined);
  const [newTodoCalendarOpen, setNewTodoCalendarOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTodoAssigneeId, setNewTodoAssigneeId] = useState<string>("__self__"); // 担当者ID（"__self__"は自分を意味する）

  // 組織内ユーザー一覧
  const [orgUsers, setOrgUsers] = useState<OrganizationUser[]>([]);

  // 組織内ユーザー一覧を取得
  useEffect(() => {
    if (showCreateForm) {
      fetch("/api/users", { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => setOrgUsers(data))
        .catch((err) => console.error("ユーザー一覧の取得に失敗しました:", err));
    }
  }, [showCreateForm]);

  // 削除確認ダイアログ用
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [todoToDelete, setTodoToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 日本時間で現在日時を取得
  const nowJst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));

  const fetchTodos = (filter?: "all" | "mine") => {
    const filterToUse = filter ?? userFilter;
    const url = filterToUse === "mine" && currentUserId
      ? `/api/todos?userId=${currentUserId}`
      : "/api/todos";
    fetch(url, { cache: "no-store" })
      .then((res) => res.json())
      .then(setTodos)
      .catch((err) => console.error("TODO一覧の取得に失敗しました:", err));
  };

  // userFilter変更時にデータを再取得
  const handleUserFilterChange = (filter: "all" | "mine") => {
    setUserFilter(filter);
    fetchTodos(filter);
  };

  const openDeleteDialog = (todoId: number) => {
    setTodoToDelete(todoId);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!todoToDelete) return;
    setIsDeleting(true);
    try {
      await fetch(`/api/todos/${todoToDelete}`, { method: "DELETE" });
      fetchTodos();
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
    await fetch(`/api/todos/${todo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completedAt: null }),
    });
    fetchTodos();
  };

  // プレーンTODOを作成
  const handleCreatePlainTodo = async () => {
    if (!newTodoContent.trim() || !newTodoDueDate) return;
    setIsCreating(true);
    try {
      // 担当者情報を取得（"__self__"は自分を意味する）
      const assignee = newTodoAssigneeId && newTodoAssigneeId !== "__self__"
        ? orgUsers.find((u) => u.id === parseInt(newTodoAssigneeId, 10))
        : null;

      await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newTodoContent.trim(),
          dueDate: newTodoDueDate,
          assigneeId: assignee?.id ?? null,
          assigneeName: assignee?.name ?? assignee?.username ?? null,
        }),
      });
      setNewTodoContent("");
      setNewTodoDueDate("");
      setNewTodoSelectedDate(undefined);
      setNewTodoAssigneeId("__self__");
      fetchTodos();
    } catch (err) {
      console.error("TODO作成に失敗しました:", err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 sm:px-6">
      <div className="mx-auto max-w-6xl py-6 sm:py-8 md:py-12">
        <div className="flex flex-col gap-6 sm:gap-8">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-foreground">
                <LayoutDashboard className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider">ダッシュボード</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">TODO</h1>
              <p className="text-muted-foreground text-xs sm:text-sm">
                {nowJst.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', timeZone: 'Asia/Tokyo' })}
              </p>
            </div>
            <Button asChild variant="default" className="w-fit">
              <Link href="/projects">
                案件一覧を確認
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <Separator />

          {/* Stats Summary */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">超過</p>
                    <p className="text-2xl font-bold">{grouped.overdue.length}</p>
                  </div>
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">今日</p>
                    <p className="text-2xl font-bold">{grouped.today.length}</p>
                  </div>
                  <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">３日以内</p>
                    <p className="text-2xl font-bold">{grouped.upcoming.length}</p>
                  </div>
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">完了</p>
                    <p className="text-2xl font-bold">{grouped.completed.length}</p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* プレーンTODO作成フォーム（TODO画面のみ） */}
          {showCreateForm && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  TODOを追加
                </CardTitle>
                <CardDescription className="text-xs">
                  案件に紐づかないTODOを作成できます
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                  <Input
                    placeholder="TODOの内容を入力"
                    value={newTodoContent}
                    onChange={(e) => setNewTodoContent(e.target.value)}
                    className="flex-1 min-w-[200px]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                        handleCreatePlainTodo();
                      }
                    }}
                  />
                  {/* 担当者選択 */}
                  <Select value={newTodoAssigneeId} onValueChange={setNewTodoAssigneeId}>
                    <SelectTrigger className="w-full sm:w-[160px]">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="担当者" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__self__">自分</SelectItem>
                      {orgUsers.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.name || u.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Popover open={newTodoCalendarOpen} onOpenChange={setNewTodoCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full sm:w-[180px] justify-start text-left font-normal",
                          !newTodoSelectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newTodoSelectedDate
                          ? formatDateJp(newTodoSelectedDate)
                          : "期日を選択"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={newTodoSelectedDate}
                        onSelect={(date) => {
                          setNewTodoSelectedDate(date);
                          if (date) {
                            const y = date.getFullYear();
                            const m = String(date.getMonth() + 1).padStart(2, "0");
                            const d = String(date.getDate()).padStart(2, "0");
                            setNewTodoDueDate(`${y}-${m}-${d}`);
                            setNewTodoCalendarOpen(false);
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Button
                    onClick={handleCreatePlainTodo}
                    disabled={!newTodoContent.trim() || !newTodoDueDate || isCreating}
                  >
                    {isCreating ? "作成中..." : "追加"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <div className="flex flex-col gap-3">
            {/* User Filter Tabs */}
            {currentUserId && (
              <Tabs value={userFilter} onValueChange={(v) => handleUserFilterChange(v as "all" | "mine")}>
                <TabsList>
                  <TabsTrigger value="all" className="gap-1.5">
                    <Users className="h-4 w-4" />
                    全員のTODO
                  </TabsTrigger>
                  <TabsTrigger value="mine" className="gap-1.5">
                    <User className="h-4 w-4" />
                    自分のTODO
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            {/* Search and Project Filter */}
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

          {/* TODO Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            <TodoSection
              title="超過"
              description="期限を過ぎたTODO"
              icon={AlertCircle}
              items={grouped.overdue}
              emptyMessage="超過したTODOはありません"
              onReopen={handleReopen}
              onDelete={openDeleteDialog}
              badge={
                grouped.overdue.length > 0 ? (
                  <span className="text-xs font-bold text-destructive">優先</span>
                ) : undefined
              }
            />
            <TodoSection
              title="今日"
              description="本日期限のTODO"
              icon={CalendarIcon}
              items={grouped.today}
              emptyMessage="本日のTODOはありません"
              onReopen={handleReopen}
              onDelete={openDeleteDialog}
            />
            <TodoSection
              title="３日以内"
              description="3日以内に期限のTODO"
              icon={Clock}
              items={grouped.upcoming}
              emptyMessage="３日以内のTODOはありません"
              onReopen={handleReopen}
              onDelete={openDeleteDialog}
            />
          </div>

          {grouped.later.length > 0 && (
            <TodoSection
              title="それ以降"
              description="4日以降に期限のTODO"
              icon={ListTodo}
              items={grouped.later}
              emptyMessage=""
              onReopen={handleReopen}
              onDelete={openDeleteDialog}
            />
          )}

          {grouped.completed.length > 0 && (
            <TodoSection
              title="完了済み"
              description="完了したTODO"
              icon={CheckCircle2}
              items={grouped.completed}
              emptyMessage=""
              onReopen={handleReopen}
              onDelete={openDeleteDialog}
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
