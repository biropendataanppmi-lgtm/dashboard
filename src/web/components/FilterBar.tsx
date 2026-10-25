import { useApi } from '../api';
import { useGlobalFilters } from '../filters';
import { fmt } from '../format';
import type { DatasetMetaInfo } from './ui';

export interface MetaResponse {
  meta: DatasetMetaInfo;
  options: {
    years: { year: number; count: number }[];
    kekeluargaan: { key: string; label: string }[];
    available: { tahun: boolean; kekeluargaan: boolean; jk: boolean };
  };
}

/** Filter global. Dimensi yang tidak tersedia disembunyikan dengan penjelasan (§5.8). */
export function GlobalFilterBar() {
  const { values, set, clear, active } = useGlobalFilters();
  const meta = useApi<MetaResponse>('/stats/meta');
  const opt = meta.data?.options;
  const hidden: string[] = [];
  if (opt && !opt.available.tahun) hidden.push('tahun kedatangan');
  if (opt && !opt.available.kekeluargaan) hidden.push('kekeluargaan');
  if (opt && !opt.available.jk) hidden.push('jenis kelamin');

  return (
    <div className="filter-bar" role="search" aria-label="Filter global">
      {opt?.available.tahun && (
        <div className="field">
          <label htmlFor="f-tahun">Tahun kedatangan pertama</label>
          <select id="f-tahun" value={values.tahun} onChange={(e) => set('tahun', e.target.value)}>
            <option value="">Semua tahun</option>
            {opt.years.map((y) => (
              <option key={y.year} value={y.year}>
                {y.year} ({fmt(y.count)})
              </option>
            ))}
          </select>
        </div>
      )}
      {opt?.available.kekeluargaan && (
        <div className="field">
          <label htmlFor="f-kek">Kekeluargaan</label>
          <select id="f-kek" value={values.kekeluargaan} onChange={(e) => set('kekeluargaan', e.target.value)}>
            <option value="">Semua kekeluargaan</option>
            {opt.kekeluargaan.map((k) => (
              <option key={k.key} value={k.key}>
                {k.label}
              </option>
            ))}
          </select>
        </div>
      )}
      {opt?.available.jk && (
        <div className="field">
          <label htmlFor="f-jk">Jenis kelamin</label>
          <select id="f-jk" value={values.jk} onChange={(e) => set('jk', e.target.value)}>
            <option value="">Banin dan banat</option>
            <option value="L">Banin</option>
            <option value="P">Banat</option>
          </select>
        </div>
      )}
      {active && (
        <button type="button" className="btn" onClick={clear}>
          Hapus filter
        </button>
      )}
      {meta.loading && <span className="muted small">Memuat pilihan filter…</span>}
      {meta.error && <span className="small" style={{ color: 'var(--err)' }}>Pilihan filter gagal dimuat: {meta.error.message}</span>}
      {hidden.length > 0 && <span className="filter-note">Filter {hidden.join(', ')} disembunyikan karena datanya belum tersedia.</span>}
    </div>
  );
}
