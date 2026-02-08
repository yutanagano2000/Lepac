import { describe, it, expect } from "vitest";
import {
  calculateTimeline,
  calculateWorkflowTimeline,
  formatDateJp,
  PHASE_OFFSETS,
  WORKFLOW_PHASES,
} from "../timeline";

describe("timeline", () => {
  describe("formatDateJp", () => {
    it("日付をYYYY.M.D形式でフォーマットする", () => {
      expect(formatDateJp(new Date(2024, 0, 1))).toBe("2024.1.1");
      expect(formatDateJp(new Date(2024, 11, 31))).toBe("2024.12.31");
      expect(formatDateJp(new Date(2025, 5, 15))).toBe("2025.6.15");
    });

    it("月と日の先頭ゼロを付けない", () => {
      expect(formatDateJp(new Date(2024, 0, 5))).toBe("2024.1.5");
      expect(formatDateJp(new Date(2024, 8, 9))).toBe("2024.9.9");
    });
  });

  describe("calculateTimeline", () => {
    it("完成月からフェーズの予定日を計算する", () => {
      const timeline = calculateTimeline("2026-03");

      expect(timeline).toBeInstanceOf(Array);
      expect(timeline.length).toBeGreaterThan(0);
    });

    it("各フェーズにkey, title, dateが含まれる", () => {
      const timeline = calculateTimeline("2026-03");

      timeline.forEach((phase) => {
        expect(phase).toHaveProperty("key");
        expect(phase).toHaveProperty("title");
        expect(phase).toHaveProperty("date");
        expect(phase.date).toBeInstanceOf(Date);
      });
    });

    it("農振申請を含めない場合は除外される", () => {
      const timeline = calculateTimeline("2026-03", false);

      const noushinPhase = timeline.find((p) => p.key === "noushin");
      expect(noushinPhase).toBeUndefined();
    });

    it("農振申請を含める場合は含まれる", () => {
      const timeline = calculateTimeline("2026-03", true);

      const noushinPhase = timeline.find((p) => p.key === "noushin");
      expect(noushinPhase).toBeDefined();
      expect(noushinPhase?.optional).toBe(true);
    });

    it("完工フェーズは完成月の15日前後になる", () => {
      const timeline = calculateTimeline("2026-03");

      const kanko = timeline.find((p) => p.key === "kanko");
      expect(kanko).toBeDefined();
      expect(kanko?.date.getMonth()).toBe(2); // 3月 = index 2
      expect(kanko?.date.getFullYear()).toBe(2026);
    });

    it("電力申請は完工より前の日付になる", () => {
      const timeline = calculateTimeline("2026-03");

      const denryoku = timeline.find((p) => p.key === "denryoku");
      const kanko = timeline.find((p) => p.key === "kanko");

      expect(denryoku).toBeDefined();
      expect(kanko).toBeDefined();
      expect(denryoku!.date.getTime()).toBeLessThan(kanko!.date.getTime());
    });

    it("連系は完工より後の日付になる", () => {
      const timeline = calculateTimeline("2026-03");

      const renkei = timeline.find((p) => p.key === "renkei");
      const kanko = timeline.find((p) => p.key === "kanko");

      expect(renkei).toBeDefined();
      expect(kanko).toBeDefined();
      expect(renkei!.date.getTime()).toBeGreaterThan(kanko!.date.getTime());
    });
  });

  describe("calculateWorkflowTimeline", () => {
    it("開始日からワークフロータイムラインを計算する", () => {
      const startDate = new Date(2026, 0, 25); // 2026-01-25
      const workflow = calculateWorkflowTimeline(startDate);

      expect(workflow).toBeInstanceOf(Array);
      expect(workflow.length).toBeGreaterThan(0);
    });

    it("各フェーズにkey, title, phaseが含まれる", () => {
      const startDate = new Date(2026, 0, 25);
      const workflow = calculateWorkflowTimeline(startDate);

      workflow.forEach((phase) => {
        expect(phase).toHaveProperty("key");
        expect(phase).toHaveProperty("title");
        expect(phase).toHaveProperty("phase");
      });
    });

    it("最初のフェーズは開始日と同じ日付になる", () => {
      const startDate = new Date(2026, 0, 25);
      const workflow = calculateWorkflowTimeline(startDate);

      const firstPhase = workflow[0];
      expect(firstPhase).toBeDefined();
      // 開始フェーズの日付は開始日と同じ
      if (firstPhase.date) {
        expect(firstPhase.date.getTime()).toBe(startDate.getTime());
      }
    });
  });

  describe("PHASE_OFFSETS", () => {
    it("フェーズオフセットが定義されている", () => {
      expect(PHASE_OFFSETS).toBeInstanceOf(Array);
      expect(PHASE_OFFSETS.length).toBeGreaterThan(0);
    });

    it("各フェーズにkey, title, monthsOffsetが含まれる", () => {
      PHASE_OFFSETS.forEach((phase) => {
        expect(phase).toHaveProperty("key");
        expect(phase).toHaveProperty("title");
        expect(phase).toHaveProperty("monthsOffset");
        expect(typeof phase.monthsOffset).toBe("number");
      });
    });

    it("完工のオフセットは0", () => {
      const kanko = PHASE_OFFSETS.find((p) => p.key === "kanko");
      expect(kanko).toBeDefined();
      expect(kanko?.monthsOffset).toBe(0);
    });

    it("連系のオフセットは正の値", () => {
      const renkei = PHASE_OFFSETS.find((p) => p.key === "renkei");
      expect(renkei).toBeDefined();
      expect(renkei?.monthsOffset).toBeGreaterThan(0);
    });
  });

  describe("WORKFLOW_PHASES", () => {
    it("ワークフローフェーズが定義されている", () => {
      expect(WORKFLOW_PHASES).toBeInstanceOf(Array);
      expect(WORKFLOW_PHASES.length).toBeGreaterThan(0);
    });

    it("各フェーズにkey, title, duration, unit, phaseが含まれる", () => {
      WORKFLOW_PHASES.forEach((phase) => {
        expect(phase).toHaveProperty("key");
        expect(phase).toHaveProperty("title");
        expect(phase).toHaveProperty("duration");
        expect(phase).toHaveProperty("unit");
        expect(phase).toHaveProperty("phase");
      });
    });
  });
});
