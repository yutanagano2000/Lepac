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

function formatYyyyMd(date: Date | undefined) {
  if (!date) return "";
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}.${m}.${d}`;
}

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
    <div className="flex items-center gap-1 shrink-0">
      {responsibles.map((responsible, index) => (
        <div key={index} className="flex items-center gap-1">
          <span className={cn(
            "px-2 py-0.5 rounded-md text-xs font-medium text-white",
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

  return (
    <div className="min-h-screen bg-background px-6">
      <div className="mx-auto max-w-3xl py-10">
        <div className="space-y-6">
          {/* ヘッダー */}
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">スケジュール</h1>
            <p className="text-sm text-muted-foreground">
              販売先と開始日を入力して、スケジュールを生成します
            </p>
          </div>

          {/* フォーム */}
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="client">販売先</Label>
                    <div className="flex gap-2">
                      <Select value={client} onValueChange={setClient} required>
                        <SelectTrigger id="client" className="flex-1">
                          <SelectValue placeholder="選択してください" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="双日">双日</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="w-10 shrink-0" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="start-date">開始日</Label>
                    <div className="flex gap-2">
                      <Input
                        id="start-date"
                        value={dateText}
                        onChange={(e) => {
                          const value = e.target.value;
                          setDateText(value);
                          // YYYY-MM-DD形式の入力を受け付ける
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
                          <Button type="button" variant="outline" size="icon">
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
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={!client || !completionDate}>
                    スケジュールを生成
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* スケジュール表示 */}
          {timeline.length > 0 && (
            <div className="relative">
              <div className="mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold">{client}様のスケジュール</h2>
              </div>
              <Accordion
                type="multiple"
                className="w-full"
                defaultValue={timeline.map((item) => item.key)}
              >
                {timeline.map((item, index) => {
                  // 日付がない工程（工事着工～完了）は常に「予定」として扱う
                  const now = new Date();
                  const isPast = item.date ? item.date < now : false;
                  const hasDate = item.date !== undefined || (item.startDate !== undefined && item.endDate !== undefined);

                  // 対応するワークフロー定義を取得
                  const workflowPhase = WORKFLOW_PHASES.find(phase => phase.key === item.key);

                  return (
                    <AccordionItem
                      key={item.key}
                      value={item.key}
                      className={`border-b ${
                        item.key === "waiting_period" ? "bg-muted/30" : ""
                      }`}
                    >
                      <AccordionTrigger className="hover:no-underline px-4 py-3">
                        <div className="flex items-center gap-3 w-full">
                          {/* ノード */}
                          <div
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                              item.key === "waiting_period"
                                ? "border-secondary bg-secondary"  // 待機期間はsecondaryカラー
                                : !hasDate
                                ? "border-gray-400 bg-background"  // 日付なしは灰色
                                : isPast
                                ? "border-green-500 bg-green-500"  // 過去の日付は完了扱い
                                : "border-muted-foreground bg-background"  // 未来の日付は予定
                            }`}
                          >
                            {item.key === "waiting_period" ? (
                              <Clock className="h-3 w-3 text-white" />
                            ) : !hasDate ? (
                              <Circle className="h-3 w-3 text-gray-400" />
                            ) : isPast ? (
                              <Check className="h-3 w-3 text-white" />
                            ) : (
                              <Circle className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                          {/* タイトルと期間 */}
                          <div className="flex items-center gap-3 text-left flex-1 min-w-0">
                            <p className={`font-medium truncate ${!hasDate || !isPast ? "text-muted-foreground" : ""}`}>
                              {item.title}
                            </p>
                            {item.startDate && item.endDate ? (
                              item.key === "initial_acquisition" || item.key === "submission_decision" ? (
                                // 案件スタートと提出先の判断は日付表示
                                <span className="text-sm font-bold text-primary shrink-0 px-2 py-1 bg-primary/10 rounded">
                                  日付: {formatDateJp(item.startDate)}
                                  {workflowPhase && workflowPhase.duration !== undefined && workflowPhase.duration > 0 && (
                                    <span className="ml-2 text-xs font-normal">
                                      {workflowPhase.duration}営業日
                                    </span>
                                  )}
                                </span>
                              ) : item.key === "waiting_period" ? (
                                // 待機期間は特別な表示
                                <span className="text-sm font-bold text-secondary-foreground shrink-0 px-2 py-1 bg-secondary rounded">
                                  待機期間: {formatDateJp(item.startDate)} ～ {formatDateJp(item.endDate)}
                                  {workflowPhase && workflowPhase.duration !== undefined && workflowPhase.duration > 0 && (
                                    <span className="ml-2 text-xs font-normal">
                                      {workflowPhase.duration}営業日
                                    </span>
                                  )}
                                </span>
                              ) : (
                                // その他のフェーズは期間表示
                                <span className="text-sm font-bold text-primary shrink-0 px-2 py-1 bg-primary/10 rounded">
                                  期間: {formatDateJp(item.startDate)} ～ {formatDateJp(item.endDate)}
                                  {workflowPhase && workflowPhase.duration !== undefined && workflowPhase.duration > 0 && (
                                    <span className="ml-2 text-xs font-normal">
                                      {workflowPhase.duration}営業日
                                    </span>
                                  )}
                                </span>
                              )
                            ) : null}
                          </div>
                          {/* フェーズ情報 */}
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded shrink-0">
                            {item.phase}
                          </span>
                        </div>
                      </AccordionTrigger>

                      <AccordionContent className="px-4 pb-4">
                        <div className="ml-9 space-y-2">
                          {/* サブ項目のタイムライン */}
                          {item.subPhases && item.subPhases.length > 0 && (
                            <div className="space-y-2">
                              {item.subPhases.map((subPhase, subIndex) => (
                                <div key={subPhase.key} className="flex items-center gap-3">
                                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-muted-foreground/50 bg-background">
                                    <div className="h-2 w-2 rounded-full bg-muted-foreground/50"></div>
                                  </div>
                                  {subPhase.type === 'branch' ? (
                                    <div className="flex-1 space-y-1">
                                      <p className="text-sm font-medium">{subPhase.title}</p>
                                      <div className="flex gap-4 mt-2">
                                        {subPhase.branches?.map((branch, branchIndex) => (
                                          <div key={branchIndex} className="flex items-center gap-2">
                                            <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                                            <span className="text-xs font-medium">{branch.name}</span>
                                            <span className="text-xs text-muted-foreground">({branch.condition})</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <span className="text-sm flex-1">{subPhase.title}</span>
                                        <ResponsibleBadges responsibles={subPhase.responsibles} />
                                      </div>
                                      {subPhase.date && (
                                        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded shrink-0">
                                          予定: {formatDateJp(subPhase.date)}
                                          {subPhase.duration !== undefined && subPhase.duration > 0 && (
                                            <span className="ml-2">
                                              {subPhase.duration}営業日
                                            </span>
                                          )}
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {!hasDate && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Circle className="h-4 w-4" />
                              <p className="text-sm">予定日は未定です</p>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
