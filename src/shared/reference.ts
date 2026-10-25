// Daftar baku kategori dari Biro Data dan Statistika (25 Oktober 2026).
// Nilai CSV yang cocok (tanpa membedakan huruf besar/kecil, spasi, dan jenis tanda kutip)
// disimpan dengan ejaan baku; nilai di luar daftar tetap disimpan apa adanya dengan peringatan.
import type { EditableField } from './columns';

export const KEKELUARGAAN = [
  'FOSGAMA', 'GAMAJATIM', 'HMMSU', 'IKMAL', 'KEMASS', 'KKS', 'KMA', 'KMB',
  'KMJ', 'KMKM', 'KMM', 'KMNTB', 'KPJ', 'KPMJB', 'KSMR', 'KSW',
] as const;

export const JENJANG = ['Daurah Lughah', "Ma'had", 'S1'] as const;

export const PROVINSI = [
  'Aceh', 'Bali', 'Bangka Belitung', 'Banten', 'Bengkulu', 'DI Yogyakarta', 'DKI Jakarta', 'Gorontalo',
  'Jambi', 'Jawa Barat', 'Jawa Tengah', 'Jawa Timur', 'Kalimantan Barat', 'Kalimantan Selatan',
  'Kalimantan Tengah', 'Kalimantan Timur', 'Kalimantan Utara', 'Kepulauan Riau', 'Lampung', 'Maluku',
  'Maluku Utara', 'Nusa Tenggara Barat', 'Nusa Tenggara Timur', 'Papua Barat Daya', 'Papua Selatan',
  'Papua Tengah', 'Riau', 'Sulawesi Barat', 'Sulawesi Selatan', 'Sulawesi Tengah', 'Sulawesi Tenggara',
  'Sulawesi Utara', 'Sumatera Barat', 'Sumatera Selatan', 'Sumatera Utara',
] as const;

export const DOMISILI_MESIR = [
  'Abbasiyah', "Bu'uts", 'Darrasah dan sekitarnya', 'Hay Asyir', "Hay Sabi'", 'Hay Tsamin',
  'Mukottom', "Rab'ah", 'Sayyidah Aisyah', 'Zahra',
] as const;

export const FAKULTAS = [
  'Dakwah', 'Dirasat Insaniyah', 'Dirasat Islamiyah (Banat)', 'Dirasat Islamiyah (Banin)', 'Kedokteran',
  'Lughah Arabiyah', "Ma'had", 'Syariah wal Qanun', 'Teknik', 'Tijarah', 'Ushuluddin',
] as const;

/** Kolom yang memiliki daftar baku. Kabupaten/kota dan jurusan belum memiliki daftar. */
export const REFERENCE_LISTS: Partial<Record<EditableField, readonly string[]>> = {
  kekeluargaan: KEKELUARGAAN,
  education_level: JENJANG,
  origin_province: PROVINSI,
  egypt_domicile: DOMISILI_MESIR,
  faculty: FAKULTAS,
};

/** Kunci pencocokan: huruf kecil, tanda kutip disamakan, spasi dirapatkan. */
export function referenceKey(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const INDEX = new Map<EditableField, Map<string, string>>(
  Object.entries(REFERENCE_LISTS).map(([field, list]) => [field as EditableField, new Map(list!.map((v) => [referenceKey(v), v]))]),
);

/**
 * Mengembalikan ejaan baku jika nilai ada di daftar, null jika kolom punya daftar tetapi
 * nilainya tidak dikenal, atau undefined jika kolom tidak memiliki daftar baku.
 */
export function canonicalCategory(field: EditableField, value: string): string | null | undefined {
  const idx = INDEX.get(field);
  if (!idx) return undefined;
  return idx.get(referenceKey(value)) ?? null;
}
