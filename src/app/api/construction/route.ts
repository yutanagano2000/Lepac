import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects, progress } from "@/db/schema";
import { eq, and, notInArray } from "drizzle-orm";
import { requireOrganization } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

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

  // 組織に属するプロジェクトのIDを取得
  const orgProjects = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.organizationId, organizationId));

  const orgProjectIds = orgProjects.map(p => p.id);

  if (orgProjectIds.length === 0) {
    return NextResponse.json({ projects: [], count: 0 });
  }

  // 完工済みの案件IDを取得（サブクエリで効率化）
  const completedProjectIds = await db
    .select({ projectId: progress.projectId })
    .from(progress)
    .where(and(
      eq(progress.title, "完工"),
      eq(progress.status, "completed")
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
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

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

  // 完成月でソート（古い順）
  constructionProjects.sort((a, b) => {
    if (!a.completionMonth && !b.completionMonth) return 0;
    if (!a.completionMonth) return 1;
    if (!b.completionMonth) return -1;
    return a.completionMonth.localeCompare(b.completionMonth);
  });

  return NextResponse.json({
    projects: constructionProjects,
    count: constructionProjects.length,
  });
}
