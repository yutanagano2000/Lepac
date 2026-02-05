import { NextRequest, NextResponse } from "next/server";
import { eq, asc, and } from "drizzle-orm";
import { db } from "@/db";
import { todos, projects } from "@/db/schema";
import { createTodoSchema, validateBody } from "@/lib/validations";
import { requireOrganization, requireOrganizationWithCsrf, getUserId } from "@/lib/auth-guard";
import { logTodoCreate } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

export async function GET() {
  // 認証・組織チェック
  const authResult = await requireOrganization();
  if (!authResult.success) {
    return authResult.response;
  }
  const { organizationId } = authResult;

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
    .where(eq(todos.organizationId, organizationId))
    .orderBy(asc(todos.dueDate));
  return NextResponse.json(rows);
}

// プレーンなTODOを作成（案件に紐づかない）
export async function POST(request: NextRequest) {
  // 認証・組織チェック（CSRF保護付き）
  const authResult = await requireOrganizationWithCsrf(request);
  if (!authResult.success) {
    return authResult.response;
  }
  const { user, organizationId } = authResult;

  const validation = await validateBody(request, createTodoSchema);
  if (!validation.success) {
    return NextResponse.json(validation.error, { status: 400 });
  }

  const { content, dueDate, projectId } = validation.data;

  // セッションからユーザー情報を取得
  const userId = getUserId(user);
  const userName = user.name || user.username || null;

  try {
    const [result] = await db
      .insert(todos)
      .values({
        organizationId, // 組織IDを自動設定
        projectId: projectId ?? null,
        content: content.trim(),
        dueDate,
        createdAt: new Date().toISOString(),
        userId,
        userName,
      })
      .returning();

    // 監査ログ記録
    await logTodoCreate(user, result.id, content, request);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Failed to create todo:", error);
    return NextResponse.json({ error: "TODOの作成に失敗しました" }, { status: 500 });
  }
}
