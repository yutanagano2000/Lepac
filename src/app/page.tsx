import { db } from "@/db";
import { projects, progress } from "@/db/schema";
import { calculateTimeline } from "@/lib/timeline";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, Calendar, Clock, ArrowRight, CheckCircle2, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface TaskItem {
  projectId: number;
  managementNumber: string;
  client: string;
  taskTitle: string;
  dueDate: Date;
  daysUntilDue: number;
}

export default async function HomePage() {
  const allProjects = await db.select().from(projects);
  const allProgress = await db.select().from(progress);
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const overdueTasks: TaskItem[] = [];
  const todayTasks: TaskItem[] = [];
  const upcomingTasks: TaskItem[] = [];
  
  for (const project of allProjects) {
    const projectProgress = allProgress.filter((p) => p.projectId === project.id);
    
    if (projectProgress.length > 0) {
      for (const p of projectProgress) {
        if (p.status === "completed") continue;
        const dueDate = new Date(p.createdAt);
        const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
        const daysUntilDue = Math.ceil((dueDateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        const task: TaskItem = {
          projectId: project.id,
          managementNumber: project.managementNumber,
          client: project.client,
          taskTitle: p.title,
          dueDate,
          daysUntilDue,
        };
        
        if (daysUntilDue < 0) overdueTasks.push(task);
        else if (daysUntilDue === 0) todayTasks.push(task);
        else if (daysUntilDue <= 7) upcomingTasks.push(task);
      }
    } else if (project.completionMonth) {
      const timeline = calculateTimeline(project.completionMonth, false);
      for (const phase of timeline) {
        const dueDateOnly = new Date(phase.date.getFullYear(), phase.date.getMonth(), phase.date.getDate());
        const daysUntilDue = Math.ceil((dueDateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        const task: TaskItem = {
          projectId: project.id,
          managementNumber: project.managementNumber,
          client: project.client,
          taskTitle: phase.title,
          dueDate: phase.date,
          daysUntilDue,
        };
        
        if (daysUntilDue < 0) overdueTasks.push(task);
        else if (daysUntilDue === 0) todayTasks.push(task);
        else if (daysUntilDue <= 7) upcomingTasks.push(task);
      }
    }
  }
  
  overdueTasks.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  todayTasks.sort((a, b) => a.managementNumber.localeCompare(b.managementNumber));
  upcomingTasks.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl px-6 py-8 md:py-12">
        <div className="flex flex-col gap-8">
          
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                <LayoutDashboard className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-wider">概要</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">ダッシュボード</h1>
              <p className="text-zinc-500 text-sm">
                {now.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
              </p>
            </div>
            <Button asChild variant="default" className="bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-sm">
              <Link href="/projects">
                案件一覧を確認
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <Separator className="bg-zinc-200 dark:bg-zinc-800" />

          {/* Stats Summary Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="overflow-hidden border-none shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800 bg-white dark:bg-zinc-900">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-zinc-500">超過タスク</p>
                    <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{overdueTasks.length}</p>
                  </div>
                  <div className="rounded-full bg-zinc-100 p-3 dark:bg-zinc-800">
                    <AlertCircle className="h-6 w-6 text-zinc-900 dark:text-zinc-100" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-none shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800 bg-white dark:bg-zinc-900">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-zinc-500">今日のタスク</p>
                    <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{todayTasks.length}</p>
                  </div>
                  <div className="rounded-full bg-zinc-100 p-3 dark:bg-zinc-800">
                    <Calendar className="h-6 w-6 text-zinc-900 dark:text-zinc-100" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-none shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800 bg-white dark:bg-zinc-900 sm:col-span-2 lg:col-span-1">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-zinc-500">今週のタスク</p>
                    <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{upcomingTasks.length}</p>
                  </div>
                  <div className="rounded-full bg-zinc-100 p-3 dark:bg-zinc-800">
                    <Clock className="h-6 w-6 text-zinc-900 dark:text-zinc-100" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            
            {/* Overdue Section */}
            <Card className="lg:col-span-1 border-none shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800 bg-white dark:bg-zinc-900">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="space-y-1">
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                    <AlertCircle className="h-4 w-4" />
                    超過
                  </CardTitle>
                  <CardDescription className="text-xs text-zinc-500">対応期限を過ぎたタスク</CardDescription>
                </div>
                <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px] font-bold border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100">
                  優先
                </Badge>
              </CardHeader>
              <CardContent>
                {overdueTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <CheckCircle2 className="h-10 w-10 text-zinc-200 dark:text-zinc-800 mb-2" />
                    <p className="text-sm text-zinc-500">超過タスクはありません</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {overdueTasks.slice(0, 5).map((task, i) => (
                      <Link key={`ov-${i}`} href={`/projects/${task.projectId}`} className="group relative flex items-center gap-4 rounded-xl border border-zinc-100 bg-white p-3 shadow-sm transition-all hover:border-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-100 dark:hover:bg-zinc-800">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900">
                          <span className="text-[10px] font-bold">{Math.abs(task.daysUntilDue)}日</span>
                        </div>
                        <div className="flex-1 space-y-1 truncate">
                          <p className="text-sm font-semibold truncate text-zinc-900 dark:text-zinc-100 group-hover:text-black dark:group-hover:text-white transition-colors">{task.managementNumber}</p>
                          <p className="text-[10px] text-zinc-500 truncate">{task.taskTitle}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-zinc-300 transition-transform group-hover:translate-x-1 group-hover:text-zinc-900 dark:group-hover:text-zinc-100" />
                      </Link>
                    ))}
                    {overdueTasks.length > 5 && (
                      <Button variant="ghost" size="sm" className="w-full text-xs text-zinc-500 hover:bg-transparent" asChild>
                        <Link href="/projects">他 {overdueTasks.length - 5} 件を案件一覧で確認</Link>
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Today Section */}
            <Card className="lg:col-span-1 border-none shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800 bg-white dark:bg-zinc-900">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="space-y-1">
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                    <Calendar className="h-4 w-4" />
                    今日
                  </CardTitle>
                  <CardDescription className="text-xs text-zinc-500">本日期限のタスク</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {todayTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <p className="text-sm text-zinc-500">本日のタスクはありません</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {todayTasks.map((task, i) => (
                      <Link key={`td-${i}`} href={`/projects/${task.projectId}`} className="group relative flex items-center gap-4 rounded-xl border border-zinc-100 bg-white p-3 shadow-sm transition-all hover:border-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-100 dark:hover:bg-zinc-800">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <div className="flex-1 space-y-1 truncate">
                          <p className="text-sm font-semibold truncate text-zinc-900 dark:text-zinc-100">{task.managementNumber}</p>
                          <p className="text-[10px] text-zinc-500 truncate">{task.taskTitle}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Section */}
            <Card className="lg:col-span-1 border-none shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800 bg-white dark:bg-zinc-900">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="space-y-1">
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                    <Clock className="h-4 w-4" />
                    今週
                  </CardTitle>
                  <CardDescription className="text-xs text-zinc-500">7日以内に期限のタスク</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {upcomingTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <p className="text-sm text-zinc-500">予定されているタスクはありません</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {upcomingTasks.slice(0, 5).map((task, i) => (
                      <div key={`up-${i}`} className="group flex items-center justify-between rounded-xl border border-dashed border-zinc-200 p-3 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                        <div className="space-y-1 truncate pr-2">
                          <p className="text-sm font-semibold truncate text-zinc-900 dark:text-zinc-100">{task.managementNumber}</p>
                          <p className="text-[10px] text-zinc-500 truncate uppercase tracking-tight">{task.taskTitle}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <Badge variant="outline" className="text-[10px] bg-zinc-50 dark:bg-zinc-800 border-none font-medium text-zinc-900 dark:text-zinc-100">
                            {formatDate(task.dueDate)}
                          </Badge>
                          <p className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 mt-1">あと {task.daysUntilDue}日</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}
