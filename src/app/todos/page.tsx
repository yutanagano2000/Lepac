import { db } from "@/db";
import { todos, projects } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import TodosView from "./TodosView";

export const dynamic = "force-dynamic";

export default async function TodosPage() {
  const rows = await db
    .select({
      id: todos.id,
      projectId: todos.projectId,
      content: todos.content,
      dueDate: todos.dueDate,
      createdAt: todos.createdAt,
      managementNumber: projects.managementNumber,
    })
    .from(todos)
    .leftJoin(projects, eq(todos.projectId, projects.id))
    .orderBy(asc(todos.dueDate));
  return <TodosView initialTodos={rows} />;
}
