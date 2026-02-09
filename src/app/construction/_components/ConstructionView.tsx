"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ExternalLink, ChevronLeft, ChevronRight, Camera } from "lucide-react";
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
import { ProjectCreateDialog } from "@/components/ProjectCreateDialog";
import PhotoMatrix from "./PhotoMatrix";

type Project = {
  id: number;
  managementNumber: string;
  client: string;
  projectNumber: string;
  prefecture: string;
  address: string;
  completionMonth: string | null;
  // 発注タブ用
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
  // 工程タブ用
  siteName: string | null;
  cityName: string | null;
  panelCount: string | null;
  panelLayout: string | null;
  loadTestStatus: string | null;
  loadTestDate: string | null;
  pileStatus: string | null;
  pileDate: string | null;
  framePanelStatus: string | null;
  framePanelDate: string | null;
  electricalStatus: string | null;
  electricalDate: string | null;
  fenceStatus: string | null;
  fenceDate: string | null;
  inspectionPhotoDate: string | null;
  processRemarks: string | null;
};

// テキストのサニタイズ関数（XSS対策）
function sanitizeText(text: string | null | undefined): string {
  if (!text) return "";
  return text.replace(/[<>"'&]/g, (char) => {
    const entities: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
      "&": "&amp;",
    };
    return entities[char] || char;
  });
}

export default function ConstructionView() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });

  useEffect(() => {
    async function fetchProjects() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/construction?year=${currentMonth.year}&month=${currentMonth.month}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data = await res.json();
          setProjects(data.projects);
        } else {
          console.error("Failed to fetch projects: HTTP", res.status);
        }
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, [currentMonth.year, currentMonth.month]);

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

  // サーバーサイドでフィルタリング済みのため、そのまま使用
  const filteredProjects = projects;

  const updateProjectField = useCallback(async (projectId: number, field: string, value: string | null) => {
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
      <div className="min-h-screen bg-background px-4 sm:px-6">
        <div className="mx-auto max-w-full py-6 sm:py-10">
          <div className="space-y-4 sm:space-y-6">
            <div className="space-y-1">
              <h1 className="text-lg sm:text-xl font-semibold">工事</h1>
              <p className="text-sm text-muted-foreground">読み込み中...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 sm:px-6">
      <div className="mx-auto max-w-full py-6 sm:py-10">
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="space-y-1">
              <h1 className="text-lg sm:text-xl font-semibold">工事</h1>
              <p className="text-sm text-muted-foreground">
                工事現場担当者（工務）向けの案件一覧
              </p>
            </div>
            <ProjectCreateDialog
              onProjectCreated={(newProject) => {
                // 新規案件が登録されたら、完成月が現在表示中の月と一致する場合のみリストに追加
                const completionMonth = newProject.completionMonth;
                if (completionMonth) {
                  const match = completionMonth.match(/(\d{4})[-/年]?(\d{1,2})/);
                  if (match) {
                    const year = parseInt(match[1]);
                    const month = parseInt(match[2]);
                    if (year === currentMonth.year && month === currentMonth.month) {
                      // APIから最新データを再取得
                      fetch(`/api/construction?year=${currentMonth.year}&month=${currentMonth.month}`, { cache: "no-store" })
                        .then(res => res.json())
                        .then(data => setProjects(data.projects))
                        .catch(console.error);
                    }
                  }
                }
              }}
            />
          </div>

          <Tabs defaultValue="orders" className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <TabsList className="w-fit">
                <TabsTrigger value="orders">発注</TabsTrigger>
                <TabsTrigger value="process" className="flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5" />
                  工程
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={goToPreviousMonth} aria-label="前月へ">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[100px] text-center" aria-live="polite">
                  {monthDisplay}
                </span>
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={goToNextMonth} aria-label="次月へ">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* 発注タブ */}
            <TabsContent value="orders">
              <div className="rounded-md border overflow-hidden">
                <div className="flex">
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
                            <TableCell className="whitespace-nowrap max-w-[200px] truncate" title={sanitizeText(project.address)}>
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
                                  onChange={(value) => updateProjectField(project.id, "mountOrderDate", value)}
                                  placeholder="-"
                                />
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                <DatePicker
                                  value={project.mountDeliveryScheduled}
                                  onChange={(value) => updateProjectField(project.id, "mountDeliveryScheduled", value)}
                                  placeholder="-"
                                />
                              </TableCell>
                              <TableCell className="whitespace-nowrap">{getStatusBadge(project.mountDeliveryStatus) || "-"}</TableCell>
                              <TableCell className="whitespace-nowrap">{project.panelOrderVendor || "-"}</TableCell>
                              <TableCell className="whitespace-nowrap">
                                <DatePicker
                                  value={project.panelOrderDate}
                                  onChange={(value) => updateProjectField(project.id, "panelOrderDate", value)}
                                  placeholder="-"
                                />
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                <DatePicker
                                  value={project.panelDeliveryScheduled}
                                  onChange={(value) => updateProjectField(project.id, "panelDeliveryScheduled", value)}
                                  placeholder="-"
                                />
                              </TableCell>
                              <TableCell className="whitespace-nowrap">{getStatusBadge(project.panelDeliveryStatus) || "-"}</TableCell>
                              <TableCell className="whitespace-nowrap">
                                <DatePicker
                                  value={project.constructionAvailableDate}
                                  onChange={(value) => updateProjectField(project.id, "constructionAvailableDate", value)}
                                  placeholder="-"
                                />
                              </TableCell>
                              <TableCell className="whitespace-nowrap max-w-[150px] truncate" title={sanitizeText(project.constructionRemarks)}>
                                {project.constructionRemarks || "-"}
                              </TableCell>
                              <TableCell className="whitespace-nowrap max-w-[200px] truncate" title={sanitizeText(project.constructionNote)}>
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

            {/* 工程タブ - 写真マトリクス */}
            <TabsContent value="process">
              <PhotoMatrix year={currentMonth.year} month={currentMonth.month} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
