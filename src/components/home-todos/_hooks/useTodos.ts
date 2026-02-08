"use client";

import { useState, useMemo, useCallback } from "react";
import type { TodoWithProject, GroupedTodos } from "../_types";
import { getDueDateInfo } from "../_utils";

interface UseTodosReturn {
  todos: TodoWithProject[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  projectFilter: string;
  setProjectFilter: (filter: string) => void;
  projectOptions: string[];
  filteredTodos: TodoWithProject[];
  grouped: GroupedTodos;
  // アクション
  fetchTodos: () => void;
  handleDelete: (todoId: number) => Promise<void>;
  handleReopen: (todo: TodoWithProject) => Promise<void>;
  // 削除ダイアログ
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: (open: boolean) => void;
  todoToDelete: number | null;
  openDeleteDialog: (todoId: number) => void;
  isDeleting: boolean;
  confirmDelete: () => Promise<void>;
}

export function useTodos(initialTodos: TodoWithProject[]): UseTodosReturn {
  const [todos, setTodos] = useState<TodoWithProject[]>(initialTodos);
  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState<string>("all");

  // 削除確認ダイアログ
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [todoToDelete, setTodoToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTodos = useCallback(() => {
    fetch("/api/todos", { cache: "no-store" })
      .then((res) => res.json())
      .then(setTodos)
      .catch((err) => console.error("TODO一覧の取得に失敗しました:", err));
  }, []);

  const openDeleteDialog = useCallback((todoId: number) => {
    setTodoToDelete(todoId);
    setDeleteDialogOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (todoId: number) => {
      await fetch(`/api/todos/${todoId}`, { method: "DELETE" });
      fetchTodos();
    },
    [fetchTodos]
  );

  const confirmDelete = useCallback(async () => {
    if (!todoToDelete) return;
    setIsDeleting(true);
    try {
      await handleDelete(todoToDelete);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setTodoToDelete(null);
    }
  }, [todoToDelete, handleDelete]);

  const handleReopen = useCallback(
    async (todo: TodoWithProject) => {
      await fetch(`/api/todos/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completedAt: null }),
      });
      fetchTodos();
    },
    [fetchTodos]
  );

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
    today.sort((a, b) =>
      (a.managementNumber ?? "").localeCompare(b.managementNumber ?? "")
    );
    upcoming.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    later.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    completed.sort((a, b) =>
      (b.completedAt ?? "").localeCompare(a.completedAt ?? "")
    );

    return { overdue, today, upcoming, later, completed };
  }, [filteredTodos]);

  return {
    todos,
    searchQuery,
    setSearchQuery,
    projectFilter,
    setProjectFilter,
    projectOptions,
    filteredTodos,
    grouped,
    fetchTodos,
    handleDelete,
    handleReopen,
    deleteDialogOpen,
    setDeleteDialogOpen,
    todoToDelete,
    openDeleteDialog,
    isDeleting,
    confirmDelete,
  };
}
