import { PageHeader } from '../components/ui';
import { fmtTime } from '../format';
import { useSession } from '../session';

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
          <dd>Sistem Pendataan PPMI Mesir 2026/2027 · V1 tahap 2</dd>
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
