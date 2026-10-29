import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import logoPpmi from '../assets/logo-ppmi.png';
import { globalFilterQuery } from '../filters';
import { Icon } from './icons';
import { useSession } from '../session';

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
          <img src={logoPpmi} alt="" width={36} height={36} />
          <div>
            <b>Pendataan PPMI Mesir</b>
            <span>Biro Data dan Statistika 2026/2027</span>
          </div>
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
          <Link to="/" className="back-landing">
            <Icon name="back" />
            Kembali ke landing page
          </Link>
          <div className="who">
            <span>Masuk sebagai</span>
            <b>{session.displayName ?? session.email}</b>
            {session.simulated && <span style={{ color: 'var(--yellow)' }}>Login simulasi (lokal)</span>}
          </div>
        </div>
      </aside>
      <div className="main">
        <div className="topbar">
          <button type="button" onClick={() => setOpen(true)} aria-label="Buka menu" aria-expanded={open}>
            <Icon name="menu" />
            Menu
          </button>
          <img src={logoPpmi} alt="" width={28} height={28} />
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
