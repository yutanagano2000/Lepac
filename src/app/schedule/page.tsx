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
import { calculateWorkflowTimeline, formatDateJp, type WorkflowTimelinePhase, WORKFLOW_PHASES } from "@/lib/timeline";
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
                <h2 className="font-semibold">{client} のスケジュール</h2>
              </div>
              <Accordion type="multiple" className="w-full">
                {timeline.map((item, index) => {
                  // 日付がない工程（工事着工～完了）は常に「予定」として扱う
                  const now = new Date();
                  const isPast = item.date ? item.date < now : false;
                  const hasDate = item.date !== undefined;

                  // 対応するワークフロー定義を取得
                  const workflowPhase = WORKFLOW_PHASES.find(phase => phase.key === item.key);

                  return (
                    <AccordionItem key={item.key} value={item.key} className="border-b">
                      <AccordionTrigger className="hover:no-underline px-4 py-3">
                        <div className="flex items-center gap-3">
                          {/* ノード */}
                          <div
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                              !hasDate
                                ? "border-gray-400 bg-background"  // 日付なしは灰色
                                : isPast
                                ? "border-green-500 bg-green-500"  // 過去の日付は完了扱い
                                : "border-muted-foreground bg-background"  // 未来の日付は予定
                            }`}
                          >
                            {!hasDate ? (
                              <Circle className="h-3 w-3 text-gray-400" />
                            ) : isPast ? (
                              <Check className="h-3 w-3 text-white" />
                            ) : (
                              <Circle className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                          {/* タイトルとフェーズ */}
                          <div className="flex items-center gap-2 text-left flex-1">
                            <p className={`font-medium ${!hasDate || !isPast ? "text-muted-foreground" : ""}`}>
                              {item.title}
                            </p>
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                              {item.phase}
                            </span>
                          </div>
                        </div>
                      </AccordionTrigger>

                      {/* 予定日をアコーディオンの外に表示 */}
                      {item.date && (
                        <div className="px-4 pb-2">
                          <div className="ml-9 flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm font-medium">
                              {formatDateJp(item.date)}
                            </p>
                          </div>
                        </div>
                      )}

                      <AccordionContent className="px-4 pb-4">
                        <div className="ml-9 space-y-3">
                          {/* 工数情報 */}
                          {workflowPhase && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">所要期間:</span>
                                <span className="text-sm font-medium">
                                  {workflowPhase.duration === 0 ? "当日" : `${workflowPhase.duration}${workflowPhase.unit === "business_days" ? "営業日" : "暦日"}`}
                                </span>
                              </div>
                              {workflowPhase.unit === "business_days" && (
                                <p className="text-xs text-muted-foreground ml-6">
                                  ※土日・祝日を除く営業日で計算
                                </p>
                              )}
                            </div>
                          )}

                          {/* 工程の説明 */}
                          <div className="space-y-1">
                            <h4 className="text-sm font-medium">工程詳細</h4>
                            <div className="text-sm text-muted-foreground space-y-1">
                              {item.key === "initial_acquisition" && (
                                <p>現地調査の実施と初期データの収集を行います。</p>
                              )}
                              {item.key === "initial_survey" && (
                                <p>法令チェック等の初期調査・設計業務を行います。</p>
                              )}
                              {item.key === "site_confirmation" && (
                                <p>造成の要否判断を含む現地詳細確認を行います。</p>
                              )}
                              {item.key === "application_contract" && (
                                <p>図面修正・土地契約を含む申請・契約業務を行います。</p>
                              )}
                              {item.key === "waiting_period" && (
                                <p>行政・電力申請の審査待ち期間です。</p>
                              )}
                              {item.key === "final_design" && (
                                <p>再シミュレーションを含む本設計業務を行います。</p>
                              )}
                              {item.key === "final_decision" && (
                                <p>最終的な判断と決済手続きを行います。</p>
                              )}
                              {item.key === "construction" && (
                                <p>工事着工から完了までの期間です。</p>
                              )}
                            </div>
                          </div>

                          {!item.date && (
                            <div className="flex items-center gap-2 text-orange-600">
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
