import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/auth-guard";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import * as fs from "fs";

export const dynamic = "force-dynamic";

const CABINET_BASE_PATH = process.env.CABINET_BASE_PATH || "C:\\Person Energy\\◇Person独自案件管理\\□Person独自案件";

interface FolderInfo {
  folderName: string;
  managementNumber: string;
  manager: string;
  projectNumber: string;
}

/**
 * フォルダ一覧を取得し、既存案件と比較
 * GET /api/projects/import
 */
export async function GET(request: Request) {
  const authResult = await requireOrganization();
  if (!authResult.success) {
    return authResult.response;
  }

  const { organizationId } = authResult;

  try {
    // フォルダ一覧を取得
    if (!fs.existsSync(CABINET_BASE_PATH)) {
      return NextResponse.json({ error: "フォルダが見つかりません" }, { status: 404 });
    }

    const entries = fs.readdirSync(CABINET_BASE_PATH, { withFileTypes: true });

    // 案件フォルダのみ抽出（管理番号-担当者　案件番号 形式）
    const folders: FolderInfo[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith(".") || entry.name.startsWith("■") || entry.name.startsWith("◆") || entry.name.startsWith("【")) continue;

      // パターン: "0001-佐東　P3327" or "0001-佐東　P3327　備考"
      const match = entry.name.match(/^(\d+)-([^\s　]+)[\s　]+([A-Za-z]+\d+)/);
      if (match) {
        folders.push({
          folderName: entry.name,
          managementNumber: match[1],
          manager: match[2],
          projectNumber: match[3].trim(),
        });
      }
    }

    // 既存案件を取得
    const existingProjects = await db
      .select({
        managementNumber: projects.managementNumber,
        projectNumber: projects.projectNumber,
      })
      .from(projects)
      .where(eq(projects.organizationId, organizationId));

    const existingSet = new Set(
      existingProjects.map(p => `${p.managementNumber}-${p.projectNumber}`)
    );

    // 未登録フォルダのみ抽出
    const importable = folders.filter(
      f => !existingSet.has(`${f.managementNumber}-${f.projectNumber}`)
    );

    const alreadyRegistered = folders.filter(
      f => existingSet.has(`${f.managementNumber}-${f.projectNumber}`)
    );

    return NextResponse.json({
      importable,
      alreadyRegistered,
      totalFolders: folders.length,
    });
  } catch (error) {
    console.error("Import list error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

/**
 * 選択した案件を一括登録
 * POST /api/projects/import
 * Body: { folders: FolderInfo[] }
 */
export async function POST(request: Request) {
  const authResult = await requireOrganization();
  if (!authResult.success) {
    return authResult.response;
  }

  const { organizationId } = authResult;

  try {
    const body = await request.json();
    const { folders } = body as { folders: FolderInfo[] };

    if (!folders || !Array.isArray(folders) || folders.length === 0) {
      return NextResponse.json({ error: "登録する案件を選択してください" }, { status: 400 });
    }

    // 重複チェック
    const existingProjects = await db
      .select({
        managementNumber: projects.managementNumber,
        projectNumber: projects.projectNumber,
      })
      .from(projects)
      .where(eq(projects.organizationId, organizationId));

    const existingSet = new Set(
      existingProjects.map(p => `${p.managementNumber}-${p.projectNumber}`)
    );

    const toInsert = folders.filter(
      f => !existingSet.has(`${f.managementNumber}-${f.projectNumber}`)
    );

    if (toInsert.length === 0) {
      return NextResponse.json({ error: "登録可能な案件がありません" }, { status: 400 });
    }

    // 一括登録
    const inserted = await db.insert(projects).values(
      toInsert.map(f => ({
        organizationId,
        managementNumber: f.managementNumber,
        manager: f.manager,
        client: "", // 販売先は後から入力
        projectNumber: f.projectNumber,
        status: "active" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }))
    ).returning({ id: projects.id });

    return NextResponse.json({
      success: true,
      count: inserted.length,
      message: `${inserted.length}件の案件を登録しました`,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({ error: "登録に失敗しました" }, { status: 500 });
  }
}
