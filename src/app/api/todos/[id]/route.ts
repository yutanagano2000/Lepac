import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { todos } from "@/db/schema";
import { updateTodoSchema, validateBody } from "@/lib/validations";

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
    const [result] = await db
      .update(todos)
      .set(updates)
      .where(eq(todos.id, todoId))
      .returning();

    if (!result) {
      return NextResponse.json({ error: "TODOが見つかりません" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to update todo:", error);
    return NextResponse.json({ error: "TODOの更新に失敗しました" }, { status: 500 });
  }
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
