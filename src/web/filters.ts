// Filter global analitik (§5.8; audit E5): tahun kedatangan pertama, kekeluargaan, jenis kelamin.
// Disimpan di query string agar ikut terbawa saat berpindah antarhalaman analitik.
import { useSearchParams } from 'react-router';

export const GLOBAL_FILTER_KEYS = ['tahun', 'kekeluargaan', 'jk'] as const;
export type GlobalFilterKey = (typeof GLOBAL_FILTER_KEYS)[number];

export function useGlobalFilters() {
  const [params, setParams] = useSearchParams();
  const values = Object.fromEntries(GLOBAL_FILTER_KEYS.map((k) => [k, params.get(k) ?? ''])) as Record<GlobalFilterKey, string>;
  const set = (key: GlobalFilterKey, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };
  const clear = () => {
    const next = new URLSearchParams(params);
    GLOBAL_FILTER_KEYS.forEach((k) => next.delete(k));
    setParams(next, { replace: true });
  };
  return { values, set, clear, active: GLOBAL_FILTER_KEYS.some((k) => values[k]) };
}

/** Query string filter global saja, untuk tautan antarhalaman analitik. */
export function globalFilterQuery(search: string): string {
  const src = new URLSearchParams(search);
  const out = new URLSearchParams();
  for (const k of GLOBAL_FILTER_KEYS) {
    const v = src.get(k);
    if (v) out.set(k, v);
  }
  const s = out.toString();
  return s ? `?${s}` : '';
}
