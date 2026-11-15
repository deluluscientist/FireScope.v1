import { useEffect, useRef } from "react";
import type { GlobeInstance } from "globe.gl";
import type { CountryFeature, GeoPoint } from "@/types/firescope";
import { buildOceanTexture } from "@/lib/oceanTexture";
import type { FirePoint } from "@/hooks/useFirePixels";
import { GLOBE_TEXTURE_URL, HOVER_COLOR, densityColor, formatNumber, monthName, polygonHeight } from "@/lib/fire";

interface Props {
  countries: CountryFeature[];
  onHover: (f: CountryFeature | null) => void;
  onSelect: (f: CountryFeature) => void;
  firePoints?: FirePoint[] | null;
  measureMode: boolean;
  measurePoints: GeoPoint[];
  onMeasurePoint: (point: GeoPoint) => void;
}

/* FRP (MW) → fire colour */
const frpColor = (frp: number) => frp < 10 ? "#fecc5c" : frp < 50 ? "#fd8d3c" : frp < 200 ? "#f03b20" : "#bd0026";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
function tooltipHtml(f: CountryFeature) {
  const p = f.properties;
  return `<div class="globe-tooltip"><b class="globe-tooltip-title">${esc(p.country ?? "Unknown Country")}</b><br>
    Fire Pixels: <b>${formatNumber(p.total_fire_pixels)}</b><br>
    Density: <b>${formatNumber(p.fire_density_per_10k_km2, 2)}</b> / 10k km²<br>
    Peak: <b>${monthName(p.peak_burning_month)}</b></div>`;
}
function fireTooltip(point: FirePoint) {
  return `<div class="globe-tooltip"><b class="globe-tooltip-title">${esc(point.satellite)} · ${point.sensor}</b><br>
    FRP: <b>${formatNumber(point.frp, 1)} MW</b><br>
    ${esc(point.date)} · ${esc(point.time)} UTC · ${point.isDay ? "Day" : "Night"}</div>`;
}

/** Client-only: globe.gl is imported dynamically so SSR never touches WebGL. */
export function GlobeView({ countries, onHover, onSelect, firePoints, measureMode, measurePoints, onMeasurePoint }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const globe = useRef<GlobeInstance | null>(null);
  const hovered = useRef<CountryFeature | null>(null);
  const pixelMode = useRef(false);
  const measuring = useRef(measureMode);
  measuring.current = measureMode;
  const fp = useRef(firePoints);
  fp.current = firePoints;
  pixelMode.current = !!firePoints;
  const cbs = useRef({ onHover, onSelect, onMeasurePoint });
  cbs.current = { onHover, onSelect, onMeasurePoint };

  useEffect(() => {
    let disposed = false;
    let ro: ResizeObserver | undefined;
    const node = el.current!;
    import("globe.gl").then(({ default: Globe }) => {
      if (disposed) return;
      const g = new Globe(node, { animateIn: true })
        .globeImageUrl(GLOBE_TEXTURE_URL)
        .backgroundColor("rgba(0,0,0,0)")
        .atmosphereColor("#60a5fa")
        .atmosphereAltitude(0.16)
        .polygonAltitude((f) => pixelMode.current ? (f === hovered.current ? 0.008 : 0.004)
          : polygonHeight(f as CountryFeature) + (f === hovered.current ? 0.015 : 0))
        .polygonCapColor((f) => pixelMode.current
          ? (f === hovered.current ? "rgba(34,211,238,0.35)" : "rgba(15,23,42,0.25)")
          : f === hovered.current ? HOVER_COLOR
          : densityColor((f as CountryFeature).properties?.fire_density_per_10k_km2))
        .pointLat((d) => (d as FirePoint).lat).pointLng((d) => (d as FirePoint).lng)
        .pointColor((d) => frpColor((d as FirePoint).frp))
        .pointAltitude(0.006).pointRadius(0.12).pointsMerge(true)
        .pointLabel((d) => fireTooltip(d as FirePoint))
        .pathPoints((d) => (d as { points: [number, number, number][] }).points)
        .pathPointAlt((p) => (p as [number, number, number])[2])
        .pathColor(() => "#22d3ee").pathStroke(0.22).pathDashLength(0.025).pathDashGap(0.012)
        .pathDashAnimateTime(0).pathLabel(() => "Measurement line")
        .labelLat((d) => (d as GeoPoint).lat).labelLng((d) => (d as GeoPoint).lng)
        .labelText((d) => (d as GeoPoint & { text: string }).text)
        .labelAltitude(0.018).labelColor(() => "#22d3ee").labelSize(0.7)
        .labelIncludeDot(true).labelDotRadius(0.35)
        .polygonSideColor(() => "rgba(255,80,20,0.22)")
        .polygonStrokeColor(() => "rgba(255,255,255,0.35)")
        .polygonLabel((f) => measuring.current ? "" : tooltipHtml(f as CountryFeature))
        .onPolygonHover((f) => {
          hovered.current = measuring.current ? null : (f as CountryFeature) || null;
          node.style.cursor = measuring.current ? "crosshair" : f ? "pointer" : "grab";
          cbs.current.onHover(hovered.current);
          g.polygonCapColor(g.polygonCapColor()).polygonAltitude(g.polygonAltitude());
        })
        .onPolygonClick((f, _event, coords) => {
          if (measuring.current) cbs.current.onMeasurePoint({ lat: coords.lat, lng: coords.lng });
          else cbs.current.onSelect(f as CountryFeature);
        })
        .onGlobeClick((coords) => {
          if (measuring.current) cbs.current.onMeasurePoint({ lat: coords.lat, lng: coords.lng });
        })
        .onPointClick((_point, _event, coords) => {
          if (measuring.current) cbs.current.onMeasurePoint({ lat: coords.lat, lng: coords.lng });
        });
      const c = g.controls();
      c.autoRotate = true; c.autoRotateSpeed = 0.3; c.enableDamping = true; c.dampingFactor = 0.08;
      node.addEventListener("mouseenter", () => (c.autoRotate = false));
      node.addEventListener("mouseleave", () => (c.autoRotate = !measuring.current));
      const size = () => g.width(node.clientWidth).height(node.clientHeight);
      size();
      ro = new ResizeObserver(size); ro.observe(node);
      globe.current = g;
      g.polygonsData(countries).pointsData(fp.current ?? []);
      buildOceanTexture().then((url) => !disposed && g.globeImageUrl(url)).catch(() => {});
      node.dataset['sceneReady'] = "true";
    });
    return () => { disposed = true; ro?.disconnect(); globe.current?._destructor(); globe.current = null; node.innerHTML = ""; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { globe.current?.polygonsData(countries); }, [countries]);
  useEffect(() => {
    const g = globe.current;
    pixelMode.current = !!firePoints;
    if (!g) return;
    g.pointsData(firePoints ?? []);
    g.polygonCapColor(g.polygonCapColor()).polygonAltitude(g.polygonAltitude())
      .polygonSideColor(() => firePoints ? "rgba(0,0,0,0)" : "rgba(255,80,20,0.22)");
  }, [firePoints]);

  useEffect(() => {
    const g = globe.current;
    if (!g) return;
    g.controls().autoRotate = !measureMode;
    if (measureMode) { hovered.current = null; cbs.current.onHover(null); }
    g.polygonCapColor(g.polygonCapColor()).polygonAltitude(g.polygonAltitude());
  }, [measureMode]);

  useEffect(() => {
    const g = globe.current;
    if (!g) return;
    const path = measurePoints.length === 2 ? [{
      points: measurePoints.map((p) => [p.lat, p.lng, 0.018] as [number, number, number]),
    }] : [];
    g.pathsData(path).labelsData(measurePoints.map((p, i) => ({ ...p, text: String(i + 1) })));
  }, [measurePoints]);

  return <div ref={el} className={`absolute inset-0 ${measureMode ? "cursor-crosshair" : ""}`}
    aria-label="Interactive 3D globe of fire density and satellite detections" />;
}
