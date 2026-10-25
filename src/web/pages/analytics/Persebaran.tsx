import { HBarChart } from '../../components/charts';
import { Kpi } from '../../components/ui';
import { fmt } from '../../format';
import { AnalyticsShell, refItems, topItems, usePageParam, useStats, type Dist, type TopOther } from './common';

interface Data {
  provinces: TopOther;
  provinceOptions: { key: string; label: string; count: number; official: boolean }[];
  selectedProvince: { key: string; label: string } | null;
  regencies: TopOther;
  domicile: Dist;
}

export function PersebaranPage() {
  const [province, setProvince] = usePageParam('provinsi');
  const res = useStats<Data>('/stats/persebaran', { provinsi: province });

  return (
    <AnalyticsShell
      title="Persebaran"
      description="Asal mahasiswa di Indonesia (provinsi dan kabupaten/kota) dan domisili di Mesir. Pilih satu provinsi untuk melihat kabupaten/kotanya. Hanya record aktif yang dihitung."
      res={res}
      isEmpty={(d) => d.provinces.knownTotal + d.provinces.unknown === 0}
    >
      {(d) => (
        <>
          <section className="kpis" aria-label="Indikator persebaran">
            <Kpi label="Provinsi asal terwakili" value={d.provinceOptions.length} hint={d.provinceOptions.some((p) => !p.official) ? 'Termasuk ejaan di luar daftar baku' : undefined} />
            <Kpi label="Provinsi belum diisi" value={d.provinces.unknown} />
            <Kpi label="Domisili di Mesir belum diisi" value={d.domicile.unknown} />
          </section>

          <div className="grid-2">
            <section className="card">
              <h2>Top 10 provinsi asal</h2>
              <p className="card-sub">"Lainnya" hanya berisi provinsi valid di luar Top 10, bukan data kosong. Klik provinsi untuk melihat kabupaten/kotanya.</p>
              <HBarChart
                items={topItems(d.provinces, 'provinsi')}
                denominator={d.provinces.knownTotal}
                denominatorLabel="record dengan provinsi terisi"
                unknown={d.provinces.unknown}
                onSelect={(k) => setProvince(province === k ? '' : k)}
                selectedKey={province || null}
              />
            </section>

            <section className="card">
              <div className="panel-head">
                <div>
                  <h2>Top 10 kabupaten/kota {d.selectedProvince ? `di ${d.selectedProvince.label}` : 'nasional'}</h2>
                  <p className="card-sub" style={{ marginTop: 0 }}>
                    {d.selectedProvince ? 'Kabupaten/kota dalam provinsi terpilih.' : 'Nama yang sama di provinsi berbeda dihitung terpisah; provinsinya ditampilkan di samping nama.'}
                  </p>
                </div>
                <div className="field">
                  <label htmlFor="pilih-provinsi">Provinsi</label>
                  <select id="pilih-provinsi" value={province} onChange={(e) => setProvince(e.target.value)}>
                    <option value="">Semua provinsi (nasional)</option>
                    {d.provinceOptions.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.label} ({fmt(p.count)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <HBarChart
                items={topItems(d.regencies, 'kabupaten/kota')}
                denominator={d.regencies.knownTotal}
                denominatorLabel="record dengan kabupaten/kota terisi"
                unknown={d.regencies.unknown}
                emptyText="Belum ada kabupaten/kota yang terisi."
              />
            </section>
          </div>

          <div className="grid-2">
            <section className="card">
              <h2>Domisili di Mesir</h2>
              <p className="card-sub">Semua wilayah dalam daftar baku tampil, termasuk yang belum memiliki record.</p>
              <HBarChart items={refItems(d.domicile)} denominator={d.domicile.knownTotal} denominatorLabel="record dengan domisili terisi" unknown={d.domicile.unknown} />
            </section>
            <section className="card">
              <h2>Peta Indonesia</h2>
              <p className="muted small">
                Peta belum ditampilkan. Peta baru akan dipasang setelah ada data batas wilayah yang andal dan nama provinsi di data sudah konsisten dengan daftar baku,
                agar tidak ada wilayah yang salah warna. Grafik di halaman ini sudah memuat angka yang sama.
              </p>
            </section>
          </div>
        </>
      )}
    </AnalyticsShell>
  );
}
