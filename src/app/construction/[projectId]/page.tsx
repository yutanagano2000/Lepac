"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useConstructionData, useConstructionActions, type Photo } from "./_hooks";
import { PHOTO_CATEGORIES, ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE, MAX_FILE_SIZE_MB } from "./_constants";

export default function ConstructionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const { project, photos, setPhotos, isLoading, error, refetch } = useConstructionData(projectId);
  const { uploadPhoto, deletePhoto } = useConstructionActions({ projectId, setPhotos });

  // アップロード状態
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadNote, setUploadNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const previewUrlRef = useRef<string | null>(null);

  // ライトボックス状態
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);

  // URL.createObjectURLのクリーンアップ
  useEffect(() => {
    if (uploadFile) {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      previewUrlRef.current = URL.createObjectURL(uploadFile);
    }
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, [uploadFile]);

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

  // ファイルバリデーション
  const validateFile = (file: File): string | null => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type as typeof ALLOWED_IMAGE_TYPES[number])) {
      return "サポートされていないファイル形式です。JPEG、PNG、GIF、WebP、HEIC形式のみ対応しています。";
    }
    if (file.size > MAX_FILE_SIZE) {
      return `ファイルサイズが大きすぎます。${MAX_FILE_SIZE_MB}MB以下のファイルを選択してください。`;
    }
    return null;
  };

  // ファイル選択時のバリデーション
  const handleFileChange = (file: File | null) => {
    if (!file) {
      setUploadFile(null);
      return;
    }
    const error = validateFile(file);
    if (error) {
      toast.warning(error);
      return;
    }
    setUploadFile(file);
  };

  // アップロード処理
  const handleUpload = async () => {
    if (!uploadingCategory || !uploadFile) return;

    // 再度バリデーション（セキュリティ対策）
    const error = validateFile(uploadFile);
    if (error) {
      toast.warning(error);
      return;
    }

    setUploading(true);
    try {
      await uploadPhoto(uploadingCategory, uploadFile, uploadNote);
      setUploadFile(null);
      setUploadNote("");
      setUploadingCategory(null);
    } catch {
      toast.error("写真のアップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  };

  // 削除処理
  const handleDelete = async (photoId: number) => {
    if (!confirm("この写真を削除しますか？")) return;

    try {
      await deletePhoto(photoId);
      setLightboxPhoto(null);
    } catch {
      toast.error("写真の削除に失敗しました");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-muted-foreground">{error || "案件が見つかりません"}</p>
        <Button variant="outline" onClick={refetch}>
          再試行
        </Button>
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
                  accept={ALLOWED_IMAGE_TYPES.join(",")}
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                />
              </div>

              {uploadFile && previewUrlRef.current && (
                <>
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                    <img
                      src={previewUrlRef.current}
                      alt="プレビュー"
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
                      aria-label="写真を削除"
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
