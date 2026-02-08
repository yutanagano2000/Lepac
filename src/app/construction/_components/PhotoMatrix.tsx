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
  ChevronRight,
  Building2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
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

type PhotoDetail = {
  id: number;
  fileName: string;
  fileUrl: string;
  contractorName: string | null;
  note: string | null;
  takenAt: string | null;
  createdAt: string;
};

type PhotoInfo = {
  count: number;
  latestAt: string | null;
  latestPhotos: PhotoDetail[];
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

  // プロジェクトの進捗を計算
  const getProjectProgress = (projectId: number) => {
    let completed = 0;
    let missing = 0;

    PHOTO_CATEGORIES.forEach((cat, idx) => {
      const info = photoMatrix[projectId]?.[cat.id];
      if (info && info.count > 0) {
        completed++;
      } else {
        // 前の工程が完了しているかチェック
        const prevCompleted = idx === 0 || PHOTO_CATEGORIES.slice(0, idx).every((c) => {
          const prevInfo = photoMatrix[projectId]?.[c.id];
          return prevInfo && prevInfo.count > 0;
        });
        if (prevCompleted) {
          missing++;
        }
      }
    });

    return {
      completed,
      total: PHOTO_CATEGORIES.length,
      percent: (completed / PHOTO_CATEGORIES.length) * 100,
      missing,
    };
  };

  // セルの状態を判定
  const getCellStatus = (projectId: number, categoryId: string, categoryIndex: number) => {
    const info = photoMatrix[projectId]?.[categoryId];
    const hasPhotos = info && info.count > 0;

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
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
        <span className="flex items-center gap-2">
          <span className="w-6 h-6 rounded bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Check className="w-4 h-4 text-green-600" />
          </span>
          撮影済
        </span>
        <span className="flex items-center gap-2">
          <span className="w-6 h-6 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Camera className="w-4 h-4 text-blue-600" />
          </span>
          新着
        </span>
        <span className="flex items-center gap-2">
          <span className="w-6 h-6 rounded bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-red-600" />
          </span>
          不足
        </span>
        <span className="flex items-center gap-2">
          <span className="w-6 h-6 rounded bg-muted flex items-center justify-center">
            <Minus className="w-4 h-4 text-muted-foreground" />
          </span>
          未到達
        </span>
      </div>

      {/* カード型レイアウト - 1列で垂直積み上げ */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">{monthDisplay}の案件がありません</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {filteredProjects.map((project) => {
            const progress = getProjectProgress(project.id);

            // 送信履歴を収集（各カテゴリの最新写真から）
            const recentUploads = PHOTO_CATEGORIES
              .map((cat) => {
                const info = photoMatrix[project.id]?.[cat.id];
                if (info && info.latestPhotos && info.latestPhotos.length > 0) {
                  const photo = info.latestPhotos[0];
                  return {
                    category: cat,
                    photo,
                    // モックデータ: 登録者名を追加（実際のAPIでは別途取得）
                    uploaderName: photo.contractorName ? `${photo.contractorName} 担当者` : "管理者",
                  };
                }
                return null;
              })
              .filter(Boolean)
              .sort((a, b) => {
                const dateA = new Date(a!.photo.createdAt).getTime();
                const dateB = new Date(b!.photo.createdAt).getTime();
                return dateB - dateA;
              })
              .slice(0, 5); // 最新5件まで表示

            return (
              <Card key={project.id} className="overflow-hidden">
                {/* ヘッダー部分 */}
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between gap-4">
                    {/* 左: 現場情報 */}
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="min-w-0">
                        <CardTitle className="text-xl">
                          {project.siteName || project.managementNumber}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-4 mt-1 text-sm">
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
                        </CardDescription>
                      </div>
                    </div>

                    {/* 右: 進捗と詳細ボタン */}
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold">{Math.round(progress.percent)}%</span>
                          {progress.missing > 0 && (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                              {progress.missing}件不足
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {progress.completed}/{progress.total} 完了
                        </p>
                      </div>
                      <Link href={`/construction/${project.id}`}>
                        <Button variant="outline" size="lg">
                          詳細
                          <ChevronRight className="h-5 w-5 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* 進捗バー */}
                  <Progress value={progress.percent} className="h-2 mt-3" />
                </CardHeader>

                <CardContent className="pt-0 space-y-4">
                  {/* カテゴリグリッド - 横1列10カラム・正方形セル */}
                  <div className="grid grid-cols-10 gap-2">
                    {PHOTO_CATEGORIES.map((cat, idx) => {
                      const status = getCellStatus(project.id, cat.id, idx);
                      const info = photoMatrix[project.id]?.[cat.id];
                      const hasPhotos = info && info.latestPhotos && info.latestPhotos.length > 0;
                      const contractorName = info?.latestPhotos?.[0]?.contractorName;
                      const latestPhoto = info?.latestPhotos?.[0];
                      const registrationDate = latestPhoto
                        ? new Date(latestPhoto.createdAt)
                        : null;

                      const cellContent = (
                        <button
                          onClick={() => handleCellClick(project, cat)}
                          className={cn(
                            "w-full aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer border text-center p-1.5",
                            status === "completed" && "bg-green-50 dark:bg-green-900/20 hover:bg-green-100 border-green-200 dark:border-green-800",
                            status === "new" && "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 border-blue-300 dark:border-blue-700 ring-2 ring-blue-400",
                            status === "missing" && "bg-red-50 dark:bg-red-900/20 hover:bg-red-100 border-red-300 dark:border-red-800",
                            status === "unreached" && "bg-muted/50 hover:bg-muted border-transparent"
                          )}
                        >
                          {/* カテゴリ名 */}
                          <span className="text-[11px] font-medium text-muted-foreground leading-tight">
                            {cat.shortLabel}
                          </span>

                          {/* ステータス表示 */}
                          {status === "completed" && (
                            <>
                              {/* 登録日を大きく表示 */}
                              {registrationDate && (
                                <div className="text-green-700 dark:text-green-400">
                                  <span className="text-xl font-bold leading-none">
                                    {registrationDate.getMonth() + 1}/{registrationDate.getDate()}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center gap-0.5">
                                <Check className="w-3.5 h-3.5 text-green-600" />
                                <span className="text-sm font-bold text-green-700 dark:text-green-400">
                                  {info?.count}枚
                                </span>
                              </div>
                              {contractorName && (
                                <span className="text-[9px] text-green-600 dark:text-green-500 truncate max-w-full leading-tight">
                                  {contractorName}
                                </span>
                              )}
                            </>
                          )}
                          {status === "new" && (
                            <>
                              {/* 登録日を大きく表示 */}
                              {registrationDate && (
                                <div className="text-blue-700 dark:text-blue-400">
                                  <span className="text-xl font-bold leading-none">
                                    {registrationDate.getMonth() + 1}/{registrationDate.getDate()}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center gap-0.5">
                                <Camera className="w-3.5 h-3.5 text-blue-600" />
                                <span className="text-sm font-bold text-blue-700 dark:text-blue-400">
                                  {info?.count}枚
                                </span>
                              </div>
                              <Badge className="bg-blue-600 text-white text-[9px] px-1 py-0">NEW</Badge>
                            </>
                          )}
                          {status === "missing" && (
                            <>
                              <AlertCircle className="w-6 h-6 text-red-600" />
                              <span className="text-sm font-bold text-red-700 dark:text-red-400">
                                不足
                              </span>
                            </>
                          )}
                          {status === "unreached" && (
                            <>
                              <Minus className="w-5 h-5 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">—</span>
                            </>
                          )}
                        </button>
                      );

                      // ホバープレビュー付きセル（大きいプレビュー）
                      if (hasPhotos) {
                        return (
                          <HoverCard key={cat.id} openDelay={150} closeDelay={100}>
                            <HoverCardTrigger asChild>
                              {cellContent}
                            </HoverCardTrigger>
                            <HoverCardContent className="w-96 p-4" side="top" align="center">
                              <div className="space-y-3">
                                {/* ヘッダー */}
                                <div className="flex items-center gap-2 pb-2 border-b">
                                  <span className={cn("w-3 h-3 rounded-full", cat.color)} />
                                  <span className="font-medium">{cat.label}</span>
                                  <Badge variant="secondary" className="ml-auto">
                                    {info.count}枚
                                  </Badge>
                                </div>

                                {/* 写真プレビュー - 大きく、全体が見える */}
                                <div className="space-y-2">
                                  {info.latestPhotos.slice(0, 2).map((photo) => (
                                    <div key={photo.id} className="rounded-lg overflow-hidden border bg-muted/30">
                                      <img
                                        src={photo.fileUrl}
                                        alt={photo.fileName}
                                        className="w-full h-auto max-h-48 object-contain bg-black/5"
                                      />
                                    </div>
                                  ))}
                                </div>

                                {/* 最新写真の詳細 */}
                                {info.latestPhotos[0] && (
                                  <div className="text-sm text-muted-foreground space-y-1.5 pt-2 border-t">
                                    {info.latestPhotos[0].contractorName && (
                                      <div className="flex items-center gap-2">
                                        <Building2 className="h-4 w-4" />
                                        <span className="font-medium text-foreground">
                                          {info.latestPhotos[0].contractorName}
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                      <User className="h-4 w-4" />
                                      <span className="text-foreground">
                                        {info.latestPhotos[0].contractorName ? `${info.latestPhotos[0].contractorName} 担当者` : "管理者"}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Clock className="h-4 w-4" />
                                      {new Date(info.latestPhotos[0].createdAt).toLocaleDateString("ja-JP", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                      に登録
                                    </div>
                                    {info.latestPhotos[0].note && (
                                      <p className="text-foreground bg-muted p-2 rounded mt-2">
                                        {info.latestPhotos[0].note}
                                      </p>
                                    )}
                                  </div>
                                )}

                                <p className="text-xs text-center text-muted-foreground pt-2">
                                  クリックで全件表示
                                </p>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        );
                      }

                      return <div key={cat.id}>{cellContent}</div>;
                    })}
                  </div>

                  {/* 送信履歴セクション */}
                  {recentUploads.length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        最近の送信履歴
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                        {recentUploads.map((upload) => {
                          if (!upload) return null;
                          const { category, photo, uploaderName } = upload;
                          const uploadDate = new Date(photo.createdAt);
                          const isToday = uploadDate.toDateString() === new Date().toDateString();

                          return (
                            <div
                              key={`${category.id}-${photo.id}`}
                              className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border hover:bg-muted/50 transition-colors"
                            >
                              {/* サムネイル */}
                              <div className="shrink-0 w-14 h-14 rounded-md overflow-hidden border bg-muted">
                                <img
                                  src={photo.fileUrl}
                                  alt={photo.fileName}
                                  className="w-full h-full object-cover"
                                />
                              </div>

                              {/* 情報 */}
                              <div className="flex-1 min-w-0 space-y-1">
                                {/* カテゴリ */}
                                <div className="flex items-center gap-1.5">
                                  <span className={cn("w-2 h-2 rounded-full shrink-0", category.color)} />
                                  <span className="text-sm font-medium truncate">{category.label}</span>
                                  {isToday && (
                                    <Badge className="bg-blue-600 text-white text-[10px] px-1 py-0 shrink-0">
                                      今日
                                    </Badge>
                                  )}
                                </div>

                                {/* 会社・担当者 */}
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Building2 className="h-3 w-3 shrink-0" />
                                  <span className="truncate">
                                    {photo.contractorName || "自社"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <User className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{uploaderName}</span>
                                </div>

                                {/* 日時 */}
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3 shrink-0" />
                                  <span>
                                    {uploadDate.toLocaleDateString("ja-JP", {
                                      month: "numeric",
                                      day: "numeric",
                                    })}
                                    {" "}
                                    {uploadDate.toLocaleTimeString("ja-JP", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 履歴がない場合 */}
                  {recentUploads.length === 0 && (
                    <div className="border-t pt-4">
                      <div className="text-center py-4 text-muted-foreground bg-muted/20 rounded-lg">
                        <Camera className="h-6 w-6 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">まだ写真が送信されていません</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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
