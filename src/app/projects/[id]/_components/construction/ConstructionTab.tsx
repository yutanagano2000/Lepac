"use client";

import { useState, useRef } from "react";
import { CalendarIcon, HardHat, ListTodo, Camera, Upload, Trash2, Loader2, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CONSTRUCTION_PROGRESS_CATEGORIES, CONSTRUCTION_PHOTO_CATEGORIES } from "@/db/schema";
import type { Project, ConstructionProgress, ConstructionPhoto } from "../../_types";

// ========================================
// 日付フォーマット
// ========================================

function formatYyyyMd(date: Date | undefined) {
  if (!date) return "";
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}.${m}.${d}`;
}

// ========================================
// Props
// ========================================

interface ConstructionTabProps {
  projectId: string;
  project: Project | null;
  constructionProgressList: ConstructionProgress[];
  constructionPhotos: ConstructionPhoto[];
  isLoading: boolean;
  onRefreshProject: () => void;
  onRefreshConstruction: () => void;
}

// ========================================
// ConstructionTab Component
// ========================================

export function ConstructionTab({
  projectId,
  project,
  constructionProgressList,
  constructionPhotos,
  isLoading,
  onRefreshProject,
  onRefreshConstruction,
}: ConstructionTabProps) {
  // 日付ピッカーの開閉状態
  const [datePickerStates, setDatePickerStates] = useState<Record<string, boolean>>({});

  // 写真アップロード状態
  const [photoUploadCategory, setPhotoUploadCategory] = useState("");
  const [photoContractorName, setPhotoContractorName] = useState("");
  const [photoNote, setPhotoNote] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const setDatePickerOpen = (field: string, open: boolean) => {
    setDatePickerStates(prev => ({ ...prev, [field]: open }));
  };

  // 日付更新
  const handleDateUpdate = async (field: string, date: Date | null) => {
    const value = date
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
      : null;
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    onRefreshProject();
    setDatePickerOpen(field, false);
  };

  // 工事進捗更新
  const handleProgressUpdate = async (category: string, status: string) => {
    await fetch(`/api/projects/${projectId}/construction-progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, status }),
    });
    onRefreshConstruction();
  };

  // 写真アップロード
  const handlePhotoUpload = async (file: File) => {
    if (!photoUploadCategory) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", photoUploadCategory);
      if (photoContractorName) formData.append("contractorName", photoContractorName);
      if (photoNote) formData.append("note", photoNote);

      await fetch(`/api/projects/${projectId}/construction-photos`, {
        method: "POST",
        body: formData,
      });
      onRefreshConstruction();
      setPhotoUploadCategory("");
      setPhotoContractorName("");
      setPhotoNote("");
    } catch (error) {
      console.error("Failed to upload photo:", error);
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  // 写真削除
  const handlePhotoDelete = async (photoId: number) => {
    if (!confirm("この写真を削除しますか？")) return;
    try {
      await fetch(`/api/projects/${projectId}/construction-photos/${photoId}`, {
        method: "DELETE",
      });
      onRefreshConstruction();
    } catch (error) {
      console.error("Failed to delete photo:", error);
    }
  };

  const dateFields = [
    { label: "着工可能日", field: "constructionAvailableDate", value: project?.constructionAvailableDate },
    { label: "納品日", field: "deliveryDate", value: project?.deliveryDate },
    { label: "着工予定日", field: "constructionStartScheduled", value: project?.constructionStartScheduled },
    { label: "着工日", field: "constructionStartDate", value: project?.constructionStartDate },
    { label: "完工予定日", field: "constructionEndScheduled", value: project?.constructionEndScheduled },
    { label: "完工日", field: "constructionEndDate", value: project?.constructionEndDate },
  ];

  return (
    <>
      <Card>
        <CardContent className="pt-6 space-y-6">
          {/* 工事日程 */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <HardHat className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">工事日程</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {dateFields.map(({ label, field, value }) => (
                <div key={field} className="space-y-2">
                  <Label>{label}</Label>
                  <Popover
                    open={datePickerStates[field] || false}
                    onOpenChange={(open) => setDatePickerOpen(field, open)}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !value && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {value ? formatYyyyMd(new Date(value + "T00:00:00")) : "選択してください"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={value ? new Date(value + "T00:00:00") : undefined}
                        onSelect={(d) => handleDateUpdate(field, d || null)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              ))}
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
                  const progress = constructionProgressList.find((p) => p.category === category);
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
                        <SelectTrigger
                          className={cn(
                            "w-32",
                            currentStatus === "completed" && "bg-green-100 dark:bg-green-900/30 border-green-300",
                            currentStatus === "in_progress" && "bg-amber-100 dark:bg-amber-900/30 border-amber-300"
                          )}
                        >
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
            const categoryPhotos = constructionPhotos.filter((p) => p.category === category);
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
                          onClick={() => handlePhotoDelete(photo.id)}
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

          {constructionPhotos.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              工事写真はまだアップロードされていません
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
