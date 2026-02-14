"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Activity,
  Timer,
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
import { Progress } from "@/components/ui/progress";

interface MemberCurrentTask {
  assignmentId: number;
  workflowName: string;
  currentStep: number;
  totalSteps: number;
  stepTitle: string;
  elapsedMinutes: number;
  isOvertime: boolean;
}

interface MemberTodayStats {
  completedWorkflows: number;
  totalMinutes: number;
  avgMinutesPerWorkflow: number;
}

interface MemberStatus {
  userId: number;
  userName: string;
  currentTask: MemberCurrentTask | null;
  todayStats: MemberTodayStats;
}

interface DashboardStats {
  today: {
    completed: number;
    inProgress: number;
    pending: number;
  };
  thisWeek: {
    completed: number;
    avgMinutes: number;
  };
}

export default function MembersPage() {
  const [members, setMembers] = useState<MemberStatus[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [membersRes, statsRes] = await Promise.all([
        fetch("/api/workflows/dashboard/members"),
        fetch("/api/workflows/dashboard/stats"),
      ]);

      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data.members ?? []);
      }
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // 30秒ごとに自動更新
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const workingMembers = members.filter((m) => m.currentTask !== null);
  const idleMembers = members.filter((m) => m.currentTask === null);

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">メンバー状況</h1>
          <p className="text-muted-foreground">
            チームのワークフロー進捗をリアルタイムで確認
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
          />
          更新
        </Button>
      </div>

      {/* 統計カード */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>本日の完了</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-500" />
                {stats.today.completed}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>進行中</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                <Activity className="h-6 w-6 text-blue-500" />
                {stats.today.inProgress}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>未着手</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                <Clock className="h-6 w-6 text-muted-foreground" />
                {stats.today.pending}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>今週の平均時間</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                <Timer className="h-6 w-6 text-orange-500" />
                {stats.thisWeek.avgMinutes}分
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* 作業中メンバー */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5 text-green-500" />
          作業中 ({workingMembers.length})
        </h2>

        {workingMembers.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>現在作業中のメンバーはいません</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {workingMembers.map((member) => (
              <Card
                key={member.userId}
                className={`${
                  member.currentTask?.isOvertime
                    ? "border-red-300 bg-red-50"
                    : "border-green-200 bg-green-50"
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{member.userName}</CardTitle>
                    {member.currentTask?.isOvertime && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        超過
                      </Badge>
                    )}
                  </div>
                  <CardDescription>
                    {member.currentTask?.workflowName}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">
                        {member.currentTask?.stepTitle}
                      </span>
                      <span className="text-muted-foreground">
                        {member.currentTask?.currentStep} /{" "}
                        {member.currentTask?.totalSteps}
                      </span>
                    </div>
                    <Progress
                      value={
                        ((member.currentTask?.currentStep ?? 0) /
                          (member.currentTask?.totalSteps ?? 1)) *
                        100
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">経過時間</span>
                    <span
                      className={`font-mono ${
                        member.currentTask?.isOvertime
                          ? "text-red-600 font-bold"
                          : ""
                      }`}
                    >
                      {member.currentTask?.elapsedMinutes}分
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 待機中メンバー */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          待機中 ({idleMembers.length})
        </h2>

        {idleMembers.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>全員が作業中です</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {idleMembers.map((member) => (
              <Card key={member.userId}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{member.userName}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                      <span>本日完了</span>
                      <span className="font-medium text-foreground">
                        {member.todayStats.completedWorkflows} 件
                      </span>
                    </div>
                    {member.todayStats.completedWorkflows > 0 && (
                      <div className="flex justify-between">
                        <span>合計時間</span>
                        <span className="font-medium text-foreground">
                          {member.todayStats.totalMinutes} 分
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
