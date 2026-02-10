import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { calendarEvents } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireOrganizationWithCsrf } from "@/lib/auth-guard";

// カスタムイベントを削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 認証・組織チェック
  const authResult = await requireOrganizationWithCsrf(request);
  if (!authResult.success) {
    return authResult.response;
  }
  const { organizationId } = authResult;

  const { id } = await params;

  try {

    // custom-123 形式からIDを抽出（完全一致で検証）
    // 部分マッチ防止: custom-1abc のような入力を拒否
    const idPattern = /^(custom-)?(\d+)$/;
    const match = id.match(idPattern);

    if (!match) {
      return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
    }

    const eventId = parseInt(match[2], 10);

    // parseIntの結果検証（NaNや範囲外の値を拒否）
    if (Number.isNaN(eventId) || eventId <= 0 || eventId > Number.MAX_SAFE_INTEGER) {
      return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
    }

    // 組織に属するイベントのみ削除可能
    const result = await db.delete(calendarEvents).where(
      and(
        eq(calendarEvents.id, eventId),
        eq(calendarEvents.organizationId, organizationId)
      )
    ).returning({ id: calendarEvents.id });

    // 削除対象が存在しない場合は404を返す
    if (result.length === 0) {
      return NextResponse.json({ error: "イベントが見つかりません" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    // エラーログは内部詳細を記録（クライアントには一般的なメッセージのみ）
    console.error("イベントの削除に失敗 (id:", id, ")");
    return NextResponse.json({ error: "イベントの削除に失敗しました" }, { status: 500 });
  }
}
