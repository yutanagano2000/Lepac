"use client";

import { useState, useEffect } from "react";
import { Play, Check, SkipForward, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TaskActionsProps {
  assignmentId: number;
  stepStartedAt: string | null;
  estimatedMinutes: number | null;
  isWorkflowStarted: boolean;
  onStart: () => Promise<void>;
  onComplete: (notes?: string) => Promise<void>;
  onSkip: (reason: string) => Promise<void>;
}

export function TaskActions({
  assignmentId,
  stepStartedAt,
  estimatedMinutes,
  isWorkflowStarted,
  onStart,
  onComplete,
  onSkip,
}: TaskActionsProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [notes, setNotes] = useState("");
  const [skipReason, setSkipReason] = useState("");

  // タイマー更新
  useEffect(() => {
    if (!stepStartedAt) {
      setElapsedSeconds(0);
      return;
    }

    const startTime = new Date(stepStartedAt).getTime();
    const updateTimer = () => {
      const now = Date.now();
      setElapsedSeconds(Math.floor((now - startTime) / 1000));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [stepStartedAt]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const isOvertime = estimatedMinutes && elapsedSeconds > estimatedMinutes * 60;

  const handleStart = async () => {
    setIsLoading(true);
    try {
      await onStart();
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      await onComplete(notes || undefined);
      setShowCompleteDialog(false);
      setNotes("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!skipReason.trim()) return;
    setIsLoading(true);
    try {
      await onSkip(skipReason);
      setShowSkipDialog(false);
      setSkipReason("");
    } finally {
      setIsLoading(false);
    }
  };

  // 未開始の場合は開始ボタンのみ表示
  if (!isWorkflowStarted) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <Button
          size="lg"
          className="w-full max-w-sm h-16 text-lg"
          onClick={handleStart}
          disabled={isLoading}
        >
          <Play className="h-6 w-6 mr-2" />
          {isLoading ? "開始中..." : "作業を開始する"}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* タイマー表示 */}
        <div
          className={`flex items-center justify-center gap-2 py-4 rounded-lg ${
            isOvertime ? "bg-red-100 text-red-700" : "bg-muted"
          }`}
        >
          {isOvertime ? (
            <AlertTriangle className="h-5 w-5" />
          ) : (
            <Clock className="h-5 w-5" />
          )}
          <span className="text-2xl font-mono font-bold">
            {formatTime(elapsedSeconds)}
          </span>
          {estimatedMinutes && (
            <span className="text-sm text-muted-foreground">
              / 目安 {estimatedMinutes}分
            </span>
          )}
        </div>

        {/* アクションボタン */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setShowSkipDialog(true)}
            disabled={isLoading}
          >
            <SkipForward className="h-4 w-4 mr-2" />
            スキップ
          </Button>
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={() => setShowCompleteDialog(true)}
            disabled={isLoading}
          >
            <Check className="h-4 w-4 mr-2" />
            完了
          </Button>
        </div>
      </div>

      {/* 完了ダイアログ */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ステップを完了</DialogTitle>
            <DialogDescription>
              このステップを完了としてマークします。メモがあれば入力してください。
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="メモ（任意）"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
              キャンセル
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleComplete}
              disabled={isLoading}
            >
              {isLoading ? "処理中..." : "完了する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* スキップダイアログ */}
      <Dialog open={showSkipDialog} onOpenChange={setShowSkipDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ステップをスキップ</DialogTitle>
            <DialogDescription>
              このステップをスキップする理由を入力してください。
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="スキップ理由（必須）"
            value={skipReason}
            onChange={(e) => setSkipReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSkipDialog(false)}>
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleSkip}
              disabled={isLoading || !skipReason.trim()}
            >
              {isLoading ? "処理中..." : "スキップする"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
