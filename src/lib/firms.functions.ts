import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import {
  countDetections, fetchDetectionBatch, getRegion, SOURCE_SPECS, type DetectionBatch,
} from "./firms.server";
import { harmonizeDetections } from "./harmonize";
import type { FireSource } from "@/lib/fireSources";
import type { RegionScope } from "@/types/firescope";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const sensor = z.enum([
  "HARMONIZED", "MODIS", "TERRA", "AQUA", "VIIRS", "VIIRS_SNPP", "VIIRS_NOAA20", "VIIRS_NOAA21",
]);
const scope = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("world"), id: z.literal("WORLD"), label: z.literal("World") }),
  z.object({ kind: z.literal("continent"), id: z.string().min(2).max(40), label: z.string().min(2).max(60) }),
  z.object({ kind: z.literal("country"), id: z.string().regex(/^[A-Z]{3}$/), label: z.string().min(2).max(80) }),
]);

async function loadBatches(
  source: FireSource, area: string, days: number, day: string, mapKey: string, max = Infinity,
) {
  const results = await Promise.all(SOURCE_SPECS[source].map(async (spec) => {
    try {
      return { batch: await fetchDetectionBatch(spec, area, days, day, mapKey, max), failed: false };
    } catch {
      return { batch: { product: null, points: [], total: 0 } as DetectionBatch, failed: true };
    }
  }));
  if (results.length > 0 && results.every((r) => r.failed)) throw new Error("NASA FIRMS request failed");
  const batches = results.filter((r) => !r.failed).map((r) => r.batch);
  const products = batches.map((b) => b.product).filter(Boolean).join(" + ");
  return {
    batches,
    source: `${products || "No source coverage for this date"}${results.some((r) => r.failed) ? " (partial)" : ""}`,
  };
}

/** Real NASA FIRMS fire pixels worldwide. Harmonized merges and de-duplicates all MODIS/VIIRS sources. */
export const getFirePixels = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ sensor, date, days: z.number().int().min(1).max(5) }).parse(d))
  .handler(async ({ data }) => {
    try {
      const mapKey = process.env["FIRMS_MAP_KEY"];
      if (!mapKey) throw new Error("FIRMS_MAP_KEY is not configured");
      const { batches, source } = await loadBatches(data.sensor, "world", data.days, data.date, mapKey, 60000);
      const allPoints = batches.flatMap((b) => b.points);
      const merged = data.sensor === "HARMONIZED" ? harmonizeDetections(allPoints) : allPoints;
      return {
        source,
        total: batches.reduce((sum, b) => sum + b.total, 0),
        points: merged.slice(0, 60000),
        duplicatesRemoved: allPoints.length - merged.length,
        error: null as string | null,
      };
    } catch (e) {
      return { source: "", total: 0, points: [], duplicatesRemoved: 0, error: (e as Error).message };
    }
  });

/** Fire pixel counts per day for the world, a continent, or an exact country boundary. */
export const getRegionalFireCounts = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ scope, sensor, date, days: z.number().int().min(1).max(5) }).parse(d))
  .handler(async ({ data }) => {
    const mapKey = process.env["FIRMS_MAP_KEY"];
    if (!mapKey) throw new Error("FIRMS_MAP_KEY is not configured");
    const origin = new URL(getRequest().url).origin;
    const region = await getRegion(origin, data.scope as RegionScope);
    const { batches, source } = await loadBatches(data.sensor, region.area, data.days, data.date, mapKey);
    const allPoints = batches.flatMap((b) => b.points);
    const merged = data.sensor === "HARMONIZED" ? harmonizeDetections(allPoints) : allPoints;
    return { source, counts: countDetections(merged, region.records) };
  });
