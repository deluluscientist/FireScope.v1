import { DENSITY_BINS } from "@/lib/fire";

export interface Filters { continent: string; minDensity: number }

export function FilterPanel({ continents, filters, onChange, shown, total }: {
  continents: string[]; filters: Filters; onChange: (f: Filters) => void; shown: number; total: number;
}) {
  return (
    <div className="panel space-y-3">
      <p className="eyebrow">Filter</p>
      <label className="block text-sm">
        <span className="text-muted-foreground">Continent</span>
        <select className="field" value={filters.continent}
          onChange={(e) => onChange({ ...filters, continent: e.target.value })}>
          <option value="">All continents</option>
          {continents.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      <label className="block text-sm">
        <span className="text-muted-foreground">Minimum density</span>
        <select className="field" value={filters.minDensity}
          onChange={(e) => onChange({ ...filters, minDensity: Number(e.target.value) })}>
          <option value={0}>Any</option>
          {DENSITY_BINS.slice(0, -1).map((b) => <option key={b.max} value={b.max}>≥ {b.max.toLocaleString("en-US")}</option>)}
        </select>
      </label>
      <p className="text-xs text-muted-foreground">{shown} of {total} countries shown</p>
    </div>
  );
}
