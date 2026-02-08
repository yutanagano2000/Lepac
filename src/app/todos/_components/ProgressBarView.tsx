"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ProjectWithProgress } from "../_types";
import { PHASES } from "../_types";

interface ProgressBarViewProps {
  projects: ProjectWithProgress[];
  getCurrentPhaseIndex: (project: ProjectWithProgress) => number;
  maxDisplay?: number;
}

/**
 * 進捗バー表示コンポーネント
 *
 * 案件ごとの進捗をバー形式で視覚的に表示する
 */
export function ProgressBarView({
  projects,
  getCurrentPhaseIndex,
  maxDisplay = 5,
}: ProgressBarViewProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium text-muted-foreground">進捗バー表示</h2>
      {projects.slice(0, maxDisplay).map((project) => {
        const currentPhaseIndex = getCurrentPhaseIndex(project);
        const progressPercent = Math.round((currentPhaseIndex / PHASES.length) * 100);

        return (
          <Card key={project.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Link
                  href={`/projects/${project.id}`}
                  className="font-medium hover:underline"
                >
                  {project.managementNumber}
                </Link>
                <Badge variant="outline" className="text-xs">
                  {progressPercent}%
                </Badge>
              </div>
              <div className="relative">
                {/* Progress bar background */}
                <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                {/* Phase markers */}
                <div className="flex justify-between mt-1">
                  {PHASES.filter((_, i) => i % 4 === 0 || i === PHASES.length - 1).map(
                    (phase) => (
                      <span
                        key={phase.key}
                        className="text-[10px] text-muted-foreground"
                      >
                        {phase.title}
                      </span>
                    )
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                現在のフェーズ:{" "}
                <span className="font-medium text-foreground">
                  {currentPhaseIndex < PHASES.length
                    ? PHASES[currentPhaseIndex].title
                    : "完了"}
                </span>
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
