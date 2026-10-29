// Landing page publik: navbar + lima panel yang bergeser horizontal.
// Panel aktif disimpan di hash URL (/#about-us, ...) sehingga Back/Forward browser dan tautan langsung berfungsi
// tanpa route baru. Semua gaya berada di bawah .public-landing (landing.css) agar layar Denied dan dashboard tidak terdampak.
import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import logoPpmi from '../../assets/logo-ppmi.png';
import { Glyph, type GlyphName } from './icons';
import { AboutPanel, DashboardPanel, HeroPanel, PrivacyPanel, SystemPanel } from './panels';
import { playPanelSound } from './sound';
import './landing.css';

const PANELS: { hash: string; label: string; icon: GlyphName; Panel: typeof HeroPanel }[] = [
  { hash: '', label: 'Beranda', icon: 'beranda', Panel: HeroPanel },
  { hash: '#about-us', label: 'About Us', icon: 'kekeluargaan', Panel: AboutPanel },
  { hash: '#tentang-sistem', label: 'Tentang Sistem', icon: 'info', Panel: SystemPanel },
  { hash: '#dashboard', label: 'Dashboard', icon: 'statistik', Panel: DashboardPanel },
  { hash: '#privasi-data', label: 'Privasi Data', icon: 'perisai', Panel: PrivacyPanel },
];

const SWIPE_MIN_PX = 60;

/** Menambahkan viewport-fit=cover hanya selama landing tampil, agar safe area iOS terbaca tanpa mengubah dashboard. */
function useViewportFitCover() {
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    if (!meta) return;
    const original = meta.content;
    if (!original.includes('viewport-fit')) meta.content = `${original}, viewport-fit=cover`;
    return () => {
      meta.content = original;
    };
  }, []);
}

export function LandingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const found = PANELS.findIndex((p) => p.hash === location.hash);
  const index = found < 0 ? 0 : found;
  const headings = useRef<(HTMLHeadingElement | null)[]>([]);
  const menuList = useRef<HTMLUListElement>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const firstRender = useRef(true);
  useViewportFitCover();

  const goTo = (i: number) => {
    if (i < 0 || i >= PANELS.length || i === index) return;
    playPanelSound();
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

  // Indikator hijau navbar desktop mengikuti posisi menu aktif (diukur ulang saat ukuran/font berubah).
  useLayoutEffect(() => {
    const list = menuList.current;
    if (!list) return;
    const measure = () => {
      const item = list.querySelectorAll('li')[index];
      setIndicator(item && item.offsetWidth ? { left: item.offsetLeft, width: item.offsetWidth } : null);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    void document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [index]);

  // Tombol panah kiri/kanan di keyboard berpindah panel (pengganti pager di desktop).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const t = e.target as HTMLElement | null;
      if (t?.closest('input, textarea, select, [contenteditable="true"]')) return;
      e.preventDefault();
      goTo(index + (e.key === 'ArrowRight' ? 1 : -1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

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
    <div className="public-landing">
      <header className="lp-nav">
        <div className="lp-container lp-nav-inner">
          <a className="lp-brand" href="/" onClick={(e) => onNavClick(e, 0)} aria-label="PPMI Mesir, ke Beranda">
            <img src={logoPpmi} alt="" width="44" height="44" />
            <span className="lp-brand-text">
              <b>PPMI Mesir</b>
              <span>Biro Data dan Statistika</span>
            </span>
          </a>
          <nav className="lp-menu" aria-label="Panel landing page">
            <ul ref={menuList}>
              {PANELS.map((p, i) => (
                <li key={p.label}>
                  <a href={`/${p.hash}`} aria-current={i === index ? 'true' : undefined} onClick={(e) => onNavClick(e, i)}>
                    <span>{p.label}</span>
                  </a>
                </li>
              ))}
              {indicator && <li className="lp-indicator" aria-hidden="true" style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width }} />}
            </ul>
          </nav>
        </div>
      </header>

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

      {/* Desktop: navbar + tombol panah keyboard. Tablet dan HP: navigasi ikon di bawah layar. */}
      <span className="lp-live" aria-live="polite">
        {PANELS[index].label}
      </span>
      <nav className="lp-tabbar" aria-label="Panel landing page">
        <ul>
          {PANELS.map((p, i) => (
            <li key={p.label}>
              <a href={`/${p.hash}`} aria-current={i === index ? 'true' : undefined} onClick={(e) => onNavClick(e, i)}>
                <span className="lp-tab-icon">
                  <Glyph name={p.icon} />
                </span>
                <span className="lp-tab-label">{p.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
