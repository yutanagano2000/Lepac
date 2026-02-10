import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, progress } from "@/db/schema";
import { eq, and, gte, lt, inArray, asc } from "drizzle-orm";
import { requireOrganization } from "@/lib/auth-guard";

// 最大イベント数（DoS防止）
const MAX_EVENTS = 500;
// 最大日付範囲（日）
const MAX_RANGE_DAYS = 180;

/**
 * 翌日の日付を計算（境界比較用）
 */
function formatNextDay(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const nextDate = new Date(Date.UTC(year, month - 1, day + 1));
  const y = nextDate.getUTCFullYear();
  const m = String(nextDate.getUTCMonth() + 1).padStart(2, "0");
  const d = String(nextDate.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * iCal形式で未完了の予定をエクスポート
 * Notion CalendarやGoogleカレンダーで購読可能
 */
export async function GET(request: NextRequest) {
  // 認証・組織チェック
  const authResult = await requireOrganization();
  if (!authResult.success) {
    return authResult.response;
  }
  const { organizationId } = authResult;

  // 日付範囲パラメータ（オプション、最大180日）
  const { searchParams } = new URL(request.url);
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");

  // デフォルト: 今日から180日後まで
  const now = new Date();
  const formatDate = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const defaultStart = formatDate(now);
  const defaultEnd = formatDate(new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000));

  // 日付バリデーション（YYYY-MM-DD形式、厳格チェック）
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const isValidDate = (dateStr: string): boolean => {
    if (!dateRegex.test(dateStr)) return false;
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  };

  // パラメータ検証
  if (startParam && !isValidDate(startParam)) {
    return NextResponse.json({ error: "無効な開始日付形式です" }, { status: 400 });
  }
  if (endParam && !isValidDate(endParam)) {
    return NextResponse.json({ error: "無効な終了日付形式です" }, { status: 400 });
  }

  const startDate = startParam || defaultStart;
  const endDate = endParam || defaultEnd;
  // 終了日の翌日を計算（境界比較用: < endDateNextDay）
  const endDateNextDay = formatNextDay(endDate);

  // start <= end チェック
  if (startDate > endDate) {
    return NextResponse.json({ error: "開始日は終了日より前である必要があります" }, { status: 400 });
  }

  // 日付範囲制限チェック
  const startMs = new Date(startDate + "T00:00:00Z").getTime();
  const endMs = new Date(endDate + "T00:00:00Z").getTime();
  const rangeDays = Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24));
  if (rangeDays > MAX_RANGE_DAYS) {
    return NextResponse.json(
      { error: `日付範囲は${MAX_RANGE_DAYS}日以内にしてください` },
      { status: 400 }
    );
  }

  // 組織に属する案件を取得
  const allProjects = await db.select().from(projects).where(eq(projects.organizationId, organizationId));
  const projectIds = allProjects.map((p) => p.id);

  // 組織に属するプロジェクトの進捗のみを取得（日付範囲 + 件数制限）
  // 境界比較: >= startDate AND < endDateNextDay（終了日当日のレコードを含む）
  const allProgress = projectIds.length > 0
    ? await db
        .select()
        .from(progress)
        .where(
          and(
            eq(progress.status, "planned"),
            inArray(progress.projectId, projectIds),
            gte(progress.createdAt, startDate),
            lt(progress.createdAt, endDateNextDay)
          )
        )
        .orderBy(asc(progress.createdAt), asc(progress.id))
        .limit(MAX_EVENTS)
    : [];

  // プロジェクトIDから管理番号へのマップを作成
  const projectMap = new Map(
    allProjects.map((p) => [p.id, p.managementNumber])
  );

  // iCalヘッダー
  const icalLines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ALAN//ALAN Calendar//JA",
    "X-WR-CALNAME:ALAN",
    "X-WR-TIMEZONE:Asia/Tokyo",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  // 各進捗をイベントとして追加（既にDBレベルでフィルタ済み）
  for (const prog of allProgress) {

    const managementNumber = projectMap.get(prog.projectId) || "不明";
    const title = `${managementNumber} ${prog.title}`;
    
    // 日付をiCal形式に変換（YYYYMMDD）
    const dateStr = formatDateForICal(prog.createdAt);
    const nextDateStr = formatNextDateForICal(prog.createdAt);
    
    // イベントを追加
    icalLines.push("BEGIN:VEVENT");
    icalLines.push(`UID:progress-${prog.id}@alan`);
    icalLines.push(`DTSTAMP:${formatDateTimeForICal(new Date())}`);
    icalLines.push(`DTSTART;VALUE=DATE:${dateStr}`);
    icalLines.push(`DTEND;VALUE=DATE:${nextDateStr}`);
    icalLines.push(`SUMMARY:${escapeICalText(title)}`);
    if (prog.description) {
      icalLines.push(`DESCRIPTION:${escapeICalText(prog.description)}`);
    }
    icalLines.push("STATUS:TENTATIVE");
    icalLines.push("END:VEVENT");
  }

  // iCalフッター
  icalLines.push("END:VCALENDAR");

  // レスポンスを返す（RFC 5545準拠の行折り返しを適用）
  const icalContent = icalLines.map(foldICalLine).join("\r\n");
  
  // 件数が上限に達した場合はヘッダーで通知
  const isTruncated = allProgress.length >= MAX_EVENTS;

  return new NextResponse(icalContent, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "attachment; filename=alan-calendar.ics",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      ...(isTruncated && { "X-ALAN-Truncated": "true", "X-ALAN-Max-Events": String(MAX_EVENTS) }),
    },
  });
}

/**
 * 日付文字列をiCal形式（YYYYMMDD）に変換
 * UTCとして解釈してオフバイワン問題を防止
 */
function formatDateForICal(dateStr: string): string {
  // YYYY-MM-DD形式の場合、ハイフンを除去するだけ（Date変換によるタイムゾーンズレを防止）
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr.replace(/-/g, "");
  }
  // ISO形式（YYYY-MM-DDTHH:mm:ss）の場合
  const date = new Date(dateStr);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

/**
 * 翌日の日付をiCal形式（YYYYMMDD）に変換（終日イベント用）
 */
function formatNextDateForICal(dateStr: string): string {
  // YYYY-MM-DD形式の場合
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split("-").map(Number);
    const nextDate = new Date(Date.UTC(year, month - 1, day + 1));
    const y = nextDate.getUTCFullYear();
    const m = String(nextDate.getUTCMonth() + 1).padStart(2, "0");
    const d = String(nextDate.getUTCDate()).padStart(2, "0");
    return `${y}${m}${d}`;
  }
  // ISO形式の場合
  const date = new Date(dateStr);
  date.setUTCDate(date.getUTCDate() + 1);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

/**
 * 日時をiCal形式（YYYYMMDDTHHMMSSZ）に変換
 */
function formatDateTimeForICal(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * iCalテキストのエスケープ
 * RFC 5545準拠: バックスラッシュ、セミコロン、カンマ、改行をエスケープ
 * CRLF（\r\n）も適切に処理
 * セキュリティ: 制御文字を除去してインジェクション防止
 */
function escapeICalText(text: string): string {
  return text
    // 制御文字を除去（CR/LFを除く）- インジェクション防止
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n/g, "\\n") // CRLF → エスケープ改行
    .replace(/\r/g, "\\n")   // CR単体 → エスケープ改行
    .replace(/\n/g, "\\n");  // LF単体 → エスケープ改行
}

/**
 * RFC 5545準拠の行折り返し（75オクテット制限）
 * マルチバイト文字（日本語等）も正しく処理するためバイト長でカウント
 */
function foldICalLine(line: string): string {
  const MAX_OCTETS = 75;
  const encoder = new TextEncoder();
  const bytes = encoder.encode(line);

  if (bytes.length <= MAX_OCTETS) return line;

  const result: string[] = [];
  let offset = 0;
  let isFirst = true;

  while (offset < bytes.length) {
    // 継続行は空白1オクテット分短く
    const maxChunk = isFirst ? MAX_OCTETS : MAX_OCTETS - 1;

    // UTF-8境界を考慮したスライス
    let chunkEnd = Math.min(offset + maxChunk, bytes.length);

    // UTF-8継続バイト（0x80-0xBF）で終わらないよう調整
    while (chunkEnd > offset && (bytes[chunkEnd] & 0xc0) === 0x80) {
      chunkEnd--;
    }

    const chunk = new TextDecoder().decode(bytes.slice(offset, chunkEnd));

    if (isFirst) {
      result.push(chunk);
      isFirst = false;
    } else {
      result.push(" " + chunk);
    }

    offset = chunkEnd;
  }

  return result.join("\r\n");
}
