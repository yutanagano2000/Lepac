"use client";

import { useEffect, useState } from "react";

interface AnalysisProgressProps {
  countdown: number | null;
  isLoading: boolean;
}

const STAGES = [
  { label: "グリッド生成", icon: "grid" },
  { label: "標高取得", icon: "mountain" },
  { label: "傾斜計算", icon: "chart" },
  { label: "統計処理", icon: "stats" },
];

export function AnalysisProgress({ countdown, isLoading }: AnalysisProgressProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [dots, setDots] = useState("");

  // ステージを進行
  useEffect(() => {
    if (!isLoading) {
      setCurrentStage(0);
      return;
    }

    const interval = setInterval(() => {
      setCurrentStage((prev) => (prev < STAGES.length - 1 ? prev + 1 : prev));
    }, 2000);

    return () => clearInterval(interval);
  }, [isLoading]);

  // ドットアニメーション
  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 400);

    return () => clearInterval(interval);
  }, [isLoading]);

  if (!isLoading) return null;

  const progress = countdown !== null && countdown > 0
    ? Math.min(95, Math.max(5, 100 - countdown * 8))
    : 98;

  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/10 p-6">
      {/* 背景のパルスエフェクト */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-shimmer" />

      <div className="relative">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-primary animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
              {countdown !== null && countdown > 0 && (
                <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-lg">
                  {countdown}
                </div>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold">地形解析中{dots}</h3>
              <p className="text-sm text-muted-foreground">
                {countdown !== null && countdown > 0
                  ? `残り約 ${countdown} 秒`
                  : "まもなく完了"}
              </p>
            </div>
          </div>

          {/* パーセンテージ */}
          <div className="text-right">
            <span className="text-3xl font-bold text-primary tabular-nums">
              {Math.round(progress)}
            </span>
            <span className="text-lg text-muted-foreground">%</span>
          </div>
        </div>

        {/* プログレスバー */}
        <div className="h-2 bg-muted/50 rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-gradient-to-r from-primary via-primary to-primary/80 rounded-full transition-all duration-500 ease-out relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          </div>
        </div>

        {/* ステージインジケーター */}
        <div className="grid grid-cols-4 gap-2">
          {STAGES.map((stage, idx) => (
            <div
              key={stage.label}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all duration-300 ${
                idx <= currentStage
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground/50"
              }`}
            >
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  idx < currentStage
                    ? "bg-primary text-primary-foreground"
                    : idx === currentStage
                    ? "bg-primary/20 text-primary ring-2 ring-primary ring-offset-2 ring-offset-background"
                    : "bg-muted/50"
                }`}
              >
                {idx < currentStage ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-xs font-medium">{idx + 1}</span>
                )}
              </div>
              <span className="text-xs font-medium text-center">{stage.label}</span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
