import type { Project, Progress } from "@/db/schema";

export interface ProjectWithProgress extends Project {
  progressItems: Progress[];
}

export interface TimelineViewProps {
  projects: ProjectWithProgress[];
}

export type AlertLevel = "critical" | "warning" | null;
