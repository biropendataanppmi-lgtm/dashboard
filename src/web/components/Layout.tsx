import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { globalFilterQuery } from '../filters';
import { useSession } from '../session';

const ICONS: Record<string, string> = {
  overview: 'M3 13h8V3H3zm0 8h8v-6H3zm10 0h8V11h-8zm0-18v6h8V3z',
  kekeluargaan: 'M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 2c-2.3 0-7 1.2-7 3.5V19h14v-2.5C15 14.2 10.3 13 8 13zm8 0c-.3 0-.6 0-1 .1 1.2.8 2 2 2 3.4V19h6v-2.5c0-2.3-4.7-3.5-7-3.5z',
  pendidikan: 'M12 3 1 9l11 6 9-4.9V17h2V9zM5 13.2v4L12 21l7-3.8v-4L12 17z',
  persebaran: 'M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z',
  kualitas: 'M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z',
  dataset: 'M12 3C7 3 3 4.8 3 7v10c0 2.2 4 4 9 4s9-1.8 9-4V7c0-2.2-4-4-9-4zm0 2c4.4 0 7 1.4 7 2s-2.6 2-7 2-7-1.4-7-2 2.6-2 7-2zm7 12c0 .6-2.6 2-7 2s-7-1.4-7-2v-2.3c1.6.8 4.2 1.3 7 1.3s5.4-.5 7-1.3zm0-5c0 .6-2.6 2-7 2s-7-1.4-7-2V9.7c1.6.8 4.2 1.3 7 1.3s5.4-.5 7-1.3z',
  akun: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-2.7 0-8 1.3-8 4v2h16v-2c0-2.7-5.3-4-8-4z',
  log: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm-1 7V3.5L18.5 9zM8 13h8v2H8zm0 4h8v2H8z',
};

const Icon = ({ name }: { name: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
    <path d={ICONS[name]} />
  </svg>
);

const ANALYTICS = [
  { to: '/app', label: 'Overview', icon: 'overview', end: true },
  { to: '/app/kekeluargaan', label: 'Kekeluargaan', icon: 'kekeluargaan' },
  { to: '/app/pendidikan', label: 'Pendidikan', icon: 'pendidikan' },
  { to: '/app/persebaran', label: 'Persebaran', icon: 'persebaran' },
  { to: '/app/kualitas-data', label: 'Kualitas Data', icon: 'kualitas' },
];
const MANAGEMENT = [
  { to: '/app/dataset', label: 'Kelola Dataset', icon: 'dataset' },
  { to: '/app/akun', label: 'Akun', icon: 'akun' },
  { to: '/app/log', label: 'Log Aktivitas', icon: 'log' },
];

export function Layout() {
  const session = useSession();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [location.pathname]);
  // Filter global ikut terbawa antarhalaman analitik; halaman manajemen tidak memakainya (§2.2).
  const carry = globalFilterQuery(location.search);

  return (
    <div className={`app${open ? ' drawer-open' : ''}`}>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className="sidebar" aria-label="Navigasi utama">
        <div className="brand">
          <b>Pendataan PPMI Mesir</b>
          <span>Biro Data dan Statistika 2026/2027</span>
        </div>
        <nav className="nav">
          <span className="nav-group">Analytics</span>
          {ANALYTICS.map((n) => (
            <NavLink key={n.to} to={{ pathname: n.to, search: n.to.startsWith('/app/kualitas') ? '' : carry }} end={n.end}>
              <Icon name={n.icon} />
              {n.label}
            </NavLink>
          ))}
          <span className="nav-group">Manajemen Sistem</span>
          {MANAGEMENT.map((n) => (
            <NavLink key={n.to} to={n.to}>
              <Icon name={n.icon} />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span>Masuk sebagai</span>
          <b>{session.displayName ?? session.email}</b>
          {session.simulated && <span style={{ color: 'var(--yellow)' }}>Login simulasi (lokal)</span>}
        </div>
      </aside>
      <div className="main">
        <div className="topbar">
          <button type="button" onClick={() => setOpen(true)} aria-label="Buka menu">
            Menu
          </button>
          <b>Pendataan PPMI Mesir</b>
        </div>
        {session.simulated && <div className="sim-banner">Mode simulasi login untuk pengembangan lokal. Ini bukan autentikasi sungguhan.</div>}
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
