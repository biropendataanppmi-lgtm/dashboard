// Data sintetis untuk tes. Semua nama, nomor, dan alamat di sini fiktif.
import { COLUMNS } from '../src/shared/columns';

export const HEADERS = COLUMNS.map((c) => c.header);

export type Row = Partial<Record<(typeof HEADERS)[number], string>>;

let seq = 0;
export function student(overrides: Row = {}): Row {
  seq++;
  const n = String(seq).padStart(4, '0');
  return {
    ID_Mahasiswa: `25-${n}`,
    Email_Address: `contoh${n}@example.org`,
    Jenis_Kelamin: seq % 2 ? 'Laki-laki' : 'Perempuan',
    Nama_Lengkap_Latin: `Mahasiswa Contoh ${n}`,
    Nama_Lengkap_Arab: '',
    Nomor_Paspor: `X${n}000`,
    Tempat_Lahir: 'Kota Contoh',
    Tanggal_Lahir: '2006-01-15',
    Domisili_Indonesia_Kabupaten_Kota: 'Kabupaten Contoh',
    Domisili_Indonesia_Provinsi: 'Jawa Tengah',
    Nomor_WhatsApp_Aktif: `+62812000${n}`,
    Nomor_Telepon_Aktif: `0812000${n}`,
    Kedatangan_di_Mesir: '2025-09-01',
    Domisili_di_Mesir: 'Darrasah dan sekitarnya',
    Kekeluargaan_Konsulat: 'KMJ',
    Jenjang_Pendidikan: 'S1',
    Fakultas: 'Ushuluddin',
    Jurusan: 'Jurusan Contoh',
    Mediator: '',
    ...overrides,
  };
}

export function toCsv(rows: Row[], headers: string[] = HEADERS): string {
  const esc = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h as keyof Row] ?? '')).join(','))].join('\r\n') + '\r\n';
}
