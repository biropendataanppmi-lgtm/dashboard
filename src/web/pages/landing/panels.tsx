// Isi panel landing page publik. Teks berasal dari draft yang disetujui dan dari landing lama;
// jangan menambah klaim, angka, atau data mahasiswa di sini.
import type { ReactNode, Ref } from 'react';
import { HeroVisual } from './HeroVisual';
import { IconTile, type GlyphName } from './icons';

type HeadingRef = Ref<HTMLHeadingElement>;

export function HeroPanel({ headingRef }: { headingRef: HeadingRef }) {
  return (
    <div className="lp-hero">
      <div className="lp-hero-copy">
        <span className="lp-eyebrow">Sistem Pendataan PPMI Mesir 2026/2027</span>
        <h1 ref={headingRef} tabIndex={-1} className="lp-headline">
          <span className="lp-headline-dark">Our Dashboard</span>
          <span className="lp-headline-lime">PPMI Mesir</span>
        </h1>
      </div>
      <HeroVisual />
    </div>
  );
}

// Foto anggota: isi `photo` dengan URL gambar asli (mis. impor dari src/web/assets/tim/) untuk mengganti slot inisial.
const TEAM: { name: string; photo: string | null }[] = [
  { name: 'Moch Azriel Putra Novendra', photo: null },
  { name: 'Indyra Nadiva Nawi', photo: null },
  { name: 'Unaysa Lukmanul Hakim', photo: null },
];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('');

function PanelHead({ eyebrow, title, headingRef, children }: { eyebrow: string; title: string; headingRef: HeadingRef; children: ReactNode }) {
  return (
    <header className="lp-panel-head">
      <span className="lp-eyebrow">{eyebrow}</span>
      <h2 ref={headingRef} tabIndex={-1}>
        {title}
      </h2>
      <p>{children}</p>
    </header>
  );
}

export function AboutPanel({ headingRef }: { headingRef: HeadingRef }) {
  return (
    <div className="lp-wrap lp-about">
      <div className="lp-about-intro">
        <PanelHead eyebrow="About Us" title="Biro Data dan Statistika" headingRef={headingRef}>
          Biro Data dan Statistika PPMI Mesir 2026/2027 berperan dalam pengelolaan dan penyajian data untuk mendukung kebutuhan informasi serta pengambilan keputusan di
          lingkungan PPMI Mesir.
        </PanelHead>
        <blockquote className="lp-quote">“Selalu ada cerita di balik setiap angka yang ada.”</blockquote>
      </div>
      <ul className="lp-team" aria-label="Anggota Biro Data dan Statistika">
        {TEAM.map((m) => (
          <li key={m.name} className="lp-member">
            <div className="lp-photo">{m.photo ? <img src={m.photo} alt={`Foto ${m.name}`} loading="lazy" /> : <span aria-hidden="true">{initials(m.name)}</span>}</div>
            <b>{m.name}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

const FEATURES: { icon: GlyphName; label: string }[] = [
  { icon: 'impor', label: 'Impor dan pemeriksaan data' },
  { icon: 'riwayat', label: 'Riwayat perubahan' },
  { icon: 'statistik', label: 'Dashboard analitik' },
];

export function SystemPanel({ headingRef }: { headingRef: HeadingRef }) {
  return (
    <div className="lp-wrap lp-system">
      <PanelHead eyebrow="Tentang Sistem" title="Mengenal Sistem Pendataan" headingRef={headingRef}>
        Sistem Pendataan PPMI Mesir 2026/2027 dirancang untuk membantu pengelolaan dan penyajian informasi mahasiswa Indonesia di Mesir secara lebih terstruktur, sehingga data
        dapat dimanfaatkan untuk mendukung koordinasi dan pengambilan keputusan.
      </PanelHead>
      <ul className="lp-features" aria-label="Fitur sistem">
        {FEATURES.map((f) => (
          <li key={f.label}>
            <IconTile name={f.icon} />
            <span>{f.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Pratinjau konseptual: bentuk abstrak tanpa angka, label data, atau data pribadi.
function Preview({ kind }: { kind: 'statistik' | 'kekeluargaan' | 'pendidikan' | 'persebaran' }) {
  const pine = '#0d2e14';
  const lime = '#7ad813';
  const soft = '#dff79e';
  const muted = '#dde3d8';
  return (
    <svg className="lp-preview" viewBox="0 0 160 90" aria-hidden="true">
      <rect width="160" height="90" rx="8" fill="#f5f7f2" />
      {kind === 'statistik' && (
        <g>
          {[10, 58, 106].map((x, i) => (
            <g key={x}>
              <rect x={x} y="10" width="44" height="22" rx="4" fill="#fff" />
              <rect x={x + 6} y="16" width="18" height="3" rx="1.5" fill={muted} />
              <rect x={x + 6} y="23" width={i === 1 ? 26 : 22} height="5" rx="2" fill={i === 1 ? lime : pine} />
            </g>
          ))}
          {[30, 48, 26, 56, 40, 64, 46].map((h, i) => (
            <rect key={i} x={14 + i * 20} y={82 - h * 0.65} width="12" height={h * 0.65} rx="2" fill={i === 5 ? lime : i % 2 ? soft : pine} />
          ))}
        </g>
      )}
      {kind === 'kekeluargaan' &&
        [118, 96, 82, 64, 50, 36].map((w, i) => (
          <g key={i}>
            <rect x="10" y={12 + i * 12} width="20" height="5" rx="2" fill={muted} />
            <rect x="36" y={11 + i * 12} width={w} height="7" rx="3" fill={i === 0 ? pine : i === 1 ? lime : soft} />
          </g>
        ))}
      {kind === 'pendidikan' && (
        <g>
          <rect x="10" y="14" width="140" height="14" rx="4" fill={soft} />
          <rect x="10" y="14" width="64" height="14" rx="4" fill={pine} />
          <rect x="76" y="14" width="42" height="14" fill={lime} />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x="10" y={42 + i * 15} width="8" height="8" rx="2" fill={[pine, lime, soft][i]} />
              <rect x="24" y={44 + i * 15} width={[54, 40, 30][i]} height="4" rx="2" fill={muted} />
              <rect x="96" y={42 + i * 15} width={[54, 38, 26][i]} height="8" rx="3" fill={[pine, lime, soft][i]} opacity=".85" />
            </g>
          ))}
        </g>
      )}
      {kind === 'persebaran' && (
        <g>
          {Array.from({ length: 6 }, (_, r) =>
            Array.from({ length: 14 }, (_, c) => {
              const hot = (r - 2) ** 2 + (c - 4) ** 2 < 5 || (r - 3) ** 2 + (c - 10) ** 2 < 3;
              return <circle key={`${r}-${c}`} cx={14 + c * 10} cy={16 + r * 12} r="3" fill={hot ? lime : muted} />;
            }),
          )}
          <path d="M54 44 c-4 -6 -10 -10 -10 -17 a10 10 0 0 1 20 0 c0 7 -6 11 -10 17z" fill={pine} />
          <circle cx="54" cy="27" r="3.5" fill={soft} />
        </g>
      )}
    </svg>
  );
}

const DASH_CATEGORIES: { key: 'statistik' | 'kekeluargaan' | 'pendidikan' | 'persebaran'; label: string; text: string }[] = [
  { key: 'statistik', label: 'Statistik', text: 'Ringkasan jumlah dan komposisi data mahasiswa yang tercatat.' },
  { key: 'kekeluargaan', label: 'Kekeluargaan', text: 'Jumlah mahasiswa per kekeluargaan beserta profil tiap kekeluargaan.' },
  { key: 'pendidikan', label: 'Pendidikan', text: 'Struktur pendidikan: jenjang, fakultas, dan jurusan.' },
  { key: 'persebaran', label: 'Persebaran', text: 'Asal provinsi dan kabupaten/kota di Indonesia serta domisili di Mesir.' },
];

export function DashboardPanel({ headingRef }: { headingRef: HeadingRef }) {
  return (
    <div className="lp-wrap lp-dash">
      <PanelHead eyebrow="Dashboard" title="Data dalam Satu Tampilan" headingRef={headingRef}>
        Jelajahi gambaran data melalui kategori kekeluargaan, pendidikan, dan persebaran. Dashboard menyajikan ringkasan informasi untuk membantu memahami kondisi data yang
        tersedia.
      </PanelHead>
      <ul className="lp-cards">
        {DASH_CATEGORIES.map((c) => (
          <li key={c.key} className="lp-card">
            <Preview kind={c.key} />
            <div className="lp-card-title">
              <IconTile name={c.key} size="sm" />
              <b>{c.label}</b>
            </div>
            <p>{c.text}</p>
          </li>
        ))}
      </ul>
      <p className="lp-note">Pratinjau konseptual, bukan data sebenarnya. Data mahasiswa hanya dapat dilihat administrator setelah login.</p>
    </div>
  );
}

const PRIVACY_POINTS: { icon: GlyphName; text: string }[] = [
  { icon: 'kunci', text: 'Tidak ada data mahasiswa yang ditampilkan sebelum login.' },
  { icon: 'perisai', text: 'Akun yang tidak terdaftar tidak akan mendapat akses.' },
  { icon: 'admin', text: 'Akses hanya untuk administrator Biro Data dan Statistika.' },
];

export function PrivacyPanel({ headingRef }: { headingRef: HeadingRef }) {
  return (
    <div className="lp-wrap lp-privacy">
      <PanelHead eyebrow="Privasi Data" title="Privasi dan Perlindungan Data" headingRef={headingRef}>
        Pengelolaan data dilakukan dengan memperhatikan pembatasan akses dan perlindungan informasi pribadi. Informasi yang ditampilkan kepada pengguna disesuaikan dengan
        kebutuhan dan hak aksesnya.
      </PanelHead>
      <ul className="lp-points">
        {PRIVACY_POINTS.map((p) => (
          <li key={p.text}>
            <IconTile name={p.icon} />
            <span>{p.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
