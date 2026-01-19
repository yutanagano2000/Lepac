import { NextResponse } from "next/server";
import { db } from "@/db";
import { comments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const allComments = db
    .select()
    .from(comments)
    .where(eq(comments.projectId, Number(id)))
    .orderBy(desc(comments.createdAt))
    .all();
  return NextResponse.json(allComments);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const result = db
    .insert(comments)
    .values({
      projectId: Number(id),
      content: body.content,
      createdAt: new Date().toISOString(),
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
  const { commentId, content } = body;
  const result = db
    .update(comments)
    .set({ content })
    .where(eq(comments.id, Number(commentId)))
    .returning()
    .get();
  return NextResponse.json(result);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(request.url);
  const commentId = searchParams.get("commentId");
  if (!commentId) {
    return NextResponse.json({ error: "commentId is required" }, { status: 400 });
  }
  db.delete(comments).where(eq(comments.id, Number(commentId))).run();
  return NextResponse.json({ success: true });
}
