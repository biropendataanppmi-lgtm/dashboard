import { useLocation } from 'react-router';
import { useApi } from '../api';
import { CompositionBar, HBarChart } from '../components/charts';
import { GlobalFilterBar } from '../components/FilterBar';
import { DatasetMeta, EmptyState, ErrorState, Kpi, Loading, PageHeader, type DatasetMetaInfo } from '../components/ui';
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
    <>
      <PageHeader
        title="Overview"
        description="Ringkasan data mahasiswa yang tercatat di sistem: jumlah, komposisi banin dan banat, kekeluargaan, jenjang pendidikan, dan provinsi asal. Hanya record aktif yang dihitung."
      />
      <DatasetMeta meta={res.data?.meta} />
      <GlobalFilterBar />
      {res.loading && !res.data && <Loading />}
      {res.error && <ErrorState error={res.error} onRetry={res.reload} />}
      {d && d.totals.total === 0 && (
        <EmptyState title={res.data!.meta.activeRecords === 0 ? 'Belum ada data mahasiswa' : 'Tidak ada record yang cocok dengan filter'}>
          {res.data!.meta.activeRecords === 0 ? 'Impor CSV pertama melalui Kelola Dataset › Impor CSV.' : 'Ubah atau hapus filter untuk melihat data.'}
        </EmptyState>
      )}
      {d && d.totals.total > 0 && (
        <>
          <section className="kpis" aria-label="Indikator utama">
            <Kpi label="Mahasiswa tercatat" value={d.totals.total} hint="Record aktif sesuai filter" />
            <Kpi label="Banin" value={d.totals.banin} />
            <Kpi label="Banat" value={d.totals.banat} hint={d.totals.genderUnknown ? `${fmt(d.totals.genderUnknown)} record jenis kelamin belum diisi` : undefined} />
            <Kpi label="Kekeluargaan terwakili" value={d.kekeluargaanRepresented} hint="Dihitung dari data; bukan ukuran kepatuhan pengumpulan" />
          </section>
          <div className="grid-2">
            <section className="card">
              <h2>Distribusi kekeluargaan</h2>
              <p className="card-sub">Jumlah mahasiswa tercatat per kekeluargaan, dari terbesar.</p>
              <HBarChart items={d.kekeluargaan.items} denominator={d.kekeluargaan.knownTotal} denominatorLabel="record dengan kekeluargaan terisi" unknown={d.kekeluargaan.unknown} />
            </section>
            <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
              <section className="card">
                <h2>Komposisi jenis kelamin</h2>
                <CompositionBar
                  parts={[
                    { key: 'L', label: 'Banin', count: d.totals.banin, color: 'var(--bar)' },
                    { key: 'P', label: 'Banat', count: d.totals.banat, color: 'var(--bar-2)' },
                  ]}
                  unknown={d.totals.genderUnknown}
                />
              </section>
              <section className="card">
                <h2>Jenjang pendidikan</h2>
                <p className="card-sub">Nilai dikelompokkan apa adanya sampai daftar baku jenjang ditetapkan.</p>
                <HBarChart items={d.education.items} denominator={d.education.knownTotal} denominatorLabel="record dengan jenjang terisi" unknown={d.education.unknown} />
              </section>
            </div>
          </div>
          <section className="card">
            <h2>Top 10 provinsi asal</h2>
            <p className="card-sub">"Lainnya" hanya berisi provinsi valid di luar Top 10, bukan data kosong.</p>
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
    </>
  );
}
