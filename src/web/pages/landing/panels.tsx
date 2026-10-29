// Isi panel landing page publik. Teks berasal dari redaksi yang disetujui dan dari landing lama;
// jangan menambah klaim, angka, atau data mahasiswa di sini.
import type { ReactNode, Ref } from 'react';
import fotoAzriel from '../../assets/tim/azriel.webp';
import fotoFathan from '../../assets/tim/fathan.webp';
import fotoIndyra from '../../assets/tim/indyra.webp';
import fotoUnaysa from '../../assets/tim/unaysa.webp';
import { HeroVisual } from './HeroVisual';
import { Glyph, IconTile, type GlyphName } from './icons';

type HeadingRef = Ref<HTMLHeadingElement>;

function PanelHead({ eyebrow, title, headingRef, children }: { eyebrow: string; title: string; headingRef: HeadingRef; children: ReactNode }) {
  return (
    <header className="lp-panel-head">
      <span className="lp-eyebrow">{eyebrow}</span>
      <h2 ref={headingRef} tabIndex={-1}>
        {title}
      </h2>
      <div className="lp-panel-text">{children}</div>
    </header>
  );
}

/** Lapisan dekoratif panel (tidak interaktif, tidak dibaca pembaca layar). */
function Deco({ kind }: { kind: 'hero' | 'about' | 'system' | 'dash' | 'privacy' }) {
  return (
    <div className={`lp-deco lp-deco-${kind}`} aria-hidden="true">
      {kind === 'hero' && <span className="lp-dotgrid lp-dotgrid-hero" />}
      {kind === 'about' && (
        <>
          <svg className="lp-blob lp-blob-1" viewBox="0 0 200 200">
            <path d="M44 -6C78 -20 132 -4 156 30s20 84-8 116-82 40-118 22S-22 100-14 62 10 8 44-6z" />
          </svg>
          <svg className="lp-blob lp-blob-2" viewBox="0 0 200 200">
            <path d="M60 10c40-14 96 4 118 42s8 92-30 116-92 18-122-10S-6 94 8 60 20 24 60 10z" />
          </svg>
          <span className="lp-dotgrid lp-dotgrid-about" />
          <svg className="lp-sparkline" viewBox="0 0 300 80" preserveAspectRatio="none">
            <polyline points="0,64 40,52 80,58 120,34 160,42 200,20 240,28 300,8" />
          </svg>
        </>
      )}
      {kind === 'system' && (
        <>
          <span className="lp-gridlines" />
          <span className="lp-plane lp-plane-1" />
          <span className="lp-plane lp-plane-2" />
          <svg className="lp-geo-lines" viewBox="0 0 400 400" preserveAspectRatio="none">
            <line x1="0" y1="400" x2="400" y2="40" />
            <line x1="60" y1="400" x2="400" y2="100" />
            <circle cx="300" cy="129" r="5" />
          </svg>
        </>
      )}
      {kind === 'dash' && (
        <>
          <span className="lp-dotgrid lp-dotgrid-dash" />
          <span className="lp-stack lp-stack-1" />
          <span className="lp-stack lp-stack-2" />
        </>
      )}
      {kind === 'privacy' && (
        <>
          <svg className="lp-rings-deco" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="96" />
            <circle cx="100" cy="100" r="74" />
            <circle cx="100" cy="100" r="52" />
            <circle cx="100" cy="100" r="30" />
          </svg>
          <svg className="lp-shield-deco" viewBox="0 0 24 24">
            <path d="M12 2.5 20 5.4v6.2c0 4.9-3.4 9-8 10.4-4.6-1.4-8-5.5-8-10.4V5.4l8-2.9z" />
          </svg>
          <span className="lp-dotgrid lp-dotgrid-privacy" />
        </>
      )}
    </div>
  );
}

export function HeroPanel({ headingRef }: { headingRef: HeadingRef }) {
  return (
    <>
      <Deco kind="hero" />
      <div className="lp-container lp-hero">
        <div className="lp-hero-copy">
          <span className="lp-eyebrow">Sistem Pendataan PPMI Mesir 2026/2027</span>
          <h1 ref={headingRef} tabIndex={-1} className="lp-headline">
            <span className="lp-headline-dark">Our Dashboard</span>
            <span className="lp-headline-lime">PPMI Mesir</span>
          </h1>
        </div>
        {/* Tautan biasa (bukan navigasi SPA) agar permintaan melewati Cloudflare Access dan login muncul. */}
        <a className="lp-login" href="/app">
          <Glyph name="masuk" />
          <span>Login Admin</span>
        </a>
        <HeroVisual />
      </div>
    </>
  );
}

// Foto disimpan di src/web/assets/tim/ (480×600, WebP). Ganti berkasnya untuk memperbarui foto.
const TEAM: { name: string; kekeluargaan: string; role: string; photo: string | null }[] = [
  { name: 'Moch Azriel Putra Novendra', kekeluargaan: 'GAMAJATIM', role: 'Kepala Biro', photo: fotoAzriel },
  { name: 'Fathan Adinata', kekeluargaan: 'GAMAJATIM', role: 'Anggota Biro', photo: fotoFathan },
  { name: 'Indyra Nadiva Nawi', kekeluargaan: 'KKS', role: 'Anggota Biro', photo: fotoIndyra },
  { name: 'Unaysa Lukmanul Hakim', kekeluargaan: 'KMNTB', role: 'Anggota Biro', photo: fotoUnaysa },
];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('');

export function AboutPanel({ headingRef }: { headingRef: HeadingRef }) {
  return (
    <>
      <Deco kind="about" />
      <div className="lp-container lp-about">
        <div className="lp-about-intro">
          <PanelHead eyebrow="About Us" title="Biro Data dan Statistika" headingRef={headingRef}>
            <p className="lp-shout">EITSS, JANGAN LANGSUNG KE SISTEMNYA DULU! 👀</p>
            <p>Kenalan dulu, yuk, sama orang-orang di balik Sistem Pendataan PPMI Mesir. Siapa aja sih yang ada di balik layar, dan apa peran mereka? Yuk, kita kenalan! 🚀</p>
          </PanelHead>
          <blockquote className="lp-quote">“Selalu ada cerita di balik setiap angka yang ada.”</blockquote>
        </div>
        <ul className="lp-team" aria-label="Anggota Biro Data dan Statistika">
          {TEAM.map((m) => (
            <li key={m.name} className="lp-member">
              <div className="lp-photo">
                {m.photo ? <img src={m.photo} alt={`Foto ${m.name}`} width="480" height="600" loading="lazy" decoding="async" /> : <span aria-hidden="true">{initials(m.name)}</span>}
              </div>
              <div className="lp-member-info">
                <b>{m.name}</b>
                <span className="lp-role">{m.role}</span>
                <span className="lp-chip">{m.kekeluargaan}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

const FEATURES: { icon: GlyphName; label: string }[] = [
  { icon: 'impor', label: 'Impor dan pemeriksaan data' },
  { icon: 'riwayat', label: 'Riwayat perubahan' },
  { icon: 'statistik', label: 'Dashboard analitik' },
];

export function SystemPanel({ headingRef }: { headingRef: HeadingRef }) {
  return (
    <>
      <Deco kind="system" />
      <div className="lp-container lp-system">
        <PanelHead eyebrow="Tentang Sistem" title="Mengenal Sistem Pendataan" headingRef={headingRef}>
          <p>
            Sistem Pendataan PPMI Mesir dirancang untuk membantu pengelolaan dan penyajian informasi mahasiswa Indonesia di Mesir secara lebih terstruktur, sehingga data dapat
            dimanfaatkan untuk mendukung berjalannya organisasi berbasiskan data (data driven organization).
          </p>
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
    </>
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
  { key: 'statistik', label: 'Overview', text: 'Ringkasan jumlah dan komposisi data mahasiswa yang tercatat.' },
  { key: 'kekeluargaan', label: 'Kekeluargaan', text: 'Jumlah mahasiswa per kekeluargaan beserta profil tiap kekeluargaan.' },
  { key: 'pendidikan', label: 'Pendidikan', text: 'Struktur pendidikan: jenjang, fakultas, dan jurusan.' },
  { key: 'persebaran', label: 'Persebaran', text: 'Asal provinsi dan kabupaten/kota di Indonesia serta domisili di Mesir.' },
];

export function DashboardPanel({ headingRef }: { headingRef: HeadingRef }) {
  return (
    <>
      <Deco kind="dash" />
      <div className="lp-container lp-dash">
        <PanelHead eyebrow="Dashboard" title="Data dalam Satu Tampilan" headingRef={headingRef}>
          <p>
            Jelajahi gambaran data melalui kategori kekeluargaan, pendidikan, dan persebaran. Dashboard menyajikan ringkasan informasi untuk membantu memahami kondisi data yang
            tersedia.
          </p>
        </PanelHead>
        <ul className="lp-cards">
          {DASH_CATEGORIES.map((c) => (
            <li key={c.key} className="lp-card">
              <div className="lp-card-face">
                <Preview kind={c.key} />
                <div className="lp-card-title">
                  <IconTile name={c.key} size="sm" />
                  <b>{c.label}</b>
                </div>
                <p>{c.text}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="lp-note">Pratinjau konseptual, bukan data sebenarnya. Data mahasiswa hanya dapat dilihat administrator setelah login.</p>
      </div>
    </>
  );
}

const PRIVACY_POINTS: { icon: GlyphName; text: string }[] = [
  { icon: 'kunci', text: 'Tidak ada data mahasiswa yang ditampilkan sebelum login.' },
  { icon: 'perisai', text: 'Akun yang tidak terdaftar tidak akan mendapat akses.' },
  { icon: 'admin', text: 'Akses hanya untuk administrator Biro Data dan Statistika.' },
];

export function PrivacyPanel({ headingRef }: { headingRef: HeadingRef }) {
  return (
    <>
      <Deco kind="privacy" />
      <div className="lp-container lp-privacy">
        <PanelHead eyebrow="Privasi Data" title="Privasi dan Perlindungan Data" headingRef={headingRef}>
          <p>
            Pengelolaan data dilakukan dengan memperhatikan pembatasan akses dan perlindungan informasi pribadi. Informasi yang ditampilkan kepada pengguna disesuaikan dengan
            kebutuhan dan hak aksesnya.
          </p>
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
    </>
  );
}
