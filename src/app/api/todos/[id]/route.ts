import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { todos } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const todoId = parseInt(id, 10);
  if (isNaN(todoId)) {
    return NextResponse.json({ error: "Invalid todo ID" }, { status: 400 });
  }
  const body = await request.json();
  const updates: { content?: string; dueDate?: string; completedAt?: string | null; completedMemo?: string | null } = {};
  if (body.content !== undefined) updates.content = body.content?.trim() ?? "";
  if (body.dueDate !== undefined) updates.dueDate = body.dueDate;
  if (body.completedAt !== undefined) updates.completedAt = body.completedAt ?? null;
  if (body.completedMemo !== undefined) updates.completedMemo = body.completedMemo ?? null;
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }
  if (updates.content !== undefined && !updates.content) {
    return NextResponse.json({ error: "content cannot be empty" }, { status: 400 });
  }
  if (updates.dueDate !== undefined && !updates.dueDate) {
    return NextResponse.json({ error: "dueDate is required when updating" }, { status: 400 });
  }
  const [result] = await db
    .update(todos)
    .set(updates)
    .where(eq(todos.id, todoId))
    .returning();
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(result);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const todoId = parseInt(id, 10);
  if (isNaN(todoId)) {
    return NextResponse.json({ error: "Invalid todo ID" }, { status: 400 });
  }
  await db.delete(todos).where(eq(todos.id, todoId));
  return NextResponse.json({ success: true });
}
