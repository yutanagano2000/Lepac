import { db } from "@/db";
import { todos, projects } from "@/db/schema";
import { eq, asc, and } from "drizzle-orm";
import { HomeTodosView } from "@/components/HomeTodosView";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function TodoPage() {
  // セッションからユーザーIDを取得
  const session = await auth();
  const currentUserId = session?.user?.id ? parseInt(session.user.id, 10) : null;
  const organizationId = session?.user?.organizationId;

  // 組織でフィルタリング（組織IDがある場合のみ）
  const conditions = organizationId
    ? [eq(todos.organizationId, organizationId)]
    : [];

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
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(todos.dueDate));

  return <HomeTodosView initialTodos={rows} showCreateForm currentUserId={currentUserId} />;
}
