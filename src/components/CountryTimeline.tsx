import { useEffect, useMemo, useState } from "react";
import type { CountryFeature, RegionScope } from "@/types/firescope";
import { useFireTimeline } from "@/hooks/useCountryTimeline";
import { DENSITY_BINS, MONTH_NAMES, formatNumber } from "@/lib/fire";
import { monthEnd, monthStart } from "@/lib/windows";
import { FIRE_SOURCES, fireSourceLabel, type FireSource } from "@/lib/fireSources";

const CURRENT_YEAR = new Date().getUTCFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2017 }, (_, i) => 2018 + i);

function Progress({ p }: { p: { done: number; total: number; failed: number } }) {
  if (p.total === 0) return null;
  const pct = Math.round((p.done / p.total) * 100);
  return (
    <div className="mt-2">
      <div className="h-1 overflow-hidden rounded bg-secondary"><div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {p.done < p.total ? `Loading NASA FIRMS… ${pct}%` : "Complete"}{p.failed ? ` • ${p.failed} window(s) failed` : ""}
      </p>
    </div>
  );
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function CountryTimeline({ feature, countries, onClose }: {
  feature: CountryFeature | null; countries: CountryFeature[]; onClose: () => void;
}) {
  const continents = useMemo(() => [...new Set(countries.map((f) => f.properties.continent).filter(Boolean) as string[])].sort(), [countries]);
  const [scopeId, setScopeId] = useState(feature?.properties.iso_a3 ?? "WORLD");
  const [sensor, setSensor] = useState<FireSource>("MODIS");
  const [year, setYear] = useState(Math.min(2025, CURRENT_YEAR));
  const [month, setMonth] = useState(Number(feature?.properties.peak_burning_month) || 8);
  const [tab, setTab] = useState<"calendar" | "history">("calendar");

  useEffect(() => {
    if (feature) {
      setScopeId(feature.properties.iso_a3);
      setMonth(Number(feature.properties.peak_burning_month) || 8);
    }
  }, [feature]);

  const scope = useMemo<RegionScope>(() => {
    if (scopeId === "WORLD") return { kind: "world", id: "WORLD", label: "World" };
    if (scopeId.startsWith("continent:")) {
      const name = scopeId.slice(10);
      return { kind: "continent", id: name, label: name };
    }
    const country = countries.find((f) => f.properties.iso_a3 === scopeId);
    return { kind: "country", id: scopeId, label: country?.properties.country ?? scopeId };
  }, [scopeId, countries]);
  const isCountry = scope.kind === "country";

  const calRanges = useMemo(() => isCountry
    ? [{ start: `${year}-01-01`, end: `${year}-12-31` }]
    : MONTH_NAMES.slice(1).map((_, i) => ({ start: monthStart(year, i + 1), end: monthStart(year, i + 1) })),
  [isCountry, year]);
  const histRanges = useMemo(() => YEARS.map((y) => ({
    start: monthStart(y, month), end: isCountry ? monthEnd(y, month) : addDays(monthStart(y, month), 4),
  })), [isCountry, month]);
  const cal = useFireTimeline(tab === "calendar" ? scope : null, sensor, calRanges, (d) => d.slice(5, 7));
  const hist = useFireTimeline(tab === "history" ? scope : null, sensor, histRanges, (d) => d.slice(0, 4));

  const calMax = Math.max(1, ...Object.values(cal.counts));
  const histMax = Math.max(1, ...Object.values(hist.counts));
  const calTotal = Object.values(cal.counts).reduce((a, b) => a + b, 0);

  return (
    <section className="panel" aria-label="Burning calendar">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="eyebrow">NASA FIRMS · {fireSourceLabel(sensor)}</p>
          <h3 className="font-display text-lg">{scope.label} burning calendar</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="grid grid-cols-2 gap-1 rounded-md bg-secondary p-1 text-xs">
            {(["calendar", "history"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={tab === t ? "seg seg-on" : "seg"}>
                {t === "calendar" ? "Burning calendar" : "Historical"}</button>))}
          </div>
          <button onClick={onClose} className="seg" aria-label="Close burning calendar">✕</button>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-muted-foreground">Geographic scope
          <select className="field" value={scopeId} onChange={(e) => setScopeId(e.target.value)}>
            <option value="WORLD">World</option>
            <optgroup label="Continents">
              {continents.map((c) => <option key={c} value={`continent:${c}`}>{c}</option>)}
            </optgroup>
            <optgroup label="Countries">
              {countries.map((f, i) => <option key={`${f.properties.iso_a3}-${i}`} value={f.properties.iso_a3}>{f.properties.country}</option>)}
            </optgroup>
          </select>
        </label>
        <label className="text-xs text-muted-foreground">Satellite / product
          <select className="field" value={sensor} onChange={(e) => setSensor(e.target.value as FireSource)}>
            {FIRE_SOURCES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
      </div>
      {sensor === "HARMONIZED" && (
        <p className="mt-2 text-[11px] text-muted-foreground">Harmonized counts merge MODIS + VIIRS and remove likely duplicates in ~1 km, 2-hour cells.</p>
      )}

      {tab === "calendar" ? (
        <>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Year</span>
            <select className="field !mt-0 !w-auto" value={year} onChange={(e) => setYear(+e.target.value)}>
              {YEARS.map((y) => <option key={y}>{y}</option>)}
            </select>
          </div>
          <div className="mt-3 grid grid-cols-6 gap-1.5 sm:grid-cols-12">
            {MONTH_NAMES.slice(1).map((m, i) => {
              const n = cal.counts[String(i + 1).padStart(2, "0")] ?? 0;
              return (
                <div key={m} className="rounded-md border border-border p-1.5 text-center"
                  style={{ background: n ? DENSITY_BINS[Math.min(4, Math.floor((n / calMax) * 4.999))]!.color : undefined }}
                  title={`${m} ${year}: ${formatNumber(n)} ${isCountry ? "fire pixels" : "sampled fire pixels"}`}>
                  <div className={`text-[10px] font-semibold ${n ? "text-primary-foreground" : "text-muted-foreground"}`}>{m.slice(0, 3)}</div>
                  <div className={`font-mono text-[11px] ${n ? "text-primary-foreground" : "text-muted-foreground"}`}>{formatNumber(n)}</div>
                </div>);
            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Colour = share of the busiest month. {isCountry ? `Total ${year}` : "One-day monthly sample total"}: <b className="text-foreground">{formatNumber(calTotal)}</b> fire pixels.
            {!isCountry && " Regional calendars sample the first day of each month; they are not annual totals."}
          </p>
          <Progress p={cal.progress} />
        </>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Compare month</span>
            <select className="field !mt-0 !w-auto" value={month} onChange={(e) => setMonth(+e.target.value)}>
              {MONTH_NAMES.slice(1).map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          {!isCountry && <p className="mt-2 text-[11px] text-muted-foreground">Regional history compares the first 5 days of the selected month in each year.</p>}
          <div className="mt-3 flex h-32 items-end gap-2">
            {YEARS.map((y) => {
              const n = hist.counts[String(y)] ?? 0;
              return (
                <div key={y} className="flex flex-1 flex-col items-center gap-1">
                  <span className="font-mono text-[10px] text-muted-foreground">{formatNumber(n)}</span>
                  <div className="w-full rounded-t bg-primary transition-all" style={{ height: `${(n / histMax) * 80}px` }} />
                  <span className="text-[11px] text-muted-foreground">{y}</span>
                </div>);
            })}
          </div>
          <Progress p={hist.progress} />
        </>
      )}
    </section>
  );
}
