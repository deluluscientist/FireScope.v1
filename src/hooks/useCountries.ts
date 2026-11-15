import { useEffect, useState } from "react";
import { fetchCountriesWithFallback } from "@/services/api";
import { normalizeCountryFeatures } from "@/lib/countries";
import type { CountryFeature, DataSource } from "@/types/firescope";

type State =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; countries: CountryFeature[]; source: DataSource };

export function useCountries() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const ctrl = new AbortController();
    setState({ status: "loading" });
    fetchCountriesWithFallback(ctrl.signal)
      .then(({ data, source }) =>
        setState({ status: "ready", countries: normalizeCountryFeatures(data.features), source }))
      .catch((e: Error) => { if (!ctrl.signal.aborted) setState({ status: "error", error: e.message }); });
    return () => ctrl.abort();
  }, [attempt]);
  return { state, retry: () => setAttempt((a) => a + 1) };
}
