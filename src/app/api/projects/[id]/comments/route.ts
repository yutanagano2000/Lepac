import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { comments } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { createCommentSchema, validateBody } from "@/lib/validations";
import { requireProjectAccess, requireProjectAccessWithCsrf, getUserId } from "@/lib/auth-guard";

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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = Number(id);

  // 認証・組織・プロジェクト所有権チェック
  const authResult = await requireProjectAccessWithCsrf(request, projectId);
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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = Number(id);

  // 認証・組織・プロジェクト所有権チェック
  const authResult = await requireProjectAccessWithCsrf(request, projectId);
  if (!authResult.success) {
    return authResult.response;
  }
  const { user } = authResult;
  const currentUserId = getUserId(user);

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

  const commentId = Number(body.commentId);
  if (isNaN(commentId)) {
    return NextResponse.json({ error: "Invalid comment ID" }, { status: 400 });
  }

  // コメントの存在確認と所有者チェック
  const [existingComment] = await db
    .select()
    .from(comments)
    .where(and(eq(comments.id, commentId), eq(comments.projectId, projectId)));

  if (!existingComment) {
    return NextResponse.json({ error: "コメントが見つかりません" }, { status: 404 });
  }

  // コメントの所有者のみ編集可能
  if (existingComment.userId !== currentUserId) {
    return NextResponse.json({ error: "このコメントを編集する権限がありません" }, { status: 403 });
  }

  try {
    const [result] = await db
      .update(comments)
      .set({ content: body.content.trim() })
      .where(eq(comments.id, commentId))
      .returning();

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to update comment:", error);
    return NextResponse.json({ error: "コメントの更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = Number(id);

  // 認証・組織・プロジェクト所有権チェック
  const authResult = await requireProjectAccessWithCsrf(request, projectId);
  if (!authResult.success) {
    return authResult.response;
  }
  const { user } = authResult;
  const currentUserId = getUserId(user);

  const { searchParams } = new URL(request.url);
  const commentIdParam = searchParams.get("commentId");
  if (!commentIdParam) {
    return NextResponse.json({ error: "commentId is required" }, { status: 400 });
  }

  const commentId = Number(commentIdParam);
  if (isNaN(commentId)) {
    return NextResponse.json({ error: "Invalid comment ID" }, { status: 400 });
  }

  // コメントの存在確認と所有者チェック
  const [existingComment] = await db
    .select()
    .from(comments)
    .where(and(eq(comments.id, commentId), eq(comments.projectId, projectId)));

  if (!existingComment) {
    return NextResponse.json({ error: "コメントが見つかりません" }, { status: 404 });
  }

  // コメントの所有者のみ削除可能
  if (existingComment.userId !== currentUserId) {
    return NextResponse.json({ error: "このコメントを削除する権限がありません" }, { status: 403 });
  }

  try {
    await db.delete(comments).where(eq(comments.id, commentId));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete comment:", error);
    return NextResponse.json({ error: "コメントの削除に失敗しました" }, { status: 500 });
  }
}
