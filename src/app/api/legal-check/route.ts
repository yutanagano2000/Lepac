import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/auth-guard";

const BACKEND_URL =
  process.env.GEO_CHECKER_BACKEND_URL ||
  "https://geo-checker-backend-aj4j.onrender.com";

// リクエストボディの最大サイズ（10KB）
const MAX_BODY_SIZE = 10 * 1024;

// 許可するフィールドのホワイトリスト
const ALLOWED_FIELDS = ["latitude", "longitude", "address", "projectId", "checkTypes"];

/**
 * リクエストボディのバリデーション
 */
function validateRequestBody(body: unknown): { valid: boolean; error?: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { valid: false, error: "無効なリクエスト形式です" };
  }

  const bodyObj = body as Record<string, unknown>;

  // 許可されたフィールドのみを通す
  const invalidFields = Object.keys(bodyObj).filter(key => !ALLOWED_FIELDS.includes(key));
  if (invalidFields.length > 0) {
    return { valid: false, error: "無効なフィールドが含まれています" };
  }

  // 緯度経度のバリデーション
  if ("latitude" in bodyObj) {
    const lat = bodyObj.latitude;
    if (typeof lat !== "number" || lat < -90 || lat > 90) {
      return { valid: false, error: "緯度は-90から90の範囲で指定してください" };
    }
  }

  if ("longitude" in bodyObj) {
    const lng = bodyObj.longitude;
    if (typeof lng !== "number" || lng < -180 || lng > 180) {
      return { valid: false, error: "経度は-180から180の範囲で指定してください" };
    }
  }

  // 住所のバリデーション
  if ("address" in bodyObj) {
    const addr = bodyObj.address;
    if (typeof addr !== "string" || addr.length > 500) {
      return { valid: false, error: "住所は500文字以内で入力してください" };
    }
  }

  // projectIdのバリデーション
  if ("projectId" in bodyObj) {
    const pid = bodyObj.projectId;
    if (typeof pid !== "string" || pid.length > 100 || !/^[a-zA-Z0-9_-]*$/.test(pid)) {
      return { valid: false, error: "無効なプロジェクトIDです" };
    }
  }

  // checkTypesのバリデーション（配列型かつ文字列要素のみ）
  if ("checkTypes" in bodyObj) {
    const types = bodyObj.checkTypes;
    if (!Array.isArray(types) || types.length > 20) {
      return { valid: false, error: "checkTypesは配列で20件以内で指定してください" };
    }
    const validCheckTypes = ["flood", "landslide", "tsunami", "earthquake", "volcano", "soil"];
    for (const t of types) {
      if (typeof t !== "string" || !validCheckTypes.includes(t)) {
        return { valid: false, error: "無効なチェックタイプが含まれています" };
      }
    }
  }

  return { valid: true };
}

export async function POST(request: NextRequest) {
  // 認証チェック
  const authResult = await requireOrganization();
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    // Content-Lengthのチェック
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
      return NextResponse.json(
        { error: "リクエストサイズが大きすぎます" },
        { status: 413 }
      );
    }

    const body = await request.json();

    // リクエストボディのバリデーション
    const validation = validateRequestBody(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // 許可されたフィールドのみを転送
    const sanitizedBody: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (field in body) {
        sanitizedBody[field] = body[field];
      }
    }

    const response = await fetch(`${BACKEND_URL}/api/v1/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sanitizedBody),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    // エラー詳細はログに出力し、クライアントには汎用メッセージを返す
    console.error("Legal check proxy error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { error: "法令チェックバックエンドへの接続に失敗しました" },
      { status: 502 }
    );
  }
}
