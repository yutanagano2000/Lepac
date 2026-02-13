import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { feedbacks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireOrganization, requireOrganizationWithCsrf } from "@/lib/auth-guard";
import { logFeedbackUpdate, logFeedbackDelete } from "@/lib/audit-log";
import { createErrorResponse } from "@/lib/api-error";
import { parseValidId } from "@/lib/validation";

export const dynamic = "force-dynamic";

// 要望取得
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // 認証・組織チェック
  const authResult = await requireOrganization();
  if (!authResult.success) {
    return authResult.response;
  }
  const { organizationId } = authResult;

  const { id } = await params;

  // 共通ヘルパーでID検証
  const feedbackId = parseValidId(id);
  if (feedbackId === null) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    // 必要なカラムのみ選択（organizationIdなど内部用カラムを除外）
    const [feedback] = await db
      .select({
        id: feedbacks.id,
        content: feedbacks.content,
        status: feedbacks.status,
        replies: feedbacks.replies,
        likes: feedbacks.likes,
        userId: feedbacks.userId,
        userName: feedbacks.userName,
        createdAt: feedbacks.createdAt,
      })
      .from(feedbacks)
      .where(and(eq(feedbacks.id, feedbackId), eq(feedbacks.organizationId, organizationId)));

    if (!feedback) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }

    return NextResponse.json(feedback);
  } catch (error) {
    return createErrorResponse(error, "フィードバックの取得に失敗しました");
  }
}

// 要望更新（ステータス、返信など）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 認証・組織チェック（CSRF保護付き）
  const authResult = await requireOrganizationWithCsrf(request);
  if (!authResult.success) {
    return authResult.response;
  }
  const { user, organizationId } = authResult;

  const { id } = await params;

  // 共通ヘルパーでID検証
  const feedbackId = parseValidId(id);
  if (feedbackId === null) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "無効なJSONです" }, { status: 400 });
  }
  const { status, replies } = body;

  // 許可されたステータス値
  const ALLOWED_STATUSES = ["pending", "in_progress", "completed", "rejected"] as const;

  const updateData: Record<string, unknown> = {};

  // statusのバリデーション
  if (status !== undefined) {
    if (typeof status !== "string" || !ALLOWED_STATUSES.includes(status as typeof ALLOWED_STATUSES[number])) {
      return NextResponse.json({ error: "無効なステータス値です" }, { status: 400 });
    }
    updateData.status = status;
  }

  // repliesのバリデーション（文字列、最大10000文字）
  if (replies !== undefined) {
    if (typeof replies !== "string" || replies.length > 10000) {
      return NextResponse.json({ error: "repliesは10000文字以内の文字列である必要があります" }, { status: 400 });
    }
    updateData.replies = replies;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    // 組織に属するフィードバックのみ更新可能（必要なカラムのみ返却）
    const [result] = await db
      .update(feedbacks)
      .set(updateData)
      .where(and(eq(feedbacks.id, feedbackId), eq(feedbacks.organizationId, organizationId)))
      .returning({
        id: feedbacks.id,
        content: feedbacks.content,
        status: feedbacks.status,
        replies: feedbacks.replies,
        likes: feedbacks.likes,
        userName: feedbacks.userName,
        createdAt: feedbacks.createdAt,
      });

    if (!result) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }

    // 監査ログ記録
    await logFeedbackUpdate(user, feedbackId, result.content, updateData, request);

    return NextResponse.json(result);
  } catch (error) {
    return createErrorResponse(error, "フィードバックの更新に失敗しました");
  }
}

// 要望削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 認証・組織チェック（CSRF保護付き）
  const authResult = await requireOrganizationWithCsrf(request);
  if (!authResult.success) {
    return authResult.response;
  }
  const { user, organizationId } = authResult;

  const { id } = await params;

  // 共通ヘルパーでID検証
  const feedbackId = parseValidId(id);
  if (feedbackId === null) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    // 削除前にフィードバックを取得（監査ログ用）
    const [existing] = await db
      .select()
      .from(feedbacks)
      .where(and(eq(feedbacks.id, feedbackId), eq(feedbacks.organizationId, organizationId)));

    if (!existing) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }
    // 組織に属するフィードバックのみ削除可能（削除結果を検証）
    const deleteResult = await db
      .delete(feedbacks)
      .where(and(eq(feedbacks.id, feedbackId), eq(feedbacks.organizationId, organizationId)))
      .returning({ id: feedbacks.id });

    // 削除結果が0件の場合は競合状態の可能性（既に削除済み）
    if (deleteResult.length === 0) {
      return NextResponse.json({ error: "Feedback not found or already deleted" }, { status: 404 });
    }

    // 監査ログ記録
    await logFeedbackDelete(user, feedbackId, existing.content, request);

    return NextResponse.json({ success: true });
  } catch (error) {
    return createErrorResponse(error, "フィードバックの削除に失敗しました");
  }
}
