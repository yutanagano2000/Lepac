import { NextResponse } from "next/server";
import { db } from "@/db";
import { todos } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { auth } from "@/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = Number(id);
  if (isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }
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
  const session = await auth();
  const { id } = await params;
  const projectId = Number(id);
  if (isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }
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
  const userId = session?.user?.id ? parseInt(session.user.id) : null;
  const userName = session?.user?.name || session?.user?.username || null;

  const [result] = await db
    .insert(todos)
    .values({
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
  const { searchParams } = new URL(request.url);
  const todoId = searchParams.get("todoId");
  if (!todoId) {
    return NextResponse.json({ error: "todoId is required" }, { status: 400 });
  }
  await db.delete(todos).where(eq(todos.id, Number(todoId)));
  return NextResponse.json({ success: true });
}
