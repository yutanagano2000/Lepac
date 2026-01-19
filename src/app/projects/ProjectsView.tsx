"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Project, NewProject } from "@/db/schema";

const MONTHS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

interface ProjectsViewProps {
  initialProjects: Project[];
}

export default function ProjectsView({ initialProjects }: ProjectsViewProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [isPreparing, setIsPreparing] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form, setForm] = useState<NewProject>({
    managementNumber: "",
    manager: "",
    client: "",
    projectNumber: "",
    completionMonth: "",
  });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [editCalendarOpen, setEditCalendarOpen] = useState(false);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  const fetchProjects = () => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then(setProjects);
  };

  // 初期データがあるので、初回マウント時のフェッチは不要（更新時のみ使用）
  // useEffect(() => {
  //   fetchProjects();
  // }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ managementNumber: "", manager: "", client: "", projectNumber: "", completionMonth: "" });
    setOpen(false);
    fetchProjects();
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    await fetch(`/api/projects/${editingProject.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingProject),
    });
    setEditOpen(false);
    setEditingProject(null);
    fetchProjects();
  };

  const openEditDialog = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject({ ...project });
    setEditOpen(true);
    if (project.completionMonth) {
      const [year] = project.completionMonth.split("-");
      setCalendarYear(parseInt(year, 10));
    } else {
      setCalendarYear(new Date().getFullYear());
    }
  };

  const openDeleteDialog = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingProject(project);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingProject) return;
    await fetch(`/api/projects/${deletingProject.id}`, {
      method: "DELETE",
    });
    setDeleteOpen(false);
    setDeletingProject(null);
    fetchProjects();
  };

  const selectMonth = (monthIndex: number) => {
    const monthStr = `${calendarYear}-${String(monthIndex + 1).padStart(2, "0")}`;
    setForm({ ...form, completionMonth: monthStr });
    setCalendarOpen(false);
  };

  const selectEditMonth = (monthIndex: number) => {
    if (!editingProject) return;
    const monthStr = `${calendarYear}-${String(monthIndex + 1).padStart(2, "0")}`;
    setEditingProject({ ...editingProject, completionMonth: monthStr });
    setEditCalendarOpen(false);
  };

  const formatCompletionMonth = (value: string | null | undefined) => {
    if (!value) return "";
    const [year, month] = value.split("-");
    return `${year}年${parseInt(month, 10)}月`;
  };

  return (
    <div className="min-h-screen bg-background px-6">
      <div className="mx-auto max-w-5xl py-10">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold">案件一覧</h1>
              <p className="text-sm text-muted-foreground">
                担当する案件を確認できます
              </p>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" />
                  新規登録
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>案件を新規登録</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="managementNumber">管理番号</Label>
                    <Input
                      id="managementNumber"
                      value={form.managementNumber}
                      onChange={(e) => setForm({ ...form, managementNumber: e.target.value })}
                      placeholder="例: P-001"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manager">担当</Label>
                    <Input
                      id="manager"
                      value={form.manager}
                      onChange={(e) => setForm({ ...form, manager: e.target.value })}
                      placeholder="例: 山田"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client">販売先</Label>
                    <Input
                      id="client"
                      value={form.client}
                      onChange={(e) => setForm({ ...form, client: e.target.value })}
                      placeholder="例: 〇〇不動産"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="projectNumber">案件番号</Label>
                    <Input
                      id="projectNumber"
                      value={form.projectNumber}
                      onChange={(e) => setForm({ ...form, projectNumber: e.target.value })}
                      placeholder="例: 2026-0001"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>完成月</Label>
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.completionMonth ? formatCompletionMonth(form.completionMonth) : "選択してください"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-3">
                        <div className="flex items-center justify-between mb-3">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setCalendarYear(calendarYear - 1)}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="font-medium">{calendarYear}年</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setCalendarYear(calendarYear + 1)}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {MONTHS.map((month, index) => (
                            <Button
                              key={month}
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-9"
                              onClick={() => selectMonth(index)}
                            >
                              {month}
                            </Button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      キャンセル
                    </Button>
                    <Button type="submit">登録</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* 編集ダイアログ */}
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>案件を編集</DialogTitle>
              </DialogHeader>
              {editingProject && (
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-managementNumber">管理番号</Label>
                    <Input
                      id="edit-managementNumber"
                      value={editingProject.managementNumber}
                      onChange={(e) => setEditingProject({ ...editingProject, managementNumber: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-manager">担当</Label>
                    <Input
                      id="edit-manager"
                      value={editingProject.manager}
                      onChange={(e) => setEditingProject({ ...editingProject, manager: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-client">販売先</Label>
                    <Input
                      id="edit-client"
                      value={editingProject.client}
                      onChange={(e) => setEditingProject({ ...editingProject, client: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-projectNumber">案件番号</Label>
                    <Input
                      id="edit-projectNumber"
                      value={editingProject.projectNumber}
                      onChange={(e) => setEditingProject({ ...editingProject, projectNumber: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>完成月</Label>
                    <Popover open={editCalendarOpen} onOpenChange={setEditCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {editingProject.completionMonth ? formatCompletionMonth(editingProject.completionMonth) : "選択してください"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-3">
                        <div className="flex items-center justify-between mb-3">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setCalendarYear(calendarYear - 1)}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="font-medium">{calendarYear}年</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setCalendarYear(calendarYear + 1)}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {MONTHS.map((month, index) => (
                            <Button
                              key={month}
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-9"
                              onClick={() => selectEditMonth(index)}
                            >
                              {month}
                            </Button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                      キャンセル
                    </Button>
                    <Button type="submit">保存</Button>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>

          {/* 削除確認ダイアログ */}
          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>案件を削除</AlertDialogTitle>
                <AlertDialogDescription>
                  「{deletingProject?.managementNumber}」を削除しますか？
                  <br />
                  関連する進捗もすべて削除されます。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  削除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>管理番号</TableHead>
                  <TableHead>担当</TableHead>
                  <TableHead>販売先</TableHead>
                  <TableHead>案件番号</TableHead>
                  <TableHead>完成月</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      案件がありません
                    </TableCell>
                  </TableRow>
                ) : (
                  projects.map((project) => (
                    <TableRow
                      key={project.id}
                      className={`cursor-pointer hover:bg-muted/50 transition-opacity ${
                        isPreparing === project.id ? "opacity-50 pointer-events-none" : ""
                      }`}
                      onClick={async () => {
                        setIsPreparing(project.id);
                        try {
                          await fetch(`/api/projects/${project.id}/progress/generate`, { method: "POST" });
                          router.push(`/projects/${project.id}`);
                        } catch (error) {
                          console.error("Failed to generate timeline:", error);
                          setIsPreparing(null);
                        }
                      }}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {project.managementNumber}
                          {isPreparing === project.id && (
                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{project.manager}</TableCell>
                      <TableCell>{project.client}</TableCell>
                      <TableCell>{project.projectNumber}</TableCell>
                      <TableCell>{formatCompletionMonth(project.completionMonth) || "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => openEditDialog(project, e)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={(e) => openDeleteDialog(project, e)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
