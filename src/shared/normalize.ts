// Normalisasi nilai. Nilai asli tetap disimpan; bentuk ternormalisasi hanya untuk
// pencocokan kandidat duplikat dan pengelompokan analitik (audit F-31).

export const STUDENT_CODE_PATTERN = /^\d{2}-\d{4}$/;

export function cleanText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const v = value.replace(/\s+/g, ' ').trim();
  return v === '' ? null : v;
}

export function normalizeEmail(value: string | null): string | null {
  return value ? value.trim().toLowerCase() : null;
}

export function normalizePassport(value: string | null): string | null {
  return value ? value.replace(/[\s-]/g, '').toUpperCase() : null;
}

/** Hanya digit, dengan awalan 0 lokal dipertahankan apa adanya; dipakai untuk pencocokan saja. */
export function normalizePhone(value: string | null): string | null {
  if (!value) return null;
  let digits = value.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  else if (digits.startsWith('00')) digits = digits.slice(2);
  return digits.length >= 6 ? digits : null;
}

/** Kunci pengelompokan kategori: huruf kecil, spasi rapat. Label tampilan tetap nilai asli terbanyak. */
export function categoryKey(value: string | null): string | null {
  const v = cleanText(value);
  return v ? v.toLowerCase() : null;
}

export type GenderCode = 'L' | 'P';

const GENDER_MAP: Record<string, GenderCode> = {
  l: 'L',
  'laki-laki': 'L',
  'laki laki': 'L',
  lakilaki: 'L',
  pria: 'L',
  banin: 'L',
  male: 'L',
  p: 'P',
  perempuan: 'P',
  wanita: 'P',
  banat: 'P',
  female: 'P',
};

export function normalizeGender(value: string | null): GenderCode | null {
  const k = categoryKey(value);
  return k ? GENDER_MAP[k] ?? null : null;
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * Kedatangan pertama di Mesir (Jawaban H3): tanggal YYYY-MM-DD atau tahun YYYY (Masehi).
 * Mengembalikan tahun, atau null jika format tidak valid.
 */
export function arrivalYear(value: string): number | null {
  if (/^\d{4}$/.test(value)) return Number(value);
  if (isValidIsoDate(value)) return Number(value.slice(0, 4));
  return null;
}

/**
 * Tahun 00YY (contoh 0025 atau 0025-12-29) dibaca sebagai 20YY. Mengembalikan nilai yang
 * diperbaiki, atau null jika nilai tidak berbentuk 00YY. Hanya dipakai untuk kedatangan,
 * karena tahun lahir dua digit tidak dapat ditebak abadnya.
 */
export function repairTwoDigitYear(value: string): string | null {
  if (!/^00\d{2}(-\d{2}-\d{2})?$/.test(value)) return null;
  const repaired = `20${value.slice(2)}`;
  return arrivalYear(repaired) == null ? null : repaired;
}
