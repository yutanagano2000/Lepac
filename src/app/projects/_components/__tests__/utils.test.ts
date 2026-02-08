import { describe, it, expect } from "vitest";
import {
  formatCompletionMonth,
  formatCompletionMonthForFilter,
  getCellValue,
  getRawCellValue,
} from "../utils";

describe("formatCompletionMonth", () => {
  it("正常な日付文字列をフォーマットする", () => {
    expect(formatCompletionMonth("2024-12")).toBe("2024年12月");
    expect(formatCompletionMonth("2025-01")).toBe("2025年1月");
    expect(formatCompletionMonth("2024-06")).toBe("2024年6月");
  });

  it("nullの場合は空文字を返す", () => {
    expect(formatCompletionMonth(null)).toBe("");
  });

  it("undefinedの場合は空文字を返す", () => {
    expect(formatCompletionMonth(undefined)).toBe("");
  });

  it("空文字の場合は空文字を返す", () => {
    expect(formatCompletionMonth("")).toBe("");
  });
});

describe("formatCompletionMonthForFilter", () => {
  it("正常な日付文字列をフォーマットする", () => {
    expect(formatCompletionMonthForFilter("2024-12")).toBe("2024年12月");
    expect(formatCompletionMonthForFilter("2025-01")).toBe("2025年1月");
  });

  it("nullの場合は「未設定」を返す", () => {
    expect(formatCompletionMonthForFilter(null)).toBe("未設定");
  });

  it("undefinedの場合は「未設定」を返す", () => {
    expect(formatCompletionMonthForFilter(undefined)).toBe("未設定");
  });

  it("空文字の場合は「未設定」を返す", () => {
    expect(formatCompletionMonthForFilter("")).toBe("未設定");
  });
});

describe("getCellValue", () => {
  const mockProject = {
    id: 1,
    managementNumber: "P001",
    manager: "田中太郎",
    completionMonth: "2024-12",
    emptyField: null,
    undefinedField: undefined,
    numericField: 123,
  };

  it("文字列値を取得する", () => {
    expect(getCellValue(mockProject, "managementNumber")).toBe("P001");
    expect(getCellValue(mockProject, "manager")).toBe("田中太郎");
  });

  it("nullの場合は'-'を返す", () => {
    expect(getCellValue(mockProject, "emptyField")).toBe("-");
  });

  it("undefinedの場合は'-'を返す", () => {
    expect(getCellValue(mockProject, "undefinedField")).toBe("-");
  });

  it("存在しないキーの場合は'-'を返す", () => {
    expect(getCellValue(mockProject, "nonExistentField")).toBe("-");
  });

  it("completionMonthをフォーマットする", () => {
    expect(getCellValue(mockProject, "completionMonth")).toBe("2024年12月");
  });

  it("completionMonthがnullの場合は'-'を返す", () => {
    const projectWithNullCompletion = { completionMonth: null };
    expect(getCellValue(projectWithNullCompletion, "completionMonth")).toBe("-");
  });

  it("数値を文字列に変換する", () => {
    expect(getCellValue(mockProject, "numericField")).toBe("123");
  });
});

describe("getRawCellValue", () => {
  const mockProject = {
    id: 1,
    managementNumber: "P001",
    completionMonth: "2024-12",
    emptyField: null,
    undefinedField: undefined,
    numericField: 456,
  };

  it("文字列値を取得する", () => {
    expect(getRawCellValue(mockProject, "managementNumber")).toBe("P001");
    expect(getRawCellValue(mockProject, "completionMonth")).toBe("2024-12");
  });

  it("nullの場合は空文字を返す", () => {
    expect(getRawCellValue(mockProject, "emptyField")).toBe("");
  });

  it("undefinedの場合は空文字を返す", () => {
    expect(getRawCellValue(mockProject, "undefinedField")).toBe("");
  });

  it("存在しないキーの場合は空文字を返す", () => {
    expect(getRawCellValue(mockProject, "nonExistentField")).toBe("");
  });

  it("数値を文字列に変換する", () => {
    expect(getRawCellValue(mockProject, "numericField")).toBe("456");
  });
});
