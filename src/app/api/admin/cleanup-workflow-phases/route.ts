import { NextResponse } from "next/server";
import { db } from "@/db";
import { progress } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { requireOrganization } from "@/lib/auth-guard";

/**
 * POST /api/admin/cleanup-workflow-phases
 *
 * WORKFLOW_PHASESベースの不要な進捗項目を全案件から削除
 * これらは以前のバージョンで誤って追加されたもの
 */

// WORKFLOW_PHASESベースの項目（削除対象）
const WORKFLOW_PHASE_TITLES = [
  "現地詳細確認",
  "初期調査・設計",
  "最終調整",
  "回答待ち",
  "申請",
  "契約・詳細設計",
  "工事着工～完了",
  "最終判断・決済",
  // 以下はWORKFLOW_PHASESのサブフェーズ
  "案件スタート",
  "案件取得",
  "初期撮影",
  "現場案内図作成",
  "法令チェック",
  "ハザードマップ確認",
  "ラフ図面作成",
  "現調（不足分の写真撮影）",
  "提出可否チェック",
  "図面修正",
  "電力シミュレーション",
  "近隣挨拶・伐採範囲の許可取得",
  "地目変更",
  "DD",
  "法令回答",
  "本設計（再シミュレーション実施）",
  "地盤調査依頼",
  "決済（名義変更）",
];

export async function POST(request: Request) {
  // 認証チェック
  const authResult = await requireOrganization();
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    // WORKFLOW_PHASESベースの項目を削除
    const result = await db
      .delete(progress)
      .where(inArray(progress.title, WORKFLOW_PHASE_TITLES))
      .returning();

    return NextResponse.json({
      success: true,
      deleted: result.length,
      deletedTitles: result.map(r => r.title),
    });
  } catch (error) {
    console.error("Cleanup failed:", error);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}

export async function GET() {
  // 削除対象の項目を確認（プレビュー）
  const authResult = await requireOrganization();
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    const items = await db
      .select()
      .from(progress)
      .where(inArray(progress.title, WORKFLOW_PHASE_TITLES));

    return NextResponse.json({
      count: items.length,
      items: items.map(i => ({
        id: i.id,
        projectId: i.projectId,
        title: i.title,
      })),
    });
  } catch (error) {
    console.error("Preview failed:", error);
    return NextResponse.json({ error: "Preview failed" }, { status: 500 });
  }
}
