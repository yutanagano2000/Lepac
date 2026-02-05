import { NextResponse } from "next/server";
import { db } from "@/db";
import { calendarEvents } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireOrganization } from "@/lib/auth-guard";

// カスタムイベントを削除
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // 認証・組織チェック
  const authResult = await requireOrganization();
  if (!authResult.success) {
    return authResult.response;
  }
  const { organizationId } = authResult;

  try {
    const { id } = await params;

    // custom-123 形式からIDを抽出
    const eventId = id.startsWith("custom-") ? parseInt(id.replace("custom-", "")) : parseInt(id);

    if (isNaN(eventId)) {
      return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
    }

    // 組織に属するイベントのみ削除可能
    await db.delete(calendarEvents).where(
      and(
        eq(calendarEvents.id, eventId),
        eq(calendarEvents.organizationId, organizationId)
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("イベントの削除に失敗:", error);
    return NextResponse.json({ error: "イベントの削除に失敗しました" }, { status: 500 });
  }
}
