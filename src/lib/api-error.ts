import { NextResponse } from "next/server";

// 環境判定
const isProduction = process.env.NODE_ENV === "production";

// エラーレスポンスの型
interface ApiErrorResponse {
  error: string;
  details?: unknown;
}

// APIエラークラス
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public userMessage: string,
    public internalMessage?: string
  ) {
    super(internalMessage || userMessage);
    this.name = "ApiError";
  }

  static badRequest(userMessage: string, internalMessage?: string) {
    return new ApiError(400, userMessage, internalMessage);
  }

  static unauthorized(userMessage = "認証が必要です", internalMessage?: string) {
    return new ApiError(401, userMessage, internalMessage);
  }

  static forbidden(userMessage = "アクセス権限がありません", internalMessage?: string) {
    return new ApiError(403, userMessage, internalMessage);
  }

  static notFound(userMessage = "リソースが見つかりません", internalMessage?: string) {
    return new ApiError(404, userMessage, internalMessage);
  }

  static conflict(userMessage: string, internalMessage?: string) {
    return new ApiError(409, userMessage, internalMessage);
  }

  static internal(userMessage = "サーバーエラーが発生しました", internalMessage?: string) {
    return new ApiError(500, userMessage, internalMessage);
  }
}

// エラーレスポンスを生成
export function createErrorResponse(
  error: unknown,
  defaultMessage = "処理中にエラーが発生しました"
): NextResponse<ApiErrorResponse> {
  // ApiErrorの場合
  if (error instanceof ApiError) {
    // 本番環境ではユーザー向けメッセージのみ
    // 開発環境では詳細情報も含める
    const response: ApiErrorResponse = {
      error: error.userMessage,
    };

    if (!isProduction && error.internalMessage) {
      response.details = error.internalMessage;
    }

    // 内部エラーをログ出力（本番・開発共通）
    if (error.statusCode >= 500) {
      console.error(`[API Error ${error.statusCode}]`, error.internalMessage || error.userMessage);
    }

    return NextResponse.json(response, { status: error.statusCode });
  }

  // 通常のErrorの場合
  if (error instanceof Error) {
    // 本番環境では詳細を隠す
    const response: ApiErrorResponse = {
      error: isProduction ? defaultMessage : error.message,
    };

    if (!isProduction) {
      response.details = error.stack;
    }

    // エラーをログ出力
    console.error("[API Error]", error.message, error.stack);

    return NextResponse.json(response, { status: 500 });
  }

  // その他の場合
  console.error("[API Error] Unknown error:", error);
  return NextResponse.json({ error: defaultMessage }, { status: 500 });
}

// APIハンドラーをラップしてエラーハンドリングを統一
export function withErrorHandler<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return createErrorResponse(error);
    }
  };
}

// バリデーションエラーレスポンスを生成
export function createValidationErrorResponse(
  details: { field: string; message: string }[]
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    error: "入力内容に誤りがあります",
  };

  if (!isProduction) {
    response.details = details;
  }

  return NextResponse.json(response, { status: 400 });
}
