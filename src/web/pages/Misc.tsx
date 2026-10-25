import { Link } from 'react-router';
import { EmptyState, PageHeader } from '../components/ui';
import { fmtTime } from '../format';
import { useSession } from '../session';

export function LandingPage() {
  return (
    <div className="landing">
      <div className="landing-inner">
        <span className="eyebrow">PPMI Mesir · Biro Data dan Statistika</span>
        <h1>Sistem Pendataan PPMI Mesir 2026/2027</h1>
        <p className="tagline">“Selalu ada cerita di balik setiap angka yang ada.”</p>
        <p>
          Sistem pengelolaan data mahasiswa Indonesia di Mesir: impor dan pemeriksaan data, riwayat perubahan, serta dashboard analitik untuk
          mendukung penyusunan informasi dan kebijakan. Akses hanya untuk administrator Biro Data dan Statistika.
        </p>
        <Link className="btn primary" to="/app">
          Masuk dengan akun Google
        </Link>
        <span className="fine">Tidak ada data mahasiswa yang ditampilkan sebelum login. Akun yang tidak terdaftar tidak akan mendapat akses.</span>
      </div>
    </div>
  );
}

/** Halaman yang belum dibangun pada tahap ini ditandai jujur, bukan diisi angka contoh. */
export function PlannedPage({ title, description, items }: { title: string; description: string; items: string[] }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <EmptyState title="Halaman ini dibangun pada tahap berikutnya">
        Rencana isi: {items.join(', ')}.
      </EmptyState>
    </>
  );
}

export function AccountPage() {
  const s = useSession();
  return (
    <>
      <PageHeader title="Akun" description="Identitas administrator yang sedang masuk dan informasi sesi." />
      <section className="card" style={{ maxWidth: 640 }}>
        <dl className="kv">
          <dt>Nama</dt>
          <dd>{s.displayName ?? '—'}</dd>
          <dt>Email terverifikasi</dt>
          <dd>{s.email}</dd>
          <dt>Status sesi</dt>
          <dd>{s.simulated ? 'Simulasi lokal (bukan autentikasi sungguhan)' : 'Terverifikasi oleh Cloudflare Access dan allowlist backend'}</dd>
          <dt>Waktu dibuka</dt>
          <dd>{fmtTime(new Date().toISOString())}</dd>
          <dt>Aplikasi</dt>
          <dd>Sistem Pendataan PPMI Mesir 2026/2027 · V1 tahap 1</dd>
        </dl>
        <div className="btn-row">
          <a className="btn" href="/cdn-cgi/access/logout">
            Keluar
          </a>
        </div>
        <p className="muted small" style={{ margin: 0 }}>
          Daftar akun yang diizinkan dikelola lewat konfigurasi backend (lihat dokumentasi), tidak lewat dashboard.
        </p>
      </section>
    </>
  );
}
