"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, Check, X, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { HorizontalPhaseData, PhaseOverride } from "./types";

interface PhaseEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phase?: HorizontalPhaseData | null;
  completedTitles: Set<string>;
  projectId: number;
  currentOverride?: PhaseOverride;
  onSave: (phaseKey: string, override: PhaseOverride) => Promise<void>;
}

export function PhaseEditDialog({
  open,
  onOpenChange,
  phase,
  completedTitles,
  projectId,
  currentOverride,
  onSave,
}: PhaseEditDialogProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open && phase) {
      setStartDate(currentOverride?.startDate || "");
      setEndDate(currentOverride?.endDate || "");
      setNote(currentOverride?.note || "");
    }
  }, [open, phase, currentOverride]);

  const handleSave = useCallback(async () => {
    if (!phase) return;

    setIsSaving(true);
    try {
      const override: PhaseOverride = {
        ...(currentOverride || {}),
      };

      if (startDate) override.startDate = startDate;
      if (endDate) override.endDate = endDate;
      if (note) override.note = note;

      await onSave(phase.key, override);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  }, [phase, startDate, endDate, note, currentOverride, onSave, onOpenChange]);

  if (!phase) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {phase.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="text-sm text-muted-foreground">
            進捗: {phase.completedSubs}/{phase.totalSubs} タスク完了
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">開始日</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">終了日</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">メモ</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="フェーズに関するメモを入力..."
              rows={3}
            />
          </div>

          {phase.subPhases && phase.subPhases.length > 0 && (
            <div className="space-y-2">
              <Label>サブタスク</Label>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {phase.subPhases.map((sub) => {
                  const isCompleted = completedTitles.has(sub.title);
                  return (
                    <div
                      key={sub.key}
                      className={cn(
                        "flex items-center gap-2 text-sm p-2 rounded",
                        isCompleted ? "bg-green-50 dark:bg-green-950" : "bg-muted/50"
                      )}
                    >
                      {isCompleted ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <X className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className={cn(isCompleted && "line-through text-muted-foreground")}>
                        {sub.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "保存中..." : "保存"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
