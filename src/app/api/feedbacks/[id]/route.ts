import { NextResponse } from "next/server";
import { db } from "@/db";
import { feedbacks } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// 要望取得
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const feedbackId = Number(id);

  if (isNaN(feedbackId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const [feedback] = await db
    .select()
    .from(feedbacks)
    .where(eq(feedbacks.id, feedbackId));

  if (!feedback) {
    return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
  }

  return NextResponse.json(feedback);
}

// 要望更新（ステータス、返信など）
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const feedbackId = Number(id);

  if (isNaN(feedbackId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const body = await request.json();
  const { status, replies } = body;

  const updateData: Record<string, unknown> = {};
  if (status !== undefined) updateData.status = status;
  if (replies !== undefined) updateData.replies = replies;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const [result] = await db
    .update(feedbacks)
    .set(updateData)
    .where(eq(feedbacks.id, feedbackId))
    .returning();

  return NextResponse.json(result);
}

// 要望削除
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const feedbackId = Number(id);

  if (isNaN(feedbackId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  await db.delete(feedbacks).where(eq(feedbacks.id, feedbackId));

  return NextResponse.json({ success: true });
}
