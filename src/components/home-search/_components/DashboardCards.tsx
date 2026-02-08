"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  Activity,
  Clock,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DashboardData, DashboardTodo, DashboardProject } from "../_types";

interface DashboardCardsProps {
  dashboard: DashboardData;
}

// TODOアイテムのリンクコンポーネント
function TodoItemLink({ todo }: { todo: DashboardTodo }) {
  return (
    <Link
      href={`/projects/${todo.projectId}`}
      className="block text-xs text-muted-foreground hover:text-foreground truncate"
    >
      <span className="font-medium">{todo.managementNumber}</span>: {todo.content}
    </Link>
  );
}

// 「他N件」表示
function MoreCount({ total, displayed }: { total: number; displayed: number }) {
  if (total <= displayed) return null;
  return (
    <p className="text-xs text-muted-foreground">他{total - displayed}件</p>
  );
}

export function DashboardCards({ dashboard }: DashboardCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {/* 期日超過TODO */}
      <Card
        className={cn(
          "transition-all hover:shadow-md cursor-pointer h-[180px]",
          dashboard.overdueTodos.count > 0 && "border-red-500/50 bg-red-500/5"
        )}
      >
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle
              className={cn(
                "h-4 w-4",
                dashboard.overdueTodos.count > 0
                  ? "text-red-500"
                  : "text-muted-foreground"
              )}
            />
            期日超過TODO
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-red-600 dark:text-red-400">
            {dashboard.overdueTodos.count}
          </div>
          <div className="mt-2 space-y-1">
            {dashboard.overdueTodos.items.slice(0, 2).map((todo) => (
              <TodoItemLink key={todo.id} todo={todo} />
            ))}
            <MoreCount total={dashboard.overdueTodos.count} displayed={2} />
          </div>
        </CardContent>
      </Card>

      {/* 今日期日のTODO */}
      <Card
        className={cn(
          "transition-all hover:shadow-md cursor-pointer h-[180px]",
          dashboard.todayTodos.count > 0 && "border-orange-500/50 bg-orange-500/5"
        )}
      >
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <CalendarClock
              className={cn(
                "h-4 w-4",
                dashboard.todayTodos.count > 0
                  ? "text-orange-500"
                  : "text-muted-foreground"
              )}
            />
            今日期日
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
            {dashboard.todayTodos.count}
          </div>
          <div className="mt-2 space-y-1">
            {dashboard.todayTodos.items.slice(0, 2).map((todo) => (
              <TodoItemLink key={todo.id} todo={todo} />
            ))}
            <MoreCount total={dashboard.todayTodos.count} displayed={2} />
          </div>
        </CardContent>
      </Card>

      {/* 今週期日のTODO */}
      <Card className="transition-all hover:shadow-md cursor-pointer h-[180px]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <CalendarDays className="h-4 w-4 text-blue-500" />
            今週期日
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {dashboard.thisWeekTodos.count}
          </div>
          <div className="mt-2 space-y-1">
            {dashboard.thisWeekTodos.items.slice(0, 2).map((todo) => (
              <TodoItemLink key={todo.id} todo={todo} />
            ))}
            <MoreCount total={dashboard.thisWeekTodos.count} displayed={2} />
          </div>
        </CardContent>
      </Card>

      {/* 案件アラート */}
      <Link href="/todos">
        <Card
          className={cn(
            "transition-all hover:shadow-md cursor-pointer h-[180px]",
            dashboard.projectAlerts.count > 0 && "border-red-500/50 bg-red-500/5"
          )}
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle
                className={cn(
                  "h-4 w-4",
                  dashboard.projectAlerts.count > 0
                    ? "text-red-500"
                    : "text-muted-foreground"
                )}
              />
              案件アラート
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">
              {dashboard.projectAlerts.totalAlerts}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {dashboard.projectAlerts.count}件の案件
            </p>
            <div className="mt-2 space-y-1">
              {dashboard.projectAlerts.items.slice(0, 2).map((project) => (
                <div
                  key={project.id}
                  className="text-xs text-muted-foreground truncate"
                >
                  <span className="font-medium">{project.managementNumber}</span>
                  <Badge
                    variant="destructive"
                    className="ml-1 text-[10px] px-1 py-0"
                  >
                    {project.alertCount}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* 進行中案件 */}
      <Link href="/projects">
        <Card className="transition-all hover:shadow-md cursor-pointer h-[180px]">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Activity className="h-4 w-4 text-green-500" />
              進行中案件
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {dashboard.activeProjects.count}
            </div>
            <div className="mt-2 space-y-1">
              {dashboard.activeProjects.items.slice(0, 2).map((project) => (
                <div
                  key={project.id}
                  className="text-xs text-muted-foreground truncate"
                >
                  <span className="font-medium">{project.managementNumber}</span>
                  {project.client && (
                    <span className="ml-1">({project.client})</span>
                  )}
                </div>
              ))}
              <MoreCount total={dashboard.activeProjects.count} displayed={2} />
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* 最近更新 */}
      <Card className="transition-all hover:shadow-md h-[180px]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4 text-purple-500" />
            最近更新
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {dashboard.recentProjects.items.slice(0, 3).map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="flex items-center gap-2 text-xs hover:text-foreground group"
              >
                <span className="font-medium text-muted-foreground group-hover:text-foreground truncate flex-1">
                  {project.managementNumber}
                </span>
                <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
