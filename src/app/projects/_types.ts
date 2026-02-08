import type { Project, NewProject } from "@/db/schema";

// 超過情報・コメント・TODO検索用テキストを含む案件型
export type ProjectWithOverdue = Project & {
  hasOverdue: boolean;
  commentSearchText?: string;
  todoSearchText?: string;
};

export interface ProjectsViewProps {
  initialProjects: ProjectWithOverdue[];
}

// フィルター状態の型
export interface ProjectFilters {
  selectedManagementNumbers: Set<string>;
  selectedManagers: Set<string>;
  selectedClients: Set<string>;
  selectedProjectNumbers: Set<string>;
  selectedCompletionMonths: Set<string>;
  filterSearchQuery: string;
}

// セル編集状態の型
export interface CellEditState {
  projectId: number;
  columnKey: string;
}

// ダイアログで使用するフォームデータ
export type ProjectFormData = NewProject;
