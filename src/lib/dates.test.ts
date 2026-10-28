import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  diffDays,
  formatRange,
  formatTime,
  isoWeek,
  monthGrid,
  parseTime,
  startOfWeek,
  weekDays,
} from "./dates";

describe("dates", () => {
  it("builds the design's Sunday-first week around Tue Nov 10, 2026", () => {
    expect(weekDays("2026-11-10", 0)).toEqual([
      "2026-11-08",
      "2026-11-09",
      "2026-11-10",
      "2026-11-11",
      "2026-11-12",
      "2026-11-13",
      "2026-11-14",
    ]);
    expect(startOfWeek("2026-11-10", 1)).toBe("2026-11-09");
  });

  it("reports ISO week 46 for that week", () => {
    expect(isoWeek("2026-11-09")).toBe(46);
    expect(isoWeek("2026-01-01")).toBe(1);
    expect(isoWeek("2027-01-01")).toBe(53);
  });

  it("formats ranges within and across months", () => {
    expect(formatRange("2026-11-08", "2026-11-14", "en")).toBe("Nov 8 – 14");
    expect(formatRange("2026-10-25", "2026-10-31", "en")).toBe("Oct 25 – 31");
    expect(formatRange("2026-11-29", "2026-12-05", "en")).toBe("Nov 29 – Dec 5");
    expect(formatRange("2026-11-08", "2026-11-14", "zh")).toBe("11月8日 – 14日");
    expect(formatRange("2026-11-29", "2026-12-05", "zh")).toBe("11月29日 – 12月5日");
  });

  it("adds days and months without drifting", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(diffDays("2026-11-08", "2026-11-14")).toBe(6);
  });

  it("returns a 6×7 month grid starting on the week start", () => {
    const grid = monthGrid("2026-11-10", 0);
    expect(grid).toHaveLength(42);
    expect(grid[0]).toBe("2026-11-01");
  });

  it("formats and parses times in 24h and 12h", () => {
    expect(formatTime(7 * 60, "24h", "en")).toBe("07:00");
    expect(formatTime(13 * 60 + 30, "12h", "en")).toBe("1:30 PM");
    expect(formatTime(0, "12h", "en")).toBe("12:00 AM");
    expect(formatTime(13 * 60 + 30, "12h", "zh")).toBe("下午 1:30");
    expect(parseTime("09:45")).toBe(585);
  });
});
