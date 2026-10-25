import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, NavLink, Navigate, Outlet, Route, Routes } from 'react-router';
import { Layout } from './components/Layout';
import { PageHeader, ToastProvider } from './components/ui';
import { ImportTab } from './pages/dataset/ImportTab';
import { HistoryTab } from './pages/dataset/HistoryTab';
import { IssuesTab } from './pages/dataset/IssuesTab';
import { StudentsTab } from './pages/dataset/StudentsTab';
import { LogsPage } from './pages/Logs';
import { AccountPage, LandingPage, PlannedPage } from './pages/Misc';
import { OverviewPage } from './pages/Overview';
import { SessionGate } from './session';
import './styles.css';

function DatasetPage() {
  return (
    <>
      <PageHeader title="Kelola Dataset" description="Impor CSV, data mahasiswa, riwayat dataset, dan baris bermasalah. Halaman ini tidak mengikuti filter analitik." />
      <nav className="tabs" aria-label="Subhalaman Kelola Dataset">
        <NavLink to="/app/dataset" end>
          Impor CSV
        </NavLink>
        <NavLink to="/app/dataset/mahasiswa">Data Mahasiswa</NavLink>
        <NavLink to="/app/dataset/riwayat">Riwayat Dataset</NavLink>
        <NavLink to="/app/dataset/baris-bermasalah">Baris Bermasalah</NavLink>
      </nav>
      <Outlet />
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/app"
            element={
              <SessionGate>
                <Layout />
              </SessionGate>
            }
          >
            <Route index element={<OverviewPage />} />
            <Route
              path="kekeluargaan"
              element={<PlannedPage title="Kekeluargaan" description="Distribusi mahasiswa per kekeluargaan." items={['distribusi seluruh kekeluargaan', 'komposisi jenis kelamin dan jenjang per kekeluargaan', 'tabel ringkasan', 'panel detail']} />}
            />
            <Route
              path="pendidikan"
              element={<PlannedPage title="Pendidikan" description="Struktur pendidikan berdasarkan jenjang, fakultas, dan jurusan." items={['grafik jenjang', 'grafik fakultas dan jurusan', 'tabel jurusan yang dapat dicari', 'panel detail fakultas']} />}
            />
            <Route
              path="persebaran"
              element={<PlannedPage title="Persebaran" description="Asal mahasiswa di Indonesia dan domisili di Mesir." items={['Top 10 provinsi', 'Top 10 kabupaten/kota', 'domisili di Mesir', 'peta Indonesia (jika andal)']} />}
            />
            <Route
              path="kualitas-data"
              element={<PlannedPage title="Kualitas Data" description="Kelengkapan dan konsistensi data untuk Biro Data dan Statistika." items={['kelengkapan per kolom', 'cakupan kategori', 'variasi penulisan', 'indikasi duplikasi']} />}
            />
            <Route path="dataset" element={<DatasetPage />}>
              <Route index element={<ImportTab />} />
              <Route path="mahasiswa" element={<StudentsTab />} />
              <Route path="riwayat" element={<HistoryTab />} />
              <Route path="baris-bermasalah" element={<IssuesTab />} />
            </Route>
            <Route path="akun" element={<AccountPage />} />
            <Route path="log" element={<LogsPage />} />
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  </StrictMode>,
);
