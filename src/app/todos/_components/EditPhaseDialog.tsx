"use client";

import { useState, useCallback } from "react";
import { Check, X, Loader2, Calendar as CalendarIcon, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ProjectWithProgress } from "../_types";
import type { PHASES } from "../_constants";

interface EditPhaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectWithProgress | null;
  phase: (typeof PHASES)[number] | null;
  onSave: (data: {
    plannedDate: Date | undefined;
    completedDate: Date | undefined;
    memo: string;
  }) => Promise<void>;
  onMarkComplete: () => Promise<void>;
  onMarkIncomplete: () => Promise<void>;
  onAddTodo: () => Promise<void>;
  showAlert: (title: string, message: string) => void;
}

function formatDateFull(date: Date | null): string {
  if (!date) return "-";
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}.${m}.${d}`;
}

export function EditPhaseDialog({
  open,
  onOpenChange,
  project,
  phase,
  onSave,
  onMarkComplete,
  onMarkIncomplete,
  onAddTodo,
  showAlert,
}: EditPhaseDialogProps) {
  const [plannedDate, setPlannedDate] = useState<Date | undefined>(undefined);
  const [completedDate, setCompletedDate] = useState<Date | undefined>(undefined);
  const [phaseMemo, setPhaseMemo] = useState("");
  const [plannedCalendarOpen, setPlannedCalendarOpen] = useState(false);
  const [completedCalendarOpen, setCompletedCalendarOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ダイアログが開いた時に初期値を設定
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (newOpen && project && phase) {
        const progressItem = project.progressItems.find((p) => p.title === phase.title);
        setPlannedDate(progressItem?.createdAt ? new Date(progressItem.createdAt) : undefined);
        setCompletedDate(progressItem?.completedAt ? new Date(progressItem.completedAt) : undefined);
        setPhaseMemo(progressItem?.description || "");
      }
      onOpenChange(newOpen);
    },
    [project, phase, onOpenChange]
  );

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ plannedDate, completedDate, memo: phaseMemo });
      onOpenChange(false);
    } catch (error) {
      showAlert("エラー", "保存に失敗しました。もう一度お試しください。");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkComplete = async () => {
    setIsSaving(true);
    try {
      await onMarkComplete();
      onOpenChange(false);
    } catch (error) {
      showAlert("エラー", "完了の更新に失敗しました。もう一度お試しください。");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkIncomplete = async () => {
    setIsSaving(true);
    try {
      await onMarkIncomplete();
      onOpenChange(false);
    } catch (error) {
      showAlert("エラー", "未完了への変更に失敗しました。もう一度お試しください。");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTodo = async () => {
    setIsSaving(true);
    try {
      await onAddTodo();
    } catch (error) {
      showAlert("エラー", "TODOの追加に失敗しました。もう一度お試しください。");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>フェーズを編集</DialogTitle>
        </DialogHeader>
        {project && phase && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">案件</p>
                <p className="font-medium">{project.managementNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">フェーズ</p>
                <p className="font-medium">{phase.title}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>予定日</Label>
              <Popover open={plannedCalendarOpen} onOpenChange={setPlannedCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !plannedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {plannedDate ? formatDateFull(plannedDate) : "予定日を選択"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={plannedDate}
                    onSelect={(date) => {
                      setPlannedDate(date);
                      setPlannedCalendarOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>完了日</Label>
              <Popover open={completedCalendarOpen} onOpenChange={setCompletedCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !completedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {completedDate ? formatDateFull(completedDate) : "完了日を選択"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={completedDate}
                    onSelect={(date) => {
                      setCompletedDate(date);
                      setCompletedCalendarOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>メモ</Label>
              <Textarea
                value={phaseMemo}
                onChange={(e) => setPhaseMemo(e.target.value)}
                placeholder="メモを入力..."
                rows={3}
              />
            </div>
            <div className="flex justify-between pt-4">
              <div className="flex gap-2">
                {completedDate ? (
                  <Button
                    variant="outline"
                    className="border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950"
                    onClick={handleMarkIncomplete}
                    disabled={isSaving}
                  >
                    <X className="h-4 w-4 mr-2" />
                    未完了に戻す
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={handleMarkComplete}
                    disabled={isSaving}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    完了にする
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                  onClick={handleAddTodo}
                  disabled={isSaving}
                >
                  <ListTodo className="h-4 w-4 mr-2" />
                  TODOに追加
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                  キャンセル
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      保存中...
                    </>
                  ) : (
                    "保存"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
