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
    // セキュリティ: userIdは組織内のTODOフィルタリングに使用
    // organizationIdによる絞り込みが先に適用されるため、
    // 他組織のデータは取得できない（IDOR対策済み）
    if (!isNaN(parsedUserId) && parsedUserId > 0 && parsedUserId <= Number.MAX_SAFE_INTEGER) {
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

  // セキュリティ: assigneeIdは組織内ユーザーの検証が理想だが、
  // TODOは組織単位でフィルタリングされるため、
  // 不正なassigneeIdでも組織外への情報漏洩リスクは低い
  // 担当者IDと名前を決定（安全な範囲チェック付き）
  const safeAssigneeId = assigneeId && assigneeId > 0 && assigneeId <= Number.MAX_SAFE_INTEGER
    ? assigneeId
    : null;
  const todoUserId = safeAssigneeId ?? creatorId;
  const todoUserName = safeAssigneeId ? (assigneeName ?? null) : creatorName;

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
    // 本番環境では詳細を隠す（情報漏洩対策）
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to create todo:", error);
    }
    return NextResponse.json({ error: "TODOの作成に失敗しました" }, { status: 500 });
  }
}
