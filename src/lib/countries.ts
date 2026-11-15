import type { CountryFeature } from "@/types/firescope";
import { isRenderableCountry } from "@/lib/fire";

const PLACEHOLDER_ISOS: Record<string, string> = {
  France: "FRA",
  Kosovo: "XKX",
  Norway: "NOR",
  Somaliland: "SOL",
};

/**
 * Repairs the four known -99 records in the bundled GeoJSON. Each was accidentally
 * repeated over five shapes; retain only the shape in that country's own region.
 */
export function normalizeCountryFeatures(features: CountryFeature[]): CountryFeature[] {
  return features.filter(isRenderableCountry).flatMap((feature) => {
    const p = feature.properties;
    if (p.iso_a3 !== "-99") return [feature];
    const iso = PLACEHOLDER_ISOS[p.country];
    if (!iso) return [];
    const [west, south] = coordinateBounds(feature);
    const matches = (p.country === "Norway" && south > 55)
      || (p.country === "France" && west < 0)
      || (p.country === "Somaliland" && south > 0 && south < 20 && west > 35 && west < 55)
      || (p.country === "Kosovo" && south > 40 && south < 43 && west > 15 && west < 25);
    return matches ? [{ ...feature, properties: { ...p, iso_a3: iso } }] : [];
  });
}

function coordinateBounds(feature: CountryFeature): [number, number] {
  let west = Infinity, south = Infinity;
  const visit = (value: unknown): void => {
    if (!Array.isArray(value)) return;
    if (typeof value[0] === "number" && typeof value[1] === "number") {
      west = Math.min(west, value[0]); south = Math.min(south, value[1]);
      return;
    }
    value.forEach(visit);
  };
  visit(feature.geometry.coordinates);
  return [west, south];
}
