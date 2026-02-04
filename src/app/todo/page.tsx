import { db } from "@/db";
import { todos, projects } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { HomeTodosView } from "@/components/HomeTodosView";

export const dynamic = "force-dynamic";

export default async function TodoPage() {
  const rows = await db
    .select({
      id: todos.id,
      projectId: todos.projectId,
      content: todos.content,
      dueDate: todos.dueDate,
      createdAt: todos.createdAt,
      completedAt: todos.completedAt,
      completedMemo: todos.completedMemo,
      userId: todos.userId,
      userName: todos.userName,
      managementNumber: projects.managementNumber,
    })
    .from(todos)
    .leftJoin(projects, eq(todos.projectId, projects.id))
    .orderBy(asc(todos.dueDate));

  return <HomeTodosView initialTodos={rows} showCreateForm />;
}
