"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { safeWindowOpen } from "@/lib/sanitize";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExternalLink, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";
import type { LawSearchCardProps, LegalStatus, ConfirmationMethod } from "../_types";

const LawSearchCard: React.FC<LawSearchCardProps> = ({
  lawName,
  onSearch,
  lawId,
  fixedText,
  copiedText,
  onCopy,
  prefecture,
  additionalButtons = [],
  badges = [],
  caption,
  note,
  farmlandAlert,
  currentStatus,
  currentNote,
  currentConfirmationSource,
  currentContactInfo,
  currentConfirmationMethod,
  currentConfirmationDate,
  currentConfirmedBy,
  currentDepartment,
  updatedBy,
  updatedAt,
  onStatusChange,
  onStatusRemove,
  onNoteChange,
  onFieldChange,
  hideNotApplicableButton,
}) => {
  const [localNote, setLocalNote] = useState(currentNote || "");
  const [localConfirmationSource, setLocalConfirmationSource] = useState(currentConfirmationSource || "");
  const [localContactInfo, setLocalContactInfo] = useState(currentContactInfo || "");
  const [localConfirmationMethod, setLocalConfirmationMethod] = useState<ConfirmationMethod>(currentConfirmationMethod || "");
  const [localConfirmationDate, setLocalConfirmationDate] = useState(currentConfirmationDate || "");
  const [localConfirmedBy, setLocalConfirmedBy] = useState(currentConfirmedBy || "");
  const [localDepartment, setLocalDepartment] = useState(currentDepartment || "");

  // 外部stateが変わったら同期（単一useEffectに統合）
  useEffect(() => {
    setLocalNote(currentNote || "");
    setLocalConfirmationSource(currentConfirmationSource || "");
    setLocalContactInfo(currentContactInfo || "");
    setLocalConfirmationMethod(currentConfirmationMethod || "");
    setLocalConfirmationDate(currentConfirmationDate || "");
    setLocalConfirmedBy(currentConfirmedBy || "");
    setLocalDepartment(currentDepartment || "");
  }, [currentNote, currentConfirmationSource, currentContactInfo, currentConfirmationMethod, currentConfirmationDate, currentConfirmedBy, currentDepartment]);

  // メモの保存（debounce的に入力完了後に呼び出し）
  const handleNoteBlur = () => {
    if (onNoteChange && localNote !== currentNote) {
      onNoteChange(localNote);
    }
  };

  // フィールドのblur保存
  const handleFieldBlur = (field: string, localValue: string, currentValue?: string) => {
    if (onFieldChange && localValue !== (currentValue || "")) {
      onFieldChange(field, localValue);
    }
  };

  // URLかどうか判定
  const isUrl = (str: string) => {
    try {
      const url = new URL(str);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  };

  // 編集日時のフォーマット
  const formatUpdatedAt = (dateStr: string) => {
    const date = new Date(dateStr);
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const h = date.getHours();
    const min = String(date.getMinutes()).padStart(2, "0");
    return `${m}/${d} ${h}:${min}`;
  };

  return (
    <div
      id={`law-section-${lawId}`}
      className={cn(
        "bg-card rounded-4xl border shadow-lg p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 scroll-mt-20",
        currentStatus === "該当" && "border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/20",
        currentStatus === "要確認" && "border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20",
        currentStatus === "非該当" && "border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-950/20",
        !currentStatus && "border-border"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground">{lawName}</p>
            {currentStatus && (
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                currentStatus === "該当" && "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
                currentStatus === "要確認" && "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
                currentStatus === "非該当" && "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200"
              )}>
                {currentStatus}
              </span>
            )}
          </div>
          {farmlandAlert && (
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-2 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
              地目に農地が含まれています
            </p>
          )}
          {caption && (
            <p className="text-sm text-muted-foreground mt-2">{caption}</p>
          )}
          {/* クイック入力ボタン */}
          {onNoteChange && (!hideNotApplicableButton || fixedText) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {!hideNotApplicableButton && (
                <button
                  onClick={() => {
                    onNoteChange("対象地区ではありません。");
                    if (onStatusChange) onStatusChange("非該当");
                  }}
                  className="px-3 py-1.5 text-xs rounded-lg border border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/30 transition-colors"
                >
                  対象地区ではありません
                </button>
              )}
              {fixedText && (
                <button
                  onClick={() => {
                    onNoteChange(fixedText);
                    if (onStatusChange) onStatusChange("非該当");
                  }}
                  className="px-3 py-1.5 text-xs rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-colors max-w-xs truncate"
                  title={fixedText}
                >
                  {fixedText.length > 30 ? fixedText.slice(0, 30) + "..." : fixedText}
                </button>
              )}
            </div>
          )}
          {note && (
            <p className="text-xs text-muted-foreground mt-2">{note}</p>
          )}
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {badges.map((badge, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                >
                  {badge}
                </span>
              ))}
            </div>
          )}
          {/* ステータス選択・メモ入力エリア */}
          {onStatusChange && (
            <div className="mt-4 pt-4 border-t border-border/50 space-y-4">
              {/* 判定ボタン */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground mr-1">判定:</span>
                <button
                  onClick={() => onStatusChange("該当")}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                    currentStatus === "該当"
                      ? "bg-red-500 text-white border-red-500"
                      : "bg-transparent text-red-600 border-red-300 hover:bg-red-100 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/30"
                  )}
                >
                  該当
                </button>
                <button
                  onClick={() => onStatusChange("要確認")}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                    currentStatus === "要確認"
                      ? "bg-amber-500 text-white border-amber-500"
                      : "bg-transparent text-amber-600 border-amber-300 hover:bg-amber-100 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-900/30"
                  )}
                >
                  要確認
                </button>
                <button
                  onClick={() => onStatusChange("非該当")}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                    currentStatus === "非該当"
                      ? "bg-green-500 text-white border-green-500"
                      : "bg-transparent text-green-600 border-green-300 hover:bg-green-100 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-900/30"
                  )}
                >
                  非該当
                </button>
                {currentStatus && onStatusRemove && (
                  <button
                    onClick={onStatusRemove}
                    className="ml-1 text-xs text-muted-foreground hover:text-foreground"
                    title="判定を解除"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* 確認情報入力欄 */}
              <div className="space-y-3 bg-muted/30 rounded-lg p-3 border border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">確認情報</span>
                  </div>
                  {updatedBy && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="px-1.5 py-0.5 rounded bg-muted">{updatedBy}</span>
                      {updatedAt && <span>{formatUpdatedAt(updatedAt)}</span>}
                    </div>
                  )}
                </div>

                {/* 確認日・担当部署・担当者 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">確認日</label>
                    <DatePicker
                      value={localConfirmationDate || null}
                      onChange={(v) => {
                        const val = v || "";
                        setLocalConfirmationDate(val);
                        if (onFieldChange) onFieldChange("confirmationDate", val);
                      }}
                      placeholder="日付を選択"
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">担当部署</label>
                    <Input
                      type="text"
                      placeholder="担当部署"
                      value={localDepartment}
                      onChange={(e) => setLocalDepartment(e.target.value)}
                      onBlur={() => handleFieldBlur("department", localDepartment, currentDepartment)}
                      className="text-sm h-8 bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">担当者</label>
                    <Input
                      type="text"
                      placeholder="担当者名"
                      value={localConfirmedBy}
                      onChange={(e) => setLocalConfirmedBy(e.target.value)}
                      onBlur={() => handleFieldBlur("confirmedBy", localConfirmedBy, currentConfirmedBy)}
                      className="text-sm h-8 bg-background"
                    />
                  </div>
                </div>

                {/* 確認先・連絡先・確認方法 */}
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">確認先（ページ・エビデンスURL）</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        placeholder="https://... 確認したページのURL"
                        value={localConfirmationSource}
                        onChange={(e) => setLocalConfirmationSource(e.target.value)}
                        onBlur={() => handleFieldBlur("confirmationSource", localConfirmationSource, currentConfirmationSource)}
                        className="text-sm h-8 bg-background flex-1"
                      />
                      {localConfirmationSource && isUrl(localConfirmationSource) && (
                        <a
                          href={localConfirmationSource}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 p-1.5 rounded-md border border-border hover:bg-accent transition-colors"
                          title="リンクを開く"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">連絡先（TEL等）</label>
                    <Input
                      type="text"
                      placeholder="例: 082-XXX-XXXX"
                      value={localContactInfo}
                      onChange={(e) => setLocalContactInfo(e.target.value)}
                      onBlur={() => handleFieldBlur("contactInfo", localContactInfo, currentContactInfo)}
                      className="text-sm h-8 bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">確認方法</label>
                    <Select
                      value={localConfirmationMethod || undefined}
                      onValueChange={(v) => {
                        const val = v as ConfirmationMethod;
                        setLocalConfirmationMethod(val);
                        if (onFieldChange) onFieldChange("confirmationMethod", val);
                      }}
                    >
                      <SelectTrigger size="sm" className="min-w-[110px] bg-background">
                        <SelectValue placeholder="未選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="電話">電話</SelectItem>
                        <SelectItem value="メール">メール</SelectItem>
                        <SelectItem value="WEB">WEB</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 確認内容（旧：検索結果） */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">確認内容</label>
                  <Textarea
                    placeholder="調査・確認結果を入力してください"
                    value={localNote}
                    onChange={(e) => setLocalNote(e.target.value)}
                    onBlur={handleNoteBlur}
                    className="text-sm min-h-[80px] resize-none bg-background"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <Button onClick={() => onSearch(lawName, lawId)} size="sm">
            Googleで検索
          </Button>
          {additionalButtons.map((button, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => safeWindowOpen(button.url)}
            >
              <ExternalLink className="h-3 w-3 mr-2" />
              {button.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LawSearchCard;
