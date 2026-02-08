"use client";

import { Button } from "@/components/ui/button";
import { Pentagon, Spline, Pencil, Trash2, RotateCcw } from "lucide-react";

export type DrawMode = "polygon" | "polyline" | "edit" | "delete" | null;

interface PolygonToolbarProps {
  activeMode: DrawMode;
  onModeChange: (mode: DrawMode) => void;
  onReset?: () => void;
  hasPolygon?: boolean;
}

const TOOLS: { mode: DrawMode; label: string; icon: typeof Pentagon }[] = [
  { mode: "polygon", label: "ポリゴン", icon: Pentagon },
  { mode: "polyline", label: "ライン", icon: Spline },
  { mode: "edit", label: "編集", icon: Pencil },
  { mode: "delete", label: "削除", icon: Trash2 },
];

export function PolygonToolbar({ activeMode, onModeChange, onReset, hasPolygon }: PolygonToolbarProps) {
  return (
    <div className="absolute top-2 left-2 z-[1000] bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-1 flex gap-1">
      {TOOLS.map((tool) => {
        const Icon = tool.icon;
        const isActive = activeMode === tool.mode;
        return (
          <Button
            key={tool.mode}
            variant={isActive ? "default" : "ghost"}
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => onModeChange(isActive ? null : tool.mode)}
            title={tool.label}
          >
            <Icon className="h-3.5 w-3.5 mr-1" />
            {tool.label}
          </Button>
        );
      })}
      {hasPolygon && onReset && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2 text-xs ml-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          onClick={onReset}
          title="リセット"
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1" />
          リセット
        </Button>
      )}
    </div>
  );
}
