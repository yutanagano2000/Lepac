"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, Clock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StepProgress } from "./StepProgress";
import { TaskCard } from "./TaskCard";
import { TaskActions } from "./TaskActions";
import type { TaskExecutionData } from "../_types";

interface TaskExecutionViewProps {
  initialData: TaskExecutionData;
}

export function TaskExecutionView({ initialData }: TaskExecutionViewProps) {
  const router = useRouter();
  const [data, setData] = useState<TaskExecutionData>(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { assignment, currentTask, previousSteps } = data;
  const isWorkflowStarted = assignment.status !== "pending";
  const isCompleted = assignment.status === "completed";

  // データ再取得
  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/workflows/my-tasks/${assignment.id}`);
      if (res.ok) {
        const newData = await res.json();
        setData(newData);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [assignment.id]);

  // ワークフロー開始
  const handleStart = useCallback(async () => {
    const res = await fetch(`/api/workflows/my-tasks/${assignment.id}/start`, {
      method: "POST",
    });
    if (res.ok) {
      await refreshData();
    }
  }, [assignment.id, refreshData]);

  // ステップ完了
  const handleComplete = useCallback(
    async (notes?: string) => {
      const res = await fetch(
        `/api/workflows/my-tasks/${assignment.id}/complete-step`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes }),
        }
      );
      if (res.ok) {
        await refreshData();
      }
    },
    [assignment.id, refreshData]
  );

  // ステップスキップ
  const handleSkip = useCallback(
    async (reason: string) => {
      const res = await fetch(
        `/api/workflows/my-tasks/${assignment.id}/skip-step`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        }
      );
      if (res.ok) {
        await refreshData();
      }
    },
    [assignment.id, refreshData]
  );

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-background border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="font-semibold">{assignment.workflowName}</h1>
              {assignment.projectName && (
                <p className="text-sm text-muted-foreground">
                  {assignment.projectName}
                </p>
              )}
            </div>
            {assignment.dueDate && (
              <Badge variant="outline" className="gap-1">
                <Calendar className="h-3 w-3" />
                期限: {formatDate(assignment.dueDate)}
              </Badge>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* 進捗バー */}
        <StepProgress
          currentStep={assignment.currentStep}
          totalSteps={assignment.totalSteps}
        />

        {/* 完了画面 */}
        {isCompleted && (
          <Card className="border-green-500 bg-green-50">
            <CardContent className="py-8 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-green-700 mb-2">
                ワークフロー完了
              </h2>
              <p className="text-green-600">
                すべてのステップが完了しました
              </p>
              <Button
                className="mt-6"
                onClick={() => router.push("/workflows")}
              >
                ワークフロー一覧に戻る
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 現在のタスク */}
        {!isCompleted && currentTask && (
          <>
            <TaskCard task={currentTask} />
            <TaskActions
              assignmentId={assignment.id}
              stepStartedAt={currentTask.startedAt}
              estimatedMinutes={currentTask.estimatedMinutes}
              isWorkflowStarted={isWorkflowStarted}
              onStart={handleStart}
              onComplete={handleComplete}
              onSkip={handleSkip}
            />
          </>
        )}

        {/* 完了済みステップ履歴 */}
        {previousSteps.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                完了済みステップ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {previousSteps.map((step) => (
                  <div
                    key={step.stepOrder}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-medium">
                        {step.stepOrder}
                      </div>
                      <span className="font-medium">{step.title}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {step.durationSeconds !== null && (
                        <span className="mr-3">
                          {formatDuration(step.durationSeconds)}
                        </span>
                      )}
                      {formatDate(step.completedAt)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
