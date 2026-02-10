import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { meetings } from "@/db/schema";
import { requireOrganization, requireOrganizationWithCsrf } from "@/lib/auth-guard";
import { logMeetingUpdate, logMeetingDelete } from "@/lib/audit-log";
import { updateMeetingSchema, validateBody } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
  } catch (error) {
    console.error("Failed to get meeting:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "会議の取得に失敗しました" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    // バリデーション
    const validation = await validateBody(request, updateMeetingSchema);
    if (!validation.success) {
      return NextResponse.json(validation.error, { status: 400 });
    }

    const { title, meetingDate, category, content, agenda } = validation.data;
    const updates = {
      ...(title !== undefined && { title }),
      ...(meetingDate !== undefined && { meetingDate }),
      ...(category !== undefined && { category }),
      ...(content !== undefined && { content: content ?? null }),
      ...(agenda !== undefined && { agenda: agenda ?? null }),
    };
    const [updated] = await db
      .update(meetings)
      .set(updates)
      .where(and(eq(meetings.id, idNum), eq(meetings.organizationId, organizationId)))
      .returning();

    // 監査ログ記録
    await logMeetingUpdate(user, idNum, updated.title, updates, request);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update meeting:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "会議の更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
  } catch (error) {
    console.error("Failed to delete meeting:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "会議の削除に失敗しました" }, { status: 500 });
  }
}
