import { NextResponse } from "next/server";
import { db } from "@/db";
import { calendarEvents } from "@/db/schema";
import { eq } from "drizzle-orm";

// カスタムイベントを削除
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // custom-123 形式からIDを抽出
    const eventId = id.startsWith("custom-") ? parseInt(id.replace("custom-", "")) : parseInt(id);

    if (isNaN(eventId)) {
      return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
    }

    await db.delete(calendarEvents).where(eq(calendarEvents.id, eventId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("イベントの削除に失敗:", error);
    return NextResponse.json({ error: "イベントの削除に失敗しました" }, { status: 500 });
  }
}
