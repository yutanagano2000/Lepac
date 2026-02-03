"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Send, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ページパスからタイトルを取得
function getPageTitle(path: string): string {
  if (path.startsWith("/projects/")) return "案件詳細";
  if (path === "/projects") return "案件一覧";
  if (path === "/todo") return "TODO";
  if (path === "/todos") return "タイムライン";
  if (path === "/meetings") return "会議";
  if (path.startsWith("/meetings/")) return "会議詳細";
  if (path === "/schedule") return "スケジュール";
  if (path === "/map") return "地図";
  if (path === "/legal") return "法令検索";
  if (path === "/tools") return "ツール";
  if (path === "/feedbacks") return "要望";
  return path;
}

export function FeedbackInput() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // 要望画面では表示しない
  if (pathname === "/feedbacks") {
    return null;
  }

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/feedbacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          pagePath: pathname,
          pageTitle: getPageTitle(pathname),
        }),
      });

      if (res.ok) {
        setContent("");
        setIsOpen(false);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* 成功メッセージ */}
      {showSuccess && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-in fade-in slide-in-from-bottom-2">
          要望を送信しました
        </div>
      )}

      {/* フィードバック入力エリア */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-4xl mx-auto px-4 py-3">
          {isOpen ? (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-start gap-2">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="この画面について改善点やご意見をお聞かせください..."
                  className="min-h-[80px] resize-none flex-1"
                  autoFocus
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  送信元: {getPageTitle(pathname)}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsOpen(false);
                      setContent("");
                    }}
                  >
                    キャンセル
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={!content.trim() || isSubmitting}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    送信
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsOpen(true)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl",
                "bg-muted/50 hover:bg-muted transition-colors",
                "text-muted-foreground hover:text-foreground",
                "text-left text-sm"
              )}
            >
              <MessageSquarePlus className="h-5 w-5 shrink-0" />
              <span>この画面についてフィードバックを送信...</span>
            </button>
          )}
        </div>
      </div>

      {/* 下部のスペース確保 */}
      <div className="h-20" />
    </>
  );
}
