"use client";

import { Check, Clock, AlertTriangle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HorizontalPhaseData } from "./types";

interface TimelineNodeProps {
  phase: HorizontalPhaseData;
  index: number;
  isLast: boolean;
  isCurrent: boolean;
  onClick: () => void;
}

export function TimelineNode({
  phase,
  index,
  isLast,
  isCurrent,
  onClick,
}: TimelineNodeProps) {
  const getNodeStyles = () => {
    if (phase.status === "completed") {
      return "bg-green-500 text-white";
    }
    if (phase.isOverdue) {
      return "bg-red-500 text-white animate-pulse";
    }
    if (phase.isUpcoming) {
      return "bg-amber-500 text-white";
    }
    if (phase.status === "in_progress") {
      return "bg-blue-500 text-white animate-pulse";
    }
    return "bg-muted text-muted-foreground";
  };

  const getIcon = () => {
    if (phase.status === "completed") {
      return <Check className="w-4 h-4" />;
    }
    if (phase.isOverdue) {
      return <AlertCircle className="w-4 h-4" />;
    }
    if (phase.isUpcoming) {
      return <AlertTriangle className="w-4 h-4" />;
    }
    if (phase.status === "in_progress") {
      return <Clock className="w-4 h-4" />;
    }
    return <span className="text-xs font-bold">{index + 1}</span>;
  };

  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex flex-col items-center gap-1 min-w-[80px] sm:min-w-[100px] px-2 py-2 rounded-lg transition-all",
          "hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring",
          isCurrent && "ring-2 ring-primary"
        )}
      >
        <div
          className={cn(
            "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all",
            getNodeStyles()
          )}
        >
          {getIcon()}
        </div>
        <span className="text-[10px] sm:text-xs font-medium text-center leading-tight max-w-[80px] sm:max-w-[100px]">
          {phase.title}
        </span>
        <span className="text-[9px] text-muted-foreground">
          {phase.completedSubs}/{phase.totalSubs}
        </span>
      </button>

      {!isLast && (
        <div className="flex-shrink-0 w-4 sm:w-8 h-0.5 bg-border mx-1" />
      )}
    </div>
  );
}
