
"use client";

import * as React from "react";
import { Check, Copy, Calendar as CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const DOC_TYPES = [
  "土地売買契約書",
  "身分証明書",
  "印鑑登録証明書",
  "固定資産評価証明書",
] as const;

function sanitizeForFilename(s: string) {
  return s
    .trim()
    .replace(/\s+/g, "") // 空白除去
    .replace(/[\\\/:*?"<>|]/g, "_"); // Windows禁止文字対策
}

function formatYyyyMd(date: Date | undefined) {
  if (!date) return "";
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}.${m}.${d}`;
}

export default function FilenamePage() {
  const [docType, setDocType] = React.useState<string>("");
  const [name, setName] = React.useState<string>("");
  const [date, setDate] = React.useState<Date | undefined>(undefined);
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const filename = React.useMemo(() => {
    const d = formatYyyyMd(date);
    const nRaw = sanitizeForFilename(name);
    const t = sanitizeForFilename(docType);
    if (!d || !nRaw || !t) return "";
    const n = nRaw.endsWith("様") ? nRaw : `${nRaw}様`;
    const prefix = t === "土地売買契約書" ? "P_" : "";
    return `【${t}】${prefix}${n}_${d}`;
  }, [docType, name, date]);

  const onCopy = async () => {
    if (!filename) return;
    await navigator.clipboard.writeText(filename);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="min-h-screen bg-background px-6">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center py-10">
        <div className="w-full space-y-4">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">ファイル名生成</h1>
            <p className="text-sm text-muted-foreground">
              書類・氏名・日付を入力するとファイル名を生成します
            </p>
          </div>

          {/* 条件入力（3カード横並び） */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* ① 書類プルダウン */}
            <Card>
              <CardHeader>
                <CardTitle>書類</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="書類を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* ② 氏名入力欄 */}
            <Card>
              <CardHeader>
                <CardTitle>氏名</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例: 山田太郎"
                />
              </CardContent>
            </Card>

            {/* ③ データピッカー（日付） */}
            <Card>
              <CardHeader>
                <CardTitle>日付</CardTitle>
              </CardHeader>
              <CardContent>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start gap-2 font-normal"
                    >
                      <CalendarIcon className="h-4 w-4" />
                      {date ? (
                        <span className="font-mono">{formatYyyyMd(date)}</span>
                      ) : (
                        <span className="text-muted-foreground">日付を選択</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      required
                      selected={date}
                      onSelect={(d) => {
                        // 選択したら必ず閉じる（requiredなので通常undefinedにはならない）
                        if (d) setDate(d);
                        setIsCalendarOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </CardContent>
            </Card>
          </div>

          {/* 生成結果（カード無し / ファイル名＋コピーアイコンのみ） */}
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
            <p className="min-w-0 flex-1 truncate font-mono text-sm text-card-foreground">
              {filename || "条件を入力するとここに生成されます"}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onCopy}
              disabled={!filename}
              aria-label="ファイル名をコピー"
              title="コピー"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            形式: <span className="font-mono">【書類】氏名様_YYYY.M.D</span>
          </p>
        </div>
      </div>
    </div>
  );
}
