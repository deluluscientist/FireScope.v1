import { DENSITY_BINS, NO_DATA_COLOR } from "@/lib/fire";

export function FireDensityLegend() {
  return (
    <div className="panel">
      <p className="eyebrow">Fire Density / 10,000 km²</p>
      <ul className="mt-2 space-y-1.5 text-sm">
        {[...DENSITY_BINS, { color: NO_DATA_COLOR, label: "No data" }].map((b) => (
          <li key={b.label} className="flex items-center gap-2">
            <span className="h-3 w-5 rounded-sm" style={{ background: b.color }} />
            {b.label}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">Height = total fire pixels (log scale)</p>
    </div>
  );
}
