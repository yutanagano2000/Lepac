import { NextResponse } from "next/server";
import { db } from "@/db";
import { progress } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const allProgress = db
    .select()
    .from(progress)
    .where(eq(progress.projectId, Number(id)))
    .orderBy(desc(progress.createdAt))
    .all();
  return NextResponse.json(allProgress);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const result = db
    .insert(progress)
    .values({
      projectId: Number(id),
      title: body.title,
      description: body.description || null,
      status: body.status || "planned",
      createdAt: body.createdAt || new Date().toISOString(),
    })
    .returning()
    .get();
  return NextResponse.json(result);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const body = await request.json();
  const { progressId, title, description, status, createdAt, completedAt } = body;

  // 更新するフィールドを構築
  const updateFields: Record<string, unknown> = {};
  if (title !== undefined) updateFields.title = title;
  if (description !== undefined) updateFields.description = description;
  if (status !== undefined) updateFields.status = status;
  if (createdAt !== undefined) updateFields.createdAt = createdAt;
  if (completedAt !== undefined) updateFields.completedAt = completedAt;

  const result = db
    .update(progress)
    .set(updateFields)
    .where(eq(progress.id, Number(progressId)))
    .returning()
    .get();
  return NextResponse.json(result);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(request.url);
  const progressId = searchParams.get("progressId");
  if (!progressId) {
    return NextResponse.json({ error: "progressId is required" }, { status: 400 });
  }
  db.delete(progress).where(eq(progress.id, Number(progressId))).run();
  return NextResponse.json({ success: true });
}
