"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface MeetingMinutesSectionProps {
  meetingId: number;
  initialContent: string | null;
}

export function MeetingMinutesSection({ meetingId, initialContent }: MeetingMinutesSectionProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(initialContent ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content || null }),
      });
      if (!res.ok) throw new Error("保存に失敗しました");
      setIsEditing(false);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setContent(initialContent ?? "");
    setIsEditing(false);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-sm font-medium text-muted-foreground">議事録</h2>
        {!isEditing && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setIsEditing(true)}
            aria-label="議事録を編集"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </div>
      {isEditing ? (
        <div className="space-y-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="議事録の内容を入力してください"
            className="min-h-[200px] resize-y"
            disabled={saving}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "保存"}
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel} disabled={saving}>
              キャンセル
            </Button>
          </div>
        </div>
      ) : (
        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap break-words">
          {content || "（内容なし）"}
        </div>
      )}
    </div>
  );
}
