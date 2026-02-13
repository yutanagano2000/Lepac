import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { calendarEvents } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireOrganizationWithCsrf } from "@/lib/auth-guard";
import { updateCalendarEventSchema, validateBody } from "@/lib/validations";

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
    // エラーログ（ユーザー入力は含めない - 情報漏洩防止）
    console.error("イベントの削除に失敗:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "イベントの削除に失敗しました" }, { status: 500 });
  }
}

// カスタムイベントを更新
export async function PATCH(
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

  // バリデーション
  const validation = await validateBody(request, updateCalendarEventSchema);
  if (!validation.success) {
    return NextResponse.json(validation.error, { status: 400 });
  }

  try {
    // custom-123 形式からIDを抽出
    const idPattern = /^(custom-)?(\d+)$/;
    const match = id.match(idPattern);

    if (!match) {
      return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
    }

    const eventId = parseInt(match[2], 10);

    if (Number.isNaN(eventId) || eventId <= 0 || eventId > Number.MAX_SAFE_INTEGER) {
      return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
    }

    const { title, eventType, eventDate, endDate, startTime, endTime, description } = validation.data;

    // endDateがeventDateより前の場合はエラー
    if (endDate && eventDate && endDate < eventDate) {
      return NextResponse.json(
        { error: "終了日は開始日以降の日付を指定してください" },
        { status: 400 }
      );
    }

    // 更新データを構築（undefinedのフィールドは除外）
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (eventType !== undefined) updateData.eventType = eventType;
    if (eventDate !== undefined) updateData.eventDate = eventDate;
    if (endDate !== undefined) updateData.endDate = endDate || null;
    if (startTime !== undefined) updateData.startTime = startTime || null;
    if (endTime !== undefined) updateData.endTime = endTime || null;
    if (description !== undefined) updateData.description = description || null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "更新するフィールドがありません" }, { status: 400 });
    }

    // 組織に属するイベントのみ更新可能
    const [result] = await db
      .update(calendarEvents)
      .set(updateData)
      .where(
        and(
          eq(calendarEvents.id, eventId),
          eq(calendarEvents.organizationId, organizationId)
        )
      )
      .returning();

    if (!result) {
      return NextResponse.json({ error: "イベントが見つかりません" }, { status: 404 });
    }

    return NextResponse.json({
      id: `custom-${result.id}`,
      type: result.eventType,
      title: result.title,
      start: result.eventDate,
      end: result.endDate,
      startTime: result.startTime,
      endTime: result.endTime,
      description: result.description,
      userName: result.userName,
    });
  } catch (error) {
    console.error("イベントの更新に失敗 (id:", id, ")");
    return NextResponse.json({ error: "イベントの更新に失敗しました" }, { status: 500 });
  }
}
