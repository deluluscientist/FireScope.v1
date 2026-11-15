import type { FirePoint, GeoPoint } from "@/types/firescope";

const EARTH_RADIUS_KM = 6371.0088;
const rad = (degrees: number) => (degrees * Math.PI) / 180;

/** Great-circle distance using the haversine formula. */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Exact cross-track distance when the projection lies on the arc, otherwise the nearest endpoint. */
export function distanceToLineKm(point: GeoPoint, start: GeoPoint, end: GeoPoint): number {
  const delta = distanceKm(start, end) / EARTH_RADIUS_KM;
  if (delta < 1e-10) return distanceKm(point, start);
  const a = toVector(start), b = toVector(end), p = toVector(point);
  const normal = cross(a, b);
  const normalLength = Math.hypot(normal.x, normal.y, normal.z);
  if (normalLength < 1e-10) return Math.min(distanceKm(point, start), distanceKm(point, end));
  const n = { x: normal.x / normalLength, y: normal.y / normalLength, z: normal.z / normalLength };
  const along = Math.atan2(dot(cross(a, p), n), dot(a, p));
  if (along < 0 || along > delta) return Math.min(distanceKm(point, start), distanceKm(point, end));
  return Math.asin(Math.min(1, Math.abs(dot(p, n)))) * EARTH_RADIUS_KM;
}

export function countFiresNearLine(
  fires: FirePoint[], start: GeoPoint, end: GeoPoint, bufferKm: number,
): number {
  return fires.reduce((count, fire) =>
    count + (distanceToLineKm(fire, start, end) <= bufferKm ? 1 : 0), 0);
}

type Vector = { x: number; y: number; z: number };
const toVector = (point: GeoPoint): Vector => {
  const lat = rad(point.lat), lng = rad(point.lng);
  return { x: Math.cos(lat) * Math.cos(lng), y: Math.cos(lat) * Math.sin(lng), z: Math.sin(lat) };
};
const cross = (a: Vector, b: Vector): Vector => ({
  x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x,
});
const dot = (a: Vector, b: Vector) => a.x * b.x + a.y * b.y + a.z * b.z;
