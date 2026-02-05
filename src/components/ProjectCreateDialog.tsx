"use client";

import { useState } from "react";
import { Plus, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { NewProject } from "@/db/schema";

const MONTHS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
const MANAGER_OPTIONS = ["吉國", "刎本", "松下", "佐東", "川田", "近永", "その他"];

interface ProjectCreateDialogProps {
  onProjectCreated?: (project: { id: number } & NewProject) => void;
  trigger?: React.ReactNode;
}

export function ProjectCreateDialog({ onProjectCreated, trigger }: ProjectCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewProject>({
    managementNumber: "",
    manager: "",
    client: "",
    projectNumber: "",
    completionMonth: "",
  });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatCompletionMonth = (value: string | null | undefined) => {
    if (!value) return "";
    const [year, month] = value.split("-");
    return `${year}年${parseInt(month, 10)}月`;
  };

  const selectMonth = (monthIndex: number) => {
    const monthStr = `${calendarYear}-${String(monthIndex + 1).padStart(2, "0")}`;
    setForm({ ...form, completionMonth: monthStr });
    setCalendarOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.manager?.trim()) {
      setError("担当を選択してください");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const newProject = await res.json();
        onProjectCreated?.(newProject);
        setForm({ managementNumber: "", manager: "", client: "", projectNumber: "", completionMonth: "" });
        setOpen(false);
      } else {
        const data = await res.json();
        setError(data.error || "登録に失敗しました");
      }
    } catch (err) {
      console.error("案件登録に失敗しました:", err);
      setError("登録に失敗しました。もう一度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const defaultTrigger = (
    <Button size="sm" className="h-9">
      <Plus className="h-4 w-4" />
      <span className="hidden sm:inline ml-1">新規登録</span>
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>案件を新規登録</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="managementNumber">管理番号</Label>
            <Input
              id="managementNumber"
              value={form.managementNumber}
              onChange={(e) => setForm({ ...form, managementNumber: e.target.value })}
              placeholder="例: P-001"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="manager">担当</Label>
            <Select
              value={form.manager || undefined}
              onValueChange={(value) => setForm({ ...form, manager: value })}
            >
              <SelectTrigger id="manager" className="w-full">
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                {MANAGER_OPTIONS.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="client">販売先</Label>
            <Input
              id="client"
              value={form.client}
              onChange={(e) => setForm({ ...form, client: e.target.value })}
              placeholder="例: 〇〇不動産"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="projectNumber">案件番号</Label>
            <Input
              id="projectNumber"
              value={form.projectNumber}
              onChange={(e) => setForm({ ...form, projectNumber: e.target.value })}
              placeholder="例: 2026-0001"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>完成月</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {form.completionMonth ? formatCompletionMonth(form.completionMonth) : "選択してください"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3">
                <div className="flex items-center justify-between mb-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setCalendarYear(calendarYear - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="font-medium">{calendarYear}年</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setCalendarYear(calendarYear + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {MONTHS.map((month, index) => (
                    <Button
                      key={month}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9"
                      onClick={() => selectMonth(index)}
                    >
                      {month}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
              キャンセル
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  登録中...
                </>
              ) : (
                "登録"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
