import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { todos } from "@/db/schema";
import { updateTodoSchema, validateBody } from "@/lib/validations";
import { requireOrganization, requireOrganizationWithCsrf } from "@/lib/auth-guard";
import { logTodoUpdate, logTodoDelete } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 認証・組織チェック（CSRF保護付き）
  const authResult = await requireOrganizationWithCsrf(request);
  if (!authResult.success) {
    return authResult.response;
  }
  const { user, organizationId } = authResult;

  const { id } = await params;
  const todoId = parseInt(id, 10);
  if (isNaN(todoId)) {
    return NextResponse.json({ error: "Invalid todo ID" }, { status: 400 });
  }

  const validation = await validateBody(request, updateTodoSchema);
  if (!validation.success) {
    return NextResponse.json(validation.error, { status: 400 });
  }

  const { content, dueDate, completedAt, completedMemo } = validation.data;
  const updates: Record<string, string | null | undefined> = {};

  if (content !== undefined) updates.content = content.trim();
  if (dueDate !== undefined) updates.dueDate = dueDate;
  if (completedAt !== undefined) updates.completedAt = completedAt;
  if (completedMemo !== undefined) updates.completedMemo = completedMemo;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    // 組織に属するTODOのみ更新可能
    const [result] = await db
      .update(todos)
      .set(updates)
      .where(and(eq(todos.id, todoId), eq(todos.organizationId, organizationId)))
      .returning();

    if (!result) {
      return NextResponse.json({ error: "TODOが見つかりません" }, { status: 404 });
    }

    // 監査ログ記録
    await logTodoUpdate(user, todoId, result.content, updates, request);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to update todo:", error);
    return NextResponse.json({ error: "TODOの更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 認証・組織チェック（CSRF保護付き）
  const authResult = await requireOrganizationWithCsrf(request);
  if (!authResult.success) {
    return authResult.response;
  }
  const { user, organizationId } = authResult;

  const { id } = await params;
  const todoId = parseInt(id, 10);
  if (isNaN(todoId)) {
    return NextResponse.json({ error: "Invalid todo ID" }, { status: 400 });
  }

  // 削除前にTODOを取得（監査ログ用）
  const [existingTodo] = await db
    .select()
    .from(todos)
    .where(and(eq(todos.id, todoId), eq(todos.organizationId, organizationId)));

  if (!existingTodo) {
    return NextResponse.json({ error: "TODOが見つかりません" }, { status: 404 });
  }

  // 組織に属するTODOのみ削除可能
  await db.delete(todos).where(
    and(eq(todos.id, todoId), eq(todos.organizationId, organizationId))
  );

  // 監査ログ記録
  await logTodoDelete(user, todoId, existingTodo.content, request);

  return NextResponse.json({ success: true });
}
