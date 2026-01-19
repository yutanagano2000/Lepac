"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Check, Circle, Calendar as CalendarIcon, Clock, Pencil, Trash2 } from "lucide-react";
import { formatDateJp } from "@/lib/timeline";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Project, Progress } from "@/db/schema";

const PROGRESS_TITLES = [
  "合意書",
  "案件提出",
  "現調",
  "土地売買契約",
  "土地契約",
  "法令申請",
  "法令許可",
  "電力申請",
  "電力回答",
  "土地決済",
  "SS",
  "発注",
  "着工",
  "連系",
  "完工",
] as const;

function formatYyyyMd(date: Date | undefined) {
  if (!date) return "";
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}.${m}.${d}`;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [progressList, setProgressList] = useState<Progress[]>([]);
  const [open, setOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [form, setForm] = useState<{
    title: string;
    description: string;
    date: Date | undefined;
    status: "planned" | "completed";
  }>({
    title: "",
    description: "",
    date: undefined,
    status: "planned",
  });
  const [dateText, setDateText] = useState("");

  // 編集用の状態
  const [editOpen, setEditOpen] = useState(false);
  const [editCalendarOpen, setEditCalendarOpen] = useState(false);
  const [editingProgress, setEditingProgress] = useState<Progress | null>(null);
  const [editForm, setEditForm] = useState<{
    title: string;
    description: string;
    date: Date | undefined;
    status: "planned" | "completed";
  }>({
    title: "",
    description: "",
    date: undefined,
    status: "planned",
  });
  const [editDateText, setEditDateText] = useState("");

  const fetchProject = () => {
    fetch(`/api/projects/${id}`)
      .then((res) => res.json())
      .then(setProject);
  };

  const fetchProgress = () => {
    fetch(`/api/projects/${id}/progress`)
      .then((res) => res.json())
      .then(setProgressList);
  };

  // タイムラインを自動生成してから進捗を取得
  const generateAndFetchProgress = async () => {
    await fetch(`/api/projects/${id}/progress/generate`, { method: "POST" });
    fetchProgress();
  };

  useEffect(() => {
    fetchProject();
    generateAndFetchProgress();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date) return;
    await fetch(`/api/projects/${id}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        status: form.status,
        createdAt: form.date.toISOString(),
      }),
    });
    setForm({ title: "", description: "", date: undefined, status: "planned" });
    setDateText("");
    setOpen(false);
    fetchProgress();
  };

  const markAsCompleted = async (progressId: number) => {
    await fetch(`/api/projects/${id}/progress`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progressId, status: "completed" }),
    });
    fetchProgress();
  };

  const openEditDialog = (p: Progress) => {
    setEditingProgress(p);
    const date = new Date(p.createdAt);
    setEditForm({
      title: p.title,
      description: p.description ?? "",
      date,
      status: p.status as "planned" | "completed",
    });
    setEditDateText(formatYyyyMd(date));
    setEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProgress || !editForm.date) return;
    await fetch(`/api/projects/${id}/progress`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        progressId: editingProgress.id,
        title: editForm.title,
        description: editForm.description,
        status: editForm.status,
        createdAt: editForm.date.toISOString(),
      }),
    });
    setEditOpen(false);
    setEditingProgress(null);
    fetchProgress();
  };

  const handleDelete = async () => {
    if (!editingProgress) return;
    if (!confirm("この進捗を削除しますか？")) return;
    await fetch(`/api/projects/${id}/progress?progressId=${editingProgress.id}`, {
      method: "DELETE",
    });
    setEditOpen(false);
    setEditingProgress(null);
    fetchProgress();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // 進捗を日付でソート（すべてDBから取得）
  const sortedTimeline = useMemo(() => {
    return [...progressList]
      .map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description ?? undefined,
        date: new Date(p.createdAt),
        status: p.status as "completed" | "planned",
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [progressList]);

  if (!project) return null;

  return (
    <div className="min-h-screen bg-background px-6">
      <div className="mx-auto max-w-3xl py-10">
        <div className="space-y-6">
          {/* ヘッダー */}
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon">
              <Link href="/projects">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="space-y-1">
              <h1 className="text-xl font-semibold">{project.managementNumber}</h1>
              <p className="text-sm text-muted-foreground">
                {project.client} / {project.projectNumber}
              </p>
              {project.completionMonth && (
                <p className="text-sm text-muted-foreground">
                  完成月: {project.completionMonth}
                </p>
              )}
            </div>
          </div>

          {/* 進捗追加ボタン */}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                進捗を追加
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>進捗を追加</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>タイトル</Label>
                  <Select
                    value={form.title}
                    onValueChange={(value) => setForm({ ...form, title: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROGRESS_TITLES.map((title) => (
                        <SelectItem key={title} value={title}>
                          {title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">詳細（任意）</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="例: 司法書士事務所へ郵送済み"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>日付</Label>
                  <div className="flex gap-2">
                    <Input
                      value={dateText}
                      onChange={(e) => {
                        const value = e.target.value;
                        setDateText(value);
                        const match = value.match(/^(\d{4})[./](\d{1,2})[./](\d{1,2})$/);
                        if (match) {
                          const [, y, m, d] = match;
                          const parsed = new Date(Number(y), Number(m) - 1, Number(d));
                          if (!isNaN(parsed.getTime())) {
                            setForm({ ...form, date: parsed });
                          }
                        } else if (value === "") {
                          setForm({ ...form, date: undefined });
                        }
                      }}
                      placeholder="例: 2026.1.19"
                      className="flex-1"
                    />
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" size="icon">
                          <CalendarIcon className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="single"
                          required
                          selected={form.date}
                          onSelect={(d) => {
                            if (d) {
                              setForm({ ...form, date: d });
                              setDateText(formatYyyyMd(d));
                            }
                            setIsCalendarOpen(false);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>ステータス</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value: "planned" | "completed") =>
                      setForm({ ...form, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">予定</SelectItem>
                      <SelectItem value="completed">完了</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    キャンセル
                  </Button>
                  <Button type="submit" disabled={!form.date || !form.title}>
                    追加
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* 編集ダイアログ */}
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>進捗を編集</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>タイトル</Label>
                  <Select
                    value={editForm.title}
                    onValueChange={(value) => setEditForm({ ...editForm, title: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROGRESS_TITLES.map((title) => (
                        <SelectItem key={title} value={title}>
                          {title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">詳細（任意）</Label>
                  <Textarea
                    id="edit-description"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="例: 司法書士事務所へ郵送済み"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>日付</Label>
                  <div className="flex gap-2">
                    <Input
                      value={editDateText}
                      onChange={(e) => {
                        const value = e.target.value;
                        setEditDateText(value);
                        const match = value.match(/^(\d{4})[./](\d{1,2})[./](\d{1,2})$/);
                        if (match) {
                          const [, y, m, d] = match;
                          const parsed = new Date(Number(y), Number(m) - 1, Number(d));
                          if (!isNaN(parsed.getTime())) {
                            setEditForm({ ...editForm, date: parsed });
                          }
                        } else if (value === "") {
                          setEditForm({ ...editForm, date: undefined });
                        }
                      }}
                      placeholder="例: 2026.1.19"
                      className="flex-1"
                    />
                    <Popover open={editCalendarOpen} onOpenChange={setEditCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" size="icon">
                          <CalendarIcon className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="single"
                          required
                          selected={editForm.date}
                          onSelect={(d) => {
                            if (d) {
                              setEditForm({ ...editForm, date: d });
                              setEditDateText(formatYyyyMd(d));
                            }
                            setEditCalendarOpen(false);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>ステータス</Label>
                  <Select
                    value={editForm.status}
                    onValueChange={(value: "planned" | "completed") =>
                      setEditForm({ ...editForm, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">予定</SelectItem>
                      <SelectItem value="completed">完了</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    削除
                  </Button>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                      キャンセル
                    </Button>
                    <Button type="submit" disabled={!editForm.date || !editForm.title}>
                      保存
                    </Button>
                  </div>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* 統合タイムライン */}
          <div className="relative">
            <div className="mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold">タイムライン</h2>
            </div>
            {sortedTimeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">タイムラインがありません</p>
            ) : (
              <div className="space-y-0">
                {(() => {
                  // 直近の未完了項目のインデックスを計算
                  const firstPendingIndex = sortedTimeline.findIndex(
                    (item) => item.status !== "completed"
                  );
                  return sortedTimeline.map((item, index) => {
                    const isCompleted = item.status === "completed";
                    const isFirstPending = index === firstPendingIndex;
                    return (
                    <div key={item.id} className="relative flex gap-4">
                      {/* 縦線とノード */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                            isCompleted
                              ? "border-green-500 bg-green-500"
                              : "border-muted-foreground bg-background"
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="h-4 w-4 text-white" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        {index < sortedTimeline.length - 1 && (
                          <div
                            className={`w-0.5 flex-1 ${
                              isCompleted
                                ? "bg-green-500"
                                : "border-l-2 border-dashed border-muted-foreground"
                            }`}
                          />
                        )}
                      </div>
                      {/* コンテンツ */}
                      <div className="flex-1 pb-6">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p
                                className={`font-medium ${
                                  isCompleted ? "" : "text-muted-foreground"
                                }`}
                              >
                                {item.title}
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  const p = progressList.find((pr) => pr.id === item.id);
                                  if (p) openEditDialog(p);
                                }}
                                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            {item.description && (
                              <p className="mt-1 text-sm text-muted-foreground">
                                {item.description}
                              </p>
                            )}
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatDateJp(item.date)}
                            </p>
                          </div>
                          {isFirstPending && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => markAsCompleted(item.id)}
                            >
                              完了にする
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
