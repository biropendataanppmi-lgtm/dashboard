// Landing page publik: navbar + lima panel yang bergeser horizontal.
// Panel aktif disimpan di hash URL (/#about-us, ...) sehingga Back/Forward browser dan tautan langsung berfungsi
// tanpa route baru. Semua gaya berada di bawah .public-landing (landing.css) agar layar Denied dan dashboard tidak terdampak.
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import logoPpmi from '../../assets/logo-ppmi.png';
import { AboutPanel, DashboardPanel, HeroPanel, PrivacyPanel, SystemPanel } from './panels';
import './landing.css';

const PANELS = [
  { hash: '', label: 'Beranda', Panel: HeroPanel },
  { hash: '#about-us', label: 'About Us', Panel: AboutPanel },
  { hash: '#tentang-sistem', label: 'Tentang Sistem', Panel: SystemPanel },
  { hash: '#dashboard', label: 'Dashboard', Panel: DashboardPanel },
  { hash: '#privasi-data', label: 'Privasi Data', Panel: PrivacyPanel },
];

const SWIPE_MIN_PX = 60;

export function LandingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const found = PANELS.findIndex((p) => p.hash === location.hash);
  const index = found < 0 ? 0 : found;
  const [menuOpen, setMenuOpen] = useState(false);
  const headings = useRef<(HTMLHeadingElement | null)[]>([]);
  const menuButton = useRef<HTMLButtonElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const firstRender = useRef(true);

  const goTo = (i: number) => {
    setMenuOpen(false);
    if (i < 0 || i >= PANELS.length || i === index) return;
    navigate({ pathname: '/', hash: PANELS[i].hash });
  };

  const onNavClick = (e: MouseEvent<HTMLAnchorElement>, i: number) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    goTo(i);
  };

  // Fokus pindah ke judul panel baru agar pengguna keyboard dan pembaca layar ikut berpindah.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headings.current[index]?.focus({ preventScroll: true });
  }, [index]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    const desktop = window.matchMedia('(min-width: 1024px)');
    const onResize = () => desktop.matches && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    desktop.addEventListener('change', onResize);
    return () => {
      window.removeEventListener('keydown', onKey);
      desktop.removeEventListener('change', onResize);
    };
  }, [menuOpen]);

  const onPointerDown = (e: PointerEvent) => {
    swipe.current = e.pointerType === 'touch' ? { x: e.clientX, y: e.clientY } : null;
  };
  const onPointerUp = (e: PointerEvent) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy) * 1.5) goTo(index + (dx < 0 ? 1 : -1));
  };

  return (
    <div className={`public-landing${menuOpen ? ' menu-open' : ''}`}>
      <header className="lp-nav">
        <a className="lp-brand" href="/" onClick={(e) => onNavClick(e, 0)} aria-label="PPMI Mesir, ke Beranda">
          <img src={logoPpmi} alt="" width="44" height="44" />
          <span className="lp-brand-text">
            <b>PPMI Mesir</b>
            <span>Biro Data dan Statistika</span>
          </span>
        </a>
        <button
          ref={menuButton}
          type="button"
          className="lp-menu-btn"
          aria-expanded={menuOpen}
          aria-controls="lp-menu"
          aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span aria-hidden="true" />
        </button>
        <nav id="lp-menu" className="lp-menu" aria-label="Panel landing page">
          <ul>
            {PANELS.map((p, i) => (
              <li key={p.label}>
                <a href={`/${p.hash}`} aria-current={i === index ? 'true' : undefined} onClick={(e) => onNavClick(e, i)}>
                  {p.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        {/* Tautan biasa (bukan navigasi SPA) agar permintaan melewati Cloudflare Access dan login muncul. */}
        <a className="lp-cta" href="/app">
          Login Admin
        </a>
      </header>
      {menuOpen && <div className="lp-scrim" onClick={() => setMenuOpen(false)} />}

      <main className="lp-viewport" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onScroll={(e) => (e.currentTarget.scrollLeft = 0)}>
        <div className="lp-track" style={{ transform: `translateX(${-index * 100}%)` }}>
          {PANELS.map(({ label, Panel }, i) => (
            <section key={label} className={`lp-panel lp-panel-${i}`} aria-label={label} inert={i !== index}>
              <Panel
                headingRef={(el: HTMLHeadingElement | null) => {
                  headings.current[i] = el;
                }}
              />
            </section>
          ))}
        </div>
      </main>

      <div className="lp-pager">
        <button type="button" onClick={() => goTo(index - 1)} disabled={index === 0} aria-label="Panel sebelumnya">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M14.5 6 8.5 12l6 6" />
          </svg>
        </button>
        <span className="lp-dots" aria-hidden="true">
          {PANELS.map((p, i) => (
            <i key={p.label} className={i === index ? 'is-active' : undefined} />
          ))}
        </span>
        <span className="lp-pager-label" aria-live="polite">
          {PANELS[index].label}
        </span>
        <button type="button" onClick={() => goTo(index + 1)} disabled={index === PANELS.length - 1} aria-label="Panel berikutnya">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m9.5 6 6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
