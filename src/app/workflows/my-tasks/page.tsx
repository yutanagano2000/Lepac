"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Play,
  Clock,
  CheckCircle,
  Calendar,
  FolderOpen,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PRIORITY } from "../_constants";

interface MyTask {
  assignmentId: number;
  workflowName: string;
  projectName: string | null;
  status: "pending" | "in_progress" | "completed";
  currentStep: number;
  totalSteps: number;
  dueDate: string | null;
  priority: number;
  startedAt: string | null;
  completedAt: string | null;
}

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<MyTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/workflows/my-tasks");
      if (!res.ok) throw new Error("タスクの取得に失敗しました");
      const data = await res.json();
      setTasks(data.assignments ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const activeTasks = tasks.filter(
    (t) => t.status === "pending" || t.status === "in_progress"
  );
  const completedTasks = tasks.filter((t) => t.status === "completed");

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
    });
  };

  const getPriorityBadge = (priority: number) => {
    switch (priority) {
      case PRIORITY.URGENT:
        return <Badge variant="destructive">緊急</Badge>;
      case PRIORITY.HIGH:
        return <Badge variant="default">高</Badge>;
      case PRIORITY.MEDIUM:
        return <Badge variant="secondary">中</Badge>;
      default:
        return <Badge variant="outline">低</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "in_progress":
        return (
          <Badge className="bg-blue-500 text-white">
            <Clock className="h-3 w-3 mr-1" />
            進行中
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-green-500 text-white">
            <CheckCircle className="h-3 w-3 mr-1" />
            完了
          </Badge>
        );
      default:
        return <Badge variant="outline">未開始</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={fetchTasks}>再試行</Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold">マイタスク</h1>
        <p className="text-muted-foreground">
          割り当てられたワークフローを実行
        </p>
      </div>

      {/* 進行中のタスクがあれば「仕事を始める」ボタン */}
      {activeTasks.some((t) => t.status === "in_progress") && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">進行中のタスクがあります</p>
                <p className="text-sm text-muted-foreground">
                  タスクを継続してください
                </p>
              </div>
              <Link
                href={`/workflows/execute/${
                  activeTasks.find((t) => t.status === "in_progress")
                    ?.assignmentId
                }`}
              >
                <Button>
                  <Play className="h-4 w-4 mr-2" />
                  作業を続ける
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* タブ */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "active" | "completed")}>
        <TabsList>
          <TabsTrigger value="active" className="gap-2">
            <Clock className="h-4 w-4" />
            未完了 ({activeTasks.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            完了済み ({completedTasks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {activeTasks.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>未完了のタスクはありません</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeTasks.map((task) => (
                <Card key={task.assignmentId} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">
                          {task.workflowName}
                        </CardTitle>
                        {task.projectName && (
                          <CardDescription>{task.projectName}</CardDescription>
                        )}
                      </div>
                      {getPriorityBadge(task.priority)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 mb-3">
                      {getStatusBadge(task.status)}
                      {task.dueDate && (
                        <Badge variant="outline" className="gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(task.dueDate)}
                        </Badge>
                      )}
                    </div>

                    {/* 進捗バー */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">進捗</span>
                        <span className="font-medium">
                          {task.currentStep} / {task.totalSteps} ステップ
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{
                            width: `${
                              task.totalSteps > 0
                                ? ((task.currentStep - 1) / task.totalSteps) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    <Link href={`/workflows/execute/${task.assignmentId}`}>
                      <Button className="w-full">
                        <Play className="h-4 w-4 mr-2" />
                        {task.status === "in_progress" ? "続ける" : "開始"}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          {completedTasks.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>完了したタスクはありません</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {completedTasks.map((task) => (
                <Card key={task.assignmentId} className="opacity-75">
                  <CardHeader className="pb-3">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">
                        {task.workflowName}
                      </CardTitle>
                      {task.projectName && (
                        <CardDescription>{task.projectName}</CardDescription>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(task.status)}
                      {task.completedAt && (
                        <span className="text-sm text-muted-foreground">
                          {formatDate(task.completedAt)} 完了
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
