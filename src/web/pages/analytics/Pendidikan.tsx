import { useMemo, useState } from 'react';
import { CompositionBar, HBarChart } from '../../components/charts';
import { Kpi } from '../../components/ui';
import { fmt, pct } from '../../format';
import { AnalyticsShell, refItems, usePageParam, useStats, type Dist } from './common';

interface MajorRow {
  facultyKey: string | null;
  faculty: string | null;
  majorKey: string | null;
  major: string | null;
  total: number;
  banin: number;
  banat: number;
}

interface Data {
  gender: { total: number; banin: number; banat: number; unknown: number };
  education: Dist;
  faculty: Dist;
  majors: MajorRow[];
  majorUnknown: number;
}

export function PendidikanPage() {
  const [selected, setSelected] = usePageParam('fakultas');
  const [query, setQuery] = useState('');
  const res = useStats<Data>('/stats/pendidikan');

  return (
    <AnalyticsShell
      title="Pendidikan"
      description="Struktur pendidikan mahasiswa: jenjang, fakultas, dan jurusan. Pilih satu fakultas untuk melihat jurusan di dalamnya. Hanya record aktif yang dihitung."
      res={res}
      isEmpty={(d) => d.gender.total === 0}
    >
      {(d) => <Content d={d} selected={selected} setSelected={setSelected} query={query} setQuery={setQuery} />}
    </AnalyticsShell>
  );
}

function Content({ d, selected, setSelected, query, setQuery }: { d: Data; selected: string; setSelected: (v: string) => void; query: string; setQuery: (v: string) => void }) {
  const facultyLabel = d.faculty.items.find((f) => f.key === selected)?.label;
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return d.majors.filter((m) => (!selected || m.facultyKey === selected) && (!q || `${m.faculty ?? ''} ${m.major ?? ''}`.toLowerCase().includes(q)));
  }, [d.majors, selected, query]);
  const facultyTotal = selected ? d.majors.filter((m) => m.facultyKey === selected).reduce((s, m) => s + m.total, 0) : 0;
  const sel = selected ? d.majors.filter((m) => m.facultyKey === selected) : [];
  const selBanin = sel.reduce((s, m) => s + m.banin, 0);
  const selBanat = sel.reduce((s, m) => s + m.banat, 0);
  const distinctMajors = new Set(d.majors.filter((m) => m.majorKey).map((m) => `${m.facultyKey}|${m.majorKey}`)).size;

  return (
    <>
      <section className="kpis" aria-label="Indikator pendidikan">
        <Kpi label="Mahasiswa tercatat" value={d.gender.total} />
        {d.education.items
          .filter((i) => i.official)
          .map((i) => (
            <Kpi key={i.key} label={i.label} value={i.count} hint={i.count ? `${pct(i.count, d.education.knownTotal)} dari jenjang terisi` : undefined} />
          ))}
        <Kpi label="Jurusan tercatat" value={distinctMajors} hint="Pasangan fakultas dan jurusan yang berbeda" />
      </section>

      <div className="grid-2">
        <section className="card">
          <h2>Jenjang pendidikan</h2>
          <p className="card-sub">Sesuai daftar baku: Daurah Lughah, Ma'had, S1.</p>
          <HBarChart items={refItems(d.education)} denominator={d.education.knownTotal} denominatorLabel="record dengan jenjang terisi" unknown={d.education.unknown} />
        </section>
        <section className="card">
          <h2>Fakultas</h2>
          <p className="card-sub">Semua fakultas dalam daftar baku tampil. Klik untuk menyaring tabel jurusan.</p>
          <HBarChart
            items={refItems(d.faculty)}
            denominator={d.faculty.knownTotal}
            denominatorLabel="record dengan fakultas terisi"
            unknown={d.faculty.unknown}
            unknownLabel="Fakultas belum diisi (termasuk jenjang tanpa fakultas)"
            onSelect={(k) => setSelected(selected === k ? '' : k)}
            selectedKey={selected || null}
          />
        </section>
      </div>

      {selected && (
        <section className="card" aria-live="polite">
          <div className="panel-head">
            <div>
              <h2>Fakultas {facultyLabel ?? ''}</h2>
              <p className="muted small">{fmt(facultyTotal)} mahasiswa tercatat sesuai filter.</p>
            </div>
            <button className="btn" type="button" onClick={() => setSelected('')}>
              Tampilkan semua fakultas
            </button>
          </div>
          <CompositionBar
            parts={[
              { key: 'L', label: 'Banin', count: selBanin, color: 'var(--bar)' },
              { key: 'P', label: 'Banat', count: selBanat, color: 'var(--bar-2)' },
            ]}
            unknown={facultyTotal - selBanin - selBanat}
          />
          <HBarChart
            items={sel.filter((m) => m.majorKey).slice(0, 10).map((m) => ({ key: m.majorKey!, label: m.major!, count: m.total }))}
            denominator={sel.filter((m) => m.majorKey).reduce((s, m) => s + m.total, 0)}
            denominatorLabel="record fakultas ini dengan jurusan terisi"
            unknown={sel.filter((m) => !m.majorKey).reduce((s, m) => s + m.total, 0)}
            unknownLabel="Jurusan belum diisi"
            emptyText="Belum ada jurusan yang terisi untuk fakultas ini."
          />
        </section>
      )}

      <section className="card">
        <h2>Tabel jurusan</h2>
        <p className="card-sub">Jurusan dikelompokkan per fakultas: nama jurusan yang sama di fakultas berbeda dihitung terpisah. Jurusan belum memiliki daftar baku, jadi penulisannya mengikuti data.</p>
        <div className="toolbar">
          <div className="field">
            <label htmlFor="cari-jurusan">Cari fakultas atau jurusan</label>
            <input id="cari-jurusan" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="contoh: tafsir" />
          </div>
          {selected && (
            <button className="btn" type="button" onClick={() => setSelected('')}>
              Hapus saringan fakultas
            </button>
          )}
        </div>
        {rows.length === 0 ? (
          <p className="muted">Tidak ada jurusan yang cocok.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fakultas</th>
                  <th>Jurusan</th>
                  <th className="num">Mahasiswa</th>
                  <th className="num">Banin</th>
                  <th className="num">Banat</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={`${m.facultyKey}|${m.majorKey}`}>
                    <td>{m.faculty ?? <span className="muted">Belum diisi</span>}</td>
                    <td>{m.major ?? <span className="muted">Belum diisi</span>}</td>
                    <td className="num">{fmt(m.total)}</td>
                    <td className="num">{fmt(m.banin)}</td>
                    <td className="num">{fmt(m.banat)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="chart-foot">
          <span>Record tanpa fakultas dan jurusan sekaligus tidak tampil di tabel. Jurusan belum diisi: {fmt(d.majorUnknown)} record.</span>
        </div>
      </section>
    </>
  );
}
