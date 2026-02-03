"use client";

import { useState } from "react";
import { Calendar as CalendarIcon, Clock, Check, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { calculateWorkflowTimeline, formatDateJp, type WorkflowTimelinePhase, WORKFLOW_PHASES, type ResponsibleType } from "@/lib/timeline";
import { cn } from "@/lib/utils";

function formatStartDate(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// 担当者バッジの色定義
const responsibleColors: Record<ResponsibleType, string> = {
  '事務': 'bg-blue-600',
  '工務': 'bg-green-600',
  '設計': 'bg-purple-600',
  '営業': 'bg-orange-600',
};

// 担当者バッジコンポーネント
function ResponsibleBadges({ responsibles }: { responsibles?: ReadonlyArray<ResponsibleType> }) {
  if (!responsibles || responsibles.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {responsibles.map((responsible, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <span className={cn(
            "px-2 py-0.5 rounded text-xs font-medium text-white",
            responsibleColors[responsible]
          )}>
            {responsible}
          </span>
          {index < responsibles.length - 1 && (
            <span className="text-muted-foreground text-xs">→</span>
          )}
        </div>
      ))}
    </div>
  );
}


export default function SchedulePage() {
  const [client, setClient] = useState("");
  const [completionDate, setCompletionDate] = useState<Date | undefined>(undefined);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [dateText, setDateText] = useState("");
  const [timeline, setTimeline] = useState<WorkflowTimelinePhase[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completionDate) return;

    const calculatedTimeline = calculateWorkflowTimeline(completionDate);
    setTimeline(calculatedTimeline);
  };

  // サブフェーズがあるフェーズのみ抽出
  const phasesWithSubPhases = timeline.filter(item => item.subPhases && item.subPhases.length > 0);

  const hasTimeline = timeline.length > 0;

  return (
    <div className={cn(
      "min-h-screen flex flex-col items-center bg-background px-4 py-8",
      !hasTimeline && "justify-center"
    )}>
      {/* タイトル */}
      <div className="mb-8">
        <h1 className="text-4xl font-normal tracking-tight text-foreground">
          スケジュール
        </h1>
      </div>

      {/* 入力フォーム */}
      <div className={cn(
        "w-full space-y-6",
        hasTimeline ? "max-w-6xl" : "max-w-2xl"
      )}>
        <div className={cn(
          "bg-card rounded-[2rem] border border-border shadow-lg p-8 space-y-6",
          hasTimeline && "max-w-2xl mx-auto"
        )}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 販売先 */}
            <div className="space-y-2">
              <Label htmlFor="client" className="text-sm font-medium text-foreground">
                販売先
              </Label>
              <Select value={client} onValueChange={setClient} required>
                <SelectTrigger id="client" className="w-full">
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="双日">双日</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 開始日 */}
            <div className="space-y-2">
              <Label htmlFor="start-date" className="text-sm font-medium text-foreground">
                開始日
              </Label>
              <div className="flex gap-2">
                <Input
                  id="start-date"
                  value={dateText}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDateText(value);
                    const match = value.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
                    if (match) {
                      const [, y, m, d] = match;
                      const year = Number(y);
                      const month = Number(m);
                      const day = Number(d);
                      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                        const parsed = new Date(year, month - 1, day);
                        if (!isNaN(parsed.getTime())) {
                          setCompletionDate(parsed);
                        }
                      }
                    } else if (value === "") {
                      setCompletionDate(undefined);
                    }
                  }}
                  placeholder="例: 2026-03-15"
                  className="flex-1"
                  required
                />
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" size="icon" className="shrink-0">
                      <CalendarIcon className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={completionDate}
                      onSelect={(d) => {
                        if (d) {
                          setCompletionDate(d);
                          setDateText(formatStartDate(d));
                        }
                        setIsCalendarOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <p className="text-xs text-muted-foreground">
                年月日をハイフン、スラッシュ、またはドット区切りで入力してください
              </p>
            </div>

            {/* 生成ボタン */}
            <div className="pt-2">
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={!client || !completionDate}
              >
                スケジュールを生成
              </Button>
            </div>
          </form>
        </div>

        {/* 横型タイムライン表示 */}
        {timeline.length > 0 && (
          <div className="bg-card rounded-[2rem] border border-border shadow-lg p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">{client}様のスケジュール</h2>
            </div>

            {/* 横型タイムライン（スクロールなし・大きなサークル） */}
            <div className="w-full py-6">
              {/* ノード行 */}
              <div className="flex items-center">
                {timeline.map((item, index) => {
                  const now = new Date();
                  const isPast = item.date ? item.date < now : false;
                  const hasDate = item.date !== undefined || (item.startDate !== undefined && item.endDate !== undefined);

                  return (
                    <div key={item.key} className="flex items-center flex-1">
                      {/* ノード */}
                      <div className="flex flex-col items-center flex-1">
                        <div
                          className={cn(
                            "flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-3 shadow-md transition-all",
                            item.key === "waiting_period"
                              ? "border-secondary bg-secondary"
                              : !hasDate
                              ? "border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800"
                              : isPast
                              ? "border-green-500 bg-green-500"
                              : "border-primary/50 bg-primary/10"
                          )}
                        >
                          {item.key === "waiting_period" ? (
                            <Clock className="h-6 w-6 text-white" />
                          ) : !hasDate ? (
                            <span className="text-lg font-bold text-gray-400">{index + 1}</span>
                          ) : isPast ? (
                            <Check className="h-6 w-6 text-white" />
                          ) : (
                            <span className="text-lg font-bold text-primary">{index + 1}</span>
                          )}
                        </div>
                      </div>

                      {/* 接続線 */}
                      {index < timeline.length - 1 && (
                        <div
                          className={cn(
                            "h-1 w-4 -mx-2 z-10",
                            isPast
                              ? "bg-green-500"
                              : "bg-muted-foreground/30"
                          )}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* タイトル・日付行 */}
              <div className="flex items-stretch mt-4">
                {timeline.map((item) => {
                  const now = new Date();
                  const isPast = item.date ? item.date < now : false;
                  const hasDate = item.date !== undefined || (item.startDate !== undefined && item.endDate !== undefined);
                  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

                  return (
                    <div key={`label-${item.key}`} className="flex-1 flex flex-col items-center px-1">
                      {/* タイトル（高さ固定） */}
                      <div className="h-8 flex items-center justify-center mb-2">
                        <p className={cn(
                          "text-xs font-semibold leading-tight text-center line-clamp-2",
                          !hasDate || !isPast ? "text-muted-foreground" : "text-foreground"
                        )}>
                          {item.title}
                        </p>
                      </div>

                      {/* 日付カード */}
                      {item.startDate ? (
                        <div className={cn(
                          "flex flex-col items-center rounded-lg border overflow-hidden min-w-[52px] shadow-sm",
                          isPast
                            ? "border-green-500 bg-green-50 dark:bg-green-950"
                            : "border-primary/30 bg-card"
                        )}>
                          {/* 月ヘッダー */}
                          <div className={cn(
                            "w-full text-center py-0.5 text-[10px] font-bold text-white",
                            isPast ? "bg-green-500" : "bg-primary"
                          )}>
                            {item.startDate.getMonth() + 1}月
                          </div>
                          {/* 日 */}
                          <div className="py-1 px-2 text-center">
                            <span className={cn(
                              "text-xl font-bold",
                              isPast ? "text-green-600 dark:text-green-400" : "text-foreground"
                            )}>
                              {item.startDate.getDate()}
                            </span>
                            <span className={cn(
                              "text-[10px] ml-0.5",
                              item.startDate.getDay() === 0 ? "text-red-500" :
                              item.startDate.getDay() === 6 ? "text-blue-500" :
                              "text-muted-foreground"
                            )}>
                              ({weekdays[item.startDate.getDay()]})
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/50 min-w-[52px]">
                          {/* 未定ヘッダー */}
                          <div className="w-full text-center py-0.5 text-[10px] font-bold text-muted-foreground bg-muted">
                            --月
                          </div>
                          {/* 未定本体 */}
                          <div className="py-1 px-2 text-center">
                            <span className="text-lg font-bold text-muted-foreground">--</span>
                            <span className="text-[10px] ml-0.5 text-muted-foreground/70">(-)</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 各フェーズの詳細タスク（アコーディオン形式・展開状態） */}
            {phasesWithSubPhases.length > 0 && (
              <Accordion
                type="multiple"
                className="w-full space-y-3"
                defaultValue={phasesWithSubPhases.map((item) => item.key)}
              >
                  {phasesWithSubPhases.map((item) => {
                    const now = new Date();
                    const isPast = item.date ? item.date < now : false;
                    const hasDate = item.date !== undefined || (item.startDate !== undefined && item.endDate !== undefined);
                    const workflowPhase = WORKFLOW_PHASES.find(phase => phase.key === item.key);
                    const originalIndex = timeline.findIndex(t => t.key === item.key);

                    return (
                      <AccordionItem
                        key={item.key}
                        value={item.key}
                        className={cn(
                          "border rounded-lg overflow-hidden",
                          item.key === "waiting_period" && "bg-secondary/10"
                        )}
                      >
                        <AccordionTrigger className="hover:no-underline px-5 py-4 hover:bg-muted/50">
                          <div className="flex items-center gap-4 w-full">
                            {/* 順番号 */}
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground text-sm font-semibold shrink-0">
                              {originalIndex + 1}
                            </div>

                            {/* ステータスノード */}
                            <div
                              className={cn(
                                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2",
                                item.key === "waiting_period"
                                  ? "border-secondary bg-secondary"
                                  : !hasDate
                                  ? "border-gray-400 bg-background"
                                  : isPast
                                  ? "border-green-500 bg-green-500"
                                  : "border-muted-foreground bg-background"
                              )}
                            >
                              {item.key === "waiting_period" ? (
                                <Clock className="h-5 w-5 text-white" />
                              ) : !hasDate ? (
                                <Circle className="h-5 w-5 text-gray-400" />
                              ) : isPast ? (
                                <Check className="h-5 w-5 text-white" />
                              ) : (
                                <Circle className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>

                            {/* タイトルと期間 */}
                            <div className="flex-1 text-left min-w-0">
                              <div className="flex items-center gap-3 flex-wrap">
                                <p className={cn(
                                  "text-base font-semibold",
                                  !hasDate || !isPast ? "text-muted-foreground" : "text-foreground"
                                )}>
                                  {item.title}
                                </p>
                                <span className={cn(
                                  "text-xs px-2 py-1 rounded",
                                  item.key === "waiting_period"
                                    ? "bg-secondary text-secondary-foreground"
                                    : "bg-muted text-muted-foreground"
                                )}>
                                  {item.phase}
                                </span>
                              </div>
                              {item.startDate && item.endDate && (
                                <p className="text-sm text-primary mt-1">
                                  {formatDateJp(item.startDate)}
                                  {item.key !== "initial_acquisition" && item.key !== "submission_decision" && (
                                    <span className="text-muted-foreground"> ～ {formatDateJp(item.endDate)}</span>
                                  )}
                                  {workflowPhase && workflowPhase.duration !== undefined && workflowPhase.duration > 0 && (
                                    <span className="text-muted-foreground ml-2">({workflowPhase.duration}営業日)</span>
                                  )}
                                </p>
                              )}
                            </div>

                            {/* サブタスク数 */}
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded shrink-0">
                              {item.subPhases!.length}件のタスク
                            </span>
                          </div>
                        </AccordionTrigger>

                        <AccordionContent className="px-5 pb-5">
                          <div className="ml-[72px] space-y-3 border-l-2 border-muted pl-6">
                            {item.subPhases!.map((subPhase, subIndex) => (
                              <div
                                key={subPhase.key}
                                className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                              >
                                {/* サブタスク番号 */}
                                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0 mt-0.5">
                                  {subIndex + 1}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-3 flex-wrap">
                                      <span className="text-sm font-medium">{subPhase.title}</span>
                                      <ResponsibleBadges responsibles={subPhase.responsibles} />
                                    </div>
                                    {subPhase.note && (
                                      <p className="text-sm text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950 px-3 py-1.5 rounded-lg">
                                        {subPhase.note}
                                      </p>
                                    )}
                                    {subPhase.date && (
                                      <p className="text-sm">
                                        <span className="text-primary font-medium">予定: {formatDateJp(subPhase.date)}</span>
                                        {subPhase.duration !== undefined && subPhase.duration > 0 && (
                                          <span className="text-muted-foreground ml-2">
                                            ({subPhase.duration}営業日)
                                          </span>
                                        )}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
          </div>
        )}

        {/* 説明テキスト（タイムライン未表示時のみ） */}
        {!hasTimeline && (
          <p className="text-center text-sm text-muted-foreground">
            販売先と開始日を入力して「スケジュールを生成」ボタンを押してください
          </p>
        )}
      </div>
    </div>
  );
}
