// ワークフロー優先度
export const PRIORITY = {
  URGENT: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4,
} as const;

export type Priority = (typeof PRIORITY)[keyof typeof PRIORITY];

export const PRIORITY_LABELS: Record<Priority, string> = {
  [PRIORITY.URGENT]: "緊急",
  [PRIORITY.HIGH]: "高",
  [PRIORITY.MEDIUM]: "中",
  [PRIORITY.LOW]: "低",
};

// ワークフローステータス
export const WORKFLOW_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export type WorkflowStatus = (typeof WORKFLOW_STATUS)[keyof typeof WORKFLOW_STATUS];

// タスクタイプ
export const TASK_TYPE = {
  INPUT: "input",
  DOCUMENT: "document",
  CHECK: "check",
  SUBMIT: "submit",
  NAVIGATE: "navigate",
} as const;

export type TaskType = (typeof TASK_TYPE)[keyof typeof TASK_TYPE];

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  [TASK_TYPE.INPUT]: "入力",
  [TASK_TYPE.DOCUMENT]: "書類確認",
  [TASK_TYPE.CHECK]: "チェック",
  [TASK_TYPE.SUBMIT]: "提出",
  [TASK_TYPE.NAVIGATE]: "移動",
};
