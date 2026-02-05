import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { meetings } from "@/db/schema";
import { requireOrganization, requireOrganizationWithCsrf } from "@/lib/auth-guard";
import { logMeetingUpdate, logMeetingDelete } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

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
  const idNum = parseInt(id, 10);
  if (isNaN(idNum)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const [row] = await db
    .select()
    .from(meetings)
    .where(and(eq(meetings.id, idNum), eq(meetings.organizationId, organizationId)));

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(row);
}

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
  const idNum = parseInt(id, 10);
  if (isNaN(idNum)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  // 組織に属する会議のみ更新可能
  const [existing] = await db
    .select()
    .from(meetings)
    .where(and(eq(meetings.id, idNum), eq(meetings.organizationId, organizationId)));

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const updates = {
    ...(body.title !== undefined && { title: body.title }),
    ...(body.meetingDate !== undefined && { meetingDate: body.meetingDate }),
    ...(body.category !== undefined && { category: body.category }),
    ...(body.content !== undefined && { content: body.content ?? null }),
    ...(body.agenda !== undefined && { agenda: body.agenda ?? null }),
  };
  const [updated] = await db
    .update(meetings)
    .set(updates)
    .where(eq(meetings.id, idNum))
    .returning();

  // 監査ログ記録
  await logMeetingUpdate(user, idNum, updated.title, updates, request);

  return NextResponse.json(updated);
}

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
  const idNum = parseInt(id, 10);
  if (isNaN(idNum)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  // 削除前に会議を取得（監査ログ用）
  const [existing] = await db
    .select()
    .from(meetings)
    .where(and(eq(meetings.id, idNum), eq(meetings.organizationId, organizationId)));

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 組織に属する会議のみ削除可能
  await db
    .delete(meetings)
    .where(and(eq(meetings.id, idNum), eq(meetings.organizationId, organizationId)));

  // 監査ログ記録
  await logMeetingDelete(user, idNum, existing.title, request);

  return NextResponse.json({ success: true });
}
