import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { requireOrganization, requireOrganizationWithCsrf } from "@/lib/auth-guard";
import { syncFromSheets, saveSyncLog, getLastSyncStatus } from "@/lib/sheets-sync";

/**
 * GET /api/sync/sheets — 最終同期ステータス取得
 */
export async function GET() {
  try {
    const authResult = await requireOrganization();
    if (!authResult.success) return authResult.response;

    const status = await getLastSyncStatus();
    return NextResponse.json({ status });
  } catch (err) {
    console.error("Sync sheets GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ステータス取得に失敗しました" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sync/sheets — 同期実行
 *
 * 2つの認証方式をサポート:
 * 1. セッション認証（ブラウザからの手動同期）
 * 2. CRON_SECRET（Vercel Cron からの自動同期）
 */
export async function POST(request: NextRequest) {
  try {
    let organizationId: number;

    // Vercel Cron からの呼び出し判定
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // タイミング攻撃を防ぐためtimingSafeEqualを使用
    const isValidCronAuth = (() => {
      if (!authHeader || !cronSecret) return false;
      const expected = `Bearer ${cronSecret}`;
      if (authHeader.length !== expected.length) return false;
      try {
        return timingSafeEqual(
          Buffer.from(authHeader),
          Buffer.from(expected)
        );
      } catch {
        return false;
      }
    })();

    if (isValidCronAuth) {
      // Cron 実行時はデフォルト組織ID（Person Energy = 1）
      organizationId = 1;
    } else {
      // ブラウザからの手動同期
      const authResult = await requireOrganizationWithCsrf(request);
      if (!authResult.success) return authResult.response;
      organizationId = authResult.organizationId;
    }

    // 同期実行
    const result = await syncFromSheets(organizationId);

    // ログ記録
    await saveSyncLog(result);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err) {
    console.error("Sync sheets POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "同期処理に失敗しました" },
      { status: 500 }
    );
  }
}
