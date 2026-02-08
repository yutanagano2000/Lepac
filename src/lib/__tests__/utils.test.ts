import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  cn,
  parseTodoMessages,
  stringifyTodoMessages,
  addTodoMessage,
  type TodoMessage,
} from "../utils";

describe("utils", () => {
  describe("cn", () => {
    it("クラス名をマージする", () => {
      expect(cn("foo", "bar")).toBe("foo bar");
    });

    it("条件付きクラスをマージする", () => {
      expect(cn("foo", true && "bar", false && "baz")).toBe("foo bar");
    });

    it("Tailwindクラスを適切にマージする", () => {
      expect(cn("p-4", "p-2")).toBe("p-2");
      expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
    });

    it("undefinedやnullを無視する", () => {
      expect(cn("foo", undefined, null, "bar")).toBe("foo bar");
    });

    it("オブジェクト形式のクラスをマージする", () => {
      expect(cn({ foo: true, bar: false })).toBe("foo");
    });

    it("配列形式のクラスをマージする", () => {
      expect(cn(["foo", "bar"])).toBe("foo bar");
    });
  });

  describe("parseTodoMessages", () => {
    it("nullの場合は空配列を返す", () => {
      expect(parseTodoMessages(null)).toEqual([]);
    });

    it("空文字列の場合は空配列を返す", () => {
      expect(parseTodoMessages("")).toEqual([]);
    });

    it("JSON配列を正しくパースする", () => {
      const messages: TodoMessage[] = [
        { message: "タスク完了", createdAt: "2024-12-01T10:00:00.000Z" },
        { message: "追加コメント", createdAt: "2024-12-02T10:00:00.000Z" },
      ];
      const json = JSON.stringify(messages);

      const result = parseTodoMessages(json);
      expect(result).toEqual(messages);
    });

    it("旧形式の文字列は単一メッセージとして扱う", () => {
      const result = parseTodoMessages("タスクを完了しました");

      expect(result.length).toBe(1);
      expect(result[0].message).toBe("タスクを完了しました");
      expect(result[0].createdAt).toBeDefined();
    });

    it("無効なJSONは旧形式として扱う", () => {
      const result = parseTodoMessages("これはJSONではない");

      expect(result.length).toBe(1);
      expect(result[0].message).toBe("これはJSONではない");
    });

    it("JSON配列以外のJSONは空配列を返す", () => {
      const result = parseTodoMessages('{"key": "value"}');

      expect(result).toEqual([]);
    });
  });

  describe("stringifyTodoMessages", () => {
    it("空配列の場合はnullを返す", () => {
      expect(stringifyTodoMessages([])).toBeNull();
    });

    it("メッセージ配列をJSON文字列に変換する", () => {
      const messages: TodoMessage[] = [
        { message: "タスク完了", createdAt: "2024-12-01T10:00:00.000Z" },
      ];

      const result = stringifyTodoMessages(messages);
      expect(result).toBe(JSON.stringify(messages));
    });

    it("複数のメッセージを正しく変換する", () => {
      const messages: TodoMessage[] = [
        { message: "タスク完了", createdAt: "2024-12-01T10:00:00.000Z" },
        { message: "追加コメント", createdAt: "2024-12-02T10:00:00.000Z" },
      ];

      const result = stringifyTodoMessages(messages);
      expect(JSON.parse(result!)).toEqual(messages);
    });
  });

  describe("addTodoMessage", () => {
    // 日付を固定するためのモック
    const fixedDate = new Date("2024-12-15T10:00:00.000Z");

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(fixedDate);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("nullに新しいメッセージを追加する", () => {
      const result = addTodoMessage(null, "新しいタスク");
      const parsed = JSON.parse(result);

      expect(parsed.length).toBe(1);
      expect(parsed[0].message).toBe("新しいタスク");
      expect(parsed[0].createdAt).toBe(fixedDate.toISOString());
    });

    it("既存のメッセージに新しいメッセージを追加する", () => {
      const existing: TodoMessage[] = [
        { message: "既存のタスク", createdAt: "2024-12-01T10:00:00.000Z" },
      ];
      const existingJson = JSON.stringify(existing);

      const result = addTodoMessage(existingJson, "新しいタスク");
      const parsed = JSON.parse(result);

      expect(parsed.length).toBe(2);
      expect(parsed[0].message).toBe("既存のタスク");
      expect(parsed[1].message).toBe("新しいタスク");
    });

    it("旧形式の文字列に新しいメッセージを追加する", () => {
      const result = addTodoMessage("古いメモ", "新しいタスク");
      const parsed = JSON.parse(result);

      expect(parsed.length).toBe(2);
      expect(parsed[0].message).toBe("古いメモ");
      expect(parsed[1].message).toBe("新しいタスク");
    });
  });
});
