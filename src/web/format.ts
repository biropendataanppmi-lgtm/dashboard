const nf = new Intl.NumberFormat('id-ID');
const pf = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1, minimumFractionDigits: 1 });

export const fmt = (n: number | null | undefined) => (n == null ? '—' : nf.format(n));

/** Persentase dengan penyebut eksplisit; null jika penyebut nol (tidak menampilkan 0% palsu). */
export function pct(part: number, whole: number): string | null {
  if (!whole) return null;
  return `${pf.format((part / whole) * 100)}%`;
}

/** Waktu disimpan UTC, ditampilkan dalam zona Kairo (audit bagian F). */
export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo' }).format(d) + ' (Kairo)';
}
