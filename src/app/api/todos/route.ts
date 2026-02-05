import { NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { todos, projects } from "@/db/schema";
import { auth } from "@/auth";
import { createTodoSchema, validateBody } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET() {
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
  return NextResponse.json(rows);
}

// プレーンなTODOを作成（案件に紐づかない）
export async function POST(request: Request) {
  const validation = await validateBody(request, createTodoSchema);
  if (!validation.success) {
    return NextResponse.json(validation.error, { status: 400 });
  }

  const session = await auth();
  const { content, dueDate, projectId } = validation.data;

  // セッションからユーザー情報を取得
  const userId = session?.user?.id ? parseInt(session.user.id) : null;
  const user = session?.user as { name?: string; username?: string } | undefined;
  const userName = user?.name || user?.username || null;

  try {
    const [result] = await db
      .insert(todos)
      .values({
        projectId: projectId ?? null,
        content: content.trim(),
        dueDate,
        createdAt: new Date().toISOString(),
        userId,
        userName,
      })
      .returning();

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Failed to create todo:", error);
    return NextResponse.json({ error: "TODOの作成に失敗しました" }, { status: 500 });
  }
}
