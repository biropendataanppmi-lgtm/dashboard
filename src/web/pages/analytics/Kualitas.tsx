import { Link } from 'react-router';
import { DEACTIVATION_REASONS } from '../../../shared/columns';
import { Badge, Kpi } from '../../components/ui';
import { fmt, pct } from '../../format';
import { AnalyticsShell, useStats } from './common';

interface Data {
  total: number;
  completeness: { field: string; header: string; label: string; analytic: boolean; sensitive: boolean; filled: number; total: number }[];
  coverage: { field: string; label: string; officialCategories: number; usedOfficial: number; unusedOfficial: string[]; outside: { label: string; count: number }[]; outsideRecords: number; knownTotal: number }[];
  variants: { field: string; label: string; groups: { forms: string[]; records: number }[] }[];
  duplicates: { key: string; label: string; groups: number; records: number }[];
  arrivalIdMismatch: number;
  rowIssues: Record<string, number>;
  inactive: { reason: string | null; n: number }[];
}

export function KualitasPage() {
  const res = useStats<Data>('/stats/kualitas');
  return (
    <AnalyticsShell
      title="Kualitas Data"
      description="Kelengkapan dan konsistensi data untuk Biro Data dan Statistika: kolom yang masih kosong, nilai di luar daftar baku, variasi penulisan, dan indikasi duplikasi. Halaman ini hanya menampilkan jumlah, bukan nilai data pribadi."
      res={res}
      isEmpty={(d) => d.total === 0}
    >
      {(d) => {
        const analytic = d.completeness.filter((c) => c.analytic);
        const avg = analytic.length ? analytic.reduce((s, c) => s + c.filled / c.total, 0) / analytic.length : 0;
        const outside = d.coverage.reduce((s, c) => s + c.outsideRecords, 0);
        const dupGroups = d.duplicates.reduce((s, x) => s + x.groups, 0);
        const pending = (d.rowIssues.belum_ditinjau ?? 0) + (d.rowIssues.perlu_perbaikan ?? 0);
        return (
          <>
            <section className="kpis" aria-label="Indikator kualitas data">
              <Kpi label="Kelengkapan kolom analitik (%)" value={Math.round(avg * 100)} hint="Rata-rata persen terisi, kolom analitik" />
              <Kpi label="Nilai di luar daftar baku" value={outside} hint="Jumlah isian di semua kolom berdaftar baku" />
              <Kpi label="Kelompok indikasi duplikat" value={dupGroups} hint="Belum tentu duplikat; periksa manual" />
              <Kpi label="Temuan impor belum selesai" value={pending} hint="Belum ditinjau atau perlu perbaikan" />
            </section>

            <section className="card">
              <h2>Kelengkapan per kolom</h2>
              <p className="card-sub">Dihitung dari {fmt(d.total)} record aktif sesuai filter. Kolom analitik dipakai di grafik; sel kosong tidak dihitung sebagai kategori.</p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Kolom</th>
                      <th>Jenis</th>
                      <th className="num">Terisi</th>
                      <th className="num">Kosong</th>
                      <th>Kelengkapan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.completeness.map((c) => {
                      const ratio = c.total ? c.filled / c.total : 0;
                      return (
                        <tr key={c.field}>
                          <td>
                            {c.label} <span className="mono small muted">{c.header}</span>
                          </td>
                          <td>{c.analytic ? <Badge tone="ok">analitik</Badge> : c.sensitive ? <Badge tone="neutral">data pribadi</Badge> : <Badge tone="neutral">identitas</Badge>}</td>
                          <td className="num">{fmt(c.filled)}</td>
                          <td className="num">{fmt(c.total - c.filled)}</td>
                          <td>
                            <span className={`pct-bar${ratio < 0.9 ? ' low' : ''}`} aria-hidden="true">
                              <i style={{ width: `${ratio * 100}%` }} />
                            </span>
                            <span className="num">{pct(c.filled, c.total)}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="card">
              <h2>Cakupan daftar baku</h2>
              <p className="card-sub">Nilai di luar daftar tetap disimpan dan dihitung sebagai kategori tersendiri. Perbaiki ejaannya di spreadsheet atau di Data Mahasiswa agar masuk kategori yang benar.</p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Kolom</th>
                      <th className="num">Kategori baku terpakai</th>
                      <th>Nilai di luar daftar</th>
                      <th>Kategori baku tanpa record</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.coverage.map((c) => (
                      <tr key={c.field}>
                        <td>{c.label}</td>
                        <td className="num">
                          {fmt(c.usedOfficial)} / {fmt(c.officialCategories)}
                        </td>
                        <td>
                          {c.outside.length === 0 ? (
                            <span className="muted">Tidak ada</span>
                          ) : (
                            <div className="chips">
                              {c.outside.map((o) => (
                                <Badge key={o.label} tone="warn">
                                  {o.label} · {fmt(o.count)}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="small muted">{c.unusedOfficial.length ? c.unusedOfficial.join(', ') : 'Semua terpakai'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="grid-2">
              <section className="card">
                <h2>Variasi penulisan</h2>
                <p className="card-sub">Kolom tanpa daftar baku yang ditulis dengan beberapa ejaan (beda huruf besar/kecil). Di grafik, ejaan ini sudah digabung.</p>
                {d.variants.every((v) => v.groups.length === 0) ? (
                  <p className="muted">Tidak ada variasi penulisan.</p>
                ) : (
                  d.variants
                    .filter((v) => v.groups.length > 0)
                    .map((v) => (
                      <div key={v.field}>
                        <h3 className="small">{v.label}</h3>
                        <ul className="small">
                          {v.groups.map((g) => (
                            <li key={g.forms.join('|')}>
                              {g.forms.map((f) => `"${f}"`).join(', ')} <span className="muted">· {fmt(g.records)} record</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))
                )}
              </section>

              <section className="card">
                <h2>Indikasi duplikasi</h2>
                <p className="card-sub">Kelompok record aktif yang memiliki nilai sama. Sistem tidak pernah menggabungkan record otomatis.</p>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Indikasi</th>
                        <th className="num">Kelompok</th>
                        <th className="num">Record</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.duplicates.map((x) => (
                        <tr key={x.key}>
                          <td>{x.label}</td>
                          <td className="num">{fmt(x.groups)}</td>
                          <td className="num">{fmt(x.records)}</td>
                        </tr>
                      ))}
                      <tr>
                        <td>Tahun kedatangan berbeda dari angkatan di ID (hanya catatan)</td>
                        <td className="num">—</td>
                        <td className="num">{fmt(d.arrivalIdMismatch)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <div className="grid-2">
              <section className="card">
                <h2>Temuan impor</h2>
                <p className="card-sub">Seluruh riwayat impor, tidak mengikuti filter.</p>
                <dl className="kv">
                  <dt>Belum ditinjau</dt>
                  <dd className="num">{fmt(d.rowIssues.belum_ditinjau ?? 0)}</dd>
                  <dt>Perlu perbaikan</dt>
                  <dd className="num">{fmt(d.rowIssues.perlu_perbaikan ?? 0)}</dd>
                  <dt>Selesai</dt>
                  <dd className="num">{fmt(d.rowIssues.selesai ?? 0)}</dd>
                </dl>
                <Link to="/app/dataset/baris-bermasalah">Buka Baris Bermasalah</Link>
              </section>
              <section className="card">
                <h2>Record nonaktif</h2>
                <p className="card-sub">Tidak dihitung di grafik mana pun. Tidak mengikuti filter.</p>
                {d.inactive.length === 0 ? (
                  <p className="muted">Belum ada record nonaktif.</p>
                ) : (
                  <dl className="kv">
                    {d.inactive.map((r) => (
                      <div key={r.reason ?? '-'} style={{ display: 'contents' }}>
                        <dt>{r.reason ? (DEACTIVATION_REASONS[r.reason as keyof typeof DEACTIVATION_REASONS] ?? r.reason) : 'Tanpa alasan'}</dt>
                        <dd className="num">{fmt(r.n)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </section>
            </div>
          </>
        );
      }}
    </AnalyticsShell>
  );
}
