import { describe, expect, it } from "vitest";
import { harmonizeDetections } from "./harmonize";
import type { FirePoint } from "@/types/firescope";

const point = (overrides: Partial<FirePoint> = {}): FirePoint => ({
  lat: 1.234,
  lng: 103.456,
  frp: 20,
  isDay: 1,
  date: "2025-08-01",
  time: "0630",
  satellite: "Terra",
  sensor: "MODIS",
  source: "MODIS",
  ...overrides,
});

describe("harmonizeDetections", () => {
  it("keeps the finer-resolution VIIRS detection in the same 1 km, 2-hour cell", () => {
    const result = harmonizeDetections([
      point({ frp: 100 }),
      point({ sensor: "VIIRS", satellite: "NOAA-20", source: "VIIRS_NOAA20", frp: 10 }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]?.satellite).toBe("NOAA-20");
  });

  it("does not remove detections from different acquisition dates", () => {
    const result = harmonizeDetections([point(), point({ date: "2025-08-02" })]);

    expect(result).toHaveLength(2);
  });

  it("does not remove detections more than one grid cell apart", () => {
    const result = harmonizeDetections([point(), point({ lat: 1.256 })]);

    expect(result).toHaveLength(2);
  });
});
