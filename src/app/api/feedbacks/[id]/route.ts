import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { feedbacks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireOrganization, requireOrganizationWithCsrf } from "@/lib/auth-guard";
import { logFeedbackUpdate, logFeedbackDelete } from "@/lib/audit-log";

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
  const feedbackId = Number(id);

  if (isNaN(feedbackId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const [feedback] = await db
    .select()
    .from(feedbacks)
    .where(and(eq(feedbacks.id, feedbackId), eq(feedbacks.organizationId, organizationId)));

  if (!feedback) {
    return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
  }

  return NextResponse.json(feedback);
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

  // 組織に属するフィードバックのみ更新可能
  const [result] = await db
    .update(feedbacks)
    .set(updateData)
    .where(and(eq(feedbacks.id, feedbackId), eq(feedbacks.organizationId, organizationId)))
    .returning();

  if (!result) {
    return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
  }

  // 監査ログ記録
  await logFeedbackUpdate(user, feedbackId, result.content, updateData, request);

  return NextResponse.json(result);
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
  const feedbackId = Number(id);

  if (isNaN(feedbackId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  // 削除前にフィードバックを取得（監査ログ用）
  const [existing] = await db
    .select()
    .from(feedbacks)
    .where(and(eq(feedbacks.id, feedbackId), eq(feedbacks.organizationId, organizationId)));

  if (!existing) {
    return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
  }

  // 組織に属するフィードバックのみ削除可能
  await db
    .delete(feedbacks)
    .where(and(eq(feedbacks.id, feedbackId), eq(feedbacks.organizationId, organizationId)));

  // 監査ログ記録
  await logFeedbackDelete(user, feedbackId, existing.content, request);

  return NextResponse.json({ success: true });
}
