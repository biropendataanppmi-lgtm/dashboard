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
    const res = validateCsvText(toCsv([student({ ID_Mahasiswa: '24-0009', Kedatangan_di_Mesir: '2025' })]));
    expect(res.rows[0].issues.map((i) => i.code)).toEqual(['tahun_tidak_cocok_id']);
    expect(res.rows[0].values.arrival_date).toBe('2025');
  });

  it('ID ganda di dalam file menahan semua kemunculannya', () => {
    const res = validateCsvText(toCsv([student({ ID_Mahasiswa: '25-9999' }), student({ ID_Mahasiswa: '25-9999' })]));
    expect(res.rows.every((r) => r.issues.some((i) => i.code === 'id_ganda_di_file'))).toBe(true);
  });

  it('nomor telepon, paspor, dan ID tetap teks: + dan nol di depan dipertahankan', () => {
    const res = validateCsvText(toCsv([student({ Nomor_Telepon_Aktif: '+20 0100 123', Nomor_Paspor: '0012345', ID_Mahasiswa: '25-0001' })]));
    expect(res.rows[0].values.phone_no).toBe('+20 0100 123');
    expect(res.rows[0].values.passport_no).toBe('0012345');
    expect(res.rows[0].studentCode).toBe('25-0001');
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
    const file = validateCsvText(toCsv([student({ ID_Mahasiswa: '25-0100' }), student({ ID_Mahasiswa: '25-0101' })]));
    const db = [existing('25-0100', { name_latin: 'Lama' })];
    const add = planImport(file, 'add_only', db, 1);
    expect(add.rows.map((r) => r.action)).toEqual(['held', 'create']);
    const upd = planImport(file, 'update_existing', db, 1);
    expect(upd.rows.map((r) => r.action)).toEqual(['update', 'held']);
    expect(upd.rows[1].issues.at(-1)?.code).toBe('id_tidak_ditemukan');
  });

  it('record yang tidak berubah tidak ditulis ulang; sel kosong mengosongkan nilai dengan peringatan', () => {
    const row = student({ ID_Mahasiswa: '25-0200' });
    const file = validateCsvText(toCsv([row]));
    const values = { ...file.rows[0].values };
    const same = planImport(file, 'full_sync', [existing('25-0200', values)], 1);
    expect(same.rows[0].action).toBe('unchanged');

    const cleared = validateCsvText(toCsv([{ ...row, Fakultas: '' }]));
    const plan = planImport(cleared, 'full_sync', [existing('25-0200', values)], 1);
    expect(plan.rows[0].action).toBe('update');
    expect(plan.rows[0].cleared).toEqual(['faculty']);
    expect(plan.summary.clearedByColumn).toEqual({ Fakultas: 1 });
    expect(plan.rows[0].issues.map((i) => i.code)).toContain('nilai_dikosongkan');
  });

  it('paspor yang sama dengan record lain ditandai kandidat duplikat, tidak digabung', () => {
    const file = validateCsvText(toCsv([student({ ID_Mahasiswa: '25-0300', Nomor_Paspor: 'b 77 1' })]));
    const plan = planImport(file, 'add_only', [existing('25-0299', { passport_no: 'B771' })], 1);
    expect(plan.rows[0].action).toBe('create');
    expect(plan.rows[0].duplicateCandidate).toBe(true);
    expect(plan.summary.duplicateCandidates).toBe(1);
  });
});
