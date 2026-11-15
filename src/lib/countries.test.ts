import { describe, expect, it } from "vitest";
import { normalizeCountryFeatures } from "./countries";
import type { CountryFeature } from "@/types/firescope";

const polygon = (west: number, south: number, east: number, north: number): CountryFeature["geometry"] => ({
  type: "Polygon", coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]],
});
const feature = (country: string, geometry: CountryFeature["geometry"]): CountryFeature => ({
  type: "Feature", geometry,
  properties: {
    iso_a3: "-99", country, continent: "Europe", area_km2: 1, total_fire_pixels: 1,
    fire_density_per_10k_km2: 1, peak_burning_month: 1, season_duration_months: 1,
    autocorr_12month: null, mean_frp_mw: 1, max_frp_mw: 1, daytime_fire_pct: 1,
  },
});

describe("normalizeCountryFeatures", () => {
  it("keeps only Kosovo's own shape and assigns its XKX identifier", () => {
    const result = normalizeCountryFeatures([
      feature("Kosovo", polygon(5, 58, 31, 81)),
      feature("Kosovo", polygon(20, 41, 22, 44)),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.properties.iso_a3).toBe("XKX");
  });

  it("keeps France's metropolitan and overseas shape rather than the copied Norway shape", () => {
    const result = normalizeCountryFeatures([
      feature("France", polygon(5, 58, 31, 81)),
      feature("France", polygon(-55, 2, 10, 52)),
    ]);
    expect(result.map((f) => f.properties.iso_a3)).toEqual(["FRA"]);
  });
});
