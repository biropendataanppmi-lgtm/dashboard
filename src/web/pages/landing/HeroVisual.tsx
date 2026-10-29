// Visual Hero: ilustrasi 3D (SVG isometrik, tanpa aset eksternal) yang berganti mengikuti
// kategori, dikelilingi ikon kategori pada lintasan orbit dengan efek pembesaran ala Dock.
import { useRef, useState, type PointerEvent, type ReactElement } from 'react';
import { IconTile, type GlyphName } from './icons';

export type CategoryKey = 'statistik' | 'kekeluargaan' | 'pendidikan' | 'persebaran';

export const CATEGORIES: { key: CategoryKey; label: string; scene: string }[] = [
  { key: 'statistik', label: 'Overview', scene: 'Ilustrasi grafik batang tiga dimensi untuk ringkasan data' },
  { key: 'kekeluargaan', label: 'Kekeluargaan', scene: 'Ilustrasi kelompok mahasiswa untuk kekeluargaan' },
  { key: 'pendidikan', label: 'Pendidikan', scene: 'Ilustrasi tumpukan buku dan toga untuk pendidikan' },
  { key: 'persebaran', label: 'Persebaran', scene: 'Ilustrasi globe dan penanda lokasi untuk persebaran' },
];

// Posisi ikon pada busur bawah orbit (persen terhadap kotak visual).
const ORBIT_ANGLES = [158, 118, 62, 22];
const orbitPos = (deg: number) => {
  const r = (deg * Math.PI) / 180;
  return { left: `${50 + 43 * Math.cos(r)}%`, top: `${47 + 38 * Math.sin(r)}%` };
};

// ---------- Proyeksi isometrik ----------
const CX = 200;
const CY = 236;
const ISO_X = Math.cos(Math.PI / 6);
const pt = (x: number, y: number, z: number) => `${(CX + (x - y) * ISO_X).toFixed(1)},${(CY + (x + y) * 0.5 - z).toFixed(1)}`;
const poly = (...p: [number, number, number][]) => p.map(([x, y, z]) => pt(x, y, z)).join(' ');

interface Faces {
  top: string;
  left: string;
  right: string;
}

/** Balok isometrik: sisi atas, sisi depan-kiri (+y), sisi depan-kanan (+x). */
function Block({ x, y, z = 0, w, d, h, f }: { x: number; y: number; z?: number; w: number; d: number; h: number; f: Faces }) {
  return (
    <g>
      <polygon points={poly([x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h])} fill={f.left} />
      <polygon points={poly([x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h])} fill={f.right} />
      <polygon points={poly([x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h])} fill={f.top} />
    </g>
  );
}

const LIME: Faces = { top: '#c9f07a', left: 'url(#lp-g-lime-l)', right: 'url(#lp-g-lime-r)' };
const PINE: Faces = { top: '#2d6b36', left: 'url(#lp-g-pine-l)', right: 'url(#lp-g-pine-r)' };
const SOFT: Faces = { top: '#ffffff', left: 'url(#lp-g-soft-l)', right: 'url(#lp-g-soft-r)' };
const PAGE: Faces = { top: '#ffffff', left: '#f5f7f2', right: '#e9eee4' };

function Platform() {
  return (
    <g>
      <ellipse cx={CX} cy={CY + 44} rx="150" ry="58" fill="#0d2e14" opacity=".10" filter="url(#lp-blur)" />
      <Block x={-84} y={-84} z={-16} w={168} d={168} h={16} f={SOFT} />
      <polygon points={poly([-84, -84, 0], [84, -84, 0], [84, 84, 0], [-84, 84, 0])} fill="url(#lp-g-floor)" />
    </g>
  );
}

function Statistik() {
  const bars: [number, number, number, Faces][] = [
    [-58, -12, 58, SOFT],
    [-22, -12, 96, LIME],
    [14, -12, 74, SOFT],
    [50, -12, 134, PINE],
  ];
  return (
    <g>
      {bars.map(([x, y, h, f], i) => (
        <Block key={i} x={x} y={y} w={24} d={24} h={h} f={f} />
      ))}
      <polyline points={[pt(-46, 0, 82), pt(-10, 0, 122), pt(26, 0, 100), pt(62, 0, 160)].join(' ')} fill="none" stroke="#fce114" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      {[[-46, 82], [-10, 122], [26, 100], [62, 160]].map(([x, z], i) => {
        const [cx, cy] = pt(x, 0, z).split(',');
        return <circle key={i} cx={cx} cy={cy} r="6" fill="#ffffff" stroke="#0d2e14" strokeWidth="2.5" />;
      })}
    </g>
  );
}

/** Figur mahasiswa: badan kapsul + kepala bola, digambar di titik layar (sx, sy). */
function Figure({ sx, sy, scale = 1, tone }: { sx: number; sy: number; scale?: number; tone: 'pine' | 'lime' | 'soft' }) {
  const body = { pine: 'url(#lp-g-pine-body)', lime: 'url(#lp-g-lime-body)', soft: 'url(#lp-g-soft-body)' }[tone];
  return (
    <g transform={`translate(${sx} ${sy}) scale(${scale})`}>
      <ellipse cx="0" cy="0" rx="24" ry="9" fill="#0d2e14" opacity=".14" />
      <path d="M-22 0 C-22 -44 -14 -58 0 -58 C14 -58 22 -44 22 0 C22 6 -22 6 -22 0Z" fill={body} />
      <circle cx="0" cy="-78" r="17" fill="url(#lp-g-head)" />
    </g>
  );
}

function Kekeluargaan() {
  // Urutan dari belakang ke depan agar figur depan menutupi figur belakang.
  return (
    <g>
      <ellipse cx={CX} cy={CY + 2} rx="104" ry="46" fill="none" stroke="#7ad813" strokeWidth="3" strokeDasharray="2 9" strokeLinecap="round" />
      <Figure sx={CX - 52} sy={CY - 26} scale={0.82} tone="soft" />
      <Figure sx={CX + 52} sy={CY - 26} scale={0.82} tone="lime" />
      <Figure sx={CX - 98} sy={CY + 4} scale={0.86} tone="lime" />
      <Figure sx={CX + 98} sy={CY + 4} scale={0.86} tone="soft" />
      <Figure sx={CX} sy={CY + 30} scale={1.05} tone="pine" />
    </g>
  );
}

function Pendidikan() {
  return (
    <g>
      <Block x={-58} y={-40} w={116} d={80} h={22} f={PINE} />
      <Block x={-54} y={-36} z={22} w={108} d={72} h={4} f={PAGE} />
      <Block x={-50} y={-44} z={26} w={104} d={78} h={22} f={LIME} />
      <Block x={-46} y={-40} z={48} w={96} d={70} h={4} f={PAGE} />
      <Block x={-54} y={-34} z={52} w={102} d={70} h={20} f={SOFT} />
      {/* Toga */}
      <Block x={-22} y={-22} z={72} w={44} d={44} h={24} f={PINE} />
      <polygon points={poly([-56, -56, 104], [56, -56, 104], [56, 56, 104], [-56, 56, 104])} fill="#0d2e14" />
      <polygon points={poly([-56, 56, 104], [56, 56, 104], [56, 56, 98], [-56, 56, 98])} fill="#0a2410" />
      <polygon points={poly([56, -56, 104], [56, 56, 104], [56, 56, 98], [56, -56, 98])} fill="#16401d" />
      <circle cx={pt(0, 0, 106).split(',')[0]} cy={pt(0, 0, 106).split(',')[1]} r="6" fill="#7ad813" />
      <path d={`M${pt(0, 0, 106)} L${pt(48, 10, 106)} L${pt(48, 10, 70)}`} fill="none" stroke="#7ad813" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx={pt(48, 10, 64).split(',')[0]} cy={pt(48, 10, 64).split(',')[1]} rx="5" ry="9" fill="#fce114" />
    </g>
  );
}

function Persebaran() {
  const g = { cx: CX, cy: CY - 74, r: 80 };
  return (
    <g>
      <ellipse cx={CX} cy={CY + 2} rx="62" ry="22" fill="#0d2e14" opacity=".16" filter="url(#lp-blur)" />
      <circle cx={g.cx} cy={g.cy} r={g.r} fill="url(#lp-g-globe)" />
      <clipPath id="lp-globe-clip">
        <circle cx={g.cx} cy={g.cy} r={g.r} />
      </clipPath>
      <g clipPath="url(#lp-globe-clip)">
        <path d={`M${g.cx - 70} ${g.cy - 34} q20 -22 44 -12 t36 8 q14 20 -10 32 t-40 -2 q-28 -6 -30 -26z`} fill="#7ad813" opacity=".6" />
        <path d={`M${g.cx + 16} ${g.cy + 18} q22 -12 40 0 q10 20 -12 30 q-24 6 -28 -30z`} fill="#7ad813" opacity=".5" />
        <path d={`M${g.cx + 30} ${g.cy - 56} q18 -6 30 6 q-4 12 -18 10z`} fill="#7ad813" opacity=".45" />
      </g>
      <g fill="none" stroke="#0d2e14" strokeOpacity=".16" strokeWidth="1.6">
        <ellipse cx={g.cx} cy={g.cy} rx={g.r} ry={g.r * 0.3} />
        <ellipse cx={g.cx} cy={g.cy} rx={g.r * 0.38} ry={g.r} />
      </g>
      <circle cx={g.cx} cy={g.cy} r={g.r} fill="url(#lp-g-shine)" />
      {/* Penanda lokasi */}
      <g transform={`translate(${g.cx + 22} ${g.cy - 34})`}>
        <ellipse cx="0" cy="4" rx="12" ry="5" fill="#0d2e14" opacity=".25" />
        <path d="M0 4 C-6 -12 -26 -26 -26 -48 A26 26 0 0 1 26 -48 C26 -26 6 -12 0 4Z" fill="url(#lp-g-pin)" />
        <circle cx="0" cy="-48" r="10" fill="#dff79e" />
      </g>
      <g transform={`translate(${g.cx - 42} ${g.cy + 20}) scale(.5)`}>
        <path d="M0 4 C-6 -12 -26 -26 -26 -48 A26 26 0 0 1 26 -48 C26 -26 6 -12 0 4Z" fill="#7ad813" />
        <circle cx="0" cy="-48" r="10" fill="#ffffff" />
      </g>
    </g>
  );
}

const SCENES: Record<CategoryKey, () => ReactElement> = { statistik: Statistik, kekeluargaan: Kekeluargaan, pendidikan: Pendidikan, persebaran: Persebaran };

function Defs() {
  return (
    <defs>
      <filter id="lp-blur" x="-20%" y="-50%" width="140%" height="200%">
        <feGaussianBlur stdDeviation="10" />
      </filter>
      <linearGradient id="lp-g-floor" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="1" stopColor="#eef8d6" />
      </linearGradient>
      <linearGradient id="lp-g-soft-l" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#eef3ea" />
        <stop offset="1" stopColor="#dfe7da" />
      </linearGradient>
      <linearGradient id="lp-g-soft-r" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#dfe7da" />
        <stop offset="1" stopColor="#cdd8c7" />
      </linearGradient>
      <linearGradient id="lp-g-lime-l" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#98e23c" />
        <stop offset="1" stopColor="#7ad813" />
      </linearGradient>
      <linearGradient id="lp-g-lime-r" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#6cc20f" />
        <stop offset="1" stopColor="#529a0b" />
      </linearGradient>
      <linearGradient id="lp-g-pine-l" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#1f5428" />
        <stop offset="1" stopColor="#17431f" />
      </linearGradient>
      <linearGradient id="lp-g-pine-r" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#123619" />
        <stop offset="1" stopColor="#0d2e14" />
      </linearGradient>
      <linearGradient id="lp-g-pine-body" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#2d6b36" />
        <stop offset="1" stopColor="#0d2e14" />
      </linearGradient>
      <linearGradient id="lp-g-lime-body" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#a6e85a" />
        <stop offset="1" stopColor="#5fae0e" />
      </linearGradient>
      <linearGradient id="lp-g-soft-body" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="1" stopColor="#cfe3b4" />
      </linearGradient>
      <radialGradient id="lp-g-head" cx=".35" cy=".3" r=".75">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset=".55" stopColor="#f1f5ec" />
        <stop offset="1" stopColor="#c9d6c2" />
      </radialGradient>
      <radialGradient id="lp-g-globe" cx=".35" cy=".3" r=".8">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset=".6" stopColor="#eef8d6" />
        <stop offset="1" stopColor="#c6e88f" />
      </radialGradient>
      <radialGradient id="lp-g-shine" cx=".3" cy=".25" r=".5">
        <stop offset="0" stopColor="#ffffff" stopOpacity=".7" />
        <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="lp-g-pin" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#2d6b36" />
        <stop offset="1" stopColor="#0d2e14" />
      </linearGradient>
    </defs>
  );
}

// Pembesaran ala Dock: ikon membesar mengikuti jarak ke pointer (mouse/pen saja).
const MAX_BOOST = 0.45;
const RANGE = 140;

export function HeroVisual() {
  const [active, setActive] = useState<CategoryKey>('statistik');
  const [scales, setScales] = useState<number[]>(() => CATEGORIES.map(() => 1));
  const iconRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = CATEGORIES.find((c) => c.key === active)!;

  const magnify = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setScales(
      iconRefs.current.map((el) => {
        if (!el) return 1;
        const r = el.getBoundingClientRect();
        const dist = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
        return 1 + MAX_BOOST * Math.max(0, 1 - dist / RANGE);
      }),
    );
  };
  const reset = () => setScales(CATEGORIES.map(() => 1));

  return (
    <div className="lp-visual" onPointerMove={magnify} onPointerLeave={reset} style={{ ['--orbit-turn' as string]: `${CATEGORIES.indexOf(current) * 32}deg` }}>
      {/* Lapisan dekoratif: gradasi, cincin orbit, dan titik yang berputar sedikit saat kategori berganti. */}
      <div className="lp-layer lp-layer-a" aria-hidden="true" />
      <div className="lp-layer lp-layer-b" aria-hidden="true" />
      <svg className="lp-rings" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="47" r="46" className="lp-ring-outer" />
        <circle cx="50" cy="47" r="30" className="lp-ring-inner" />
        <g className="lp-ring-dots">
          <circle cx="50" cy="1" r="1.2" className="is-lime" />
          <circle cx="96" cy="47" r="0.9" className="is-yellow" />
          <circle cx="17.5" cy="14.5" r="0.8" className="is-pine" />
          <circle cx="82.5" cy="79.5" r="0.7" className="is-lime" />
        </g>
      </svg>
      <svg className="lp-orbit" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <ellipse cx="50" cy="47" rx="43" ry="38" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="lp-glow" aria-hidden="true" />
      <svg className="lp-scene" viewBox="0 0 400 340" role="img" aria-label={current.scene}>
        <Defs />
        <Platform />
        {CATEGORIES.map(({ key }) => {
          const Scene = SCENES[key];
          return (
            <g key={key} className={`lp-scene-layer${key === active ? ' is-active' : ''}`}>
              <Scene />
            </g>
          );
        })}
      </svg>
      <div className="lp-dock" role="group" aria-label="Pilih kategori ilustrasi">
        {CATEGORIES.map((c, i) => (
          <button
            key={c.key}
            ref={(el) => {
              iconRefs.current[i] = el;
            }}
            type="button"
            className={`lp-dock-item${c.key === active ? ' is-active' : ''}`}
            style={{ ...orbitPos(ORBIT_ANGLES[i]), ['--s' as string]: scales[i] }}
            aria-pressed={c.key === active}
            onClick={() => setActive(c.key)}
          >
            <IconTile name={c.key as GlyphName} />
            <span className="lp-dock-label">{c.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
