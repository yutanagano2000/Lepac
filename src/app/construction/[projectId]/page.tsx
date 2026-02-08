"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  Check,
  AlertCircle,
  Upload,
  Loader2,
  Trash2,
  Clock,
  User,
  MapPin,
  Building2,
  Image as ImageIcon,
  ExternalLink,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

// カテゴリ定義
const PHOTO_CATEGORIES = [
  { id: "着工前", label: "着工前", color: "bg-amber-500" },
  { id: "造成後", label: "造成後", color: "bg-lime-500" },
  { id: "載荷試験", label: "載荷試験", color: "bg-indigo-500" },
  { id: "杭打ち", label: "杭打ち", color: "bg-red-500" },
  { id: "ケーブル埋設", label: "ケーブル埋設", color: "bg-purple-500" },
  { id: "架台組立", label: "架台組立", color: "bg-blue-500" },
  { id: "パネル", label: "パネル", color: "bg-emerald-500" },
  { id: "電気", label: "電気", color: "bg-orange-500" },
  { id: "フェンス", label: "フェンス", color: "bg-cyan-500" },
  { id: "完工写真", label: "完工写真", color: "bg-green-500" },
] as const;

type Project = {
  id: number;
  managementNumber: string;
  siteName: string | null;
  cityName: string | null;
  prefecture: string | null;
  address: string | null;
  client: string | null;
  completionMonth: string | null;
};

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

export default function ConstructionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  // アップロード状態
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadNote, setUploadNote] = useState("");
  const [uploading, setUploading] = useState(false);

  // ライトボックス状態
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);

  // データ取得
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [projectRes, photosRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/construction-photos`),
      ]);

      if (projectRes.ok) {
        const projectData = await projectRes.json();
        setProject(projectData);
      }
      if (photosRes.ok) {
        const photosData = await photosRes.json();
        setPhotos(photosData);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // カテゴリ別に写真をグループ化
  const photosByCategory = PHOTO_CATEGORIES.reduce((acc, cat) => {
    acc[cat.id] = photos.filter((p) => p.category === cat.id);
    return acc;
  }, {} as Record<string, Photo[]>);

  // 進捗計算
  const completedCategories = PHOTO_CATEGORIES.filter(
    (cat) => photosByCategory[cat.id]?.length > 0
  ).length;
  const progressPercent = (completedCategories / PHOTO_CATEGORIES.length) * 100;

  // アップロード処理
  const handleUpload = async () => {
    if (!uploadingCategory || !uploadFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("category", uploadingCategory);
      formData.append("note", uploadNote);

      const res = await fetch(`/api/projects/${projectId}/construction-photos`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const newPhoto = await res.json();
        setPhotos((prev) => [newPhoto, ...prev]);
        setUploadFile(null);
        setUploadNote("");
        setUploadingCategory(null);
      }
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
    }
  };

  // 削除処理
  const handleDelete = async (photoId: number) => {
    if (!confirm("この写真を削除しますか？")) return;

    try {
      const res = await fetch(
        `/api/projects/${projectId}/construction-photos/${photoId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
        setLightboxPhoto(null);
      }
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">案件が見つかりません</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* ヘッダー */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/construction")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            工事一覧に戻る
          </Button>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">
                {project.siteName || project.managementNumber}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                {project.prefecture && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {project.prefecture}
                    {project.cityName && ` ${project.cityName}`}
                  </span>
                )}
                {project.client && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    {project.client}
                  </span>
                )}
                {project.completionMonth && (
                  <Badge variant="outline">
                    完成月: {project.completionMonth}
                  </Badge>
                )}
              </div>
            </div>

            <Link href={`/projects/${projectId}`}>
              <Button variant="outline" size="sm">
                案件詳細
                <ExternalLink className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>

        {/* 進捗バー */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">工程進捗</span>
              <span className="text-sm text-muted-foreground">
                {completedCategories} / {PHOTO_CATEGORIES.length} 完了
              </span>
            </div>
            <Progress value={progressPercent} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2">
              {progressPercent === 100
                ? "全工程の写真が揃っています"
                : `残り${PHOTO_CATEGORIES.length - completedCategories}工程の写真が必要です`}
            </p>
          </CardContent>
        </Card>

        {/* カテゴリ別写真グリッド */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PHOTO_CATEGORIES.map((cat, idx) => {
            const catPhotos = photosByCategory[cat.id] || [];
            const hasPhotos = catPhotos.length > 0;

            // 前の工程が完了しているか
            const prevCompleted =
              idx === 0 ||
              PHOTO_CATEGORIES.slice(0, idx).every(
                (c) => (photosByCategory[c.id]?.length || 0) > 0
              );

            return (
              <Card
                key={cat.id}
                className={cn(
                  "transition-colors",
                  hasPhotos && "border-green-200 dark:border-green-800",
                  !hasPhotos && prevCompleted && "border-amber-200 dark:border-amber-800",
                  !hasPhotos && !prevCompleted && "opacity-60"
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn("w-3 h-3 rounded-full", cat.color)} />
                      <CardTitle className="text-base">{cat.label}</CardTitle>
                      {hasPhotos ? (
                        <Badge
                          variant="default"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          {catPhotos.length}枚
                        </Badge>
                      ) : prevCompleted ? (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          不足
                        </Badge>
                      ) : (
                        <Badge variant="outline">未到達</Badge>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setUploadingCategory(cat.id)}
                      disabled={!prevCompleted && !hasPhotos}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      追加
                    </Button>
                  </div>
                </CardHeader>

                <CardContent>
                  {catPhotos.length === 0 ? (
                    <div className="flex items-center justify-center h-32 bg-muted/30 rounded-lg border-2 border-dashed">
                      <div className="text-center text-muted-foreground">
                        <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">
                          {prevCompleted
                            ? "写真を追加してください"
                            : "前の工程を完了してください"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {catPhotos.slice(0, 6).map((photo) => (
                        <button
                          key={photo.id}
                          onClick={() => setLightboxPhoto(photo)}
                          className="relative group aspect-square rounded-lg overflow-hidden border hover:ring-2 hover:ring-primary transition-all"
                        >
                          <img
                            src={photo.fileUrl}
                            alt={photo.fileName}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                        </button>
                      ))}
                      {catPhotos.length > 6 && (
                        <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
                          <span className="text-sm text-muted-foreground">
                            +{catPhotos.length - 6}枚
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 最新写真の情報 */}
                  {catPhotos[0] && (
                    <div className="mt-3 pt-3 border-t text-sm text-muted-foreground flex items-center gap-4">
                      {catPhotos[0].contractorName && (
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {catPhotos[0].contractorName}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(
                          catPhotos[0].takenAt || catPhotos[0].createdAt
                        ).toLocaleDateString("ja-JP")}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* アップロードモーダル */}
        <Dialog
          open={!!uploadingCategory}
          onOpenChange={() => setUploadingCategory(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span
                  className={cn(
                    "w-3 h-3 rounded-full",
                    PHOTO_CATEGORIES.find((c) => c.id === uploadingCategory)?.color
                  )}
                />
                {PHOTO_CATEGORIES.find((c) => c.id === uploadingCategory)?.label}
                に写真を追加
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              <div>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                />
              </div>

              {uploadFile && (
                <>
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                    <img
                      src={URL.createObjectURL(uploadFile)}
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <Textarea
                    placeholder="メモ（任意）"
                    value={uploadNote}
                    onChange={(e) => setUploadNote(e.target.value)}
                    rows={2}
                  />
                </>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setUploadingCategory(null)}
                >
                  キャンセル
                </Button>
                <Button onClick={handleUpload} disabled={!uploadFile || uploading}>
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Upload className="h-4 w-4 mr-1" />
                  )}
                  アップロード
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ライトボックス */}
        <Dialog open={!!lightboxPhoto} onOpenChange={() => setLightboxPhoto(null)}>
          <DialogContent className="max-w-4xl">
            {lightboxPhoto && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center justify-between">
                    <span>{lightboxPhoto.fileName}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(lightboxPhoto.id)}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
                    <img
                      src={lightboxPhoto.fileUrl}
                      alt={lightboxPhoto.fileName}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      {lightboxPhoto.contractorName && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{lightboxPhoto.contractorName}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {lightboxPhoto.takenAt
                            ? new Date(lightboxPhoto.takenAt).toLocaleString("ja-JP")
                            : new Date(lightboxPhoto.createdAt).toLocaleString("ja-JP")}
                        </span>
                      </div>
                    </div>
                    {lightboxPhoto.note && (
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="text-sm">{lightboxPhoto.note}</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
