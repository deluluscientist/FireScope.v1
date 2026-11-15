import { describe, expect, it } from "vitest";
import { dateWindows, historicalRanges, monthEnd } from "./windows";

describe("dateWindows", () => {
  it("never exceeds the 5-day FIRMS limit and covers every day", () => {
    const w = dateWindows("2019-01-01", "2019-12-31");
    expect(w.every((x) => x.days >= 1 && x.days <= 5)).toBe(true);
    expect(w.reduce((s, x) => s + x.days, 0)).toBe(365);
  });
  it("splits a 31-day month into 7 windows", () => {
    expect(dateWindows("2020-01-01", monthEnd(2020, 1))).toHaveLength(7);
  });
});

describe("historicalRanges", () => {
  it("covers all 366 days when a leap-year country compares all 12 months", () => {
    const ranges = historicalRanges([2020], 8, true, true);
    expect(ranges).toHaveLength(12);
    expect(ranges[0]).toEqual({ start: "2020-01-01", end: "2020-01-31" });
    expect(ranges[11]).toEqual({ start: "2020-12-01", end: "2020-12-31" });
    expect(ranges.reduce((sum, range) => sum + dateWindows(range.start, range.end)
      .reduce((days, window) => days + window.days, 0), 0)).toBe(366);
  });

  it("uses the first five days of every month for an all-month regional comparison", () => {
    const ranges = historicalRanges([2025], 8, true, false);
    expect(ranges).toHaveLength(12);
    expect(ranges.every((range) => range.start.endsWith("-01") && dateWindows(range.start, range.end)[0]?.days === 5)).toBe(true);
    expect(ranges[11]).toEqual({ start: "2025-12-01", end: "2025-12-05" });
  });
});
