import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects, progress } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  // 全案件を取得
  const allProjects = await db.select().from(projects);
  const allProgress = await db.select().from(progress);

  // デバッグ: 日付フィールドの確認
  if (allProjects.length > 0) {
    const sample = allProjects[0];
    console.log("[Construction GET] Sample project date fields:", {
      id: sample.id,
      mountOrderDate: sample.mountOrderDate,
      mountDeliveryScheduled: sample.mountDeliveryScheduled,
      panelOrderDate: sample.panelOrderDate,
      panelDeliveryScheduled: sample.panelDeliveryScheduled,
      constructionAvailableDate: sample.constructionAvailableDate,
    });
  }

  // 完工済みでない案件のみ抽出
  const activeProjects = allProjects.filter((p) => {
    const projectProgress = allProgress.filter((prog) => prog.projectId === p.id);
    const completionProgress = projectProgress.find((prog) => prog.title === "完工");
    return !completionProgress || completionProgress.status !== "completed";
  });

  // 工事部向けに必要なフィールドのみ抽出
  const constructionProjects = activeProjects.map((p) => ({
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
