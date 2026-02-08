import { NextResponse } from "next/server";
import { db } from "@/db";
import { mapAnnotations } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireProjectAccess } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

// GET: プロジェクトの全アノテーション取得
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = Number(id);

  if (isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  const authResult = await requireProjectAccess(projectId);
  if (!authResult.success) {
    return authResult.response;
  }

  const annotations = await db
    .select()
    .from(mapAnnotations)
    .where(eq(mapAnnotations.projectId, projectId))
    .orderBy(desc(mapAnnotations.updatedAt));

  return NextResponse.json(annotations);
}

// POST: アノテーション作成/更新 (upsert)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = Number(id);

  if (isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  const authResult = await requireProjectAccess(projectId);
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const { id: annotationId, name, geoJson, mapCenter, mapZoom, tileLayer } = body;

    if (!geoJson) {
      return NextResponse.json({ error: "geoJson is required" }, { status: 400 });
    }

    const now = new Date().toISOString();

    if (annotationId) {
      // Update
      const [updated] = await db
        .update(mapAnnotations)
        .set({
          name: name || "無題の案内図",
          geoJson,
          mapCenter,
          mapZoom,
          tileLayer,
          updatedAt: now,
        })
        .where(eq(mapAnnotations.id, annotationId))
        .returning();

      return NextResponse.json(updated);
    } else {
      // Create
      const [created] = await db
        .insert(mapAnnotations)
        .values({
          projectId,
          name: name || "無題の案内図",
          geoJson,
          mapCenter,
          mapZoom,
          tileLayer,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return NextResponse.json(created);
    }
  } catch (error) {
    console.error("Map annotation save error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to save annotation: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// DELETE: アノテーション削除
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = Number(id);

  if (isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  const authResult = await requireProjectAccess(projectId);
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const annotationId = searchParams.get("annotationId");

    if (!annotationId) {
      return NextResponse.json(
        { error: "annotationId query parameter is required" },
        { status: 400 }
      );
    }

    const deleted = await db
      .delete(mapAnnotations)
      .where(eq(mapAnnotations.id, Number(annotationId)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: "Annotation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, deleted: deleted[0] });
  } catch (error) {
    console.error("Map annotation delete error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to delete annotation: ${errorMessage}` },
      { status: 500 }
    );
  }
}
