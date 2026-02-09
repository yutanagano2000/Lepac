import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/auth-guard";

// Yahoo! JAPAN ルビ振りAPI (V2)
// https://developer.yahoo.co.jp/webapi/jlp/furigana/v2/furigana.html
const YAHOO_API_ENDPOINT = "https://jlp.yahooapis.jp/FuriganaService/V2/furigana";

// 入力制限
const MAX_NAME_LENGTH = 100;

interface YahooWord {
  surface: string;
  furigana?: string;
  roman?: string;
  subword?: YahooWord[];
}

interface YahooApiResponse {
  id: string;
  jsonrpc: string;
  result?: {
    word: YahooWord[];
  };
  error?: {
    code: number;
    message: string;
  };
}

/**
 * ひらがなをカタカナに変換
 */
function hiraganaToKatakana(str: string): string {
  return str.replace(/[\u3041-\u3096]/g, (match) =>
    String.fromCharCode(match.charCodeAt(0) + 0x60)
  );
}

/**
 * 漢字の名前をカタカナのフリガナに変換
 * POST /api/furigana
 * Body: { name: string }
 * Response: { furigana: string }
 */
export async function POST(request: NextRequest) {
  // 認証チェック
  const authResult = await requireOrganization();
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "名前を入力してください" },
        { status: 400 }
      );
    }

    // 入力長の制限（DoS対策）
    if (name.length > MAX_NAME_LENGTH) {
      return NextResponse.json(
        { error: `名前は${MAX_NAME_LENGTH}文字以内で入力してください` },
        { status: 400 }
      );
    }

    // 空白や記号のみの場合はスキップ
    const trimmedName = name.trim();
    if (!trimmedName) {
      return NextResponse.json({ furigana: "" });
    }

    // Yahoo! Client IDを取得
    const clientId = process.env.YAHOO_CLIENT_ID;

    if (!clientId) {
      // Client IDが未設定の場合はフォールバック（空文字を返す）
      console.warn("YAHOO_CLIENT_ID is not set. Furigana conversion is disabled.");
      return NextResponse.json({ furigana: "" });
    }

    // Yahoo! ルビ振りAPIにリクエスト (JSON-RPC 2.0形式)
    const response = await fetch(YAHOO_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": `Yahoo AppID: ${clientId}`,
      },
      body: JSON.stringify({
        id: "furigana-request",
        jsonrpc: "2.0",
        method: "jlp.furiganaservice.furigana",
        params: {
          q: trimmedName,
          grade: 1, // 小学1年生レベル = すべての漢字にふりがなを付ける
        },
      }),
    });

    if (!response.ok) {
      console.error("Yahoo API HTTP error:", response.status, response.statusText);
      return NextResponse.json(
        { error: "フリガナ変換に失敗しました" },
        { status: 500 }
      );
    }

    const data = (await response.json()) as YahooApiResponse;

    // エラーチェック
    if (data.error) {
      console.error("Yahoo API error:", data.error);
      return NextResponse.json(
        { error: "フリガナ変換に失敗しました" },
        { status: 500 }
      );
    }

    // ふりがなを結合（Yahoo APIはひらがなで返すのでカタカナに変換）
    let furigana = "";
    if (data.result?.word) {
      furigana = data.result.word
        .map((word) => word.furigana || word.surface)
        .join("");
    }

    // ひらがな → カタカナ変換
    const katakanaFurigana = hiraganaToKatakana(furigana);

    return NextResponse.json({
      furigana: katakanaFurigana,
    });
  } catch (error) {
    console.error("Furigana API error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
