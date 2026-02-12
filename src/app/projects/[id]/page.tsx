"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Check, Pencil, Trash2, ExternalLink, Copy, CheckCircle2, Loader2, ListTodo, PenTool, Mountain } from "lucide-react";
import { formatDateJp } from "@/lib/timeline";
import { HorizontalTimeline } from "@/components/horizontal-timeline";
import { cn, parseTodoMessages, addTodoMessage } from "@/lib/utils";
import { isSafeUrl } from "@/lib/sanitize";
import {
  parseCoordinateString,
  normalizeCoordinateString,
} from "@/lib/coordinates";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Project, Progress, Comment, Todo, ProjectFile, ConstructionProgress, ConstructionPhoto } from "@/db/schema";
import { CONSTRUCTION_PROGRESS_CATEGORIES, CONSTRUCTION_PHOTO_CATEGORIES } from "@/db/schema";
import { ProjectFiles } from "@/components/ProjectFiles";
import { Card, CardContent } from "@/components/ui/card";
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
import { ProjectFolderLink } from "@/components/ProjectFolderLink";
import { ProjectPhotoGallery } from "@/components/ProjectPhotoGallery";
import { ProjectDashboard } from "@/components/ProjectDashboard";
import { PanelLayoutSection } from "@/components/PanelLayoutSection";
import { laws } from "./_constants";
import type { LegalStatuses } from "./_types";
import LegalSearchTab from "./_components/LegalSearchTab";
import { ConstructionTab, CommentsTab } from "./_components";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [progressList, setProgressList] = useState<Progress[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [newTodoContent, setNewTodoContent] = useState("");
  const [newTodoDueDate, setNewTodoDueDate] = useState<string>("");
  const [todoEditOpen, setTodoEditOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [editTodoContent, setEditTodoContent] = useState("");
  const [editTodoDueDate, setEditTodoDueDate] = useState("");
  const [todoCompleteOpen, setTodoCompleteOpen] = useState(false);
  const [completingTodo, setCompletingTodo] = useState<Todo | null>(null);
  const [completeTodoMemo, setCompleteTodoMemo] = useState("");
  const [todoAddMessageOpen, setTodoAddMessageOpen] = useState(false);
  const [addingMessageTodo, setAddingMessageTodo] = useState<Todo | null>(null);
  const [newTodoMessage, setNewTodoMessage] = useState("");
  const [todoDeleteOpen, setTodoDeleteOpen] = useState(false);
  const [projectDeleteOpen, setProjectDeleteOpen] = useState(false);
  const [deletingTodo, setDeletingTodo] = useState<Todo | null>(null);
  const [activeTab, setActiveTab] = useState("details");
  const [legalSearchParams, setLegalSearchParams] = useState<{ lat: string; lon: string; prefecture: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [detailEditOpen, setDetailEditOpen] = useState(false);
  const [detailForm, setDetailForm] = useState({
    address: "",
    coordinates: "",
    landowner1: "",
    landowner2: "",
    landowner3: "",
    // 地権者フリガナ
    landowner1Kana: "",
    landowner2Kana: "",
    landowner3Kana: "",
    // 地権者追加情報
    landownerAddress1: "",
    landownerAddress2: "",
    landownerAddress3: "",
    inheritanceStatus1: "",
    inheritanceStatus2: "",
    inheritanceStatus3: "",
    correctionRegistration1: "",
    correctionRegistration2: "",
    correctionRegistration3: "",
    mortgageStatus1: "",
    mortgageStatus2: "",
    mortgageStatus3: "",
    // 地目・面積
    landCategory1: "",
    landCategory2: "",
    landCategory3: "",
    landArea1: "",
    landArea2: "",
    landArea3: "",
    // 環境データ
    verticalSnowLoad: "",
    windSpeed: "",
    // 外部連携
    dococabiLink: "",
  });
  const [furiganaLoading, setFuriganaLoading] = useState<{ [key: string]: boolean }>({});
  const furiganaTimeoutRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // フリガナ自動取得関数（debounce付き）
  const fetchFurigana = useCallback(async (name: string, field: "landowner1Kana" | "landowner2Kana" | "landowner3Kana") => {
    // 既存のタイムアウトをクリア
    if (furiganaTimeoutRef.current[field]) {
      clearTimeout(furiganaTimeoutRef.current[field]);
    }

    // 空の場合はスキップ
    if (!name.trim()) {
      setDetailForm((prev) => ({ ...prev, [field]: "" }));
      return;
    }

    // 300ms後にAPIを呼び出し
    furiganaTimeoutRef.current[field] = setTimeout(async () => {
      setFuriganaLoading((prev) => ({ ...prev, [field]: true }));
      try {
        const res = await fetch("/api/furigana", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.furigana) {
            setDetailForm((prev) => ({ ...prev, [field]: data.furigana }));
          }
        }
      } catch (error) {
        console.error("Furigana fetch error:", error);
      } finally {
        setFuriganaLoading((prev) => ({ ...prev, [field]: false }));
      }
    }, 300);
  }, []);

  // フリガナタイムアウトのクリーンアップ（メモリリーク防止）
  useEffect(() => {
    const timeouts = furiganaTimeoutRef.current;
    return () => {
      Object.values(timeouts).forEach(clearTimeout);
    };
  }, []);


  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) throw new Error("Failed to fetch project");
      setProject(await res.json());
    } catch (error) {
      console.error("fetchProject error:", error);
    }
  };

  const fetchProgress = async () => {
    try {
      const res = await fetch(`/api/projects/${id}/progress`);
      if (!res.ok) throw new Error("Failed to fetch progress");
      setProgressList(await res.json());
    } catch (error) {
      console.error("fetchProgress error:", error);
    }
  };

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/projects/${id}/comments`);
      if (!res.ok) throw new Error("Failed to fetch comments");
      setComments(await res.json());
    } catch (error) {
      console.error("fetchComments error:", error);
    }
  };

  const fetchTodos = async () => {
    try {
      const res = await fetch(`/api/projects/${id}/todos`);
      if (!res.ok) throw new Error("Failed to fetch todos");
      setTodos(await res.json());
    } catch (error) {
      console.error("fetchTodos error:", error);
    }
  };

  const fetchFiles = async () => {
    try {
      const res = await fetch(`/api/projects/${id}/files`);
      if (!res.ok) throw new Error("Failed to fetch files");
      const json = await res.json();
      // APIがpaginatedレスポンス {data, pagination} を返す場合に対応
      const filesData = Array.isArray(json) ? json : (json.data ?? []);
      setFiles(filesData);
    } catch (error) {
      console.error("fetchFiles error:", error);
    }
  };

  const handleDetailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // 更新するフィールドのみ送信（...projectを展開するとidやorganizationId等も含まれてバリデーションエラーになる）
          address: detailForm.address,
          coordinates: normalizeCoordinateString(detailForm.coordinates) || detailForm.coordinates,
          landowner1: detailForm.landowner1,
          landowner2: detailForm.landowner2,
          landowner3: detailForm.landowner3,
          // 地権者フリガナ
          landowner1Kana: detailForm.landowner1Kana,
          landowner2Kana: detailForm.landowner2Kana,
          landowner3Kana: detailForm.landowner3Kana,
          // 地権者追加情報
          landownerAddress1: detailForm.landownerAddress1,
          landownerAddress2: detailForm.landownerAddress2,
          landownerAddress3: detailForm.landownerAddress3,
          inheritanceStatus1: detailForm.inheritanceStatus1,
          inheritanceStatus2: detailForm.inheritanceStatus2,
          inheritanceStatus3: detailForm.inheritanceStatus3,
          correctionRegistration1: detailForm.correctionRegistration1,
          correctionRegistration2: detailForm.correctionRegistration2,
          correctionRegistration3: detailForm.correctionRegistration3,
          mortgageStatus1: detailForm.mortgageStatus1,
          mortgageStatus2: detailForm.mortgageStatus2,
          mortgageStatus3: detailForm.mortgageStatus3,
          // 地目・面積
          landCategory1: detailForm.landCategory1,
          landCategory2: detailForm.landCategory2,
          landCategory3: detailForm.landCategory3,
          landArea1: detailForm.landArea1,
          landArea2: detailForm.landArea2,
          landArea3: detailForm.landArea3,
          // 環境データ
          verticalSnowLoad: detailForm.verticalSnowLoad,
          windSpeed: detailForm.windSpeed,
          // 外部連携
          dococabiLink: detailForm.dococabiLink,
        }),
      });
      if (!res.ok) throw new Error("Failed to update project details");
      setDetailEditOpen(false);
      fetchProject();
    } catch (error) {
      console.error("handleDetailUpdate error:", error);
    }
  };

  const openDetailEditDialog = () => {
    if (!project) return;
    setDetailForm({
      address: project.address ?? "",
      coordinates: project.coordinates ?? "",
      landowner1: project.landowner1 ?? "",
      landowner2: project.landowner2 ?? "",
      landowner3: project.landowner3 ?? "",
      // 地権者フリガナ
      landowner1Kana: project.landowner1Kana ?? "",
      landowner2Kana: project.landowner2Kana ?? "",
      landowner3Kana: project.landowner3Kana ?? "",
      // 地権者追加情報
      landownerAddress1: project.landownerAddress1 ?? "",
      landownerAddress2: project.landownerAddress2 ?? "",
      landownerAddress3: project.landownerAddress3 ?? "",
      inheritanceStatus1: project.inheritanceStatus1 ?? "",
      inheritanceStatus2: project.inheritanceStatus2 ?? "",
      inheritanceStatus3: project.inheritanceStatus3 ?? "",
      correctionRegistration1: project.correctionRegistration1 ?? "",
      correctionRegistration2: project.correctionRegistration2 ?? "",
      correctionRegistration3: project.correctionRegistration3 ?? "",
      mortgageStatus1: project.mortgageStatus1 ?? "",
      mortgageStatus2: project.mortgageStatus2 ?? "",
      mortgageStatus3: project.mortgageStatus3 ?? "",
      // 地目・面積
      landCategory1: project.landCategory1 ?? "",
      landCategory2: project.landCategory2 ?? "",
      landCategory3: project.landCategory3 ?? "",
      landArea1: project.landArea1 ?? "",
      landArea2: project.landArea2 ?? "",
      landArea3: project.landArea3 ?? "",
      // 環境データ
      verticalSnowLoad: project.verticalSnowLoad ?? "",
      windSpeed: project.windSpeed ?? "",
      // 外部連携
      dococabiLink: project.dococabiLink ?? "",
    });
    setDetailEditOpen(true);
  };

  // 土地面積の合計を計算
  const calculateTotalArea = (area1: string, area2: string, area3: string) => {
    const num1 = parseFloat(area1) || 0;
    const num2 = parseFloat(area2) || 0;
    const num3 = parseFloat(area3) || 0;
    return num1 + num2 + num3;
  };

  // クリップボードにコピーする汎用関数
  const copyToClipboard = async (text: string, fieldName: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // 座標をクリップボードにコピー
  const copyCoordinates = async () => {
    if (!project?.coordinates) return;
    await copyToClipboard(project.coordinates, "coordinates");
  };

  // 合計値をクリップボードにコピー
  const copyTotalArea = async () => {
    if (!project) return;
    const total = calculateTotalArea(
      project.landArea1 ?? "",
      project.landArea2 ?? "",
      project.landArea3 ?? ""
    );
    await copyToClipboard(total.toString(), "totalArea");
  };

  // 住所をコピー
  const copyAddress = async () => {
    if (!project?.address) return;
    await copyToClipboard(project.address, "address");
  };

  // 地権者をコピー
  const copyLandowners = async () => {
    if (!project) return;
    const landowners = [project.landowner1, project.landowner2, project.landowner3]
      .filter(Boolean)
      .join("\n");
    if (landowners) {
      await copyToClipboard(landowners, "landowners");
    }
  };

  const handleTodoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoContent.trim() || !newTodoDueDate) return;
    await fetch(`/api/projects/${id}/todos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newTodoContent.trim(), dueDate: newTodoDueDate }),
    });
    setNewTodoContent("");
    setNewTodoDueDate("");
    fetchTodos();
  };

  const handleTodoDelete = async (todoId: number) => {
    try {
      const res = await fetch(`/api/todos/${todoId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete todo");
      fetchTodos();
    } catch (error) {
      console.error("handleTodoDelete error:", error);
    }
  };

  const openTodoDeleteDialog = (todo: Todo) => {
    setDeletingTodo(todo);
    setTodoDeleteOpen(true);
  };

  const openTodoEditDialog = (todo: Todo) => {
    setEditingTodo(todo);
    setEditTodoContent(todo.content);
    setEditTodoDueDate(todo.dueDate);
    setTodoEditOpen(true);
  };

  const handleTodoEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTodo || !editTodoContent.trim() || !editTodoDueDate) return;
    try {
      const res = await fetch(`/api/todos/${editingTodo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editTodoContent.trim(), dueDate: editTodoDueDate }),
      });
      if (!res.ok) throw new Error("Failed to update todo");
      setTodoEditOpen(false);
      setEditingTodo(null);
      fetchTodos();
    } catch (error) {
      console.error("handleTodoEditSubmit error:", error);
    }
  };

  const openTodoCompleteDialog = (todo: Todo) => {
    setCompletingTodo(todo);
    setCompleteTodoMemo("");
    setTodoCompleteOpen(true);
  };

  const handleTodoCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingTodo) return;
    // 完了メモがある場合は配列形式で保存
    const completedMemo = completeTodoMemo.trim()
      ? addTodoMessage(null, completeTodoMemo.trim())
      : null;
    try {
      const res = await fetch(`/api/todos/${completingTodo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completedAt: new Date().toISOString(),
          completedMemo,
        }),
      });
      if (!res.ok) throw new Error("Failed to complete todo");
      setTodoCompleteOpen(false);
      setCompletingTodo(null);
      setCompleteTodoMemo("");
      fetchTodos();
    } catch (error) {
      console.error("handleTodoCompleteSubmit error:", error);
    }
  };

  const handleTodoReopen = async (todo: Todo) => {
    // 再開時はメッセージを保持（completedAtのみクリア）
    try {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completedAt: null }),
      });
      if (!res.ok) throw new Error("Failed to reopen todo");
      fetchTodos();
    } catch (error) {
      console.error("handleTodoReopen error:", error);
    }
  };

  // 完了済みTODOにメッセージを追加
  const openAddMessageDialog = (todo: Todo) => {
    setAddingMessageTodo(todo);
    setNewTodoMessage("");
    setTodoAddMessageOpen(true);
  };

  const handleAddMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingMessageTodo || !newTodoMessage.trim()) return;
    const updatedMemo = addTodoMessage(
      addingMessageTodo.completedMemo,
      newTodoMessage.trim()
    );
    try {
      const res = await fetch(`/api/todos/${addingMessageTodo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completedMemo: updatedMemo }),
      });
      if (!res.ok) throw new Error("Failed to add message");
      setTodoAddMessageOpen(false);
      setAddingMessageTodo(null);
      setNewTodoMessage("");
      fetchTodos();
    } catch (error) {
      console.error("handleAddMessageSubmit error:", error);
    }
  };

  // タイムラインを自動生成してから進捗を取得
  const generateAndFetchProgress = async () => {
    try {
      const res = await fetch(`/api/projects/${id}/progress/generate`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to generate progress");
      fetchProgress();
    } catch (error) {
      console.error("generateAndFetchProgress error:", error);
    }
  };

  // 案件削除
  const handleDeleteProject = async () => {
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("削除に失敗しました");
      setProjectDeleteOpen(false);
      router.push("/projects");
    } catch (error) {
      console.error("handleDeleteProject error:", error);
    }
  };

  // Strict Modeでの二重呼び出しを防止
  const hasGeneratedRef = useRef(false);

  // 初期データを統合APIで一括取得（7リクエスト→1リクエストに最適化）
  useEffect(() => {
    const fetchBundle = async () => {
      try {
        const res = await fetch(`/api/projects/${id}/bundle`);
        if (!res.ok) return;
        const data = await res.json();
        setProject(data.project);
        setProgressList(data.progress);
        setComments(data.comments);
        setTodos(data.todos);
        setFiles(data.files);
      } catch (error) {
        console.error("Failed to fetch bundle:", error);
      }
    };

    fetchBundle();

    // generate APIは1回だけ呼び出す（React Strict Modeでの二重実行防止）
    if (!hasGeneratedRef.current) {
      hasGeneratedRef.current = true;
      generateAndFetchProgress();
    }
  }, [id]);


  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const getMappleUrl = (coords: string | null) => {
    const parsed = coords ? parseCoordinateString(coords) : null;
    if (!parsed) return null;
    return `https://labs.mapple.com/mapplexml.html#16/${parsed.lat}/${parsed.lon}`;
  };

  const getGoogleMapsUrl = (coords: string | null) => {
    const parsed = coords ? parseCoordinateString(coords) : null;
    if (!parsed) return null;
    return `https://www.google.com/maps?q=${parsed.lat},${parsed.lon}`;
  };

  const getHazardMapUrl = (coords: string | null) => {
    const parsed = coords ? parseCoordinateString(coords) : null;
    if (!parsed) return null;
    return `https://disaportal.gsi.go.jp/maps/?ll=${parsed.lat},${parsed.lon}&z=16&base=ort&vs=c1j0l0u0t0h0z0`;
  };

  // 現地住所から都道府県の選択値（法令検索用）を取得
  const getPrefectureParam = (address: string | null): string | null => {
    if (!address) return null;
    if (address.includes("広島県")) return "hiroshima";
    if (address.includes("岡山県")) return "okayama";
    return null;
  };

  // 法令確認画面へのURL（座標・都道府県をクエリで渡す）
  const getLegalSearchUrl = () => {
    if (!project?.coordinates || !project?.address) return null;
    const parsed = parseCoordinateString(project.coordinates);
    if (!parsed) return null;
    const { lat, lon } = parsed;
    const prefectureParam = getPrefectureParam(project.address);
    if (!prefectureParam || !lat || !lon) return null;
    const params = new URLSearchParams({ lat, lon, prefecture: prefectureParam });
    return `/legal?${params.toString()}`;
  };

  // 法令タブを直接開いたときも、法令検索ボタンと同じ内容を表示する（座標・住所があれば検索パラメータを自動設定）
  useEffect(() => {
    if (activeTab !== "legal") return;
    if (legalSearchParams != null) return;
    if (!project?.coordinates || !project?.address) return;
    const parsed = parseCoordinateString(project.coordinates);
    if (!parsed) return;
    const prefectureParam = getPrefectureParam(project.address);
    if (!prefectureParam || !parsed.lat || !parsed.lon) return;
    setLegalSearchParams({ lat: parsed.lat, lon: parsed.lon, prefecture: prefectureParam });
  }, [activeTab, legalSearchParams, project?.coordinates, project?.address]);


  if (!project) return null;

  return (
    <div className="min-h-screen bg-background px-4 sm:px-6">
      <div className="mx-auto max-w-7xl py-6 sm:py-10">
        <div className="space-y-4 sm:space-y-6">
          {/* ヘッダー */}
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon" className="shrink-0 h-10 w-10">
              <Link href="/projects">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="space-y-1 min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold truncate">{project.managementNumber}</h1>
              <p className="text-sm sm:text-base text-muted-foreground truncate">
                {project.client} / {project.projectNumber}
              </p>
              {project.completionMonth && (
                <p className="text-sm sm:text-base text-muted-foreground">
                  完成月: {project.completionMonth}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 text-destructive border-destructive/50 hover:bg-destructive/10"
              onClick={() => setProjectDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              削除
            </Button>
          </div>

          {/* 進捗ダッシュボード */}
          <ProjectDashboard project={project} progressList={progressList} />

          {/* パネルレイアウト */}
          <PanelLayoutSection
            projectId={project.id}
            currentLayout={project.panelLayout}
            onUpdate={fetchProject}
          />

          {/* ワークフロータイムライン（横型Gitツリー） */}
          <HorizontalTimeline
            progressList={progressList}
            completionMonth={project?.completionMonth}
            projectId={project.id}
            phaseOverrides={project?.phaseOverrides}
            onUpdate={fetchProject}
          />

          {/* TODO（この日までに行うリマインダー） */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <ListTodo className="h-5 w-5 text-muted-foreground" />
                <h2 className="font-semibold text-base sm:text-lg">TODO</h2>
              </div>
              <form onSubmit={handleTodoSubmit} className="space-y-3">
                <div className="flex gap-2 flex-wrap items-end">
                  <div className="flex-1 min-w-[200px] space-y-1">
                    <Label htmlFor="new-todo-content" className="text-xs text-muted-foreground">内容</Label>
                    <Textarea
                      id="new-todo-content"
                      value={newTodoContent}
                      onChange={(e) => setNewTodoContent(e.target.value)}
                      placeholder="この日までに行うことを入力..."
                      rows={2}
                      className="resize-y"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">期日</Label>
                    <DatePicker
                      value={newTodoDueDate || null}
                      onChange={(val) => setNewTodoDueDate(val || "")}
                      placeholder="期日を選択"
                      className="w-[180px]"
                    />
                  </div>
                  <Button type="submit" size="default" disabled={!newTodoContent.trim() || !newTodoDueDate}>
                    追加
                  </Button>
                </div>
              </form>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {todos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">TODOはありません</p>
                ) : (
                  todos.map((todo) => (
                    <div
                      key={todo.id}
                      className={cn(
                        "flex items-start justify-between gap-2 p-3 rounded-lg border border-border",
                        todo.completedAt ? "bg-muted/30 opacity-90" : "bg-muted/50"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm", todo.completedAt && "line-through text-muted-foreground")}>
                          {todo.content}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          期日: {formatDateJp(new Date(todo.dueDate + "T00:00:00"))}
                          {todo.completedAt && (
                            <>
                              {" · "}
                              完了: {formatDateJp(new Date(todo.completedAt))}
                            </>
                          )}
                        </p>
                        {/* メッセージツリー表示 */}
                        {todo.completedMemo && (
                          <div className="mt-2 space-y-1">
                            {parseTodoMessages(todo.completedMemo).map((msg, idx, arr) => (
                              <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                                <div className="flex flex-col items-center">
                                  <div className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-600 mt-1.5"></div>
                                  {idx < arr.length - 1 && (
                                    <div className="w-0.5 h-full bg-zinc-300 dark:bg-zinc-700 min-h-[16px]"></div>
                                  )}
                                </div>
                                <div className="flex-1 p-2 rounded bg-background/50 border border-border/50">
                                  <p className="text-xs">{msg.message}</p>
                                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                                    {formatDateJp(new Date(msg.createdAt))}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {todo.completedAt ? (
                          <div className="flex flex-col gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => openAddMessageDialog(todo)}
                              title="メッセージを追加"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              メモ
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => handleTodoReopen(todo)}
                            >
                              再開
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openTodoEditDialog(todo)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-green-600 hover:text-green-700"
                              onClick={() => openTodoCompleteDialog(todo)}
                              title="完了"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => openTodoDeleteDialog(todo)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* タブ UI */}
          <Tabs defaultValue="details" className="w-full" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
              <TabsTrigger value="details" className="text-sm sm:text-base py-2.5">案件情報</TabsTrigger>
              <TabsTrigger value="legal" className="text-sm sm:text-base py-2.5">法令</TabsTrigger>
              <TabsTrigger value="construction" className="text-sm sm:text-base py-2.5">工事</TabsTrigger>
              <TabsTrigger value="comments" className="text-sm sm:text-base py-2.5">コメント</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4 sm:mt-6">
              <Card>
                <CardContent className="pt-5 sm:pt-6 space-y-4 sm:space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 items-start border-b pb-4 gap-1 sm:gap-0">
                    <span className="text-sm sm:text-base font-medium text-muted-foreground">現地住所</span>
                    <div className="col-span-2 flex items-center gap-2">
                      <span className="text-sm">{project.address || "未登録"}</span>
                      {project.address && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={copyAddress}
                        >
                          {copiedField === "address" ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 items-start border-b pb-3">
                    <span className="text-sm font-medium text-muted-foreground">座標</span>
                    <div className="col-span-2 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{project.coordinates || "未登録"}</span>
                        {project.coordinates && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={copyCoordinates}
                          >
                            {copiedField === "coordinates" ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                      {project.coordinates && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Button variant="outline" size="sm" asChild className="h-8">
                            <a
                              href={getMappleUrl(project.coordinates) || ""}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-3 w-3 mr-2" />
                              MAPPLE
                            </a>
                          </Button>
                          <Button variant="outline" size="sm" asChild className="h-8">
                            <a
                              href={getGoogleMapsUrl(project.coordinates) || ""}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-3 w-3 mr-2" />
                              Google Map
                            </a>
                          </Button>
                          <Button variant="outline" size="sm" asChild className="h-8">
                            <a
                              href={getHazardMapUrl(project.coordinates) || ""}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-3 w-3 mr-2" />
                              ハザード
                            </a>
                          </Button>
                          <Button variant="outline" size="sm" asChild className="h-8">
                            <Link
                              href={`/map-editor?projectId=${project.id}&lat=${parseCoordinateString(project.coordinates)?.lat || ""}&lon=${parseCoordinateString(project.coordinates)?.lon || ""}`}
                            >
                              <PenTool className="h-3 w-3 mr-2" />
                              案内図エディタ
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm" asChild className="h-8">
                            <Link
                              href={`/survey?lat=${parseCoordinateString(project.coordinates)?.lat || ""}&lon=${parseCoordinateString(project.coordinates)?.lon || ""}&projectId=${project.id}&projectName=${encodeURIComponent(project.managementNumber)}`}
                            >
                              <Mountain className="h-3 w-3 mr-2" />
                              現地調査
                            </Link>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 items-start border-b pb-3">
                    <span className="text-sm font-medium text-muted-foreground">法令</span>
                    <div className="col-span-2">
                      {(() => {
                        // 保存された法令情報を解析
                        const legalStatuses = project?.legalStatuses
                          ? (() => {
                              try {
                                return JSON.parse(project.legalStatuses) as Record<string, { status: string; note?: string }>;
                              } catch {
                                return null;
                              }
                            })()
                          : null;

                        // 法令名からIDを取得するヘルパー
                        const getLawId = (lawName: string) => {
                          const law = laws.find(l => l.name === lawName);
                          return law?.id;
                        };

                        // 法令セクションにスクロール
                        const scrollToLawSection = (lawName: string) => {
                          const lawId = getLawId(lawName);
                          if (lawId) {
                            setActiveTab("legal");
                            // タブ切り替え後にスクロール
                            setTimeout(() => {
                              const element = document.getElementById(`law-section-${lawId}`);
                              if (element) {
                                element.scrollIntoView({ behavior: "smooth", block: "center" });
                                // 一時的にハイライト
                                element.classList.add("ring-2", "ring-primary", "ring-offset-2");
                                setTimeout(() => {
                                  element.classList.remove("ring-2", "ring-primary", "ring-offset-2");
                                }, 2000);
                              }
                            }, 100);
                          } else {
                            setActiveTab("legal");
                          }
                        };

                        if (legalStatuses && Object.keys(legalStatuses).length > 0) {
                          // 該当・要確認・非該当でグループ分け
                          const applicable = Object.entries(legalStatuses).filter(([, v]) => v.status === "該当");
                          const needsCheck = Object.entries(legalStatuses).filter(([, v]) => v.status === "要確認");
                          const notApplicable = Object.entries(legalStatuses).filter(([, v]) => v.status === "非該当");

                          return (
                            <div className="space-y-3">
                              {applicable.length > 0 && (
                                <div className="space-y-1.5">
                                  <span className="text-xs text-red-600 dark:text-red-400 font-medium">該当</span>
                                  {applicable.map(([name, info]) => (
                                    <div key={name} className="flex flex-col gap-1">
                                      <span
                                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 border border-red-200 dark:border-red-800 cursor-pointer hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors w-fit"
                                        onClick={() => scrollToLawSection(name)}
                                        title="クリックで詳細に移動"
                                      >
                                        {name}
                                      </span>
                                      {info.note && (
                                        <p className="text-xs text-muted-foreground pl-2 border-l-2 border-red-200 dark:border-red-800">
                                          {info.note}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {needsCheck.length > 0 && (
                                <div className="space-y-1.5">
                                  <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">要確認</span>
                                  {needsCheck.map(([name, info]) => (
                                    <div key={name} className="flex flex-col gap-1">
                                      <span
                                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border border-amber-200 dark:border-amber-800 cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors w-fit"
                                        onClick={() => scrollToLawSection(name)}
                                        title="クリックで詳細に移動"
                                      >
                                        {name}
                                      </span>
                                      {info.note && (
                                        <p className="text-xs text-muted-foreground pl-2 border-l-2 border-amber-200 dark:border-amber-800">
                                          {info.note}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {notApplicable.length > 0 && (
                                <details className="text-xs">
                                  <summary className="text-muted-foreground cursor-pointer hover:text-foreground">
                                    非該当 ({notApplicable.length}件)
                                  </summary>
                                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                                    {notApplicable.map(([name, info]) => (
                                      <div key={name} className="flex flex-col gap-0.5">
                                        <span
                                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors"
                                          onClick={() => scrollToLawSection(name)}
                                          title="クリックで詳細に移動"
                                        >
                                          {name}
                                        </span>
                                        {info.note && (
                                          <p className="text-xs text-muted-foreground/70 pl-1 truncate max-w-[200px]" title={info.note}>
                                            {info.note}
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              )}
                              <button
                                className="text-xs text-primary hover:underline mt-1"
                                onClick={() => setActiveTab("legal")}
                              >
                                法令タブで詳細を確認・編集
                              </button>
                            </div>
                          );
                        }

                        // 法令情報がない場合
                        return (
                          <div className="space-y-2">
                            <span className="text-sm text-muted-foreground">
                              法令情報は登録されていません
                            </span>
                            {getLegalSearchUrl() && (
                              <button
                                className="block text-xs text-primary hover:underline"
                                onClick={() => {
                                  const url = getLegalSearchUrl();
                                  if (url) {
                                    const urlObj = new URL(url, window.location.origin);
                                    const lat = urlObj.searchParams.get("lat");
                                    const lon = urlObj.searchParams.get("lon");
                                    const prefecture = urlObj.searchParams.get("prefecture");
                                    if (lat && lon && prefecture) {
                                      setLegalSearchParams({ lat, lon, prefecture });
                                      setActiveTab("legal");
                                    }
                                  }
                                }}
                              >
                                法令タブで確認・登録
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 items-start border-b pb-3">
                    <span className="text-sm font-medium text-muted-foreground">地権者</span>
                    <div className="col-span-2 flex items-start gap-2">
                      <div className="space-y-3 text-sm flex-1">
                        {/* 地権者1 */}
                        {project.landowner1 && (
                          <div className="p-2 rounded-lg bg-muted/30 space-y-1">
                            <div className="font-medium">{project.landowner1}</div>
                            {project.landownerAddress1 && (
                              <div className="text-xs text-muted-foreground">住所: {project.landownerAddress1}</div>
                            )}
                            <div className="flex flex-wrap gap-2 text-xs">
                              <span className={cn(
                                "px-2 py-0.5 rounded-full",
                                project.inheritanceStatus1 === "有" ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" :
                                project.inheritanceStatus1 === "無" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                                "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                              )}>
                                相続: {project.inheritanceStatus1 || "未確認"}
                              </span>
                              <span className={cn(
                                "px-2 py-0.5 rounded-full",
                                project.correctionRegistration1 === "有" ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" :
                                project.correctionRegistration1 === "無" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                                "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                              )}>
                                更正登記: {project.correctionRegistration1 || "未確認"}
                              </span>
                              <span className={cn(
                                "px-2 py-0.5 rounded-full",
                                project.mortgageStatus1 === "有" ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" :
                                project.mortgageStatus1 === "無" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                                "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                              )}>
                                抵当権: {project.mortgageStatus1 || "未確認"}
                              </span>
                            </div>
                          </div>
                        )}
                        {/* 地権者2 */}
                        {project.landowner2 && (
                          <div className="p-2 rounded-lg bg-muted/30 space-y-1">
                            <div className="font-medium">{project.landowner2}</div>
                            {project.landownerAddress2 && (
                              <div className="text-xs text-muted-foreground">住所: {project.landownerAddress2}</div>
                            )}
                            <div className="flex flex-wrap gap-2 text-xs">
                              <span className={cn(
                                "px-2 py-0.5 rounded-full",
                                project.inheritanceStatus2 === "有" ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" :
                                project.inheritanceStatus2 === "無" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                                "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                              )}>
                                相続: {project.inheritanceStatus2 || "未確認"}
                              </span>
                              <span className={cn(
                                "px-2 py-0.5 rounded-full",
                                project.correctionRegistration2 === "有" ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" :
                                project.correctionRegistration2 === "無" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                                "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                              )}>
                                更正登記: {project.correctionRegistration2 || "未確認"}
                              </span>
                              <span className={cn(
                                "px-2 py-0.5 rounded-full",
                                project.mortgageStatus2 === "有" ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" :
                                project.mortgageStatus2 === "無" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                                "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                              )}>
                                抵当権: {project.mortgageStatus2 || "未確認"}
                              </span>
                            </div>
                          </div>
                        )}
                        {/* 地権者3 */}
                        {project.landowner3 && (
                          <div className="p-2 rounded-lg bg-muted/30 space-y-1">
                            <div className="font-medium">{project.landowner3}</div>
                            {project.landownerAddress3 && (
                              <div className="text-xs text-muted-foreground">住所: {project.landownerAddress3}</div>
                            )}
                            <div className="flex flex-wrap gap-2 text-xs">
                              <span className={cn(
                                "px-2 py-0.5 rounded-full",
                                project.inheritanceStatus3 === "有" ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" :
                                project.inheritanceStatus3 === "無" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                                "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                              )}>
                                相続: {project.inheritanceStatus3 || "未確認"}
                              </span>
                              <span className={cn(
                                "px-2 py-0.5 rounded-full",
                                project.correctionRegistration3 === "有" ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" :
                                project.correctionRegistration3 === "無" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                                "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                              )}>
                                更正登記: {project.correctionRegistration3 || "未確認"}
                              </span>
                              <span className={cn(
                                "px-2 py-0.5 rounded-full",
                                project.mortgageStatus3 === "有" ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" :
                                project.mortgageStatus3 === "無" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                                "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                              )}>
                                抵当権: {project.mortgageStatus3 || "未確認"}
                              </span>
                            </div>
                          </div>
                        )}
                        {!project.landowner1 && !project.landowner2 && !project.landowner3 && (
                          <span>未登録</span>
                        )}
                      </div>
                      {(project.landowner1 || project.landowner2 || project.landowner3) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={copyLandowners}
                        >
                          {copiedField === "landowners" ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 items-start border-b pb-3">
                    <span className="text-sm font-medium text-muted-foreground">地目・面積</span>
                    <div className="col-span-2 space-y-1 text-sm">
                      {(project.landCategory1 || project.landArea1) && (
                        <div className="flex items-center gap-2">
                          <span>{project.landCategory1 || "-"}</span>
                          <span className="text-muted-foreground">:</span>
                          <span>{project.landArea1 || "-"} ㎡</span>
                        </div>
                      )}
                      {(project.landCategory2 || project.landArea2) && (
                        <div className="flex items-center gap-2">
                          <span>{project.landCategory2 || "-"}</span>
                          <span className="text-muted-foreground">:</span>
                          <span>{project.landArea2 || "-"} ㎡</span>
                        </div>
                      )}
                      {(project.landCategory3 || project.landArea3) && (
                        <div className="flex items-center gap-2">
                          <span>{project.landCategory3 || "-"}</span>
                          <span className="text-muted-foreground">:</span>
                          <span>{project.landArea3 || "-"} ㎡</span>
                        </div>
                      )}
                      {!project.landCategory1 && !project.landArea1 && 
                       !project.landCategory2 && !project.landArea2 && 
                       !project.landCategory3 && !project.landArea3 && (
                        <span>未登録</span>
                      )}
                      <div className="flex items-center gap-2 pt-1 border-t mt-1">
                        <span className="font-medium">合計:</span>
                        <span className="font-medium">
                          {calculateTotalArea(
                            project.landArea1 ?? "",
                            project.landArea2 ?? "",
                            project.landArea3 ?? ""
                          )} ㎡
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={copyTotalArea}
                        >
                          {copiedField === "totalArea" ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                  {/* 環境データ */}
                  <div className="grid grid-cols-3 items-start border-b pb-3">
                    <span className="text-sm font-medium text-muted-foreground">環境データ</span>
                    <div className="col-span-2 space-y-1 text-sm">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">垂直積雪量:</span>
                          <span className="font-medium">{project.verticalSnowLoad || "未登録"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">風速:</span>
                          <span className="font-medium">{project.windSpeed || "未登録"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* どこキャビ連携・サブフォルダクイックアクセス */}
                  <div className="grid grid-cols-3 items-start border-b pb-3">
                    <span className="text-sm font-medium text-muted-foreground">どこキャビ</span>
                    <div className="col-span-2 space-y-3">
                      {project.dococabiLink && isSafeUrl(project.dococabiLink) ? (
                        <>
                          <Button variant="outline" size="sm" asChild className="h-8">
                            <a
                              href={project.dococabiLink}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-3 w-3 mr-2" />
                              どこキャビを開く
                            </a>
                          </Button>
                          {/* サブフォルダクイックアクセス */}
                          <div className="pt-2">
                            <p className="text-xs text-muted-foreground mb-2">サブフォルダ</p>
                            <div className="grid grid-cols-2 gap-1.5">
                              {[
                                { name: "01_合意書", icon: "📝" },
                                { name: "02_土地情報", icon: "🗺️" },
                                { name: "03_図面", icon: "📐" },
                                { name: "04_発電シミュレーション", icon: "☀️" },
                                { name: "05_法令関係", icon: "⚖️" },
                                { name: "06_電力申請", icon: "⚡" },
                                { name: "07_材料発注", icon: "📦" },
                                { name: "08_工事関係", icon: "🔧" },
                                { name: "09_連系資料", icon: "🔌" },
                                { name: "10_土地決済・所有権移転", icon: "🏠" },
                              ].map((folder) => (
                                <Button
                                  key={folder.name}
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 justify-start text-xs px-2"
                                  onClick={() => {
                                    const url = `${project.dococabiLink}/${encodeURIComponent(folder.name)}`;
                                    if (isSafeUrl(url)) window.open(url, "_blank", "noopener,noreferrer");
                                  }}
                                >
                                  <span className="mr-1.5">{folder.icon}</span>
                                  <span className="truncate">{folder.name.substring(3)}</span>
                                </Button>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">未登録</span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button variant="outline" size="sm" onClick={openDetailEditDialog}>
                      <Pencil className="h-4 w-4 mr-2" />
                      詳細情報を編集
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* ファイル */}
              <Card className="mt-6">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-4">ファイル</h3>
                  <ProjectFiles projectId={Number(id)} initialFiles={files} />
                </CardContent>
              </Card>

              {/* フォルダ連携 */}
              <div className="mt-6">
                <ProjectFolderLink managementNumber={project?.managementNumber || null} />
              </div>

              {/* 現場写真 */}
              <div className="mt-6">
                <ProjectPhotoGallery managementNumber={project?.managementNumber || null} />
              </div>
            </TabsContent>

            <TabsContent value="legal" className="mt-6 space-y-6">
              <LegalSearchTab
                searchParams={legalSearchParams}
                projectAddress={project?.address || null}
                projectCoordinates={project?.coordinates || null}
                projectClient={project?.client}
                projectNumber={project?.managementNumber}
                projectLandCategories={
                  project
                    ? {
                        landCategory1: project.landCategory1 ?? null,
                        landCategory2: project.landCategory2 ?? null,
                        landCategory3: project.landCategory3 ?? null,
                      }
                    : null
                }
                projectId={project?.id}
                initialLegalStatuses={project?.legalStatuses}
                onLegalStatusesChange={(statuses) => {
                  if (project) {
                    setProject({ ...project, legalStatuses: JSON.stringify(statuses) });
                  }
                }}
              />
            </TabsContent>

            <TabsContent value="construction" className="mt-6">
              {project && (
                <ConstructionTab
                  project={project}
                  projectId={id}
                  onProjectUpdate={fetchProject}
                />
              )}
            </TabsContent>

            <TabsContent value="comments" className="mt-6">
              <CommentsTab
                projectId={id}
                comments={comments}
                onCommentsChange={fetchComments}
              />
            </TabsContent>
          </Tabs>

          {/* 詳細情報編集ダイアログ */}
          <Dialog open={detailEditOpen} onOpenChange={setDetailEditOpen}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>詳細情報を編集</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleDetailUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">現地住所</Label>
                  <Input
                    id="address"
                    value={detailForm.address}
                    onChange={(e) => setDetailForm({ ...detailForm, address: e.target.value })}
                    placeholder="例: 長野県..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coordinates">座標</Label>
                  <Input
                    id="coordinates"
                    value={detailForm.coordinates}
                    onChange={(e) => setDetailForm({ ...detailForm, coordinates: e.target.value })}
                    onBlur={() => {
                      const normalized = normalizeCoordinateString(detailForm.coordinates);
                      if (normalized) setDetailForm({ ...detailForm, coordinates: normalized });
                    }}
                    placeholder="例: 36.6485, 138.1942（スラッシュ区切りも可）"
                  />
                </div>
                <div className="space-y-4">
                  <Label>地権者</Label>
                  {/* 地権者1 */}
                  <div className="p-3 border rounded-lg space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">地権者1</div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={detailForm.landowner1}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          setDetailForm({ ...detailForm, landowner1: newValue });
                          fetchFurigana(newValue, "landowner1Kana");
                        }}
                        placeholder="氏名"
                      />
                      <div className="relative">
                        <Input
                          value={detailForm.landowner1Kana}
                          onChange={(e) => setDetailForm({ ...detailForm, landowner1Kana: e.target.value })}
                          placeholder=""
                          className={furiganaLoading.landowner1Kana ? "pr-8" : ""}
                        />
                        {furiganaLoading.landowner1Kana && (
                          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <Input
                      value={detailForm.landownerAddress1}
                      onChange={(e) => setDetailForm({ ...detailForm, landownerAddress1: e.target.value })}
                      placeholder="住所"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <Select
                        value={detailForm.inheritanceStatus1}
                        onValueChange={(value) => setDetailForm({ ...detailForm, inheritanceStatus1: value })}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder="相続" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="有">相続: 有</SelectItem>
                          <SelectItem value="無">相続: 無</SelectItem>
                          <SelectItem value="未確認">相続: 未確認</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={detailForm.correctionRegistration1}
                        onValueChange={(value) => setDetailForm({ ...detailForm, correctionRegistration1: value })}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder="更正登記" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="有">更正登記: 有</SelectItem>
                          <SelectItem value="無">更正登記: 無</SelectItem>
                          <SelectItem value="未確認">更正登記: 未確認</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={detailForm.mortgageStatus1}
                        onValueChange={(value) => setDetailForm({ ...detailForm, mortgageStatus1: value })}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder="抵当権" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="有">抵当権: 有</SelectItem>
                          <SelectItem value="無">抵当権: 無</SelectItem>
                          <SelectItem value="未確認">抵当権: 未確認</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {/* 地権者2 */}
                  <div className="p-3 border rounded-lg space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">地権者2</div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={detailForm.landowner2}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          setDetailForm({ ...detailForm, landowner2: newValue });
                          fetchFurigana(newValue, "landowner2Kana");
                        }}
                        placeholder="氏名"
                      />
                      <div className="relative">
                        <Input
                          value={detailForm.landowner2Kana}
                          onChange={(e) => setDetailForm({ ...detailForm, landowner2Kana: e.target.value })}
                          placeholder=""
                          className={furiganaLoading.landowner2Kana ? "pr-8" : ""}
                        />
                        {furiganaLoading.landowner2Kana && (
                          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <Input
                      value={detailForm.landownerAddress2}
                      onChange={(e) => setDetailForm({ ...detailForm, landownerAddress2: e.target.value })}
                      placeholder="住所"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <Select
                        value={detailForm.inheritanceStatus2}
                        onValueChange={(value) => setDetailForm({ ...detailForm, inheritanceStatus2: value })}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder="相続" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="有">相続: 有</SelectItem>
                          <SelectItem value="無">相続: 無</SelectItem>
                          <SelectItem value="未確認">相続: 未確認</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={detailForm.correctionRegistration2}
                        onValueChange={(value) => setDetailForm({ ...detailForm, correctionRegistration2: value })}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder="更正登記" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="有">更正登記: 有</SelectItem>
                          <SelectItem value="無">更正登記: 無</SelectItem>
                          <SelectItem value="未確認">更正登記: 未確認</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={detailForm.mortgageStatus2}
                        onValueChange={(value) => setDetailForm({ ...detailForm, mortgageStatus2: value })}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder="抵当権" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="有">抵当権: 有</SelectItem>
                          <SelectItem value="無">抵当権: 無</SelectItem>
                          <SelectItem value="未確認">抵当権: 未確認</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {/* 地権者3 */}
                  <div className="p-3 border rounded-lg space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">地権者3</div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={detailForm.landowner3}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          setDetailForm({ ...detailForm, landowner3: newValue });
                          fetchFurigana(newValue, "landowner3Kana");
                        }}
                        placeholder="氏名"
                      />
                      <div className="relative">
                        <Input
                          value={detailForm.landowner3Kana}
                          onChange={(e) => setDetailForm({ ...detailForm, landowner3Kana: e.target.value })}
                          placeholder=""
                          className={furiganaLoading.landowner3Kana ? "pr-8" : ""}
                        />
                        {furiganaLoading.landowner3Kana && (
                          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <Input
                      value={detailForm.landownerAddress3}
                      onChange={(e) => setDetailForm({ ...detailForm, landownerAddress3: e.target.value })}
                      placeholder="住所"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <Select
                        value={detailForm.inheritanceStatus3}
                        onValueChange={(value) => setDetailForm({ ...detailForm, inheritanceStatus3: value })}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder="相続" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="有">相続: 有</SelectItem>
                          <SelectItem value="無">相続: 無</SelectItem>
                          <SelectItem value="未確認">相続: 未確認</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={detailForm.correctionRegistration3}
                        onValueChange={(value) => setDetailForm({ ...detailForm, correctionRegistration3: value })}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder="更正登記" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="有">更正登記: 有</SelectItem>
                          <SelectItem value="無">更正登記: 無</SelectItem>
                          <SelectItem value="未確認">更正登記: 未確認</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={detailForm.mortgageStatus3}
                        onValueChange={(value) => setDetailForm({ ...detailForm, mortgageStatus3: value })}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder="抵当権" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="有">抵当権: 有</SelectItem>
                          <SelectItem value="無">抵当権: 無</SelectItem>
                          <SelectItem value="未確認">抵当権: 未確認</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>地目・土地の面積</Label>
                  <div className="space-y-2">
                    {/* 1つ目 */}
                    <div className="flex items-center gap-2">
                      <Select
                        value={detailForm.landCategory1}
                        onValueChange={(value) => setDetailForm({ ...detailForm, landCategory1: value })}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue placeholder="地目" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="山林">山林</SelectItem>
                          <SelectItem value="原野">原野</SelectItem>
                          <SelectItem value="畑">畑</SelectItem>
                          <SelectItem value="田">田</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        step="0.01"
                        value={detailForm.landArea1}
                        onChange={(e) => setDetailForm({ ...detailForm, landArea1: e.target.value })}
                        placeholder="面積（㎡）"
                        className="flex-1"
                      />
                    </div>
                    {/* 2つ目 */}
                    <div className="flex items-center gap-2">
                      <Select
                        value={detailForm.landCategory2}
                        onValueChange={(value) => setDetailForm({ ...detailForm, landCategory2: value })}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue placeholder="地目" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="山林">山林</SelectItem>
                          <SelectItem value="原野">原野</SelectItem>
                          <SelectItem value="畑">畑</SelectItem>
                          <SelectItem value="田">田</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        step="0.01"
                        value={detailForm.landArea2}
                        onChange={(e) => setDetailForm({ ...detailForm, landArea2: e.target.value })}
                        placeholder="面積（㎡）"
                        className="flex-1"
                      />
                    </div>
                    {/* 3つ目 */}
                    <div className="flex items-center gap-2">
                      <Select
                        value={detailForm.landCategory3}
                        onValueChange={(value) => setDetailForm({ ...detailForm, landCategory3: value })}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue placeholder="地目" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="山林">山林</SelectItem>
                          <SelectItem value="原野">原野</SelectItem>
                          <SelectItem value="畑">畑</SelectItem>
                          <SelectItem value="田">田</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        step="0.01"
                        value={detailForm.landArea3}
                        onChange={(e) => setDetailForm({ ...detailForm, landArea3: e.target.value })}
                        placeholder="面積（㎡）"
                        className="flex-1"
                      />
                    </div>
                    {/* 合計 */}
                    <div className="flex justify-end items-center gap-2 pt-1 border-t">
                      <span className="text-sm">合計:</span>
                      <span className="font-medium">
                        {calculateTotalArea(detailForm.landArea1, detailForm.landArea2, detailForm.landArea3)} ㎡
                      </span>
                    </div>
                  </div>
                </div>
                {/* 環境データ */}
                <div className="space-y-2">
                  <Label>環境データ</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="verticalSnowLoad" className="text-xs text-muted-foreground">垂直積雪量</Label>
                      <Input
                        id="verticalSnowLoad"
                        value={detailForm.verticalSnowLoad}
                        onChange={(e) => setDetailForm({ ...detailForm, verticalSnowLoad: e.target.value })}
                        placeholder="例: 30cm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="windSpeed" className="text-xs text-muted-foreground">風速</Label>
                      <Input
                        id="windSpeed"
                        value={detailForm.windSpeed}
                        onChange={(e) => setDetailForm({ ...detailForm, windSpeed: e.target.value })}
                        placeholder="例: 34m/s"
                      />
                    </div>
                  </div>
                </div>
                {/* どこキャビ連携 */}
                <div className="space-y-2">
                  <Label htmlFor="dococabiLink">どこキャビ連携URL</Label>
                  <Input
                    id="dococabiLink"
                    value={detailForm.dococabiLink}
                    onChange={(e) => setDetailForm({ ...detailForm, dococabiLink: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDetailEditOpen(false)}>
                    キャンセル
                  </Button>
                  <Button type="submit">
                    保存
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* TODO削除確認ダイアログ */}
          <AlertDialog open={todoDeleteOpen} onOpenChange={setTodoDeleteOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>TODOを削除</AlertDialogTitle>
                <AlertDialogDescription>
                  このTODOを削除しますか？
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (deletingTodo) {
                      handleTodoDelete(deletingTodo.id);
                    }
                    setTodoDeleteOpen(false);
                    setDeletingTodo(null);
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  削除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* 案件削除確認ダイアログ */}
          <AlertDialog open={projectDeleteOpen} onOpenChange={setProjectDeleteOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>案件を削除</AlertDialogTitle>
                <AlertDialogDescription>
                  「{project.managementNumber}」を削除しますか？<br />関連する進捗・TODO・コメントもすべて削除されます。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteProject}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  削除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* TODO完了ダイアログ */}
          <Dialog open={todoCompleteOpen} onOpenChange={setTodoCompleteOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>TODOを完了</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  完了メモを残すことができます（任意）
                </p>
              </DialogHeader>
              {completingTodo && (
                <form onSubmit={handleTodoCompleteSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="complete-todo-memo">完了メモ</Label>
                    <Textarea
                      id="complete-todo-memo"
                      value={completeTodoMemo}
                      onChange={(e) => setCompleteTodoMemo(e.target.value)}
                      placeholder="完了時のメモを入力..."
                      rows={3}
                      className="resize-y"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setTodoCompleteOpen(false)}
                    >
                      キャンセル
                    </Button>
                    <Button type="submit">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      完了する
                    </Button>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>

          {/* TODOメッセージ追加ダイアログ */}
          <Dialog open={todoAddMessageOpen} onOpenChange={setTodoAddMessageOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>メッセージを追加</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  完了済みTODOにメッセージを追加します
                </p>
              </DialogHeader>
              {addingMessageTodo && (
                <form onSubmit={handleAddMessageSubmit} className="space-y-4">
                  {/* 既存メッセージの表示 */}
                  {addingMessageTodo.completedMemo && (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      <Label className="text-xs text-muted-foreground">既存のメッセージ</Label>
                      {parseTodoMessages(addingMessageTodo.completedMemo).map((msg, idx) => (
                        <div key={idx} className="text-xs p-2 rounded bg-muted/50 border border-border/50">
                          <p>{msg.message}</p>
                          <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                            {formatDateJp(new Date(msg.createdAt))}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="new-todo-message">新しいメッセージ</Label>
                    <Textarea
                      id="new-todo-message"
                      value={newTodoMessage}
                      onChange={(e) => setNewTodoMessage(e.target.value)}
                      placeholder="メッセージを入力..."
                      rows={3}
                      className="resize-y"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setTodoAddMessageOpen(false)}
                    >
                      キャンセル
                    </Button>
                    <Button type="submit" disabled={!newTodoMessage.trim()}>
                      <Plus className="h-4 w-4 mr-2" />
                      追加
                    </Button>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>

          {/* TODO編集ダイアログ */}
          <Dialog open={todoEditOpen} onOpenChange={setTodoEditOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>TODOを編集</DialogTitle>
              </DialogHeader>
              {editingTodo && (
                <form onSubmit={handleTodoEditSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-todo-content">内容</Label>
                    <Textarea
                      id="edit-todo-content"
                      value={editTodoContent}
                      onChange={(e) => setEditTodoContent(e.target.value)}
                      placeholder="この日までに行うことを入力..."
                      rows={3}
                      className="resize-y"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>期日</Label>
                    <DatePicker
                      value={editTodoDueDate || null}
                      onChange={(val) => setEditTodoDueDate(val || "")}
                      placeholder="期日を選択"
                      className="w-full"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setTodoEditOpen(false)}
                    >
                      キャンセル
                    </Button>
                    <Button type="submit" disabled={!editTodoContent.trim() || !editTodoDueDate}>
                      保存
                    </Button>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>

        </div>
      </div>
    </div>
  );
}
