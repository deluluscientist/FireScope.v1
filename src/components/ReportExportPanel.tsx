import { downloadBlob, downloadFireCsv, filteredCountriesCsv, type FireReportData } from "@/lib/reports";
import type { CountryFeature } from "@/types/firescope";

interface Props { report: FireReportData | null; countries: CountryFeature[] }

export function ReportExportPanel({ report, countries }: Props) {
  const exportCountries = () => {
    const csv = filteredCountriesCsv(countries.map((f) => f.properties));
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), "firescope-filtered-countries.csv");
  };
  return (
    <section className="panel space-y-2">
      <p className="eyebrow">Reports</p>
      <button className="btn-primary w-full text-sm" disabled={!report} onClick={() => report && window.print()}>
        Print / Save PDF report
      </button>
      <button className="panel w-full text-sm font-semibold disabled:opacity-50" disabled={!report}
        onClick={() => report && downloadFireCsv(report)}>
        Fire detections (CSV)
      </button>
      <button className="panel w-full text-sm font-semibold disabled:opacity-50" disabled={countries.length === 0}
        onClick={exportCountries}>
        Filtered countries (CSV · {countries.length})
      </button>
      {!report && <p className="text-xs text-muted-foreground">Load fire pixels to enable fire reports.</p>}
    </section>
  );
}
