import { describe, expect, it } from "vitest";
import { countFiresNearLine, distanceKm } from "./measure";
import type { FirePoint } from "@/types/firescope";

const fire = (lat: number, lng: number): FirePoint => ({
  lat, lng, frp: 10, isDay: 1, date: "2025-01-01", time: "0000",
  satellite: "Terra", sensor: "MODIS", source: "MODIS",
});

describe("distance measurement", () => {
  it("measures one degree of longitude at the equator as about 111.195 km", () => {
    expect(distanceKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(111.195, 2);
  });

  it("counts only fires inside the selected line buffer", () => {
    const fires = [fire(0, 0.5), fire(2, 0.5)];
    expect(countFiresNearLine(fires, { lat: 0, lng: 0 }, { lat: 0, lng: 1 }, 50)).toBe(1);
  });
});
