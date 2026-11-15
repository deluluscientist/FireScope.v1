import type { FirePoint } from "@/types/firescope";

/**
 * Cross-sensor de-duplication for a harmonized preview.
 * One detection is retained per acquisition date, 2-hour UTC cell and ~1 km grid cell.
 * VIIRS is preferred for its finer resolution; FRP breaks same-sensor ties.
 * This is a transparent spatial/temporal merge, not a sensor calibration model.
 */
export function harmonizeDetections(points: FirePoint[]): FirePoint[] {
  const cells = new Map<string, FirePoint>();
  for (const point of points) {
    const minutes = Number(point.time.slice(0, 2)) * 60 + Number(point.time.slice(2, 4));
    const key = [
      point.date,
      Math.floor(minutes / 120),
      Math.round(point.lat * 100),
      Math.round(point.lng * 100),
    ].join("|");
    const current = cells.get(key);
    if (!current || isPreferred(point, current)) cells.set(key, point);
  }
  return [...cells.values()];
}

function isPreferred(candidate: FirePoint, current: FirePoint): boolean {
  if (candidate.sensor !== current.sensor) return candidate.sensor === "VIIRS";
  return candidate.frp > current.frp;
}
