import { useEffect, useState } from "react";
import { getFirePixels } from "@/lib/firms.functions";
import type { FireSource } from "@/lib/fireSources";
import type { FirePoint } from "@/types/firescope";

export type { FirePoint } from "@/types/firescope";
export interface PixelQuery { enabled: boolean; sensor: FireSource; date: string; days: number }

export function useFirePixels(q: PixelQuery) {
  const [state, setState] = useState<
    { status: "idle" | "loading" } | { status: "error"; error: string } |
    { status: "ready"; points: FirePoint[]; total: number; source: string; duplicatesRemoved: number }
  >({ status: "idle" });
  useEffect(() => {
    if (!q.enabled || !q.date) { setState({ status: "idle" }); return; }
    let cancelled = false;
    setState({ status: "loading" });
    getFirePixels({ data: { sensor: q.sensor, date: q.date, days: q.days } })
      .then((r) => { if (cancelled) return;
        setState(r.error ? { status: "error", error: r.error } : {
          status: "ready", points: r.points, total: r.total, source: r.source,
          duplicatesRemoved: r.duplicatesRemoved,
        }); })
      .catch((e: Error) => !cancelled && setState({ status: "error", error: e.message }));
    return () => { cancelled = true; };
  }, [q.enabled, q.sensor, q.date, q.days]);
  return state;
}
