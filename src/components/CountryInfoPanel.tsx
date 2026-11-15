import type { CountryFeature } from "@/types/firescope";
import { formatNumber, monthName, withUnit } from "@/lib/fire";

export function CountryInfoPanel({ feature }: { feature: CountryFeature | null }) {
  const p = feature?.properties;
  const season = Number(p?.season_duration_months);
  const rows: [string, string][] = p ? [
    ["Continent", p.continent ?? "N/A"],
    ["Total Fire Pixels", formatNumber(p.total_fire_pixels)],
    ["Fire Density", withUnit(formatNumber(p.fire_density_per_10k_km2, 2), " / 10k km²")],
    ["Peak Burning Month", monthName(p.peak_burning_month)],
    ["Fire Season Duration", p.season_duration_months != null && Number.isFinite(season) ? `${season} months` : "N/A"],
    ["12-Month Autocorrelation", formatNumber(p.autocorr_12month, 3)],
    ["Mean FRP", withUnit(formatNumber(p.mean_frp_mw, 2), " MW")],
    ["Maximum FRP", withUnit(formatNumber(p.max_frp_mw, 2), " MW")],
    ["Daytime Fires", withUnit(formatNumber(p.daytime_fire_pct, 1), "%")],
  ] : [];
  return (
    <aside className="panel">
      <p className="eyebrow">{p ? `${p.iso_a3 ?? "N/A"} • MODIS FIRMS` : "MODIS FIRMS statistics"}</p>
      <h2 className="mt-1 font-display text-2xl leading-tight">{p?.country ?? "Hover over a country"}</h2>
      {p ? (
        <dl className="mt-4 divide-y divide-border">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-4 py-2 text-sm">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-mono tabular-nums text-foreground">{v}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Hover or tap a country on the globe to view its fire statistics.</p>
      )}
    </aside>
  );
}
