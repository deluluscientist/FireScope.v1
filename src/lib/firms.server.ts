import { geoBounds, geoContains } from "d3-geo";
import type { CountryCollection, CountryFeature, FirePoint, RegionScope } from "@/types/firescope";
import type { FireSource } from "@/lib/fireSources";
import { normalizeCountryFeatures } from "@/lib/countries";

export type BaseSensor = "MODIS" | "VIIRS_SNPP" | "VIIRS_NOAA20" | "VIIRS_NOAA21";
type SourceSpec = { sensor: BaseSensor; satellite?: "Terra" | "Aqua" };
type CountryRecord = { feature: CountryFeature; bbox: string; bounds: [number, number, number, number] };

const BASE = "https://firms.modaps.eosdis.nasa.gov/api";
const SOURCES: Record<BaseSensor, { sp: string; nrt: string; satellite: string }> = {
  MODIS: { sp: "MODIS_SP", nrt: "MODIS_NRT", satellite: "MODIS" },
  VIIRS_SNPP: { sp: "VIIRS_SNPP_SP", nrt: "VIIRS_SNPP_NRT", satellite: "Suomi NPP" },
  VIIRS_NOAA20: { sp: "VIIRS_NOAA20_SP", nrt: "VIIRS_NOAA20_NRT", satellite: "NOAA-20" },
  VIIRS_NOAA21: { sp: "VIIRS_NOAA21_SP", nrt: "VIIRS_NOAA21_NRT", satellite: "NOAA-21" },
};

export const SOURCE_SPECS: Record<FireSource, SourceSpec[]> = {
  HARMONIZED: [{ sensor: "MODIS" }, { sensor: "VIIRS_SNPP" }, { sensor: "VIIRS_NOAA20" }, { sensor: "VIIRS_NOAA21" }],
  MODIS: [{ sensor: "MODIS" }],
  TERRA: [{ sensor: "MODIS", satellite: "Terra" }],
  AQUA: [{ sensor: "MODIS", satellite: "Aqua" }],
  VIIRS: [{ sensor: "VIIRS_SNPP" }, { sensor: "VIIRS_NOAA20" }, { sensor: "VIIRS_NOAA21" }],
  VIIRS_SNPP: [{ sensor: "VIIRS_SNPP" }],
  VIIRS_NOAA20: [{ sensor: "VIIRS_NOAA20" }],
  VIIRS_NOAA21: [{ sensor: "VIIRS_NOAA21" }],
};

let availability: { at: number; products: Record<string, { min: string; max: string }> } | null = null;
async function productAvailability(mapKey: string) {
  if (!availability || Date.now() - availability.at > 6 * 3600e3) {
    const res = await fetch(`${BASE}/data_availability/csv/${mapKey}/ALL`);
    const text = await res.text();
    if (!res.ok) throw new Error("NASA FIRMS availability request failed");
    const products: Record<string, { min: string; max: string }> = {};
    for (const line of text.trim().split("\n").slice(1)) {
      const [id, min, max] = line.trim().split(",");
      if (id && min && max) products[id] = { min, max };
    }
    availability = { at: Date.now(), products };
  }
  return availability.products;
}

/** Science-quality archive where available, otherwise near-real-time; null means no coverage. */
export async function pickSource(sensor: BaseSensor, date: string, mapKey: string): Promise<string | null> {
  const s = SOURCES[sensor];
  const products = await productAvailability(mapKey);
  const sp = products[s.sp], nrt = products[s.nrt];
  if (sp && date >= sp.min && date <= sp.max) return s.sp;
  if (nrt && date >= nrt.min && date <= nrt.max) return s.nrt;
  return null;
}

export async function fetchCsv(source: string, area: string, days: number, date: string, mapKey: string) {
  const url = `${BASE}/area/csv/${mapKey}/${source}/${area}/${days}/${date}`;
  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok || !text.startsWith("latitude")) {
    console.error("FIRMS error", res.status, text.slice(0, 200));
    throw new Error("NASA FIRMS request failed");
  }
  return text;
}

export interface DetectionBatch {
  product: string | null;
  points: FirePoint[];
  total: number;
}

/** Fetches one satellite/filter specification. Unavailable dates return an empty batch. */
export async function fetchDetectionBatch(
  spec: SourceSpec, area: string, days: number, date: string, mapKey: string, max = Infinity,
): Promise<DetectionBatch> {
  const product = await pickSource(spec.sensor, date, mapKey);
  if (!product) return { product: null, points: [], total: 0 };
  const csv = await fetchCsv(product, area, days, date, mapKey);
  return { product, ...parseDetections(csv, spec.sensor, max, spec.satellite) };
}

/* ---- Country geometry (bundled dataset, fetched from our own origin once) ---- */
let countries: Map<string, CountryRecord> | null = null;
async function getCountries(origin: string): Promise<Map<string, CountryRecord>> {
  if (!countries) {
    const res = await fetch(`${origin}/data/firms_country_analysis.geojson`);
    const fc = (await res.json()) as CountryCollection;
    countries = new Map();
    for (const f of normalizeCountryFeatures(fc.features)) {
      const [[w, s], [e, n]] = geoBounds(f);
      // Antimeridian-crossing countries get a full-longitude box; point-in-polygon trims it.
      const bounds: [number, number, number, number] = w > e ? [-180, s, 180, n] : [w, s, e, n];
      countries.set(f.properties.iso_a3, {
        feature: f,
        bounds,
        bbox: bounds.map((v) => Math.round(v * 1000) / 1000).join(","),
      });
    }
  }
  return countries;
}

export async function getCountry(origin: string, iso3: string) {
  return (await getCountries(origin)).get(iso3) ?? null;
}

const CONTINENT_BOXES: Record<string, string> = {
  Africa: "-26,-35,64,38",
  Europe: "-31,27,180,82",
  Asia: "25,-12,180,82",
  "North America": "-170,5,-50,83",
  "South America": "-93,-56,-28,15",
  Oceania: "105,-55,180,10",
};

export async function getRegion(origin: string, scope: RegionScope) {
  if (scope.kind === "world") return { area: "world", records: null as CountryRecord[] | null };
  const all = await getCountries(origin);
  if (scope.kind === "country") {
    const country = all.get(scope.id);
    if (!country) throw new Error("Unknown country");
    return { area: country.bbox, records: [country] };
  }
  const records = [...all.values()].filter((r) => r.feature.properties.continent === scope.id);
  const area = CONTINENT_BOXES[scope.id];
  if (!area || records.length === 0) throw new Error("Unknown continent");
  return { area, records };
}

/** Buckets detections by acquisition date, trimming bounding-box results to exact borders. */
export function countDetections(points: FirePoint[], records: CountryRecord[] | null): Record<string, number> {
  const out: Record<string, number> = {};
  for (const point of points) {
    if (records && !records.some((r) => insideBounds(point, r.bounds) && geoContains(r.feature, [point.lng, point.lat]))) continue;
    out[point.date] = (out[point.date] ?? 0) + 1;
  }
  return out;
}

function insideBounds(point: FirePoint, [w, s, e, n]: [number, number, number, number]) {
  return point.lng >= w && point.lng <= e && point.lat >= s && point.lat <= n;
}

/** Normalize FIRMS CSV into a shared MODIS/VIIRS shape, with optional MODIS satellite filtering. */
export function parseDetections(
  csv: string, sensor: BaseSensor, max = Infinity, satelliteFilter?: "Terra" | "Aqua",
) {
  const lines = csv.split("\n");
  const header = lines[0]!.split(",");
  const index = (name: string) => header.indexOf(name);
  const iLat = index("latitude"), iLon = index("longitude"), iFrp = index("frp"), iDn = index("daynight");
  const iDate = index("acq_date"), iTime = index("acq_time"), iSatellite = index("satellite");
  const rows = lines.slice(1).filter((line) => {
    if (line.length <= 5) return false;
    if (!satelliteFilter) return true;
    const c = line.split(",");
    return normalizeModisSatellite(c[iSatellite]) === satelliteFilter;
  });
  const step = Math.max(1, rows.length / max);
  const points: FirePoint[] = [];
  for (let i = 0; i < rows.length; i += step) {
    const c = rows[Math.floor(i)]!.split(",");
    const isViirs = sensor !== "MODIS";
    points.push({
      lat: +c[iLat]!, lng: +c[iLon]!, frp: +c[iFrp]! || 0, isDay: c[iDn] === "D" ? 1 : 0,
      date: c[iDate] ?? "", time: (c[iTime] ?? "0").padStart(4, "0"),
      satellite: isViirs ? SOURCES[sensor].satellite : normalizeModisSatellite(c[iSatellite]),
      sensor: isViirs ? "VIIRS" : "MODIS", source: sensor,
    });
  }
  return { total: rows.length, points };
}

function normalizeModisSatellite(value: string | undefined): string {
  if (value === "T" || value === "Terra") return "Terra";
  if (value === "A" || value === "Aqua") return "Aqua";
  return value || "MODIS";
}
