import type { CountryFeature } from "@/types/firescope";

export const GLOBE_TEXTURE_URL = "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-dark.jpg";
export const MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];

/* Fire density bins (per 10,000 km²); `max` exclusive. Data-viz palette (YlOrRd). */
export const DENSITY_BINS = [
  { max: 100, color: "#ffffb2", label: "Under 100" },
  { max: 500, color: "#fecc5c", label: "100 – 499" },
  { max: 1000, color: "#fd8d3c", label: "500 – 999" },
  { max: 2000, color: "#f03b20", label: "1,000 – 1,999" },
  { max: Infinity, color: "#bd0026", label: "2,000+" },
];
export const NO_DATA_COLOR = "#475569";
export const HOVER_COLOR = "#22d3ee";

export function formatNumber(value: unknown, decimals = 0): string {
  if (value === null || value === undefined || value === "") return "N/A";
  const n = Number(value);
  if (!Number.isFinite(n)) return "N/A";
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
export const withUnit = (f: string, unit: string) => (f === "N/A" ? f : `${f}${unit}`);
export const monthName = (m: unknown) => MONTH_NAMES[Number(m)] || "N/A";

export function densityColor(value: unknown): string {
  if (value === null || value === undefined) return NO_DATA_COLOR;
  const d = Number(value);
  if (!Number.isFinite(d)) return NO_DATA_COLOR;
  return DENSITY_BINS.find((b) => d < b.max)!.color;
}

/* Log scale keeps extreme fire counts from dominating the globe. */
export function polygonHeight(f: CountryFeature): number {
  const fires = Number(f.properties?.total_fire_pixels);
  if (!Number.isFinite(fires) || fires <= 0) return 0.006;
  return Math.min(0.16, 0.01 + Math.log10(fires + 1) * 0.018);
}

export function isRenderableCountry(f: CountryFeature): boolean {
  const t = f.geometry?.type;
  return (t === "Polygon" || t === "MultiPolygon") && f.properties?.iso_a3 !== "ATA";
}
