"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ExternalLink,
  Camera,
  Check,
  AlertCircle,
  Minus,
  Upload,
  X,
  Loader2,
  MapPin,
  User,
  Clock,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

// カテゴリ定義（Lepac/Vantage共通）
const PHOTO_CATEGORIES = [
  { id: "着工前", label: "着工前", shortLabel: "着工前", color: "bg-amber-500" },
  { id: "造成後", label: "造成後", shortLabel: "造成後", color: "bg-lime-500" },
  { id: "載荷試験", label: "載荷試験", shortLabel: "載荷", color: "bg-indigo-500" },
  { id: "杭打ち", label: "杭打ち", shortLabel: "杭打ち", color: "bg-red-500" },
  { id: "ケーブル埋設", label: "ケーブル埋設", shortLabel: "埋設", color: "bg-purple-500" },
  { id: "架台組立", label: "架台組立", shortLabel: "架台", color: "bg-blue-500" },
  { id: "パネル", label: "パネル", shortLabel: "パネル", color: "bg-emerald-500" },
  { id: "電気", label: "電気", shortLabel: "電気", color: "bg-orange-500" },
  { id: "フェンス", label: "フェンス", shortLabel: "フェンス", color: "bg-cyan-500" },
  { id: "完工写真", label: "完工写真", shortLabel: "完工", color: "bg-green-500" },
] as const;

type Project = {
  id: number;
  managementNumber: string;
  siteName: string | null;
  cityName: string | null;
  prefecture: string | null;
  completionMonth: string | null;
  client: string | null;
};

type PhotoInfo = {
  count: number;
  latestAt: string | null;
};

type PhotoMatrix = Record<number, Record<string, PhotoInfo>>;

type Photo = {
  id: number;
  projectId: number;
  category: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  contractorName: string | null;
  note: string | null;
  takenAt: string | null;
  createdAt: string;
};

interface PhotoMatrixProps {
  year: number;
  month: number;
}

export default function PhotoMatrix({ year, month }: PhotoMatrixProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [photoMatrix, setPhotoMatrix] = useState<PhotoMatrix>({});
  const [loading, setLoading] = useState(true);
  const [showMissingOnly, setShowMissingOnly] = useState(false);

  // モーダル状態
  const [selectedCell, setSelectedCell] = useState<{
    project: Project;
    category: typeof PHOTO_CATEGORIES[number];
  } | null>(null);
  const [cellPhotos, setCellPhotos] = useState<Photo[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  // アップロード状態
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadNote, setUploadNote] = useState("");

  // データ取得
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/construction/photos-summary?year=${year}&month=${month}`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
        setPhotoMatrix(data.photoMatrix || {});
      }
    } catch (error) {
      console.error("Failed to fetch photo matrix:", error);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // セルクリック時の写真取得
  const handleCellClick = async (project: Project, category: typeof PHOTO_CATEGORIES[number]) => {
    setSelectedCell({ project, category });
    setCellPhotos([]);
    setLoadingPhotos(true);

    try {
      const res = await fetch(`/api/projects/${project.id}/construction-photos`);
      if (res.ok) {
        const photos = await res.json();
        const filtered = photos.filter((p: Photo) => p.category === category.id);
        setCellPhotos(filtered);
      }
    } catch (error) {
      console.error("Failed to fetch photos:", error);
    } finally {
      setLoadingPhotos(false);
    }
  };

  // 写真アップロード
  const handleUpload = async () => {
    if (!selectedCell || !uploadFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("category", selectedCell.category.id);
      formData.append("note", uploadNote);

      const res = await fetch(`/api/projects/${selectedCell.project.id}/construction-photos`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const newPhoto = await res.json();
        setCellPhotos((prev) => [newPhoto, ...prev]);
        setUploadFile(null);
        setUploadNote("");
        // マトリクスを更新
        fetchData();
      }
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
    }
  };

  // 写真削除
  const handleDeletePhoto = async (photoId: number) => {
    if (!selectedCell) return;
    if (!confirm("この写真を削除しますか？")) return;

    try {
      const res = await fetch(
        `/api/projects/${selectedCell.project.id}/construction-photos/${photoId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setCellPhotos((prev) => prev.filter((p) => p.id !== photoId));
        fetchData();
      }
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  // セルの状態を判定
  const getCellStatus = (projectId: number, categoryId: string, categoryIndex: number) => {
    const info = photoMatrix[projectId]?.[categoryId];
    const hasPhotos = info && info.count > 0;

    // 完工写真以外で、前の工程が完了していない場合は「未到達」
    // ただし、着工前は常に表示
    if (categoryIndex > 0) {
      const prevCategories = PHOTO_CATEGORIES.slice(0, categoryIndex);
      const allPrevCompleted = prevCategories.every((c) => {
        const prevInfo = photoMatrix[projectId]?.[c.id];
        return prevInfo && prevInfo.count > 0;
      });
      if (!allPrevCompleted && !hasPhotos) {
        return "unreached";
      }
    }

    if (hasPhotos) {
      // 最新の写真が今日の場合は「新着」
      if (info.latestAt) {
        const today = new Date().toISOString().split("T")[0];
        const photoDate = info.latestAt.split("T")[0];
        if (photoDate === today) {
          return "new";
        }
      }
      return "completed";
    }

    return "missing";
  };

  // フィルタリング
  const filteredProjects = showMissingOnly
    ? projects.filter((p) => {
        // いずれかのカテゴリで写真が不足している
        return PHOTO_CATEGORIES.some((c, i) => {
          const status = getCellStatus(p.id, c.id, i);
          return status === "missing";
        });
      })
    : projects;

  const monthDisplay = `${year}年${month}月`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* フィルター */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            id="showMissingOnly"
            checked={showMissingOnly}
            onCheckedChange={(checked) => setShowMissingOnly(checked === true)}
          />
          <Label htmlFor="showMissingOnly" className="text-sm cursor-pointer">
            不足のみ表示
          </Label>
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredProjects.length}件の現場
        </div>
      </div>

      {/* 凡例 */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Check className="w-3 h-3 text-green-600" />
          </span>
          撮影済
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Camera className="w-3 h-3 text-blue-600" />
          </span>
          新着
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <AlertCircle className="w-3 h-3 text-amber-600" />
          </span>
          不足
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded bg-muted flex items-center justify-center">
            <Minus className="w-3 h-3 text-muted-foreground" />
          </span>
          未到達
        </span>
      </div>

      {/* マトリクステーブル */}
      <div className="rounded-md border overflow-hidden">
        <div className="flex">
          {/* 固定列（左側） */}
          <div className="shrink-0 border-r bg-background z-10">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[140px] whitespace-nowrap font-medium">現場</TableHead>
                  <TableHead className="w-[80px] whitespace-nowrap font-medium">市町村</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map((project) => (
                  <TableRow key={project.id} className="h-[44px]">
                    <TableCell className="whitespace-nowrap font-medium">
                      <Link
                        href={`/projects/${project.id}`}
                        className="text-blue-600 hover:underline dark:text-blue-400 inline-flex items-center gap-1"
                      >
                        {project.siteName || project.managementNumber}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {project.cityName || project.prefecture || "-"}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredProjects.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                      {monthDisplay}の案件がありません
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* スクロール可能列（右側） */}
          <ScrollArea className="flex-1">
            <div className="min-w-[800px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    {PHOTO_CATEGORIES.map((cat) => (
                      <TableHead
                        key={cat.id}
                        className="w-[70px] text-center whitespace-nowrap font-medium"
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={cn("w-2 h-2 rounded-full", cat.color)} />
                          <span className="text-xs">{cat.shortLabel}</span>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.map((project) => (
                    <TableRow key={project.id} className="h-[44px]">
                      {PHOTO_CATEGORIES.map((cat, idx) => {
                        const status = getCellStatus(project.id, cat.id, idx);
                        const info = photoMatrix[project.id]?.[cat.id];

                        return (
                          <TableCell
                            key={cat.id}
                            className="text-center p-1"
                          >
                            <button
                              onClick={() => handleCellClick(project, cat)}
                              className={cn(
                                "w-10 h-8 rounded flex items-center justify-center transition-colors cursor-pointer",
                                status === "completed" && "bg-green-100 dark:bg-green-900/30 hover:bg-green-200",
                                status === "new" && "bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 ring-2 ring-blue-400",
                                status === "missing" && "bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200",
                                status === "unreached" && "bg-muted hover:bg-muted/80"
                              )}
                            >
                              {status === "completed" && (
                                <span className="text-xs font-medium text-green-700 dark:text-green-400">
                                  {info?.count}
                                </span>
                              )}
                              {status === "new" && (
                                <span className="flex items-center gap-0.5 text-xs font-medium text-blue-700 dark:text-blue-400">
                                  {info?.count}
                                  <Camera className="w-3 h-3" />
                                </span>
                              )}
                              {status === "missing" && (
                                <AlertCircle className="w-4 h-4 text-amber-600" />
                              )}
                              {status === "unreached" && (
                                <Minus className="w-4 h-4 text-muted-foreground" />
                              )}
                            </button>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                  {filteredProjects.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8">
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

      {/* 写真詳細モーダル */}
      <Dialog open={!!selectedCell} onOpenChange={() => setSelectedCell(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span
                className={cn(
                  "w-3 h-3 rounded-full",
                  selectedCell?.category.color
                )}
              />
              {selectedCell?.project.siteName || selectedCell?.project.managementNumber} - {selectedCell?.category.label}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4">
            {/* アップロードエリア */}
            <div className="border-2 border-dashed rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={handleUpload}
                  disabled={!uploadFile || uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  <span className="ml-1">追加</span>
                </Button>
              </div>
              {uploadFile && (
                <Textarea
                  placeholder="メモ（任意）"
                  value={uploadNote}
                  onChange={(e) => setUploadNote(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              )}
            </div>

            {/* 写真一覧 */}
            {loadingPhotos ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : cellPhotos.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">まだ写真がありません</p>
                <p className="text-xs mt-1">Vantageから撮影するか、上のフォームから追加してください</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {cellPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative group rounded-lg overflow-hidden border bg-muted/30"
                  >
                    <img
                      src={photo.fileUrl}
                      alt={photo.fileName}
                      className="w-full aspect-square object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="self-end h-7 w-7 text-white hover:text-red-400 hover:bg-transparent"
                        onClick={() => handleDeletePhoto(photo.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <div className="text-white text-xs space-y-0.5">
                        {photo.takenAt && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(photo.takenAt).toLocaleDateString("ja-JP")}
                          </div>
                        )}
                        {photo.contractorName && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {photo.contractorName}
                          </div>
                        )}
                        {photo.note && (
                          <p className="truncate">{photo.note}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
