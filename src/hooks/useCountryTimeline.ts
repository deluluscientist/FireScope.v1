import { useEffect, useState } from "react";
import { getRegionalFireCounts } from "@/lib/firms.functions";
import type { FireSource } from "@/lib/fireSources";
import type { RegionScope } from "@/types/firescope";
import { dateWindows } from "@/lib/windows";

const cache = new Map<string, Record<string, number>>();

/** Progressive daily fire counts for a world, continent, or country scope. */
export function useFireTimeline(
  scope: RegionScope | null, sensor: FireSource, ranges: { start: string; end: string }[],
  bucket: (date: string) => string,
) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [progress, setProgress] = useState({ done: 0, total: 0, failed: 0 });
  const rangesKey = JSON.stringify(ranges);
  const scopeKey = scope ? `${scope.kind}:${scope.id}` : "";

  useEffect(() => {
    if (!scope) return;
    let cancelled = false;
    const today = new Date().toISOString().slice(0, 10);
    const windows = ranges.flatMap((r) => dateWindows(r.start, r.end < today ? r.end : today));
    setCounts({}); setProgress({ done: 0, total: windows.length, failed: 0 });
    const acc: Record<string, number> = {};
    const add = (daily: Record<string, number>) => {
      for (const [d, n] of Object.entries(daily)) { const b = bucket(d); acc[b] = (acc[b] ?? 0) + n; }
    };
    let i = 0, done = 0, failed = 0;
    const worker = async () => {
      while (!cancelled && i < windows.length) {
        const w = windows[i++]!;
        const k = `${scopeKey}|${sensor}|${w.date}|${w.days}`;
        try {
          let daily = cache.get(k);
          if (!daily) {
            daily = (await getRegionalFireCounts({ data: { scope, sensor, ...w } })).counts;
            cache.set(k, daily);
          }
          add(daily);
        } catch { failed++; }
        done++;
        if (!cancelled) { setCounts({ ...acc }); setProgress({ done, total: windows.length, failed }); }
      }
    };
    void Promise.all(Array.from({ length: scope.kind === "world" ? 2 : 4 }, worker));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey, sensor, rangesKey]);

  return { counts, progress };
}
