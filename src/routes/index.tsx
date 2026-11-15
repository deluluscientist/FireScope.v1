import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { GlobeView } from "@/components/GlobeView";
import { CountryInfoPanel } from "@/components/CountryInfoPanel";
import { FireDensityLegend } from "@/components/FireDensityLegend";
import { FilterPanel, type Filters } from "@/components/FilterPanel";
import { useCountries } from "@/hooks/useCountries";
import { CountryTimeline } from "@/components/CountryTimeline";
import { FirePixelControls } from "@/components/FirePixelControls";
import { ReportExportPanel } from "@/components/ReportExportPanel";
import { FireReportDocument } from "@/components/FireReportDocument";
import type { FireReportData } from "@/lib/reports";
import { MeasurementControls } from "@/components/MeasurementControls";
import { useFirePixels, type PixelQuery } from "@/hooks/useFirePixels";
import { formatNumber } from "@/lib/fire";
import { countFiresNearLine, distanceKm } from "@/lib/measure";
import type { CountryFeature, GeoPoint } from "@/types/firescope";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "FireScope — Harmonized Global Active Fire Analysis" },
      { name: "description", content: "Explore harmonized MODIS and VIIRS fire detections, satellite filters, regional burning calendars, and distance tools on a 3D globe." },
      { property: "og:title", content: "FireScope — Harmonized Global Active Fire Analysis" },
      { property: "og:description", content: "Compare satellites, explore world-to-country burning calendars, and measure fire distances on an interactive globe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FireScope,
});

function FireScope() {
  const { state, retry } = useCountries();
  const [active, setActive] = useState<CountryFeature | null>(null);
  const [selected, setSelected] = useState<CountryFeature | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [pq, setPq] = useState<PixelQuery>(() => ({ enabled: true, sensor: "HARMONIZED",
    date: new Date(Date.now() - 864e5).toISOString().slice(0, 10), days: 1 }));
  const pixels = useFirePixels(pq);
  const pixelStatus = pixels.status === "loading" ? "Loading NASA FIRMS…"
    : pixels.status === "error" ? `Error: ${pixels.error}`
    : pixels.status === "ready" ? (pixels.total === 0 ? "No fire pixels in this window."
      : `${formatNumber(pixels.total)} source detections${pixels.points.length < pixels.total ? ` · showing ${formatNumber(pixels.points.length)}` : ""} • ${pixels.source}${pixels.duplicatesRemoved ? ` • ${formatNumber(pixels.duplicatesRemoved)} likely duplicates removed` : ""}`) : "";
  const [filters, setFilters] = useState<Filters>({ continent: "", minDensity: 0 });
  const [measureActive, setMeasureActive] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<GeoPoint[]>([]);
  const [bufferKm, setBufferKm] = useState(50);

  const all = state.status === "ready" ? state.countries : [];
  const continents = useMemo(
    () => [...new Set(all.map((f) => f.properties.continent).filter(Boolean) as string[])].sort(), [all]);
  const visible = useMemo(() => all.filter((f) => {
    const p = f.properties;
    if (filters.continent && p.continent !== filters.continent) return false;
    if (filters.minDensity > 0 && !((p.fire_density_per_10k_km2 ?? -1) >= filters.minDensity)) return false;
    return true;
  }), [all, filters]);
  const firePoints = pq.enabled && pixels.status === "ready" ? pixels.points : null;
  const report = useMemo<FireReportData | null>(() => firePoints && pixels.status === "ready" ? {
    sensor: pq.sensor, date: pq.date, days: pq.days, points: firePoints, total: pixels.total,
    source: pixels.source, duplicatesRemoved: pixels.duplicatesRemoved ?? 0,
  } : null, [firePoints, pixels, pq]);
  const measuredDistance = useMemo(() => measurePoints.length === 2
    ? distanceKm(measurePoints[0]!, measurePoints[1]!) : null, [measurePoints]);
  const nearbyFires = useMemo(() => measurePoints.length === 2 && firePoints
    ? countFiresNearLine(firePoints, measurePoints[0]!, measurePoints[1]!, bufferKm) : 0,
  [firePoints, measurePoints, bufferKm]);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-space text-foreground">
      {state.status === "ready" && (
        <GlobeView countries={visible} onHover={(f) => setActive(f)}
          onSelect={(f) => { setActive(f); setSelected(f); setCalendarOpen(true); }}
          firePoints={firePoints} measureMode={measureActive} measurePoints={measurePoints}
          onMeasurePoint={(point) => setMeasurePoints((points) => points.length < 2 ? [...points, point] : points)} />
      )}

      <header className="pointer-events-none absolute left-4 top-4 z-10 max-w-md md:left-6 md:top-6">
        <p className="eyebrow text-primary">FireScope</p>
        <h1 className="font-display text-2xl leading-tight md:text-4xl">Harmonized Global Active Fire Analysis</h1>
        <p className="mt-1 text-sm text-muted-foreground">NASA FIRMS · MODIS + VIIRS · Burning calendars and fire distance tools</p>
        {state.status === "ready" && (
          <p className="mt-2 text-xs text-muted-foreground">
            Country shapes: {state.source === "api" ? "FireScope API" : "bundled dataset (offline mode)"}
          </p>
        )}
      </header>

      {state.status === "loading" && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center"><div className="loader mx-auto" /><p className="mt-4 text-sm text-muted-foreground">Loading fire data…</p></div>
        </div>
      )}
      {state.status === "error" && (
        <div className="absolute inset-0 grid place-items-center p-6">
          <div className="panel max-w-sm text-center">
            <p className="font-display text-xl">Unable to load fire data</p>
            <p className="mt-2 text-sm text-muted-foreground">{state.error}</p>
            <button className="btn-primary mt-4" onClick={retry}>Try again</button>
          </div>
        </div>
      )}
      {state.status === "ready" && all.length === 0 && (
        <div className="absolute inset-0 grid place-items-center"><div className="panel">No country data available.</div></div>
      )}

      {state.status === "ready" && all.length > 0 && (
        <>
          <div className={`absolute bottom-3 left-3 right-3 z-10 max-h-[38vh] overflow-y-auto md:bottom-auto md:left-auto md:right-6 md:top-6 md:max-h-[calc(100dvh-16rem)] md:w-80 ${selected ? "hidden md:block" : ""}`}>
            <CountryInfoPanel feature={active} />
          </div>
          <div className="absolute bottom-6 left-6 top-56 z-10 hidden w-64 space-y-3 overflow-y-auto md:block">
            <FirePixelControls query={pq} onChange={setPq} status={pixelStatus} />
            <FilterPanel continents={continents} filters={filters} onChange={setFilters} shown={visible.length} total={all.length} />
            <MeasurementControls active={measureActive} points={measurePoints} bufferKm={bufferKm}
              distanceKm={measuredDistance} nearbyFires={nearbyFires} firesReady={!!firePoints}
              onToggle={() => { setMeasureActive((value) => !value); if (!measureActive) setMeasurePoints([]); }}
              onBufferChange={setBufferKm}
              onUndo={() => setMeasurePoints((points) => points.slice(0, -1))}
              onClear={() => setMeasurePoints([])} />
            <ReportExportPanel report={report} countries={visible} />
          </div>
          {report && <div className="print-only"><FireReportDocument report={report} /></div>}
          {calendarOpen ? (
            <div className="absolute bottom-3 left-3 right-3 z-20 max-h-[52vh] overflow-y-auto md:bottom-6 md:left-[19rem] md:right-[22rem]">
              <CountryTimeline feature={selected} countries={all}
                onClose={() => { setCalendarOpen(false); setSelected(null); }} />
            </div>
          ) : (
            <button onClick={() => setCalendarOpen(true)}
              className="panel absolute bottom-4 left-1/2 z-10 -translate-x-1/2 text-sm font-semibold text-foreground">
              Open burning calendar
            </button>
          )}
          <div className="absolute bottom-6 right-6 z-10 hidden w-56 md:block"><FireDensityLegend /></div>
          {visible.length === 0 && (
            <div className="absolute inset-x-0 top-1/2 z-10 mx-auto w-fit panel text-sm">No countries match these filters.</div>
          )}
        </>
      )}
    </main>
  );
}
