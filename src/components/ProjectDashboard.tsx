"use client";

import { useMemo } from "react";
import { FolderOpen, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { isSafeUrl } from "@/lib/sanitize";
import type { Project, Progress } from "@/db/schema";

// サブフォルダ定義
const SUBFOLDERS = [
  { name: "01_合意書", icon: "📝" },
  { name: "02_土地情報", icon: "🗺️" },
  { name: "03_図面", icon: "📐" },
  { name: "04_発電シミュレーション", icon: "☀️" },
  { name: "05_法令関係", icon: "⚖️" },
  { name: "06_電力申請", icon: "⚡" },
  { name: "07_材料発注", icon: "📦" },
  { name: "08_工事関係", icon: "🔧" },
  { name: "09_連系資料", icon: "🔌" },
  { name: "10_土地決済・所有権移転", icon: "🏠" },
] as const;

interface ProjectDashboardProps {
  project: Project;
  progressList: Progress[];
}

export function ProjectDashboard({ project }: ProjectDashboardProps) {
  // どこキャビリンクからベースパスを抽出
  const baseFolderPath = useMemo(() => {
    if (!project.dococabiLink) return null;
    return project.dococabiLink;
  }, [project.dococabiLink]);

  if (!baseFolderPath) return null;

  return (
    <div className="grid gap-4 grid-cols-1">
      {/* サブフォルダクイックアクセス */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center gap-2 mb-3">
            <FolderOpen className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-base">フォルダ</h3>
          </div>

          <div className="space-y-1">
            {SUBFOLDERS.slice(0, 5).map((folder) => (
              <Button
                key={folder.name}
                variant="ghost"
                size="sm"
                className="w-full justify-start h-9 text-sm"
                onClick={() => {
                  const url = `${baseFolderPath}/${encodeURIComponent(folder.name)}`;
                  if (isSafeUrl(url)) window.open(url, "_blank", "noopener,noreferrer");
                }}
              >
                <span className="mr-2">{folder.icon}</span>
                <span className="truncate">{folder.name}</span>
                <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
              </Button>
            ))}
            <details className="group">
              <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground px-2 py-1">
                その他のフォルダ...
              </summary>
              <div className="mt-1 space-y-1">
                {SUBFOLDERS.slice(5).map((folder) => (
                  <Button
                    key={folder.name}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-9 text-sm"
                    onClick={() => {
                      const url = `${baseFolderPath}/${encodeURIComponent(folder.name)}`;
                      if (isSafeUrl(url)) window.open(url, "_blank", "noopener,noreferrer");
                    }}
                  >
                    <span className="mr-2">{folder.icon}</span>
                    <span className="truncate">{folder.name}</span>
                    <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
                  </Button>
                ))}
              </div>
            </details>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
