import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects, progress } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireOrganization } from "@/lib/auth-guard";

/**
 * iCal形式で未完了の予定をエクスポート
 * Notion CalendarやGoogleカレンダーで購読可能
 */
export async function GET() {
  // 認証・組織チェック
  const authResult = await requireOrganization();
  if (!authResult.success) {
    return authResult.response;
  }
  const { organizationId } = authResult;

  // 組織に属する案件を取得
  const allProjects = await db.select().from(projects).where(eq(projects.organizationId, organizationId));
  const projectIds = new Set(allProjects.map((p) => p.id));

  // 全進捗を取得（未完了のみ）
  const allProgress = await db
    .select()
    .from(progress)
    .where(eq(progress.status, "planned"));

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

  // 各進捗をイベントとして追加（組織に属するプロジェクトのもののみ）
  for (const prog of allProgress) {
    if (!projectIds.has(prog.projectId)) continue;

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

  // レスポンスを返す
  const icalContent = icalLines.join("\r\n");
  
  return new NextResponse(icalContent, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "attachment; filename=alan-calendar.ics",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}

/**
 * 日付文字列をiCal形式（YYYYMMDD）に変換
 */
function formatDateForICal(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

/**
 * 翌日の日付をiCal形式（YYYYMMDD）に変換（終日イベント用）
 */
function formatNextDateForICal(dateStr: string): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
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
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}
