// Satu keluarga ikon garis (24×24, stroke) untuk landing page publik.
export type GlyphName = 'statistik' | 'kekeluargaan' | 'pendidikan' | 'persebaran' | 'impor' | 'riwayat' | 'kunci' | 'perisai' | 'admin';

const GLYPHS: Record<GlyphName, string> = {
  statistik: 'M3.5 20h17M6 20v-7M10.5 20V6.5M15 20v-9.5M19.5 20v-4.5',
  kekeluargaan: 'M9 11a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 9 11zM2.8 19.5c.4-3.2 3-5.3 6.2-5.3s5.8 2.1 6.2 5.3M16.5 11.2a2.6 2.6 0 1 0-.8-5.1M17.6 14.4c2 .5 3.4 2.2 3.6 5.1',
  pendidikan: 'M2.5 9.2 12 4.5l9.5 4.7L12 14 2.5 9.2zM6.5 11.4v4.4c0 1.5 2.5 3.2 5.5 3.2s5.5-1.7 5.5-3.2v-4.4M21.5 9.2v5.3',
  persebaran: 'M12 21s6.8-6 6.8-11.3a6.8 6.8 0 1 0-13.6 0C5.2 15 12 21 12 21zM12 12.2a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  impor: 'M12 15V4.5M8 8.5l4-4 4 4M4.5 14.5v4.5h15v-4.5',
  riwayat: 'M3.8 12a8.2 8.2 0 1 0 2.6-6M3.8 4.5V8h3.5M12 7.5V12l3 2',
  kunci: 'M6.5 11h11a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 18.5v-6A1.5 1.5 0 0 1 6.5 11zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  perisai: 'M12 3.5 19 6v5.6c0 4.2-2.9 7.7-7 8.9-4.1-1.2-7-4.7-7-8.9V6l7-2.5zM9 12l2.2 2.2L15.2 10',
  admin: 'M12 11.5a3.8 3.8 0 1 0 0-7.6 3.8 3.8 0 0 0 0 7.6zM4.5 20c.5-3.9 3.6-6 7.5-6s7 2.1 7.5 6',
};

export function Glyph({ name }: { name: GlyphName }) {
  return (
    <svg className="lp-glyph" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={GLYPHS[name]} />
    </svg>
  );
}

/** Ikon di atas ubin bergradasi lembut; dipakai di Hero, panel Dashboard, dan daftar fitur. */
export function IconTile({ name, size = 'md' }: { name: GlyphName; size?: 'sm' | 'md' }) {
  return (
    <span className={`lp-tile lp-tile-${size}`} aria-hidden="true">
      <Glyph name={name} />
    </span>
  );
}
