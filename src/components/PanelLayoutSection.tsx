"use client";

import { useState } from "react";
import { LayoutGrid, Pencil, Check, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// パネルレイアウトの選択肢
const PANEL_LAYOUT_OPTIONS = [
  "8直2列",
  "9直2列",
  "10直2列",
  "8直3列",
  "9直3列",
  "10直3列",
  "11直2列",
  "11直3列",
  "12直2列",
  "12直3列",
] as const;

interface PanelLayoutSectionProps {
  projectId: number;
  currentLayout: string | null;
  onUpdate: () => void;
  variant?: "card" | "inline";
}

export function PanelLayoutSection({ projectId, currentLayout, onUpdate, variant = "card" }: PanelLayoutSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedValue, setSelectedValue] = useState<string>(currentLayout || "");
  const [customValue, setCustomValue] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const startEdit = () => {
    const isPreset = PANEL_LAYOUT_OPTIONS.includes(currentLayout as typeof PANEL_LAYOUT_OPTIONS[number]);
    if (currentLayout && !isPreset) {
      setIsCustom(true);
      setSelectedValue("custom");
      setCustomValue(currentLayout);
    } else {
      setIsCustom(false);
      setSelectedValue(currentLayout || "");
      setCustomValue("");
    }
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setSelectedValue(currentLayout || "");
    setCustomValue("");
    setIsCustom(false);
  };

  const handleSelectChange = (value: string) => {
    setSelectedValue(value);
    if (value === "custom") {
      setIsCustom(true);
    } else {
      setIsCustom(false);
      setCustomValue("");
    }
  };

  const handleSave = async () => {
    const finalValue = isCustom ? customValue.trim() : selectedValue;
    if (!finalValue || finalValue === "custom") return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ panelLayout: finalValue }),
      });
      if (!res.ok) throw new Error("Failed to update panel layout");
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error("パネルレイアウトの更新に失敗:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const editContent = (
    <div className="space-y-3">
      <Select value={selectedValue} onValueChange={handleSelectChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="レイアウトを選択" />
        </SelectTrigger>
        <SelectContent>
          {PANEL_LAYOUT_OPTIONS.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
          <SelectItem value="custom">その他（自由入力）</SelectItem>
        </SelectContent>
      </Select>

      {isCustom && (
        <Input
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          placeholder="例: 13直4列"
          className="w-full"
        />
      )}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={isSaving}>
          <X className="h-4 w-4 mr-1" />
          キャンセル
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isSaving || (!selectedValue && !customValue.trim()) || (isCustom && !customValue.trim())}
        >
          <Check className="h-4 w-4 mr-1" />
          {isSaving ? "保存中..." : "保存"}
        </Button>
      </div>
    </div>
  );

  const displayContent = (
    <div className={cn(
      "rounded-lg border px-4 py-3",
      currentLayout
        ? "bg-primary/5 border-primary/20"
        : "bg-muted/50 border-dashed"
    )}>
      {currentLayout ? (
        <span className="text-base font-medium">{currentLayout}</span>
      ) : (
        <span className="text-sm text-muted-foreground">未設定 - 編集ボタンから設定してください</span>
      )}
    </div>
  );

  if (variant === "inline") {
    return (
      <div className="grid grid-cols-3 items-start border-b pb-3">
        <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
          <LayoutGrid className="h-4 w-4" />
          パネルレイアウト
        </span>
        <div className="col-span-2">
          {isEditing ? editContent : (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{currentLayout || "未設定"}</span>
              <Button variant="ghost" size="sm" className="h-6 px-2" onClick={startEdit}>
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-base sm:text-lg">パネルレイアウト</h2>
          </div>
          {!isEditing && (
            <Button variant="ghost" size="sm" onClick={startEdit}>
              <Pencil className="h-4 w-4 mr-1.5" />
              編集
            </Button>
          )}
        </div>
        {isEditing ? editContent : displayContent}
      </CardContent>
    </Card>
  );
}
