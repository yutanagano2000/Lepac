"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";
import { HardHat, ListTodo, Camera, Upload, Trash2, Loader2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { cn } from "@/lib/utils";
import type { Project, ConstructionProgress, ConstructionPhoto } from "@/db/schema";
import { CONSTRUCTION_PROGRESS_CATEGORIES, CONSTRUCTION_PHOTO_CATEGORIES } from "@/db/schema";
import { DatePickerField } from "./DatePickerField";

interface ConstructionTabProps {
  project: Project;
  projectId: string;
  onProjectUpdate: () => void;
}

function ConstructionTabContent({ project, projectId, onProjectUpdate }: ConstructionTabProps) {
  // 工事データのローカルstate
  const [constructionProgressList, setConstructionProgressList] = useState<ConstructionProgress[]>([]);
  const [constructionPhotos, setConstructionPhotos] = useState<ConstructionPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoUploadCategory, setPhotoUploadCategory] = useState<string>("");
  const [photoContractorName, setPhotoContractorName] = useState("");
  const [photoNote, setPhotoNote] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<number | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // 工事データ取得
  const fetchConstructionData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [progressRes, photosRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/construction-progress`),
        fetch(`/api/projects/${projectId}/construction-photos`),
      ]);
      if (!progressRes.ok || !photosRes.ok) {
        console.error("Failed to fetch construction data");
        return;
      }
      const progressData = await progressRes.json();
      const photosData = await photosRes.json();
      setConstructionProgressList(Array.isArray(progressData) ? progressData : []);
      setConstructionPhotos(Array.isArray(photosData) ? photosData : []);
    } catch (error) {
      console.error("Failed to fetch construction data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // 初回マウント時に取得
  useEffect(() => {
    fetchConstructionData();
  }, [fetchConstructionData]);

  // 日付更新ハンドラ
  const handleDateUpdate = async (field: string, value: string | null) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) {
        console.error("Failed to update date:", res.status);
        return;
      }
      onProjectUpdate();
    } catch (error) {
      console.error("Failed to update date:", error);
    }
  };

  // 工事進捗更新
  const handleProgressUpdate = async (category: string, status: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/construction-progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, status }),
      });
      if (!res.ok) {
        console.error("Failed to update construction progress:", res.status);
        return;
      }
      fetchConstructionData();
    } catch (error) {
      console.error("Failed to update construction progress:", error);
    }
  };

  // 写真アップロード
  const handlePhotoUpload = async (file: File) => {
    if (!photoUploadCategory) {
      alert("写真カテゴリを選択してください");
      return;
    }
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", photoUploadCategory);
      if (photoContractorName) formData.append("contractorName", photoContractorName);
      if (photoNote) formData.append("note", photoNote);

      const res = await fetch(`/api/projects/${projectId}/construction-photos`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setPhotoUploadCategory("");
        setPhotoContractorName("");
        setPhotoNote("");
        fetchConstructionData();
      }
    } catch (error) {
      console.error("Failed to upload photo:", error);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // 写真削除ダイアログを開く
  const openDeleteDialog = (photoId: number) => {
    setDeletingPhotoId(photoId);
    setDeleteDialogOpen(true);
  };

  // 写真削除
  const handlePhotoDelete = async () => {
    if (!deletingPhotoId) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/construction-photos/${deletingPhotoId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        console.error("Failed to delete photo:", res.status);
        return;
      }
      setDeleteDialogOpen(false);
      setDeletingPhotoId(null);
      fetchConstructionData();
    } catch (error) {
      console.error("Failed to delete photo:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* 工事日程 */}
      <Card>
        <CardContent className="pt-6 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <HardHat className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">工事日程</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <DatePickerField
                label="着工可能日"
                value={project.constructionAvailableDate}
                onChange={(value) => handleDateUpdate("constructionAvailableDate", value)}
              />
              <DatePickerField
                label="納品日"
                value={project.deliveryDate}
                onChange={(value) => handleDateUpdate("deliveryDate", value)}
              />
              <DatePickerField
                label="着工予定日"
                value={project.constructionStartScheduled}
                onChange={(value) => handleDateUpdate("constructionStartScheduled", value)}
              />
              <DatePickerField
                label="着工日"
                value={project.constructionStartDate}
                onChange={(value) => handleDateUpdate("constructionStartDate", value)}
              />
              <DatePickerField
                label="完工予定日"
                value={project.constructionEndScheduled}
                onChange={(value) => handleDateUpdate("constructionEndScheduled", value)}
              />
              <DatePickerField
                label="完工日"
                value={project.constructionEndDate}
                onChange={(value) => handleDateUpdate("constructionEndDate", value)}
              />
            </div>
          </div>

          {/* 工事進捗 */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ListTodo className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">工事進捗</h3>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                {CONSTRUCTION_PROGRESS_CATEGORIES.map((category) => {
                  const progress = constructionProgressList.find(p => p.category === category);
                  const currentStatus = progress?.status || "pending";
                  return (
                    <div key={category} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                      <div className="flex-1">
                        <span className="font-medium">{category}</span>
                        {progress?.note && (
                          <p className="text-xs text-muted-foreground mt-1">{progress.note}</p>
                        )}
                      </div>
                      <Select
                        value={currentStatus}
                        onValueChange={(value) => handleProgressUpdate(category, value)}
                      >
                        <SelectTrigger className={cn(
                          "w-32",
                          currentStatus === "completed" && "bg-green-100 dark:bg-green-900/30 border-green-300",
                          currentStatus === "in_progress" && "bg-amber-100 dark:bg-amber-900/30 border-amber-300"
                        )}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">未着手</SelectItem>
                          <SelectItem value="in_progress">進行中</SelectItem>
                          <SelectItem value="completed">完了</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 工事写真 */}
      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Camera className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">工事写真</h3>
          </div>

          {/* 写真アップロード */}
          <div className="p-4 border-2 border-dashed rounded-lg space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>写真カテゴリ *</Label>
                <Select value={photoUploadCategory} onValueChange={setPhotoUploadCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="カテゴリを選択..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CONSTRUCTION_PHOTO_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>撮影業者名</Label>
                <Input
                  value={photoContractorName}
                  onChange={(e) => setPhotoContractorName(e.target.value)}
                  placeholder="業者名を入力..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>メモ</Label>
              <Input
                value={photoNote}
                onChange={(e) => setPhotoNote(e.target.value)}
                placeholder="写真に関するメモ..."
              />
            </div>
            <div className="flex items-center gap-4">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePhotoUpload(file);
                }}
              />
              <Button
                variant="outline"
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto || !photoUploadCategory}
              >
                {uploadingPhoto ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                写真をアップロード
              </Button>
              {!photoUploadCategory && (
                <span className="text-xs text-muted-foreground">カテゴリを選択してください</span>
              )}
            </div>
          </div>

          {/* 写真一覧（カテゴリ別） */}
          {CONSTRUCTION_PHOTO_CATEGORIES.map((category) => {
            const categoryPhotos = constructionPhotos.filter(p => p.category === category);
            if (categoryPhotos.length === 0) return null;
            return (
              <div key={category} className="space-y-3">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  {category}
                  <span className="text-muted-foreground">({categoryPhotos.length})</span>
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {categoryPhotos.map((photo) => (
                    <div key={photo.id} className="relative group">
                      <a href={photo.fileUrl} target="_blank" rel="noopener noreferrer">
                        <img
                          src={photo.fileUrl}
                          alt={photo.fileName}
                          className="w-full h-32 object-cover rounded-lg border"
                        />
                      </a>
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => openDeleteDialog(photo.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="mt-1 text-xs space-y-0.5">
                        {photo.contractorName && (
                          <p className="text-muted-foreground">業者: {photo.contractorName}</p>
                        )}
                        <p className="text-muted-foreground truncate">{photo.fileName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {constructionPhotos.length === 0 && !isLoading && (
            <p className="text-sm text-muted-foreground text-center py-8">
              工事写真はまだアップロードされていません
            </p>
          )}
        </CardContent>
      </Card>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        {deleteDialogOpen && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>写真を削除</AlertDialogTitle>
              <AlertDialogDescription>
                この写真を削除しますか？この操作は取り消せません。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction onClick={handlePhotoDelete}>削除</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </div>
  );
}

// memoでラップして不要な再レンダリングを防止
export const ConstructionTab = memo(ConstructionTabContent);
