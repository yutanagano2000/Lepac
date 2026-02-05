"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { format, parse, isValid } from "date-fns";
import { ja } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { DatePicker } from "@/components/ui/date-picker";

type Project = {
  id: number;
  managementNumber: string;
  client: string;
  projectNumber: string;
  prefecture: string;
  address: string;
  deliveryLocation: string | null;
  mountOrderVendor: string | null;
  mountOrderDate: string | null;
  mountDeliveryScheduled: string | null;
  mountDeliveryStatus: string | null;
  panelOrderVendor: string | null;
  panelOrderDate: string | null;
  panelDeliveryScheduled: string | null;
  panelDeliveryStatus: string | null;
  constructionAvailableDate: string | null;
  constructionRemarks: string | null;
  constructionNote: string | null;
  completionMonth: string | null;
};

function parseCompletionMonth(completionMonth: string | null): { year: number; month: number } | null {
  if (!completionMonth) return null;
  // "YYYY-MM" または "YYYY/MM" または "YYYY年MM月" などの形式に対応
  const match = completionMonth.match(/(\d{4})[-/年]?(\d{1,2})/);
  if (match) {
    return {
      year: parseInt(match[1]),
      month: parseInt(match[2]),
    };
  }
  return null;
}

export default function ConstructionPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch("/api/construction", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          console.log("[Construction] Fetched projects:", data.projects.slice(0, 3).map((p: Project) => ({
            id: p.id,
            mountOrderDate: p.mountOrderDate,
            completionMonth: p.completionMonth,
          })));
          setProjects(data.projects);
        }
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  // 月の切り替え
  const goToPreviousMonth = () => {
    setCurrentMonth((prev) => {
      if (prev.month === 1) {
        return { year: prev.year - 1, month: 12 };
      }
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const goToNextMonth = () => {
    setCurrentMonth((prev) => {
      if (prev.month === 12) {
        return { year: prev.year + 1, month: 1 };
      }
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  // 現在の月でフィルタリング
  const filteredProjects = projects.filter((project) => {
    const parsed = parseCompletionMonth(project.completionMonth);
    if (!parsed) return false;
    return parsed.year === currentMonth.year && parsed.month === currentMonth.month;
  });

  // 日付フィールドの更新
  const updateProjectDate = useCallback(async (projectId: number, field: string, value: string | null) => {
    console.log("[Construction] Updating:", { projectId, field, value });
    try {
      const res = await fetch(`/api/construction/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });

      const data = await res.json();
      console.log("[Construction] API response:", data);

      if (!res.ok) {
        console.error("[Construction] API error:", data.error);
        return;
      }

      // ローカル状態を更新
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId ? { ...p, [field]: value } : p
        )
      );
    } catch (error) {
      console.error("Failed to update project:", error);
    }
  }, []);

  const getStatusBadge = (status: string | null) => {
    if (!status) return null;
    const statusLower = status.toLowerCase();
    if (statusLower.includes("完了") || statusLower.includes("済")) {
      return <Badge variant="default" className="bg-green-600 hover:bg-green-700">{status}</Badge>;
    }
    if (statusLower.includes("予定") || statusLower.includes("待")) {
      return <Badge variant="secondary">{status}</Badge>;
    }
    if (statusLower.includes("遅延") || statusLower.includes("問題")) {
      return <Badge variant="destructive">{status}</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  const monthDisplay = `${currentMonth.year}年${currentMonth.month}月`;

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-6">
        <div className="mx-auto max-w-full py-10">
          <div className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold">工事</h1>
              <p className="text-sm text-muted-foreground">読み込み中...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-6">
      <div className="mx-auto max-w-full py-10">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold">工事</h1>
              <p className="text-sm text-muted-foreground">
                工事現場担当者（工務）向けの案件一覧
              </p>
            </div>
          </div>

          <Tabs defaultValue="orders" className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="orders">発注</TabsTrigger>
                <TabsTrigger value="schedule">工程</TabsTrigger>
              </TabsList>

              {/* 月切り替え */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[100px] text-center">
                  {monthDisplay}
                </span>
                <Button variant="outline" size="icon" onClick={goToNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* 発注タブ */}
            <TabsContent value="orders">
              <div className="rounded-md border overflow-hidden">
                <div className="flex">
                  {/* 固定列（左側） */}
                  <div className="shrink-0 border-r bg-background z-10">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-[100px] whitespace-nowrap font-medium">管理番号</TableHead>
                          <TableHead className="w-[120px] whitespace-nowrap font-medium">販売先</TableHead>
                          <TableHead className="w-[120px] whitespace-nowrap font-medium">案件番号</TableHead>
                          <TableHead className="w-[80px] whitespace-nowrap font-medium">都道府県</TableHead>
                          <TableHead className="w-[200px] whitespace-nowrap font-medium">現場住所</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProjects.map((project) => (
                          <TableRow key={project.id} className="h-[52px]">
                            <TableCell className="whitespace-nowrap font-medium">
                              <Link
                                href={`/projects/${project.id}`}
                                className="text-blue-600 hover:underline dark:text-blue-400 inline-flex items-center gap-1"
                              >
                                {project.managementNumber}
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">{project.client || "-"}</TableCell>
                            <TableCell className="whitespace-nowrap">{project.projectNumber || "-"}</TableCell>
                            <TableCell className="whitespace-nowrap">{project.prefecture || "-"}</TableCell>
                            <TableCell className="whitespace-nowrap max-w-[200px] truncate" title={project.address || ""}>
                              {project.address || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredProjects.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                              {monthDisplay}の案件がありません
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* スクロール可能列（右側） */}
                  <ScrollArea className="flex-1">
                    <div className="min-w-[1400px]">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="w-[150px] whitespace-nowrap font-medium">納品場所</TableHead>
                            <TableHead className="w-[120px] whitespace-nowrap font-medium">架台発注先</TableHead>
                            <TableHead className="w-[140px] whitespace-nowrap font-medium">架台発注日</TableHead>
                            <TableHead className="w-[140px] whitespace-nowrap font-medium">架台納品予定日</TableHead>
                            <TableHead className="w-[100px] whitespace-nowrap font-medium">架台納品状況</TableHead>
                            <TableHead className="w-[120px] whitespace-nowrap font-medium">パネル発注先</TableHead>
                            <TableHead className="w-[140px] whitespace-nowrap font-medium">パネル発注日</TableHead>
                            <TableHead className="w-[140px] whitespace-nowrap font-medium">パネル納品予定日</TableHead>
                            <TableHead className="w-[100px] whitespace-nowrap font-medium">パネル納品状況</TableHead>
                            <TableHead className="w-[140px] whitespace-nowrap font-medium">着工可能日</TableHead>
                            <TableHead className="w-[150px] whitespace-nowrap font-medium">着工備考</TableHead>
                            <TableHead className="w-[200px] whitespace-nowrap font-medium">工事備考</TableHead>
                            <TableHead className="w-[100px] whitespace-nowrap font-medium">完成月</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredProjects.map((project) => (
                            <TableRow key={project.id} className="h-[52px]">
                              <TableCell className="whitespace-nowrap">{project.deliveryLocation || "-"}</TableCell>
                              <TableCell className="whitespace-nowrap">{project.mountOrderVendor || "-"}</TableCell>
                              <TableCell className="whitespace-nowrap">
                                <DatePicker
                                  value={project.mountOrderDate}
                                  onChange={(value) => updateProjectDate(project.id, "mountOrderDate", value)}
                                  placeholder="-"
                                />
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                <DatePicker
                                  value={project.mountDeliveryScheduled}
                                  onChange={(value) => updateProjectDate(project.id, "mountDeliveryScheduled", value)}
                                  placeholder="-"
                                />
                              </TableCell>
                              <TableCell className="whitespace-nowrap">{getStatusBadge(project.mountDeliveryStatus) || "-"}</TableCell>
                              <TableCell className="whitespace-nowrap">{project.panelOrderVendor || "-"}</TableCell>
                              <TableCell className="whitespace-nowrap">
                                <DatePicker
                                  value={project.panelOrderDate}
                                  onChange={(value) => updateProjectDate(project.id, "panelOrderDate", value)}
                                  placeholder="-"
                                />
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                <DatePicker
                                  value={project.panelDeliveryScheduled}
                                  onChange={(value) => updateProjectDate(project.id, "panelDeliveryScheduled", value)}
                                  placeholder="-"
                                />
                              </TableCell>
                              <TableCell className="whitespace-nowrap">{getStatusBadge(project.panelDeliveryStatus) || "-"}</TableCell>
                              <TableCell className="whitespace-nowrap">
                                <DatePicker
                                  value={project.constructionAvailableDate}
                                  onChange={(value) => updateProjectDate(project.id, "constructionAvailableDate", value)}
                                  placeholder="-"
                                />
                              </TableCell>
                              <TableCell className="whitespace-nowrap max-w-[150px] truncate" title={project.constructionRemarks || ""}>
                                {project.constructionRemarks || "-"}
                              </TableCell>
                              <TableCell className="whitespace-nowrap max-w-[200px] truncate" title={project.constructionNote || ""}>
                                {project.constructionNote || "-"}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">{project.completionMonth || "-"}</TableCell>
                            </TableRow>
                          ))}
                          {filteredProjects.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={13} className="text-center text-muted-foreground py-8">
                                &nbsp;
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>

            {/* 工程タブ */}
            <TabsContent value="schedule">
              <div className="rounded-md border p-8 text-center text-muted-foreground">
                <p className="text-lg">工程表</p>
                <p className="text-sm mt-2">（実装予定）</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
