import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatYyyyMd,
  formatDateShort,
  formatDateFull,
  formatDateJp,
  formatDateIso,
  parseDateText,
  parseIsoDate,
  formatRelativeDate,
} from "../date-formatters";

describe("Date Formatters", () => {
  describe("formatYyyyMd", () => {
    it("日付をYYYY.M.D形式でフォーマットする", () => {
      const date = new Date(2026, 0, 19); // 2026年1月19日
      expect(formatYyyyMd(date)).toBe("2026.1.19");
    });

    it("月・日が2桁の場合もゼロパディングなし", () => {
      const date = new Date(2026, 11, 25); // 2026年12月25日
      expect(formatYyyyMd(date)).toBe("2026.12.25");
    });

    it("nullの場合は空文字を返す", () => {
      expect(formatYyyyMd(null)).toBe("");
    });

    it("undefinedの場合は空文字を返す", () => {
      expect(formatYyyyMd(undefined)).toBe("");
    });
  });

  describe("formatDateShort", () => {
    it("日付をM/D形式でフォーマットする", () => {
      const date = new Date(2026, 0, 19);
      expect(formatDateShort(date)).toBe("1/19");
    });

    it("nullの場合は'-'を返す", () => {
      expect(formatDateShort(null)).toBe("-");
    });

    it("undefinedの場合は'-'を返す", () => {
      expect(formatDateShort(undefined)).toBe("-");
    });
  });

  describe("formatDateFull", () => {
    it("日付をYYYY.M.D形式でフォーマットする", () => {
      const date = new Date(2026, 0, 19);
      expect(formatDateFull(date)).toBe("2026.1.19");
    });

    it("nullの場合は'-'を返す", () => {
      expect(formatDateFull(null)).toBe("-");
    });

    it("undefinedの場合は'-'を返す", () => {
      expect(formatDateFull(undefined)).toBe("-");
    });
  });

  describe("formatDateJp", () => {
    it("日付を日本語形式でフォーマットする", () => {
      const date = new Date(2026, 0, 19);
      expect(formatDateJp(date)).toBe("2026年1月19日");
    });

    it("月・日が2桁の場合", () => {
      const date = new Date(2026, 11, 25);
      expect(formatDateJp(date)).toBe("2026年12月25日");
    });
  });

  describe("formatDateIso", () => {
    it("日付をYYYY-MM-DD形式でフォーマットする", () => {
      const date = new Date(2026, 0, 19);
      expect(formatDateIso(date)).toBe("2026-01-19");
    });

    it("月・日がゼロパディングされる", () => {
      const date = new Date(2026, 0, 5);
      expect(formatDateIso(date)).toBe("2026-01-05");
    });
  });

  describe("parseDateText", () => {
    it("YYYY.M.D形式をパースする", () => {
      const result = parseDateText("2026.1.19");
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2026);
      expect(result?.getMonth()).toBe(0);
      expect(result?.getDate()).toBe(19);
    });

    it("YYYY/M/D形式をパースする", () => {
      const result = parseDateText("2026/1/19");
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2026);
    });

    it("YYYY.MM.DD形式をパースする", () => {
      const result = parseDateText("2026.12.25");
      expect(result).toBeInstanceOf(Date);
      expect(result?.getMonth()).toBe(11);
      expect(result?.getDate()).toBe(25);
    });

    it("無効な形式はnullを返す", () => {
      expect(parseDateText("invalid")).toBeNull();
      expect(parseDateText("2026-01-19")).toBeNull(); // ハイフン形式は対応外
      expect(parseDateText("")).toBeNull();
    });
  });

  describe("parseIsoDate", () => {
    it("YYYY-MM-DD形式をパースする", () => {
      const result = parseIsoDate("2026-01-19");
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2026);
      expect(result?.getMonth()).toBe(0);
      expect(result?.getDate()).toBe(19);
    });

    it("空文字はnullを返す", () => {
      expect(parseIsoDate("")).toBeNull();
    });

    it("無効な日付文字列はnullを返す", () => {
      expect(parseIsoDate("invalid")).toBeNull();
    });
  });

  describe("formatRelativeDate", () => {
    let mockDate: Date;

    beforeEach(() => {
      // 2026年1月19日を「今日」として固定
      mockDate = new Date(2026, 0, 19);
      vi.useFakeTimers();
      vi.setSystemTime(mockDate);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("今日の日付は'今日'を返す", () => {
      const today = new Date(2026, 0, 19);
      expect(formatRelativeDate(today)).toBe("今日");
    });

    it("昨日の日付は'昨日'を返す", () => {
      const yesterday = new Date(2026, 0, 18);
      expect(formatRelativeDate(yesterday)).toBe("昨日");
    });

    it("明日の日付は'明日'を返す", () => {
      const tomorrow = new Date(2026, 0, 20);
      expect(formatRelativeDate(tomorrow)).toBe("明日");
    });

    it("3日前の日付は'3日前'を返す", () => {
      const threeDaysAgo = new Date(2026, 0, 16);
      expect(formatRelativeDate(threeDaysAgo)).toBe("3日前");
    });

    it("3日後の日付は'3日後'を返す", () => {
      const threeDaysLater = new Date(2026, 0, 22);
      expect(formatRelativeDate(threeDaysLater)).toBe("3日後");
    });

    it("7日前の日付は'7日前'を返す", () => {
      const sevenDaysAgo = new Date(2026, 0, 12);
      expect(formatRelativeDate(sevenDaysAgo)).toBe("7日前");
    });

    it("8日以上前の日付はYYYY.M.D形式を返す", () => {
      const eightDaysAgo = new Date(2026, 0, 11);
      expect(formatRelativeDate(eightDaysAgo)).toBe("2026.1.11");
    });

    it("8日以上後の日付はYYYY.M.D形式を返す", () => {
      const eightDaysLater = new Date(2026, 0, 27);
      expect(formatRelativeDate(eightDaysLater)).toBe("2026.1.27");
    });
  });
});
