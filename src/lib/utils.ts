import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// TODOメッセージの型定義
export interface TodoMessage {
  message: string;
  createdAt: string; // ISO 8601形式
}

// completedMemoからメッセージ配列を取得（後方互換性あり）
export function parseTodoMessages(completedMemo: string | null): TodoMessage[] {
  if (!completedMemo) return [];

  try {
    const parsed = JSON.parse(completedMemo);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // JSONではない場合、旧形式の文字列として扱う
    return [{
      message: completedMemo,
      createdAt: new Date().toISOString()
    }];
  }

  return [];
}

// メッセージ配列をJSON文字列に変換
export function stringifyTodoMessages(messages: TodoMessage[]): string | null {
  if (messages.length === 0) return null;
  return JSON.stringify(messages);
}

// 新しいメッセージを追加
export function addTodoMessage(
  completedMemo: string | null,
  newMessage: string
): string {
  const messages = parseTodoMessages(completedMemo);
  messages.push({
    message: newMessage,
    createdAt: new Date().toISOString()
  });
  return JSON.stringify(messages);
}
