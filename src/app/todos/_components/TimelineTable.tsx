"use client";

import Link from "next/link";
import { ChevronRight, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ProjectWithProgress, Phase, PhaseStatus } from "../_types";
import { PHASES } from "../_types";
import { TimelineFilters } from "./TimelineFilters";
import { PhaseCell } from "./PhaseCell";

interface TimelineTableProps {
  projects: ProjectWithProgress[];
  filterProps: {
    filterOpen: boolean;
    onFilterOpenChange: (open: boolean) => void;
    filterSearchQuery: string;
    onFilterSearchChange: (query: string) => void;
    selectedProjectIds: Set<number>;
    onToggleProject: (projectId: number) => void;
    onSelectAll: () => void;
    onClearAll: () => void;
    filterableProjects: ProjectWithProgress[];
    isFiltered: boolean;
  };
  getPhaseStatus: (project: ProjectWithProgress, phaseTitle: string) => PhaseStatus;
  getCurrentPhaseIndex: (project: ProjectWithProgress) => number;
  isPhaseAlert: (project: ProjectWithProgress, phaseIndex: number) => boolean;
  onEditPhase: (project: ProjectWithProgress, phase: Phase) => void;
}

export function TimelineTable({
  projects,
  filterProps,
  getPhaseStatus,
  getCurrentPhaseIndex,
  isPhaseAlert,
  onEditPhase,
}: TimelineTableProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="w-full overflow-hidden">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b">
                <th className="sticky left-0 bg-card z-10 px-2 py-3 text-left font-medium text-muted-foreground w-[140px]">
                  <TimelineFilters {...filterProps} />
                </th>
                {PHASES.map((phase) => (
                  <th
                    key={phase.key}
                    className="px-0 py-3 text-center font-semibold text-muted-foreground text-xs"
                    title={phase.title}
                  >
                    <span className="block truncate leading-tight">{phase.title}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr>
                  <td
                    colSpan={PHASES.length + 1}
                    className="px-4 py-8 text-center text-muted-foreground text-base"
                  >
                    案件が見つかりません
                  </td>
                </tr>
              ) : (
                projects.map((project) => (
                  <TimelineRow
                    key={project.id}
                    project={project}
                    getPhaseStatus={getPhaseStatus}
                    getCurrentPhaseIndex={getCurrentPhaseIndex}
                    isPhaseAlert={isPhaseAlert}
                    onEditPhase={onEditPhase}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

interface TimelineRowProps {
  project: ProjectWithProgress;
  getPhaseStatus: (project: ProjectWithProgress, phaseTitle: string) => PhaseStatus;
  getCurrentPhaseIndex: (project: ProjectWithProgress) => number;
  isPhaseAlert: (project: ProjectWithProgress, phaseIndex: number) => boolean;
  onEditPhase: (project: ProjectWithProgress, phase: Phase) => void;
}

function TimelineRow({
  project,
  getPhaseStatus,
  getCurrentPhaseIndex,
  isPhaseAlert,
  onEditPhase,
}: TimelineRowProps) {
  const currentPhaseIndex = getCurrentPhaseIndex(project);
  const hasAlert = PHASES.some((_, i) => isPhaseAlert(project, i));

  return (
    <tr
      className={cn(
        "border-b hover:bg-muted/30 transition-colors",
        hasAlert && "bg-red-500/5"
      )}
    >
      <td
        className={cn(
          "sticky left-0 z-10 px-2 py-3 w-[140px]",
          hasAlert ? "bg-red-500/10" : "bg-card"
        )}
      >
        <Link
          href={`/projects/${project.id}`}
          className="group flex items-center gap-1"
        >
          {hasAlert && (
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mr-1" />
          )}
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "text-sm font-bold group-hover:underline truncate",
                hasAlert && "text-red-600 dark:text-red-400"
              )}
            >
              {project.managementNumber}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {project.client}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </Link>
      </td>
      {PHASES.map((phase, index) => {
        const phaseStatus = getPhaseStatus(project, phase.title);
        const isCompleted = phaseStatus.status === "completed";
        const isCurrent = index === currentPhaseIndex;
        const isAlert = isPhaseAlert(project, index);

        return (
          <PhaseCell
            key={phase.key}
            phase={phase}
            phaseIndex={index}
            phaseStatus={phaseStatus}
            isCompleted={isCompleted}
            isCurrent={isCurrent}
            isAlert={isAlert}
            onEdit={() => onEditPhase(project, phase)}
          />
        );
      })}
    </tr>
  );
}
