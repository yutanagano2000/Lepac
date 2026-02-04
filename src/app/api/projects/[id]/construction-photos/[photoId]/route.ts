import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { db } from "@/db";
import { constructionPhotos } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

// 工事写真削除
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  const { id, photoId } = await params;
  const projectId = Number(id);
  const photoIdNum = Number(photoId);

  if (isNaN(projectId) || isNaN(photoIdNum)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    // 写真情報を取得
    const [photo] = await db
      .select()
      .from(constructionPhotos)
      .where(
        and(
          eq(constructionPhotos.id, photoIdNum),
          eq(constructionPhotos.projectId, projectId)
        )
      )
      .limit(1);

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Blobから削除
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (token && photo.fileUrl) {
      try {
        await del(photo.fileUrl, { token });
      } catch (blobError) {
        console.error("Failed to delete from blob:", blobError);
      }
    }

    // DBから削除
    await db
      .delete(constructionPhotos)
      .where(eq(constructionPhotos.id, photoIdNum));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete photo error:", error);
    return NextResponse.json(
      { error: "Failed to delete photo" },
      { status: 500 }
    );
  }
}
