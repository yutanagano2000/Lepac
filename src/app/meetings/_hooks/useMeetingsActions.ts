"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { MeetingFormData } from "../_types";
import { INITIAL_FORM_DATA } from "../_constants";

interface UseMeetingsActionsProps {
  onRefresh: () => Promise<void>;
}

export function useMeetingsActions({ onRefresh }: UseMeetingsActionsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<MeetingFormData>({ ...INITIAL_FORM_DATA });
  const resetForm = useCallback(() => {
    setForm({ ...INITIAL_FORM_DATA });
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.warning("タイトルを入力してください");
      return;
    }
    if (!form.meetingDate) {
      toast.warning("日付を選択してください");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          meetingDate: form.meetingDate,
          category: form.category,
          content: form.content.trim() || null,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "登録に失敗しました");
      }
      resetForm();
      setDialogOpen(false);
      await onRefresh();
    } catch (err) {
      console.error("Meeting create error:", err);
      toast.error(err instanceof Error ? err.message : "登録に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  }, [form, onRefresh, resetForm]);

  const handleDateChange = useCallback((val: string | null) => {
    setForm((prev) => ({ ...prev, meetingDate: val || "" }));
  }, []);

  const updateForm = useCallback((updates: Partial<MeetingFormData>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  }, []);

  return {
    form,
    updateForm,
    dialogOpen,
    setDialogOpen,
    isSubmitting,
    handleSubmit,
    handleDateChange,
  };
}
