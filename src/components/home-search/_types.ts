export interface SearchResult {
  type: "project" | "todo" | "meeting";
  id: number;
  title: string;
  subtitle?: string;
  href: string;
}

export interface DashboardTodo {
  id: number;
  content: string;
  dueDate: string;
  projectId: number;
  managementNumber: string;
}

export interface DashboardProject {
  id: number;
  managementNumber: string;
  client?: string;
  alertCount?: number;
  updatedAt?: string;
}

export interface DashboardData {
  overdueTodos: { count: number; items: DashboardTodo[] };
  todayTodos: { count: number; items: DashboardTodo[] };
  thisWeekTodos: { count: number; items: DashboardTodo[] };
  projectAlerts: { count: number; totalAlerts: number; items: DashboardProject[] };
  activeProjects: { count: number; items: DashboardProject[] };
  recentProjects: { items: DashboardProject[] };
}

export interface CategorizedResults {
  projects: SearchResult[];
  todos: SearchResult[];
  meetings: SearchResult[];
}
