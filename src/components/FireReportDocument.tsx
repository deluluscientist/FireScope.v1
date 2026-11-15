import { formatNumber } from "@/lib/fire";
import { fireSourceLabel } from "@/lib/fireSources";
import { PRINT_REPORT_ROW_LIMIT, fireReportDateRange, type FireReportData } from "@/lib/reports";

export function FireReportDocument({ report }: { report: FireReportData }) {
  const rows = report.points.slice(0, PRINT_REPORT_ROW_LIMIT);
  return (
    <article className="fire-report bg-background text-foreground" aria-label="Filtered fire data report">
      <header className="border-b border-border pb-4">
        <p className="eyebrow">FireScope · NASA FIRMS</p>
        <h1 className="mt-1 font-display text-3xl">Filtered Active Fire Report</h1>
        <p className="mt-2 text-sm text-muted-foreground">Generated {new Date().toISOString().replace("T", " ").slice(0, 16)} UTC</p>
      </header>

      <section className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <div><p className="eyebrow">Satellite / product</p><p className="mt-1 font-semibold">{fireSourceLabel(report.sensor)}</p></div>
        <div><p className="eyebrow">Date window</p><p className="mt-1 font-semibold">{fireReportDateRange(report)}</p></div>
        <div><p className="eyebrow">NASA source</p><p className="mt-1 font-semibold">{report.source}</p></div>
        <div><p className="eyebrow">Source detections</p><p className="mt-1 font-mono text-lg">{formatNumber(report.total)}</p></div>
        <div><p className="eyebrow">Loaded / CSV rows</p><p className="mt-1 font-mono text-lg">{formatNumber(report.points.length)}</p></div>
        <div><p className="eyebrow">Likely duplicates removed</p><p className="mt-1 font-mono text-lg">{formatNumber(report.duplicatesRemoved)}</p></div>
      </section>

      {report.sensor === "HARMONIZED" && (
        <p className="mt-4 rounded-md border border-border p-3 text-xs text-muted-foreground">
          Harmonized data merges MODIS and VIIRS in approximately 1 km and 2-hour UTC cells. It is a spatial/temporal merge, not a radiometric calibration.
        </p>
      )}

      <section className="mt-6">
        <h2 className="font-display text-xl">Detection details</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Showing {formatNumber(rows.length)} of {formatNumber(report.points.length)} loaded detections.
          {report.points.length > rows.length && " The CSV export contains every loaded detection."}
        </p>
        <table className="mt-3 w-full border-collapse text-left text-[9px]">
          <thead>
            <tr className="border-y border-border text-muted-foreground">
              <th className="px-1 py-2">Date</th><th className="px-1 py-2">UTC</th><th className="px-1 py-2">Latitude</th>
              <th className="px-1 py-2">Longitude</th><th className="px-1 py-2">Satellite</th><th className="px-1 py-2">Sensor</th>
              <th className="px-1 py-2">FRP (MW)</th><th className="px-1 py-2">D/N</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((point, index) => (
              <tr key={`${point.date}-${point.time}-${point.lat}-${point.lng}-${index}`} className="border-b border-border">
                <td className="px-1 py-1.5">{point.date}</td><td className="px-1 py-1.5">{point.time}</td>
                <td className="px-1 py-1.5 font-mono">{point.lat.toFixed(4)}</td><td className="px-1 py-1.5 font-mono">{point.lng.toFixed(4)}</td>
                <td className="px-1 py-1.5">{point.satellite}</td><td className="px-1 py-1.5">{point.sensor}</td>
                <td className="px-1 py-1.5 font-mono">{point.frp}</td><td className="px-1 py-1.5">{point.isDay ? "D" : "N"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </article>
  );
}
