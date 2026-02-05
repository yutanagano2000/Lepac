import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { meetings } from "@/db/schema";
import { createMeetingSchema, validateBody } from "@/lib/validations";
import { requireOrganization, requireOrganizationWithCsrf } from "@/lib/auth-guard";
import { logMeetingCreate } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

export async function GET() {
  // 認証・組織チェック
  const authResult = await requireOrganization();
  if (!authResult.success) {
    return authResult.response;
  }
  const { organizationId } = authResult;

  const list = await db
    .select()
    .from(meetings)
    .where(eq(meetings.organizationId, organizationId))
    .orderBy(desc(meetings.meetingDate));
  return NextResponse.json(list);
}

export async function POST(request: NextRequest) {
  // 認証・組織チェック（CSRF保護付き）
  const authResult = await requireOrganizationWithCsrf(request);
  if (!authResult.success) {
    return authResult.response;
  }
  const { user, organizationId } = authResult;

  const validation = await validateBody(request, createMeetingSchema);
  if (!validation.success) {
    return NextResponse.json(validation.error, { status: 400 });
  }

  const { title, meetingDate, category, content, agenda } = validation.data;

  try {
    const [result] = await db
      .insert(meetings)
      .values({
        organizationId, // 組織IDを自動設定
        title,
        meetingDate,
        category,
        content: content ?? null,
        agenda: agenda ?? null,
      })
      .returning();

    // 監査ログ記録
    await logMeetingCreate(user, result.id, title, request);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Failed to create meeting:", error);
    return NextResponse.json({ error: "会議の作成に失敗しました" }, { status: 500 });
  }
}
