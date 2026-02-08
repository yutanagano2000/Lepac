export type TodoWithProject = {
  id: number;
  projectId: number | null;
  content: string;
  dueDate: string;
  createdAt: string;
  completedAt: string | null;
  completedMemo: string | null;
  userId: number | null;
  userName: string | null;
  managementNumber: string | null;
};

export interface HomeTodosViewProps {
  initialTodos: TodoWithProject[];
  showCreateForm?: boolean;
}

export type DueDateGroup = "overdue" | "today" | "upcoming" | "later";

export interface DueDateInfo {
  group: DueDateGroup;
  label: string;
  diffDays: number;
}

export interface GroupedTodos {
  overdue: TodoWithProject[];
  today: TodoWithProject[];
  upcoming: TodoWithProject[];
  later: TodoWithProject[];
  completed: TodoWithProject[];
}
