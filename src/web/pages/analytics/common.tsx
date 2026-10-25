// Kerangka bersama halaman analitik: header, metadata dataset, filter global, dan status muat.
import type { ReactNode } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import { useApi, type AsyncState } from '../../api';
import { GlobalFilterBar } from '../../components/FilterBar';
import { DatasetMeta, EmptyState, ErrorState, Loading, PageHeader, type DatasetMetaInfo } from '../../components/ui';
import { globalFilterQuery } from '../../filters';

export interface Dist {
  items: { key: string; label: string; count: number; official?: boolean }[];
  unknown: number;
  knownTotal: number;
}

export interface TopOther {
  top: { key: string; label: string; count: number; note?: string }[];
  other: { count: number; categories: number };
  unknown: number;
  knownTotal: number;
}

export interface StatsResponse<T> {
  meta: DatasetMetaInfo;
  data: T;
}

/** Parameter khusus halaman (pilihan detail), disimpan di query string bersama filter global. */
export function usePageParam(name: string): [string, (value: string) => void] {
  const [params, setParams] = useSearchParams();
  const set = (value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    setParams(next, { replace: true });
  };
  return [params.get(name) ?? '', set];
}

/** Path API: filter global + parameter halaman tambahan. */
export function useStats<T>(base: string, extra: Record<string, string> = {}): AsyncState<StatsResponse<T>> {
  const location = useLocation();
  const q = new URLSearchParams(globalFilterQuery(location.search));
  for (const [k, v] of Object.entries(extra)) if (v) q.set(k, v);
  const s = q.toString();
  return useApi<StatsResponse<T>>(`${base}${s ? `?${s}` : ''}`);
}

export function AnalyticsShell<T>({
  title,
  description,
  res,
  isEmpty,
  children,
}: {
  title: string;
  description: string;
  res: AsyncState<StatsResponse<T>>;
  isEmpty: (data: T) => boolean;
  children: (data: T) => ReactNode;
}) {
  const d = res.data?.data;
  return (
    <>
      <PageHeader title={title} description={description} />
      <DatasetMeta meta={res.data?.meta} />
      <GlobalFilterBar />
      {res.loading && !res.data && <Loading />}
      {res.error && <ErrorState error={res.error} onRetry={res.reload} />}
      {d && isEmpty(d) && (
        <EmptyState title={res.data!.meta.activeRecords === 0 ? 'Belum ada data mahasiswa' : 'Tidak ada record yang cocok dengan filter'}>
          {res.data!.meta.activeRecords === 0 ? 'Impor CSV pertama melalui Kelola Dataset › Impor CSV.' : 'Ubah atau hapus filter untuk melihat data.'}
        </EmptyState>
      )}
      {d && !isEmpty(d) && children(d)}
    </>
  );
}

/** Item grafik dari distribusi berdaftar baku: nilai di luar daftar diberi catatan. */
export function refItems(d: Dist, opts: { hideZero?: boolean } = {}) {
  return d.items
    .filter((i) => !opts.hideZero || i.count > 0)
    .map((i) => ({ ...i, note: i.official === false ? 'di luar daftar baku' : undefined }));
}

/** Top N + Lainnya sebagai item grafik. */
export function topItems(t: TopOther, unit: string) {
  return [
    ...t.top,
    ...(t.other.count > 0 ? [{ key: '__lainnya', label: `Lainnya (${t.other.categories} ${unit})`, count: t.other.count, muted: true }] : []),
  ];
}
