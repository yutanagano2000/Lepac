import { NextResponse } from "next/server";
import { db } from "@/db";
import { comments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/auth";
import { createCommentSchema, validateBody } from "@/lib/validations";

export async function GET(
  _request: Request,
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
  const validation = await validateBody(request, createCommentSchema);
  if (!validation.success) {
    return NextResponse.json(validation.error, { status: 400 });
  }

  const session = await auth();
  const { id } = await params;
  const { content } = validation.data;

  // セッションからユーザー情報を取得
  const userId = session?.user?.id ? parseInt(session.user.id) : null;
  const user = session?.user as { name?: string; username?: string } | undefined;
  const userName = user?.name || user?.username || null;

  try {
    const [result] = await db
      .insert(comments)
      .values({
        projectId: Number(id),
        content,
        createdAt: new Date().toISOString(),
        userId,
        userName,
      })
      .returning();

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Failed to create comment:", error);
    return NextResponse.json({ error: "コメントの投稿に失敗しました" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const validation = await validateBody(request, createCommentSchema.extend({
    commentId: createCommentSchema.shape.content.transform((_, ctx) => {
      // This is a workaround - we need to parse commentId separately
      return undefined;
    }),
  }).partial());

  // Parse body manually for this endpoint as it has a different structure
  let body: { commentId?: number; content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.commentId || !body.content?.trim()) {
    return NextResponse.json({ error: "commentId and content are required" }, { status: 400 });
  }

  try {
    const [result] = await db
      .update(comments)
      .set({ content: body.content.trim() })
      .where(eq(comments.id, Number(body.commentId)))
      .returning();

    if (!result) {
      return NextResponse.json({ error: "コメントが見つかりません" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to update comment:", error);
    return NextResponse.json({ error: "コメントの更新に失敗しました" }, { status: 500 });
  }
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

  try {
    await db.delete(comments).where(eq(comments.id, Number(commentId)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete comment:", error);
    return NextResponse.json({ error: "コメントの削除に失敗しました" }, { status: 500 });
  }
}
