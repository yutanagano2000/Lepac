export type TaskType = "input" | "document" | "check" | "submit" | "navigate";

export interface Assignment {
  id: number;
  workflowName: string;
  projectName: string | null;
  status: string;
  totalSteps: number;
  currentStep: number;
  startedAt: string | null;
  dueDate: string | null;
}

export interface CurrentTask {
  stepId: number;
  stepOrder: number;
  taskType: TaskType;
  title: string;
  instruction: string | null;
  targetUrl: string | null;
  estimatedMinutes: number | null;
  startedAt: string | null;
}

export interface PreviousStep {
  stepOrder: number;
  title: string;
  completedAt: string | null;
  durationSeconds: number | null;
}

export interface TaskExecutionData {
  assignment: Assignment;
  currentTask: CurrentTask | null;
  previousSteps: PreviousStep[];
}
