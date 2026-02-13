import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/auth-guard";

const BACKEND_URL =
  process.env.GEO_CHECKER_BACKEND_URL ||
  "https://geo-checker-backend-aj4j.onrender.com";

// 許可するバックエンドホストのホワイトリスト（SSRF対策）
const ALLOWED_BACKEND_HOSTS = [
  "geo-checker-backend-aj4j.onrender.com",
  "localhost",
  "127.0.0.1",
];

// リクエストボディの最大サイズ（10KB）
const MAX_BODY_SIZE = 10 * 1024;

// API呼び出しタイムアウト（30秒）
const API_TIMEOUT_MS = 30000;

/**
 * バックエンドURLの検証（SSRF対策）
 */
function isAllowedBackendUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // httpsまたはlocalhostのhttpのみ許可
    if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1"))) {
      return false;
    }
    return ALLOWED_BACKEND_HOSTS.includes(parsed.hostname);
  } catch {
    return false;
  }
}

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
    // バックエンドURLの検証（SSRF対策）
    if (!isAllowedBackendUrl(BACKEND_URL)) {
      console.error("Invalid backend URL configured:", BACKEND_URL);
      return NextResponse.json(
        { error: "サーバー設定エラー" },
        { status: 500 }
      );
    }

    // Content-Lengthのチェック（事前チェック、ただし偽装可能なため後で再検証）
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
      return NextResponse.json(
        { error: "リクエストサイズが大きすぎます" },
        { status: 413 }
      );
    }

    // ボディをテキストとして取得してサイズ検証
    const bodyText = await request.text();
    if (bodyText.length > MAX_BODY_SIZE) {
      return NextResponse.json(
        { error: "リクエストサイズが大きすぎます" },
        { status: 413 }
      );
    }

    let body: unknown;
    try {
      body = JSON.parse(bodyText);
    } catch {
      return NextResponse.json(
        { error: "無効なJSONです" },
        { status: 400 }
      );
    }

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
    const bodyObj = body as Record<string, unknown>;
    for (const field of ALLOWED_FIELDS) {
      if (field in bodyObj) {
        sanitizedBody[field] = bodyObj[field];
      }
    }

    // タイムアウト設定でハングを防止
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(`${BACKEND_URL}/api/v1/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sanitizedBody),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    // AbortErrorはタイムアウトとして処理
    if (error instanceof Error && error.name === "AbortError") {
      console.error("Legal check API timeout");
      return NextResponse.json(
        { error: "法令チェックがタイムアウトしました" },
        { status: 504 }
      );
    }
    // エラー詳細はログに出力し、クライアントには汎用メッセージを返す
    console.error("Legal check proxy error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { error: "法令チェックバックエンドへの接続に失敗しました" },
      { status: 502 }
    );
  }
}
