import { CompositionBar, HBarChart } from '../../components/charts';
import { Badge, Kpi, Loading } from '../../components/ui';
import { fmt, pct } from '../../format';
import { AnalyticsShell, refItems, topItems, usePageParam, useStats, type Dist, type TopOther } from './common';

interface Row {
  key: string;
  label: string;
  official: boolean;
  total: number;
  banin: number;
  banat: number;
  genderUnknown: number;
  jenjang: Record<string, number>;
}

interface Profile {
  key: string;
  gender: { total: number; banin: number; banat: number; unknown: number };
  education: Dist;
  faculty: Dist;
  provinces: TopOther;
  domicile: Dist;
  arrivalYears: { year: number; count: number }[];
}

interface Data {
  rows: Row[];
  unknown: number;
  knownTotal: number;
  jenjangOrder: string[];
  detail: Profile | null;
}

export function KekeluargaanPage() {
  const [selected, setSelected] = usePageParam('pilih');
  const res = useStats<Data>('/stats/kekeluargaan', { pilih: selected });
  const detail = res.data?.data.detail ?? null;

  return (
    <AnalyticsShell
      title="Kekeluargaan"
      description="Jumlah mahasiswa tercatat per kekeluargaan, beserta komposisi jenis kelamin dan jenjang. Pilih satu kekeluargaan untuk melihat profilnya. Hanya record aktif yang dihitung."
      res={res}
      isEmpty={(d) => d.knownTotal + d.unknown === 0}
    >
      {(d) => {
        const official = d.rows.filter((r) => r.official);
        const represented = official.filter((r) => r.total > 0).length;
        const outside = d.rows.filter((r) => !r.official);
        const largest = d.rows[0];
        return (
          <>
            <section className="kpis" aria-label="Indikator kekeluargaan">
              <Kpi label="Kekeluargaan terwakili" value={represented} hint={`dari ${official.length} kekeluargaan dalam daftar baku`} />
              <Kpi label="Terbesar" value={largest?.total ?? 0} hint={largest && largest.total > 0 ? largest.label : undefined} />
              <Kpi label="Kekeluargaan belum diisi" value={d.unknown} hint="Record tanpa kekeluargaan; tidak dihitung sebagai kategori" />
              {outside.length > 0 && <Kpi label="Di luar daftar baku" value={outside.reduce((s, r) => s + r.total, 0)} hint={`${outside.length} ejaan, lihat Kualitas Data`} />}
            </section>

            <div className="grid-2">
              <section className="card">
                <h2>Distribusi kekeluargaan</h2>
                <p className="card-sub">Ke-16 kekeluargaan selalu tampil, termasuk yang belum memiliki record. Klik untuk melihat profil.</p>
                <HBarChart
                  items={refItems({ items: d.rows.map((r) => ({ key: r.key, label: r.label, count: r.total, official: r.official })), unknown: d.unknown, knownTotal: d.knownTotal })}
                  denominator={d.knownTotal}
                  denominatorLabel="record dengan kekeluargaan terisi"
                  unknown={d.unknown}
                  onSelect={(k) => setSelected(selected === k ? '' : k)}
                  selectedKey={selected || null}
                />
              </section>
              {selected ? <ProfilePanel row={d.rows.find((r) => r.key === selected)} profile={detail} loading={res.loading} onClose={() => setSelected('')} /> : (
                <section className="card">
                  <h2>Profil kekeluargaan</h2>
                  <p className="muted small">Pilih satu kekeluargaan pada grafik atau tabel untuk melihat jenjang, fakultas, provinsi asal, domisili di Mesir, dan tahun kedatangan anggotanya.</p>
                </section>
              )}
            </div>

            <section className="card">
              <h2>Tabel ringkasan</h2>
              <p className="card-sub">Persentase dihitung dari {fmt(d.knownTotal)} record dengan kekeluargaan terisi.</p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Kekeluargaan</th>
                      <th className="num">Mahasiswa</th>
                      <th className="num">%</th>
                      <th className="num">Banin</th>
                      <th className="num">Banat</th>
                      <th>Komposisi</th>
                      {d.jenjangOrder.map((j) => (
                        <th key={j} className="num">
                          {j}
                        </th>
                      ))}
                      <th className="num" title="Jenjang kosong atau di luar daftar baku">
                        Jenjang lain/kosong
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.rows.map((r) => {
                      const otherJ = r.total - d.jenjangOrder.reduce((s, j) => s + (r.jenjang[j] ?? 0), 0);
                      return (
                        <tr key={r.key} className="clickable" onClick={() => setSelected(r.key)} aria-selected={selected === r.key}>
                          <td>
                            <b>{r.label}</b> {!r.official && <Badge tone="warn">di luar daftar</Badge>}
                          </td>
                          <td className="num">{fmt(r.total)}</td>
                          <td className="num muted">{r.total ? pct(r.total, d.knownTotal) : '—'}</td>
                          <td className="num">{fmt(r.banin)}</td>
                          <td className="num">{fmt(r.banat)}</td>
                          <td>
                            <MiniComposition banin={r.banin} banat={r.banat} unknown={r.genderUnknown} />
                          </td>
                          {d.jenjangOrder.map((j) => (
                            <td key={j} className="num">
                              {fmt(r.jenjang[j] ?? 0)}
                            </td>
                          ))}
                          <td className="num muted">{fmt(otherJ)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        );
      }}
    </AnalyticsShell>
  );
}

function MiniComposition({ banin, banat, unknown }: { banin: number; banat: number; unknown: number }) {
  const total = banin + banat + unknown;
  if (!total) return <span className="muted">—</span>;
  return (
    <span className="mini-comp" role="img" aria-label={`Banin ${fmt(banin)}, banat ${fmt(banat)}, belum diisi ${fmt(unknown)}`} title={`Banin ${fmt(banin)} · Banat ${fmt(banat)} · Belum diisi ${fmt(unknown)}`}>
      <i style={{ width: `${(banin / total) * 100}%`, background: 'var(--bar)' }} />
      <i style={{ width: `${(banat / total) * 100}%`, background: 'var(--bar-2)' }} />
    </span>
  );
}

function ProfilePanel({ row, profile, loading, onClose }: { row: Row | undefined; profile: Profile | null; loading: boolean; onClose: () => void }) {
  return (
    <section className="card" aria-live="polite">
      <div className="panel-head">
        <div>
          <h2>Profil {row?.label ?? 'kekeluargaan'}</h2>
          <p className="muted small">{row ? `${fmt(row.total)} mahasiswa tercatat sesuai filter.` : ''}</p>
        </div>
        <button className="btn" type="button" onClick={onClose}>
          Tutup
        </button>
      </div>
      {!profile && loading && <Loading />}
      {profile && profile.gender.total === 0 && <p className="muted">Belum ada record untuk kekeluargaan ini sesuai filter.</p>}
      {profile && profile.gender.total > 0 && (
        <>
          <CompositionBar
            parts={[
              { key: 'L', label: 'Banin', count: profile.gender.banin, color: 'var(--bar)' },
              { key: 'P', label: 'Banat', count: profile.gender.banat, color: 'var(--bar-2)' },
            ]}
            unknown={profile.gender.unknown}
          />
          <h3 className="small">Jenjang pendidikan</h3>
          <HBarChart items={refItems(profile.education)} denominator={profile.education.knownTotal} denominatorLabel="record dengan jenjang terisi" unknown={profile.education.unknown} />
          <h3 className="small">Fakultas</h3>
          <HBarChart items={refItems(profile.faculty)} denominator={profile.faculty.knownTotal} denominatorLabel="record dengan fakultas terisi" unknown={profile.faculty.unknown} />
          <h3 className="small">Provinsi asal (Top 10)</h3>
          <HBarChart items={topItems(profile.provinces, 'provinsi')} denominator={profile.provinces.knownTotal} denominatorLabel="record dengan provinsi terisi" unknown={profile.provinces.unknown} />
          <h3 className="small">Domisili di Mesir</h3>
          <HBarChart items={refItems(profile.domicile)} denominator={profile.domicile.knownTotal} denominatorLabel="record dengan domisili terisi" unknown={profile.domicile.unknown} />
          <h3 className="small">Tahun kedatangan pertama</h3>
          <HBarChart
            items={profile.arrivalYears.map((y) => ({ key: String(y.year), label: String(y.year), count: y.count }))}
            denominator={profile.arrivalYears.reduce((s, y) => s + y.count, 0)}
            denominatorLabel="record dengan kedatangan terisi"
          />
        </>
      )}
    </section>
  );
}
