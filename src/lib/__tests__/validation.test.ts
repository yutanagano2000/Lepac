import { describe, it, expect } from "vitest";
import { parseValidId, parseDateAsLocal } from "../validation";

describe("バリデーションヘルパー", () => {
  describe("parseValidId", () => {
    it("正の整数IDを正しくパース", () => {
      expect(parseValidId("1")).toBe(1);
      expect(parseValidId("123")).toBe(123);
      expect(parseValidId("999999")).toBe(999999);
    });

    it("0は無効として拒否", () => {
      expect(parseValidId("0")).toBeNull();
    });

    it("負の数は無効として拒否", () => {
      expect(parseValidId("-1")).toBeNull();
      expect(parseValidId("-123")).toBeNull();
    });

    it("小数は無効として拒否", () => {
      expect(parseValidId("1.5")).toBeNull();
      expect(parseValidId("123.456")).toBeNull();
    });

    it("数字以外の文字を含むIDは拒否", () => {
      expect(parseValidId("abc")).toBeNull();
      expect(parseValidId("12abc")).toBeNull();
      expect(parseValidId("abc12")).toBeNull();
      expect(parseValidId("12 34")).toBeNull();
      expect(parseValidId("")).toBeNull();
    });

    it("先頭ゼロ付きの数値も有効", () => {
      expect(parseValidId("007")).toBe(7);
      expect(parseValidId("0123")).toBe(123);
    });

    it("非常に大きな数値も安全な整数範囲内なら有効", () => {
      expect(parseValidId("9007199254740991")).toBe(9007199254740991); // Number.MAX_SAFE_INTEGER
    });

    it("安全な整数範囲を超える数値は拒否", () => {
      expect(parseValidId("9007199254740992")).toBeNull(); // MAX_SAFE_INTEGER + 1
    });

    it("特殊文字を含むIDは拒否", () => {
      expect(parseValidId("1;DROP TABLE")).toBeNull();
      expect(parseValidId("1' OR '1'='1")).toBeNull();
      expect(parseValidId("<script>")).toBeNull();
    });
  });

  describe("parseDateAsLocal", () => {
    it("YYYY-MM-DD形式の日付を正しくパース", () => {
      const result = parseDateAsLocal("2025-01-15");
      expect(result).not.toBeNull();
      expect(result!.getFullYear()).toBe(2025);
      expect(result!.getMonth()).toBe(0); // 1月は0
      expect(result!.getDate()).toBe(15);
    });

    it("月初・月末の日付を正しく処理", () => {
      const jan1 = parseDateAsLocal("2025-01-01");
      expect(jan1!.getMonth()).toBe(0);
      expect(jan1!.getDate()).toBe(1);

      const dec31 = parseDateAsLocal("2025-12-31");
      expect(dec31!.getMonth()).toBe(11);
      expect(dec31!.getDate()).toBe(31);
    });

    it("nullまたはundefinedはnullを返す", () => {
      expect(parseDateAsLocal(null)).toBeNull();
      expect(parseDateAsLocal(undefined)).toBeNull();
    });

    it("空文字はnullを返す", () => {
      expect(parseDateAsLocal("")).toBeNull();
    });

    it("不正なフォーマットはnullを返す", () => {
      expect(parseDateAsLocal("2025/01/15")).toBeNull(); // スラッシュ区切り
      expect(parseDateAsLocal("15-01-2025")).toBeNull(); // 逆順
      expect(parseDateAsLocal("invalid")).toBeNull();
      expect(parseDateAsLocal("2025")).toBeNull(); // 年のみ
      expect(parseDateAsLocal("2025-01")).toBeNull(); // 年月のみ
    });

    it("ゼロパディングなしの日付も許容", () => {
      // 柔軟な実装：ゼロパディングなしも有効
      const result = parseDateAsLocal("2025-1-15");
      expect(result).not.toBeNull();
      expect(result!.getMonth()).toBe(0); // 1月
      expect(result!.getDate()).toBe(15);
    });

    it("範囲外の年はnullを返す", () => {
      expect(parseDateAsLocal("1899-01-01")).toBeNull(); // 1900未満
      expect(parseDateAsLocal("2101-01-01")).toBeNull(); // 2100超
    });

    it("範囲外の月はnullを返す", () => {
      expect(parseDateAsLocal("2025-00-15")).toBeNull(); // 0月
      expect(parseDateAsLocal("2025-13-15")).toBeNull(); // 13月
    });

    it("範囲外の日はnullを返す", () => {
      expect(parseDateAsLocal("2025-01-00")).toBeNull(); // 0日
      expect(parseDateAsLocal("2025-01-32")).toBeNull(); // 32日
    });

    it("ローカルタイムゾーンとして解釈される（UTCずれなし）", () => {
      const result = parseDateAsLocal("2025-01-01");
      // ローカルタイムゾーンの午前0時として作成されることを確認
      expect(result!.getHours()).toBe(0);
      expect(result!.getMinutes()).toBe(0);
      expect(result!.getSeconds()).toBe(0);
    });
  });
});
