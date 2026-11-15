import type {
  CountriesResponse, CountryCollection, CountryDetailResponse, FireLocationsResponse,
  FireStatisticsResponse, MetadataResponse, DataSource,
} from "@/types/firescope";

/** Single source of the backend URL. Empty = backend not deployed yet. */
export const API_BASE_URL: string = (import.meta.env['VITE_API_BASE_URL'] ?? "").replace(/\/$/, "");
export const LOCAL_GEOJSON_URL = "/data/firms_country_analysis.geojson";

export class ApiError extends Error {
  constructor(message: string, public status?: number) { super(message); }
}

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  if (!API_BASE_URL) throw new ApiError("VITE_API_BASE_URL is not configured");
  const res = await fetch(`${API_BASE_URL}${path}`, { signal: signal ?? null, headers: { Accept: "application/json" } });
  if (!res.ok) throw new ApiError(`Request failed: HTTP ${res.status}`, res.status);
  return res.json() as Promise<T>;
}

function validateCollection(data: unknown): CountryCollection {
  const d = data as CountryCollection;
  if (d?.type !== "FeatureCollection" || !Array.isArray(d.features)) {
    throw new ApiError("Invalid GeoJSON FeatureCollection.");
  }
  return d;
}

async function loadLocalCountries(signal?: AbortSignal): Promise<CountryCollection> {
  const res = await fetch(LOCAL_GEOJSON_URL, { signal: signal ?? null });
  if (!res.ok) throw new ApiError(`GeoJSON request failed: HTTP ${res.status}`, res.status);
  return validateCollection(await res.json());
}

export const api = {
  getCountries: (s?: AbortSignal) => request<CountriesResponse>("/api/v1/countries", s).then(validateCollection),
  getCountry: (iso3: string, s?: AbortSignal) =>
    request<CountryDetailResponse>(`/api/v1/countries/${encodeURIComponent(iso3)}`, s),
  getFireStatistics: (s?: AbortSignal) => request<FireStatisticsResponse>("/api/v1/fire-statistics", s),
  getFireLocations: (s?: AbortSignal) => request<FireLocationsResponse>("/api/v1/fire-locations", s),
  getMetadata: (s?: AbortSignal) => request<MetadataResponse>("/api/v1/metadata", s),
};

/** Countries from the backend, falling back to the bundled GeoJSON when it is unavailable. */
export async function fetchCountriesWithFallback(
  signal?: AbortSignal,
): Promise<{ data: CountryCollection; source: DataSource }> {
  if (API_BASE_URL) {
    try {
      return { data: await api.getCountries(signal), source: "api" };
    } catch (e) {
      if (signal?.aborted) throw e;
      console.warn("Backend unavailable, using bundled dataset:", e);
    }
  }
  return { data: await loadLocalCountries(signal), source: "local" };
}
