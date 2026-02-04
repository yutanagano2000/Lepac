import { NextResponse } from "next/server";
import { db } from "@/db";
import { comments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const allComments = await db
    .select()
    .from(comments)
    .where(eq(comments.projectId, Number(id)))
    .orderBy(desc(comments.createdAt));
  return NextResponse.json(allComments);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id } = await params;
  const body = await request.json();

  // セッションからユーザー情報を取得
  const userId = session?.user?.id ? parseInt(session.user.id) : null;
  const userName = session?.user?.name || (session?.user as any)?.username || null;

  const [result] = await db
    .insert(comments)
    .values({
      projectId: Number(id),
      content: body.content,
      createdAt: new Date().toISOString(),
      userId,
      userName,
    })
    .returning();
  return NextResponse.json(result);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const body = await request.json();
  const { commentId, content } = body;
  const [result] = await db
    .update(comments)
    .set({ content })
    .where(eq(comments.id, Number(commentId)))
    .returning();
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
  await db.delete(comments).where(eq(comments.id, Number(commentId)));
  return NextResponse.json({ success: true });
}
