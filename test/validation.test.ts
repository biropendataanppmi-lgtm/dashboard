import { describe, expect, it } from 'vitest';
import { parseCsv } from '../src/shared/csv';
import { normalizePhone } from '../src/shared/normalize';
import { planImport, type ExistingStudent } from '../src/shared/plan';
import { validateCsvText } from '../src/shared/validation';
import { HEADERS, student, toCsv } from './fixtures';

describe('parser CSV', () => {
  it('menangani BOM, CRLF, tanda kutip, dan baris baru di dalam kutip', () => {
    const text = '﻿a,b\r\n"x, y","baris\nkedua"\r\n"kutip ""ganda""",2\r\n\r\n';
    const p = parseCsv(text);
    expect(p.headers).toEqual(['a', 'b']);
    expect(p.rows.map((r) => r.cells)).toEqual([
      ['x, y', 'baris\nkedua'],
      ['kutip "ganda"', '2'],
    ]);
    expect(p.rows[1].rowNumber).toBe(4);
  });

  it('menolak kutip yang tidak ditutup', () => {
    expect(() => parseCsv('a\n"terbuka')).toThrow();
  });
});

describe('validasi file', () => {
  it('file kosong ditolak', () => {
    expect(validateCsvText('').fileIssues[0].code).toBe('file_kosong');
  });

  it('header asing dan kolom wajib hilang menghasilkan error yang jelas', () => {
    const headers = HEADERS.filter((h) => h !== 'Nama_Lengkap_Latin').concat('Kolom_Asing');
    const res = validateCsvText(toCsv([student()], headers));
    const codes = res.fileIssues.map((i) => i.code);
    expect(codes).toContain('header_tidak_dikenal');
    expect(codes).toContain('header_wajib_hilang');
    expect(res.rows).toHaveLength(0);
  });

  it('kolom opsional yang tidak ada hanya menjadi warning dan tidak masuk presentFields', () => {
    const headers = HEADERS.filter((h) => h !== 'Mediator');
    const res = validateCsvText(toCsv([student()], headers));
    expect(res.fileIssues.map((i) => i.code)).toEqual(['header_tidak_ada']);
    expect(res.presentFields).not.toContain('mediator');
  });

  it('ID harus 6 angka seperti di spreadsheet Biro', () => {
    const res = validateCsvText(toCsv([student({ ID_Mahasiswa: '260001' }), student({ ID_Mahasiswa: '26-0002' }), student({ ID_Mahasiswa: '26001' })]));
    expect(res.rows.map((r) => r.issues.some((i) => i.code === 'format_id'))).toEqual([false, true, true]);
  });

  it('ID, tanggal, dan kedatangan divalidasi; nilai analitik kosong hanya warning', () => {
    const res = validateCsvText(
      toCsv([
        student({ ID_Mahasiswa: '2025-1' }),
        student({ Tanggal_Lahir: '15/01/2006' }),
        student({ Kedatangan_di_Mesir: '2025-02-30' }),
        student({ Jenjang_Pendidikan: '', Fakultas: '' }),
        student({ Nama_Lengkap_Latin: '  ' }),
      ]),
    );
    const codes = res.rows.map((r) => r.issues.map((i) => `${i.severity}:${i.code}`));
    expect(codes[0]).toContain('error:format_id');
    expect(codes[1]).toContain('error:format_tanggal');
    expect(codes[2]).toContain('error:format_kedatangan');
    expect(codes[3]).toEqual(['warning:analitik_kosong', 'warning:analitik_kosong']);
    expect(codes[4]).toContain('error:wajib_kosong');
  });

  it('kedatangan boleh berupa tahun saja; tahun berbeda dari prefiks ID hanya warning', () => {
    const res = validateCsvText(toCsv([student({ ID_Mahasiswa: '240009', Kedatangan_di_Mesir: '2025' })]));
    expect(res.rows[0].issues.map((i) => i.code)).toEqual(['tahun_tidak_cocok_id']);
    expect(res.rows[0].values.arrival_date).toBe('2025');
  });

  it('ID ganda di dalam file menahan semua kemunculannya', () => {
    const res = validateCsvText(toCsv([student({ ID_Mahasiswa: '259999' }), student({ ID_Mahasiswa: '259999' })]));
    expect(res.rows.every((r) => r.issues.some((i) => i.code === 'id_ganda_di_file'))).toBe(true);
  });

  it('nomor telepon, paspor, dan ID tetap teks: + dan nol di depan dipertahankan', () => {
    const res = validateCsvText(toCsv([student({ Nomor_Telepon_Aktif: '+20 0100 123', Nomor_Paspor: '0012345', ID_Mahasiswa: '250001' })]));
    expect(res.rows[0].values.phone_no).toBe('+20 0100 123');
    expect(res.rows[0].values.passport_no).toBe('0012345');
    expect(res.rows[0].studentCode).toBe('250001');
    expect(normalizePhone('+20 0100 123')).toBe('200100123');
  });
});

describe('perencanaan impor', () => {
  const existing = (code: string, values: Record<string, string | null>, status: 'active' | 'inactive' = 'active'): ExistingStudent => ({
    id: 1,
    student_code: code,
    record_status: status,
    values,
  });

  it('Add Only menolak ID yang sudah ada; Update Existing menolak ID baru', () => {
    const file = validateCsvText(toCsv([student({ ID_Mahasiswa: '250100' }), student({ ID_Mahasiswa: '250101' })]));
    const db = [existing('250100', { name_latin: 'Lama' })];
    const add = planImport(file, 'add_only', db, 1);
    expect(add.rows.map((r) => r.action)).toEqual(['held', 'create']);
    const upd = planImport(file, 'update_existing', db, 1);
    expect(upd.rows.map((r) => r.action)).toEqual(['update', 'held']);
    expect(upd.rows[1].issues.at(-1)?.code).toBe('id_tidak_ditemukan');
  });

  it('record yang tidak berubah tidak ditulis ulang; sel kosong mengosongkan nilai dengan peringatan', () => {
    const row = student({ ID_Mahasiswa: '250200' });
    const file = validateCsvText(toCsv([row]));
    const values = { ...file.rows[0].values };
    const same = planImport(file, 'full_sync', [existing('250200', values)], 1);
    expect(same.rows[0].action).toBe('unchanged');

    const cleared = validateCsvText(toCsv([{ ...row, Fakultas: '' }]));
    const plan = planImport(cleared, 'full_sync', [existing('250200', values)], 1);
    expect(plan.rows[0].action).toBe('update');
    expect(plan.rows[0].cleared).toEqual(['faculty']);
    expect(plan.summary.clearedByColumn).toEqual({ Fakultas: 1 });
    expect(plan.rows[0].issues.map((i) => i.code)).toContain('nilai_dikosongkan');
  });

  it('paspor yang sama dengan record lain ditandai kandidat duplikat, tidak digabung', () => {
    const file = validateCsvText(toCsv([student({ ID_Mahasiswa: '250300', Nomor_Paspor: 'b 77 1' })]));
    const plan = planImport(file, 'add_only', [existing('250299', { passport_no: 'B771' })], 1);
    expect(plan.rows[0].action).toBe('create');
    expect(plan.rows[0].duplicateCandidate).toBe(true);
    expect(plan.summary.duplicateCandidates).toBe(1);
  });
});

describe('daftar baku dan spreadsheet asli', () => {
  const SHEET_HEADERS: Record<string, string> = {
    ID_Mahasiswa: 'ID Mahasiswa',
    Email_Address: 'Email Address',
    Jenis_Kelamin: 'Jenis Kelamin',
    Nama_Lengkap_Latin: 'Nama Lengkap (Latin)',
    Nama_Lengkap_Arab: 'Nama Lengkap (Arab)',
    Nomor_Paspor: 'Nomor Paspor',
    Tempat_Lahir: 'Tempat Lahir',
    Tanggal_Lahir: 'Tanggal Lahir',
    Domisili_Indonesia_Kabupaten_Kota: 'Domisili di Indonesia (Kabupaten/Kota)',
    Domisili_Indonesia_Provinsi: 'Domisili di Indonesia (Provinsi)',
    Nomor_WhatsApp_Aktif: 'Nomor WhatsApp (Aktif)',
    Nomor_Telepon_Aktif: 'Nomor Telepon (Aktif)',
    Kedatangan_di_Mesir: 'Kedatangan di Mesir',
    Domisili_di_Mesir: 'Domisili di Mesir',
    Kekeluargaan_Konsulat: 'Kekeluargaan/Konsulat',
    Jenjang_Pendidikan: 'Jenjang Pendidikan',
    Fakultas: 'Fakultas',
    Jurusan: 'Jurusan',
    Mediator: 'Mediator',
  };

  it('header spreadsheet Biro dikenali tanpa diubah namanya', () => {
    const csv = toCsv([student()]).replace(/^[^\r]*/, HEADERS.map((h) => `"${SHEET_HEADERS[h]}"`).join(','));
    const res = validateCsvText(csv);
    expect(res.fileIssues).toEqual([]);
    expect(res.presentFields).toHaveLength(18);
    expect(res.rows[0].issues).toEqual([]);
  });

  it('nama kolom pendek di spreadsheet ikut dikenali', () => {
    const res = validateCsvText('ID Mahasiswa,Nama Lengkap,Provinsi di Indonesia,Kabupaten/Kota di Indonesia,Kekeluargaan\n250001,A,Jawa Tengah,Semarang,KMJ\n');
    expect(res.fileIssues.filter((i) => i.severity === 'error')).toEqual([]);
    expect(res.presentFields).toEqual(expect.arrayContaining(['name_latin', 'origin_province', 'origin_regency', 'kekeluargaan']));
  });

  it('header yang sama dalam dua ejaan dianggap ganda', () => {
    const res = validateCsvText('ID_Mahasiswa,Nama_Lengkap_Latin,Nama Lengkap (Latin)\n250001,A,A\n');
    expect(res.fileIssues.map((i) => i.code)).toContain('header_ganda');
  });

  it('kategori disimpan dengan ejaan baku; nilai di luar daftar tetap disimpan dengan peringatan', () => {
    const res = validateCsvText(
      toCsv([
        student({ Kekeluargaan_Konsulat: 'kmj', Domisili_di_Mesir: 'hay  sabi’', Fakultas: 'syariah WAL qanun', Jenjang_Pendidikan: "ma'had" }),
        student({ Domisili_Indonesia_Provinsi: 'Papua' }),
      ]),
    );
    expect(res.rows[0].values).toMatchObject({ kekeluargaan: 'KMJ', egypt_domicile: "Hay Sabi'", faculty: 'Syariah wal Qanun', education_level: "Ma'had" });
    expect(res.rows[0].issues).toEqual([]);
    expect(res.rows[1].values.origin_province).toBe('Papua');
    expect(res.rows[1].issues.map((i) => `${i.severity}:${i.code}`)).toEqual(['warning:kategori_tidak_dikenal']);
  });

  it('tahun kedatangan 00YY dibaca sebagai 20YY dengan peringatan; tanggal lahir 00YY tetap error', () => {
    const res = validateCsvText(toCsv([student({ ID_Mahasiswa: '250001', Kedatangan_di_Mesir: '0025-12-29' }), student({ Tanggal_Lahir: '0005-01-01' })]));
    expect(res.rows[0].values.arrival_date).toBe('2025-12-29');
    expect(res.rows[0].issues.map((i) => i.code)).toEqual(['tahun_diperbaiki']);
    expect(res.rows[1].issues.map((i) => i.code)).toEqual(['format_tanggal']);
  });
});
