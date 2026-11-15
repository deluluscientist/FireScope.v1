import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";

/** Properties of firms_country_analysis.geojson (kept field-compatible). */
export interface CountryFireProperties {
  iso_a3: string;
  country: string;
  continent: string | null;
  area_km2: number | null;
  total_fire_pixels: number | null;
  fire_density_per_10k_km2: number | null;
  peak_burning_month: number | null;
  season_duration_months: number | null;
  autocorr_12month: number | null;
  mean_frp_mw: number | null;
  max_frp_mw: number | null;
  daytime_fire_pct: number | null;
}

export type CountryFeature = Feature<Polygon | MultiPolygon, CountryFireProperties>;
export type CountryCollection = FeatureCollection<Polygon | MultiPolygon, CountryFireProperties>;

/* ---- API response contracts (FastAPI backend) ---- */
/** GET /api/v1/countries */
export type CountriesResponse = CountryCollection;
/** GET /api/v1/countries/{iso3} */
export type CountryDetailResponse = CountryFeature;
/** GET /api/v1/fire-statistics */
export interface FireStatisticsResponse {
  total_countries: number;
  total_fire_pixels: number;
  by_continent: { continent: string; total_fire_pixels: number; countries: number }[];
}
/** GET /api/v1/fire-locations */
export interface FireLocation {
  latitude: number;
  longitude: number;
  frp_mw: number | null;
  acq_date: string;
  daynight: "D" | "N";
  confidence: number | null;
}
export interface FireLocationsResponse {
  count: number;
  locations: FireLocation[];
}
/** GET /api/v1/metadata */
export interface MetadataResponse {
  source: string;
  sensor: string;
  temporal_coverage: { start: string; end: string };
  generated_at: string;
  version: string;
}

export type DataSource = "api" | "local";

/** A single NASA FIRMS detection, normalized across MODIS and VIIRS products. */
export interface FirePoint {
  lat: number;
  lng: number;
  frp: number;
  isDay: 0 | 1;
  date: string;
  /** UTC acquisition time in HHmm format. */
  time: string;
  satellite: string;
  sensor: "MODIS" | "VIIRS";
  source: string;
}

export interface GeoPoint { lat: number; lng: number }

export type RegionScope =
  | { kind: "world"; id: "WORLD"; label: "World" }
  | { kind: "continent"; id: string; label: string }
  | { kind: "country"; id: string; label: string };
