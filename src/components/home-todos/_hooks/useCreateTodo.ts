"use client";

import { useState, useCallback } from "react";

interface UseCreateTodoReturn {
  content: string;
  setContent: (content: string) => void;
  dueDate: string;
  setDueDate: (date: string) => void;
  selectedDate: Date | undefined;
  setSelectedDate: (date: Date | undefined) => void;
  calendarOpen: boolean;
  setCalendarOpen: (open: boolean) => void;
  isCreating: boolean;
  handleCreate: (onSuccess: () => void) => Promise<void>;
  reset: () => void;
}

export function useCreateTodo(): UseCreateTodoReturn {
  const [content, setContent] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const reset = useCallback(() => {
    setContent("");
    setDueDate("");
    setSelectedDate(undefined);
  }, []);

  const handleCreate = useCallback(
    async (onSuccess: () => void) => {
      if (!content.trim() || !dueDate) return;
      setIsCreating(true);
      try {
        await fetch("/api/todos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: content.trim(),
            dueDate: dueDate,
          }),
        });
        reset();
        onSuccess();
      } catch (err) {
        console.error("TODO作成に失敗しました:", err);
      } finally {
        setIsCreating(false);
      }
    },
    [content, dueDate, reset]
  );

  return {
    content,
    setContent,
    dueDate,
    setDueDate,
    selectedDate,
    setSelectedDate,
    calendarOpen,
    setCalendarOpen,
    isCreating,
    handleCreate,
    reset,
  };
}
