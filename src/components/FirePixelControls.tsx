import type { PixelQuery } from "@/hooks/useFirePixels";
import { FIRE_SOURCES } from "@/lib/fireSources";

export function FirePixelControls({ query, onChange, status }: {
  query: PixelQuery; onChange: (q: PixelQuery) => void; status: string;
}) {
  return (
    <div className="panel space-y-3">
      <label className="flex items-center justify-between gap-2">
        <span className="eyebrow">Live fire pixels</span>
        <input type="checkbox" className="h-4 w-4 accent-[var(--primary)]" checked={query.enabled}
          onChange={(e) => onChange({ ...query, enabled: e.target.checked })} />
      </label>
      {query.enabled && (
        <>
          <label className="block text-sm">
            <span className="text-muted-foreground">Satellite / product</span>
            <select className="field" value={query.sensor}
              onChange={(e) => onChange({ ...query, sensor: e.target.value as PixelQuery["sensor"] })}>
              {FIRE_SOURCES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
          {query.sensor === "HARMONIZED" && (
            <p className="rounded-md bg-secondary p-2 text-[11px] leading-relaxed text-muted-foreground">
              Merges MODIS and VIIRS, retaining one detection per ~1 km and 2-hour cell. VIIRS is preferred; this is not a radiometric calibration.
            </p>
          )}
          <label className="block text-sm"><span className="text-muted-foreground">Start date</span>
            <input type="date" className="field" value={query.date} min="2018-01-01"
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => e.target.value && onChange({ ...query, date: e.target.value })} />
          </label>
          <label className="block text-sm"><span className="text-muted-foreground">Window</span>
            <select className="field" value={query.days} onChange={(e) => onChange({ ...query, days: Number(e.target.value) })}>
              {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>{d} day{d > 1 ? "s" : ""}</option>)}
            </select>
          </label>
          <p className="text-xs text-muted-foreground">{status}</p>
        </>
      )}
    </div>
  );
}
