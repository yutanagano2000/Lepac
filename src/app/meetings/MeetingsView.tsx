"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Calendar as CalendarIcon, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Meeting } from "@/db/schema";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { cn } from "@/lib/utils";

const CATEGORY_OPTIONS = ["社内", "社外"] as const;

interface MeetingsViewProps {
  initialMeetings: Meeting[];
}

export default function MeetingsView({ initialMeetings }: MeetingsViewProps) {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>(initialMeetings);
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [form, setForm] = useState<{
    title: string;
    meetingDate: string;
    category: string;
    content: string;
  }>({
    title: "",
    meetingDate: "",
    category: "社内",
    content: "",
  });
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");

  // 検索フィルタ（タイトル・内容・議題・種別）
  const filteredMeetings = meetings.filter((meeting) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const title = (meeting.title ?? "").toLowerCase();
    const content = (meeting.content ?? "").toLowerCase();
    const agenda = (meeting.agenda ?? "").toLowerCase();
    const category = (meeting.category ?? "").toLowerCase();
    return (
      title.includes(q) ||
      content.includes(q) ||
      agenda.includes(q) ||
      category.includes(q)
    );
  });

  const fetchMeetings = () => {
    fetch("/api/meetings", { cache: "no-store" })
      .then((res) => res.json())
      .then(setMeetings)
      .catch((err) => console.error("会議一覧の取得に失敗しました:", err));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      alert("タイトルを入力してください");
      return;
    }
    if (!form.meetingDate) {
      alert("日付を選択してください");
      return;
    }
    setIsSubmitting(true);
    try {
      await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          meetingDate: form.meetingDate,
          category: form.category,
          content: form.content.trim() || null,
        }),
      });
      setForm({ title: "", meetingDate: "", category: "社内", content: "" });
      setSelectedDate(undefined);
      setOpen(false);
      fetchMeetings();
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDisplayDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr + "T00:00:00");
    if (isNaN(d.getTime())) return dateStr;
    return format(d, "yyyy年M月d日", { locale: ja });
  };

  return (
    <div className="min-h-screen bg-background px-6">
      <div className="mx-auto max-w-5xl py-10">
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1 shrink-0">
              <h1 className="text-xl font-semibold">会議</h1>
              <p className="text-sm text-muted-foreground">
                議事録を保存・確認できます
              </p>
            </div>

            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="タイトル・内容・議題・種別で検索"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 h-12 text-base bg-muted/50 border-0 focus-visible:ring-2 rounded-xl"
              />
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" />
                  新規登録
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
                <DialogHeader>
                  <DialogTitle>議事録を新規登録</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="meeting-title">タイトル</Label>
                    <Input
                      id="meeting-title"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="例: 〇〇案件 定例ミーティング"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>日付</Label>
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !selectedDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate
                            ? format(selectedDate, "yyyy年M月d日", { locale: ja })
                            : "選択してください"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => {
                            setSelectedDate(date);
                            if (date) {
                              const y = date.getFullYear();
                              const m = String(date.getMonth() + 1).padStart(2, "0");
                              const d = String(date.getDate()).padStart(2, "0");
                              setForm({ ...form, meetingDate: `${y}-${m}-${d}` });
                              setCalendarOpen(false);
                            }
                          }}
                          locale={ja}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="meeting-category">カテゴリ</Label>
                    <Select
                      value={form.category}
                      onValueChange={(value) => setForm({ ...form, category: value })}
                    >
                      <SelectTrigger id="meeting-category" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="meeting-content">内容</Label>
                    <Textarea
                      id="meeting-content"
                      value={form.content}
                      onChange={(e) => setForm({ ...form, content: e.target.value })}
                      placeholder="議事録の長文テキストをペーストしてください"
                      className="min-h-[200px] resize-y font-mono text-sm"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setOpen(false)}
                      disabled={isSubmitting}
                    >
                      キャンセル
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          登録中...
                        </>
                      ) : (
                        "登録"
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>タイトル</TableHead>
                  <TableHead>日付</TableHead>
                  <TableHead>種別</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMeetings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      {searchQuery ? "検索結果がありません" : "議事録がありません"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMeetings.map((meeting) => (
                    <TableRow
                      key={meeting.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/meetings/${meeting.id}`)}
                    >
                      <TableCell className="font-medium">{meeting.title}</TableCell>
                      <TableCell>{formatDisplayDate(meeting.meetingDate)}</TableCell>
                      <TableCell>{meeting.category}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
