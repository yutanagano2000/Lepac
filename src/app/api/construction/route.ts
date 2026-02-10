import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects, progress } from "@/db/schema";
import { eq, and, notInArray, inArray } from "drizzle-orm";
import { requireOrganization } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

// 完工判定用の定数（仕様変更時はここを修正）
const COMPLETION_PROGRESS_TITLE = "完工";
const COMPLETION_PROGRESS_STATUS = "completed";

export async function GET(request: Request) {
  // 認証・組織チェック
  const authResult = await requireOrganization();
  if (!authResult.success) {
    return authResult.response;
  }
  const { organizationId } = authResult;

  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  try {
    // 組織に属するプロジェクトのIDを取得
    const orgProjects = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.organizationId, organizationId));

    const orgProjectIds = orgProjects.map(p => p.id);

    if (orgProjectIds.length === 0) {
      return NextResponse.json({ projects: [], count: 0 });
    }

    // 完工済みの案件IDを取得（組織フィルタ: inArrayで組織プロジェクトに限定）
    const completedProjectIds = await db
      .select({ projectId: progress.projectId })
      .from(progress)
      .where(and(
        eq(progress.title, COMPLETION_PROGRESS_TITLE),
        eq(progress.status, COMPLETION_PROGRESS_STATUS),
        inArray(progress.projectId, orgProjectIds) // 組織プロジェクトに限定
      ));

    const completedIds = completedProjectIds.map(p => p.projectId);

    // 完工済みでない案件を取得（組織に属するもののみ）
    let allProjects;
    if (completedIds.length > 0) {
      allProjects = await db
        .select()
        .from(projects)
        .where(and(
          eq(projects.organizationId, organizationId),
          notInArray(projects.id, completedIds)
        ));
    } else {
      allProjects = await db
        .select()
        .from(projects)
        .where(eq(projects.organizationId, organizationId));
    }

    // 月でフィルタリング（サーバーサイド）
    let filteredProjects = allProjects;
    if (year && month) {
      const yearNum = parseInt(year, 10);
      const monthNum = parseInt(month, 10);

      // バリデーション: 無効な値は空を返す
      if (isNaN(yearNum) || isNaN(monthNum) || yearNum < 2000 || yearNum > 2100 || monthNum < 1 || monthNum > 12) {
        return NextResponse.json({ projects: [], count: 0 });
      }

      filteredProjects = allProjects.filter((p) => {
        if (!p.completionMonth) return false;
        // 完成月のフォーマット: "2025年1月" or "2025/01" or "2025-01" など
        const monthMatch = p.completionMonth.match(/(\d{4})[-/年]?(\d{1,2})/);
        if (monthMatch) {
          const pYear = parseInt(monthMatch[1]);
          const pMonth = parseInt(monthMatch[2]);
          return pYear === yearNum && pMonth === monthNum;
        }
        return false;
      });
    }

    // 工事部向けに必要なフィールドのみ抽出
    const constructionProjects = filteredProjects.map((p) => ({
      id: p.id,
      managementNumber: p.managementNumber,
      client: p.client,
      projectNumber: p.projectNumber,
      prefecture: p.prefecture,
      address: p.address,
      // 発注タブ用
      deliveryLocation: p.deliveryLocation,
      mountOrderVendor: p.mountOrderVendor,
      mountOrderDate: p.mountOrderDate,
      mountDeliveryScheduled: p.mountDeliveryScheduled,
      mountDeliveryStatus: p.mountDeliveryStatus,
      panelOrderVendor: p.panelOrderVendor,
      panelOrderDate: p.panelOrderDate,
      panelDeliveryScheduled: p.panelDeliveryScheduled,
      panelDeliveryStatus: p.panelDeliveryStatus,
      constructionAvailableDate: p.constructionAvailableDate,
      constructionRemarks: p.constructionRemarks,
      constructionNote: p.constructionNote,
      completionMonth: p.completionMonth,
      // 工程タブ用
      siteName: p.siteName,
      cityName: p.cityName,
      panelCount: p.panelCount,
      panelLayout: p.panelLayout,
      loadTestStatus: p.loadTestStatus,
      loadTestDate: p.loadTestDate,
      pileStatus: p.pileStatus,
      pileDate: p.pileDate,
      framePanelStatus: p.framePanelStatus,
      framePanelDate: p.framePanelDate,
      electricalStatus: p.electricalStatus,
      electricalDate: p.electricalDate,
      fenceStatus: p.fenceStatus,
      fenceDate: p.fenceDate,
      inspectionPhotoDate: p.inspectionPhotoDate,
      processRemarks: p.processRemarks,
    }));

    // 完成月でソート（古い順）- 正規化した数値比較
    const parseCompletionMonth = (month: string | null): number => {
      if (!month) return Infinity; // nullは末尾に
      const match = month.match(/(\d{4})[-/年]?(\d{1,2})/);
      if (!match) return Infinity;
      const year = parseInt(match[1], 10);
      const mon = parseInt(match[2], 10);
      return year * 100 + mon; // YYYYMM形式の数値
    };

    constructionProjects.sort((a, b) => {
      return parseCompletionMonth(a.completionMonth) - parseCompletionMonth(b.completionMonth);
    });

    return NextResponse.json({
      projects: constructionProjects,
      count: constructionProjects.length,
    });
  } catch (error) {
    console.error("Failed to fetch construction projects:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "工事案件の取得に失敗しました" }, { status: 500 });
  }
}
