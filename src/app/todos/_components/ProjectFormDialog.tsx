"use client";

import { useState } from "react";
import { Loader2, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { NewProject } from "@/db/schema";
import { MONTHS, MANAGER_OPTIONS } from "../_constants";

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (project: NewProject) => Promise<void>;
  showAlert: (title: string, message: string) => void;
}

function formatCompletionMonth(value: string | null | undefined) {
  if (!value) return "";
  const [year, month] = value.split("-");
  return `${year}年${parseInt(month, 10)}月`;
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  onSubmit,
  showAlert,
}: ProjectFormDialogProps) {
  const [projectForm, setProjectForm] = useState<NewProject>({
    managementNumber: "",
    manager: "",
    client: "",
    projectNumber: "",
    completionMonth: "",
  });
  const [projectCalendarOpen, setProjectCalendarOpen] = useState(false);
  const [projectCalendarYear, setProjectCalendarYear] = useState(new Date().getFullYear());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectForm.manager?.trim()) {
      showAlert("入力エラー", "担当を選択してください");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(projectForm);
      setProjectForm({
        managementNumber: "",
        manager: "",
        client: "",
        projectNumber: "",
        completionMonth: "",
      });
      onOpenChange(false);
    } catch {
      showAlert("エラー", "案件登録に失敗しました。もう一度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectProjectMonth = (monthIndex: number) => {
    const monthStr = `${projectCalendarYear}-${String(monthIndex + 1).padStart(2, "0")}`;
    setProjectForm({ ...projectForm, completionMonth: monthStr });
    setProjectCalendarOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>案件を新規登録</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="managementNumber">管理番号</Label>
            <Input
              id="managementNumber"
              value={projectForm.managementNumber}
              onChange={(e) => setProjectForm({ ...projectForm, managementNumber: e.target.value })}
              placeholder="例: P-001"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="manager">担当</Label>
            <Select
              value={projectForm.manager || undefined}
              onValueChange={(value) => setProjectForm({ ...projectForm, manager: value })}
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
              value={projectForm.client}
              onChange={(e) => setProjectForm({ ...projectForm, client: e.target.value })}
              placeholder="例: 〇〇不動産"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="projectNumber">案件番号</Label>
            <Input
              id="projectNumber"
              value={projectForm.projectNumber}
              onChange={(e) => setProjectForm({ ...projectForm, projectNumber: e.target.value })}
              placeholder="例: 2026-0001"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>完成月</Label>
            <Popover open={projectCalendarOpen} onOpenChange={setProjectCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {projectForm.completionMonth
                    ? formatCompletionMonth(projectForm.completionMonth)
                    : "選択してください"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3">
                <div className="flex items-center justify-between mb-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setProjectCalendarYear(projectCalendarYear - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="font-medium">{projectCalendarYear}年</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setProjectCalendarYear(projectCalendarYear + 1)}
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
                      onClick={() => selectProjectMonth(index)}
                    >
                      {month}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
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
