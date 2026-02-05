import { NextResponse } from "next/server";
import { db } from "@/db";
import { comments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { createCommentSchema, validateBody } from "@/lib/validations";
import { requireProjectAccess, getUserId } from "@/lib/auth-guard";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = Number(id);

  // 認証・組織・プロジェクト所有権チェック
  const authResult = await requireProjectAccess(projectId);
  if (!authResult.success) {
    return authResult.response;
  }

  const allComments = await db
    .select()
    .from(comments)
    .where(eq(comments.projectId, projectId))
    .orderBy(desc(comments.createdAt));
  return NextResponse.json(allComments);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = Number(id);

  // 認証・組織・プロジェクト所有権チェック
  const authResult = await requireProjectAccess(projectId);
  if (!authResult.success) {
    return authResult.response;
  }
  const { user } = authResult;

  const validation = await validateBody(request, createCommentSchema);
  if (!validation.success) {
    return NextResponse.json(validation.error, { status: 400 });
  }

  const { content } = validation.data;

  // セッションからユーザー情報を取得
  const userId = getUserId(user);
  const userName = user.name || user.username || null;

  try {
    const [result] = await db
      .insert(comments)
      .values({
        projectId,
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
  const { id } = await params;
  const projectId = Number(id);

  // 認証・組織・プロジェクト所有権チェック
  const authResult = await requireProjectAccess(projectId);
  if (!authResult.success) {
    return authResult.response;
  }

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
  const { id } = await params;
  const projectId = Number(id);

  // 認証・組織・プロジェクト所有権チェック
  const authResult = await requireProjectAccess(projectId);
  if (!authResult.success) {
    return authResult.response;
  }

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
