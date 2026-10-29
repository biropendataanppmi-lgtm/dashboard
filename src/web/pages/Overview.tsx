import { useLocation } from 'react-router';
import { useApi } from '../api';
import { CompositionBar, HBarChart } from '../components/charts';
import { GlobalFilterBar } from '../components/FilterBar';
import { DatasetMeta, EmptyState, ErrorState, Kpi, PageHeader, type DatasetMetaInfo } from '../components/ui';
import { globalFilterQuery } from '../filters';
import { fmt } from '../format';

interface Dist {
  items: { key: string; label: string; count: number }[];
  unknown: number;
  knownTotal: number;
}

interface OverviewResponse {
  meta: DatasetMetaInfo;
  data: {
    totals: { total: number; banin: number; banat: number; genderUnknown: number };
    kekeluargaanRepresented: number;
    kekeluargaan: Dist;
    education: Dist;
    provinces: { top: Dist['items']; other: { count: number; categories: number }; unknown: number; knownTotal: number };
  };
}

export function OverviewPage() {
  const location = useLocation();
  const res = useApi<OverviewResponse>(`/stats/overview${globalFilterQuery(location.search)}`);
  const d = res.data?.data;

  return (
    <div className="overview-page">
      <PageHeader breadcrumb={['Analytics', 'Overview']} icon="overview" title="Overview" description="Gambaran nasional mahasiswa Indonesia yang tercatat di Mesir." />
      <DatasetMeta meta={res.data?.meta} />
      <GlobalFilterBar />
      {res.loading && !res.data && <OverviewSkeleton />}
      {res.error && <ErrorState error={res.error} onRetry={res.reload} />}
      {d && d.totals.total === 0 && (
        <EmptyState title={res.data!.meta.activeRecords === 0 ? 'Belum ada data mahasiswa' : 'Tidak ada record yang cocok dengan filter'}>
          {res.data!.meta.activeRecords === 0 ? 'Impor CSV pertama melalui Kelola Dataset › Impor CSV.' : 'Ubah atau hapus filter untuk melihat data.'}
        </EmptyState>
      )}
      {d && d.totals.total > 0 && (
        <>
          <section className="kpis ov-kpis" aria-label="Indikator utama">
            <Kpi tone="primary" icon="group" label="Mahasiswa tercatat" value={d.totals.total} hint="Record aktif sesuai filter" />
            <Kpi tone="banin" icon="person" label="Banin" value={d.totals.banin} />
            <Kpi tone="banat" icon="person" label="Banat" value={d.totals.banat} hint={d.totals.genderUnknown ? `${fmt(d.totals.genderUnknown)} record jenis kelamin belum diisi` : undefined} />
            <Kpi icon="kekeluargaan" label="Kekeluargaan terwakili" value={d.kekeluargaanRepresented} hint="Dihitung dari data; bukan ukuran kepatuhan pengumpulan" />
          </section>
          <div className="ov-charts">
            <section className="card ov-main">
              <div className="card-head">
                <h2>Distribusi kekeluargaan</h2>
                <p className="card-sub">Jumlah mahasiswa tercatat per kekeluargaan, dari terbesar.</p>
              </div>
              <HBarChart items={d.kekeluargaan.items} denominator={d.kekeluargaan.knownTotal} denominatorLabel="record dengan kekeluargaan terisi" unknown={d.kekeluargaan.unknown} />
            </section>
            <div className="ov-side">
              <section className="card">
                <div className="card-head">
                  <h2>Komposisi jenis kelamin</h2>
                  <p className="card-sub">Perbandingan banin dan banat dari record yang terisi.</p>
                </div>
                <CompositionBar
                  parts={[
                    { key: 'L', label: 'Banin', count: d.totals.banin, color: 'var(--bar)' },
                    { key: 'P', label: 'Banat', count: d.totals.banat, color: 'var(--bar-2)' },
                  ]}
                  unknown={d.totals.genderUnknown}
                />
              </section>
              <section className="card">
                <div className="card-head">
                  <h2>Jenjang pendidikan</h2>
                  <p className="card-sub">Sesuai daftar baku: Daurah Lughah, Ma'had, S1.</p>
                </div>
                <HBarChart items={d.education.items} denominator={d.education.knownTotal} denominatorLabel="record dengan jenjang terisi" unknown={d.education.unknown} />
              </section>
            </div>
          </div>
          <section className="card">
            <div className="card-head">
              <h2>Top 10 provinsi asal</h2>
              <p className="card-sub">"Lainnya" hanya berisi provinsi valid di luar Top 10, bukan data kosong.</p>
            </div>
            <HBarChart
              items={[
                ...d.provinces.top,
                ...(d.provinces.other.count > 0
                  ? [{ key: '__lainnya', label: `Lainnya (${d.provinces.other.categories} provinsi)`, count: d.provinces.other.count, muted: true }]
                  : []),
              ]}
              denominator={d.provinces.knownTotal}
              denominatorLabel="record dengan provinsi terisi"
              unknown={d.provinces.unknown}
            />
          </section>
        </>
      )}
    </div>
  );
}

/** Placeholder seukuran tata letak akhir agar halaman tidak melompat saat data tiba. */
function OverviewSkeleton() {
  return (
    <div className="ov-skeleton" aria-busy="true" aria-live="polite">
      <span className="muted small">Memuat data…</span>
      <div className="kpis ov-kpis" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton" style={{ height: 116 }} />
        ))}
      </div>
      <div className="ov-charts" aria-hidden="true">
        <div className="skeleton" style={{ height: 420 }} />
        <div className="ov-side">
          <div className="skeleton" style={{ height: 180 }} />
          <div className="skeleton" style={{ height: 220 }} />
        </div>
      </div>
    </div>
  );
}
