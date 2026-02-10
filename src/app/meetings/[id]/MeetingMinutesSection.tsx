"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Loader2, Eye, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MeetingMinutesSectionProps {
  meetingId: number;
  initialContent: string | null;
}

export function MeetingMinutesSection({ meetingId, initialContent }: MeetingMinutesSectionProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(initialContent ?? "");
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content || null }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "保存に失敗しました");
      }
      setIsEditing(false);
      setShowPreview(false);
      router.refresh();
    } catch (e) {
      console.error("Meeting save error:", e);
      toast.error(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setContent(initialContent ?? "");
    setIsEditing(false);
    setShowPreview(false);
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
          {/* 編集/プレビュー切り替えタブ */}
          <div className="flex items-center gap-1 border-b border-border pb-2">
            <Button
              variant={!showPreview ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setShowPreview(false)}
            >
              <Edit3 className="h-3 w-3 mr-1" />
              編集
            </Button>
            <Button
              variant={showPreview ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setShowPreview(true)}
            >
              <Eye className="h-3 w-3 mr-1" />
              プレビュー
            </Button>
          </div>

          {showPreview ? (
            <div className="min-h-[200px] p-3 border border-border rounded-md bg-muted/30">
              <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:mt-4 prose-headings:mb-2 prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none">
                {content ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content}
                  </ReactMarkdown>
                ) : (
                  <span className="text-muted-foreground">（内容なし）</span>
                )}
              </div>
            </div>
          ) : (
            <>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="議事録の内容を入力してください（Markdown記法対応）"
                className="min-h-[200px] resize-y font-mono text-sm"
                disabled={saving}
              />
              {/* Markdownヒント */}
              <div className="text-xs text-muted-foreground space-y-2 p-3 bg-muted/30 rounded-md">
                <p className="font-medium">Markdown記法が使えます:</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <span><code className="bg-muted px-1 rounded"># 見出し1</code></span>
                  <span><code className="bg-muted px-1 rounded">## 見出し2</code></span>
                  <span><code className="bg-muted px-1 rounded">### 見出し3</code></span>
                  <span><code className="bg-muted px-1 rounded">**太字**</code></span>
                  <span><code className="bg-muted px-1 rounded">*斜体*</code></span>
                  <span><code className="bg-muted px-1 rounded">~~取り消し線~~</code></span>
                  <span><code className="bg-muted px-1 rounded">- リスト</code></span>
                  <span><code className="bg-muted px-1 rounded">1. 番号付き</code></span>
                  <span><code className="bg-muted px-1 rounded">`コード`</code></span>
                  <span><code className="bg-muted px-1 rounded">[リンク](URL)</code></span>
                  <span><code className="bg-muted px-1 rounded">&gt; 引用</code></span>
                  <span><code className="bg-muted px-1 rounded">- [ ] タスク</code></span>
                </div>
                <div className="mt-2 pt-2 border-t border-border/50">
                  <p className="font-medium mb-1">テーブル記法:</p>
                  <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">| 列1 | 列2 | 列3 |{"\n"}|-----|-----|-----|{"\n"}| A   | B   | C   |</pre>
                </div>
              </div>
            </>
          )}

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
        <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:mt-4 prose-headings:mb-2 prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none">
          {content ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          ) : (
            <span className="text-muted-foreground">（内容なし）</span>
          )}
        </div>
      )}
    </div>
  );
}
