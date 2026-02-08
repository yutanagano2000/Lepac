"use client";

import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import type { Project } from "@/db/schema";
import { MONTHS, MANAGER_OPTIONS } from "../_constants";
import { formatCompletionMonth } from "./utils";

interface ProjectEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  onConfirm: (project: Project) => Promise<void>;
}

export function ProjectEditDialog({
  open,
  onOpenChange,
  project,
  onConfirm,
}: ProjectEditDialogProps) {
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  // ダイアログが開くたびにプロジェクトデータを初期化
  useEffect(() => {
    if (open && project) {
      setEditingProject({ ...project });
      if (project.completionMonth) {
        const [year] = project.completionMonth.split("-");
        setCalendarYear(parseInt(year, 10));
      } else {
        setCalendarYear(new Date().getFullYear());
      }
    }
  }, [open, project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    await onConfirm(editingProject);
    onOpenChange(false);
    setEditingProject(null);
  };

  const selectMonth = (monthIndex: number) => {
    if (!editingProject) return;
    const monthStr = `${calendarYear}-${String(monthIndex + 1).padStart(2, "0")}`;
    setEditingProject({ ...editingProject, completionMonth: monthStr });
    setCalendarOpen(false);
  };

  if (!editingProject) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>案件を編集</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-managementNumber">管理番号</Label>
            <Input
              id="edit-managementNumber"
              value={editingProject.managementNumber}
              onChange={(e) =>
                setEditingProject({ ...editingProject, managementNumber: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-manager">担当</Label>
            <Select
              value={editingProject.manager}
              onValueChange={(value) =>
                setEditingProject({ ...editingProject, manager: value })
              }
            >
              <SelectTrigger id="edit-manager" className="w-full">
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                {MANAGER_OPTIONS.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
                {editingProject.manager &&
                  !MANAGER_OPTIONS.includes(editingProject.manager) && (
                    <SelectItem value={editingProject.manager}>
                      {editingProject.manager}
                    </SelectItem>
                  )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-client">販売先</Label>
            <Input
              id="edit-client"
              value={editingProject.client}
              onChange={(e) =>
                setEditingProject({ ...editingProject, client: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-projectNumber">案件番号</Label>
            <Input
              id="edit-projectNumber"
              value={editingProject.projectNumber}
              onChange={(e) =>
                setEditingProject({ ...editingProject, projectNumber: e.target.value })
              }
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
                  {editingProject.completionMonth
                    ? formatCompletionMonth(editingProject.completionMonth)
                    : "選択してください"}
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button type="submit">保存</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
