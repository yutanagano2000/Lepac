import { NextRequest, NextResponse } from "next/server";
import { eq, asc, and } from "drizzle-orm";
import { db } from "@/db";
import { todos, projects } from "@/db/schema";
import { createTodoSchema, validateBody } from "@/lib/validations";
import { requireOrganization, requireOrganizationWithCsrf, getUserId } from "@/lib/auth-guard";
import { logTodoCreate } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // 認証・組織チェック
  const authResult = await requireOrganization();
  if (!authResult.success) {
    return authResult.response;
  }
  const { organizationId } = authResult;

  // クエリパラメータからuserIdフィルタを取得
  const { searchParams } = new URL(request.url);
  const filterUserId = searchParams.get("userId");

  // 条件を構築
  const conditions = [eq(todos.organizationId, organizationId)];
  if (filterUserId) {
    const parsedUserId = parseInt(filterUserId, 10);
    // NaNチェック：不正なuserIdは無視して組織全体のTODOを返す
    if (!isNaN(parsedUserId) && parsedUserId > 0) {
      conditions.push(eq(todos.userId, parsedUserId));
    }
  }

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
    .where(and(...conditions))
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

  const { content, dueDate, projectId, assigneeId, assigneeName } = validation.data;

  // 担当者が指定されていればその情報を使用、なければ作成者を担当者とする
  const creatorId = getUserId(user);
  const creatorName = user.name || user.username || null;

  // 担当者IDと名前を決定
  const todoUserId = assigneeId ?? creatorId;
  const todoUserName = assigneeName ?? creatorName;

  try {
    const [result] = await db
      .insert(todos)
      .values({
        organizationId, // 組織IDを自動設定
        projectId: projectId ?? null,
        content: content.trim(),
        dueDate,
        createdAt: new Date().toISOString(),
        userId: todoUserId,
        userName: todoUserName,
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
