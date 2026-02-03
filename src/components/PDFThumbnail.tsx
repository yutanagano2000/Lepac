"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Loader2 } from "lucide-react";

interface PDFThumbnailProps {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}

export function PDFThumbnail({ src, alt, className, onClick }: PDFThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const loadPDF = async () => {
      if (!canvasRef.current) return;

      // 前回のレンダリングタスクをキャンセル
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }

      try {
        setIsLoading(true);
        setError(false);

        // pdf.jsを動的にインポート（クライアントサイドのみ）
        const pdfjsLib = await import("pdfjs-dist");

        if (isCancelled) return;

        // Worker設定
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        // PDFを読み込む
        const loadingTask = pdfjsLib.getDocument(src);
        const pdf = await loadingTask.promise;

        if (isCancelled) return;

        // 1ページ目を取得
        const page = await pdf.getPage(1);

        if (isCancelled) return;

        // キャンバスのサイズを計算（アスペクト比を維持）
        const canvas = canvasRef.current;
        if (!canvas) return;

        const containerWidth = canvas.parentElement?.clientWidth || 300;
        const viewport = page.getViewport({ scale: 1 });
        const scale = containerWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        // レンダリング
        const context = canvas.getContext("2d");
        if (context && !isCancelled) {
          // キャンバスをクリア
          context.clearRect(0, 0, canvas.width, canvas.height);

          const renderTask = page.render({
            canvasContext: context,
            viewport: scaledViewport,
            canvas: canvas,
          } as Parameters<typeof page.render>[0]);

          renderTaskRef.current = renderTask;

          await renderTask.promise;

          if (!isCancelled) {
            setIsLoading(false);
          }
        }
      } catch (err) {
        if (!isCancelled) {
          // キャンセルエラーは無視
          if (err instanceof Error && err.message.includes("cancel")) {
            return;
          }
          console.error("PDF thumbnail error:", err);
          setError(true);
          setIsLoading(false);
        }
      }
    };

    loadPDF();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [src]);

  if (error) {
    return (
      <button
        onClick={onClick}
        className={`flex items-center justify-center bg-muted ${className}`}
      >
        <FileText className="h-12 w-12 text-muted-foreground" />
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`relative overflow-hidden bg-muted ${className}`}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={`w-full h-full object-contain ${isLoading ? "opacity-0" : "opacity-100"}`}
      />
      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
        PDF
      </div>
    </button>
  );
}
