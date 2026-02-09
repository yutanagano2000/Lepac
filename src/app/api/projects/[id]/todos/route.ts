import { NextResponse } from "next/server";
import { db } from "@/db";
import { todos } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { requireProjectAccess, getUserId } from "@/lib/auth-guard";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = Number(id);
  if (isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  // 認証・組織・プロジェクト所有権チェック
  const authResult = await requireProjectAccess(projectId);
  if (!authResult.success) {
    return authResult.response;
  }
  const { organizationId } = authResult;

  const list = await db
    .select()
    .from(todos)
    .where(eq(todos.projectId, projectId))
    .orderBy(asc(todos.dueDate));
  return NextResponse.json(list);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = Number(id);
  if (isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  // 認証・組織・プロジェクト所有権チェック
  const authResult = await requireProjectAccess(projectId);
  if (!authResult.success) {
    return authResult.response;
  }
  const { user, organizationId } = authResult;

  const body = await request.json();
  const content = body.content?.trim() ?? "";
  const dueDate = body.dueDate ?? "";
  if (!content || !dueDate) {
    return NextResponse.json(
      { error: "content and dueDate are required" },
      { status: 400 }
    );
  }

  // セッションからユーザー情報を取得
  const userId = getUserId(user);
  const userName = user.name || user.username || null;

  const [result] = await db
    .insert(todos)
    .values({
      organizationId, // 組織IDを設定
      projectId,
      content,
      dueDate,
      createdAt: new Date().toISOString(),
      userId,
      userName,
    })
    .returning();
  return NextResponse.json(result);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = Number(id);
  if (isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  // 認証・組織・プロジェクト所有権チェック
  const authResult = await requireProjectAccess(projectId);
  if (!authResult.success) {
    return authResult.response;
  }

  const { searchParams } = new URL(request.url);
  const todoIdParam = searchParams.get("todoId");
  if (!todoIdParam) {
    return NextResponse.json({ error: "todoId is required" }, { status: 400 });
  }

  const todoId = Number(todoIdParam);
  if (isNaN(todoId) || todoId <= 0) {
    return NextResponse.json({ error: "Invalid todoId" }, { status: 400 });
  }

  // IDOR対策: 該当TODOがこのプロジェクトに属しているか確認
  const [existingTodo] = await db
    .select({ id: todos.id, projectId: todos.projectId })
    .from(todos)
    .where(eq(todos.id, todoId))
    .limit(1);

  if (!existingTodo) {
    return NextResponse.json({ error: "TODO not found" }, { status: 404 });
  }

  if (existingTodo.projectId !== projectId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.delete(todos).where(eq(todos.id, todoId));
  return NextResponse.json({ success: true });
}
