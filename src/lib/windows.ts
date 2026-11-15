/** Splits [start, end] (inclusive, YYYY-MM-DD) into ≤5-day windows; FIRMS area API allows 1–5 days. */
export function dateWindows(start: string, end: string): { date: string; days: number }[] {
  const out: { date: string; days: number }[] = [];
  const d = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`).getTime();
  while (d.getTime() <= last) {
    const remaining = Math.round((last - d.getTime()) / 864e5) + 1;
    const days = Math.min(5, remaining);
    out.push({ date: d.toISOString().slice(0, 10), days });
    d.setUTCDate(d.getUTCDate() + days);
  }
  return out;
}

export function monthEnd(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}
const pad = (n: number) => String(n).padStart(2, "0");
export const monthStart = (y: number, m: number) => `${y}-${pad(m)}-01`;

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/** Historical ranges: full months for countries, or five-day monthly samples for regions. */
export function historicalRanges(
  years: number[], selectedMonth: number, allMonths: boolean, isCountry: boolean,
): { start: string; end: string }[] {
  const months = allMonths ? Array.from({ length: 12 }, (_, i) => i + 1) : [selectedMonth];
  return years.flatMap((year) => months.map((month) => ({
    start: monthStart(year, month),
    end: isCountry ? monthEnd(year, month) : addDays(monthStart(year, month), 4),
  })));
}
