// Validasi file dan baris CSV (Dokumen Induk §4.3–§4.5). Fungsi murni: dapat diuji tanpa database.
import { COLUMNS, resolveHeader, type ColumnDef, type EditableField, type StudentField, type StudentValues } from './columns';
import { parseCsv, CsvError } from './csv';
import { STUDENT_CODE_PATTERN, arrivalYear, cleanText, isValidIsoDate, normalizeGender, repairTwoDigitYear } from './normalize';
import { canonicalCategory } from './reference';

export type Severity = 'error' | 'warning';

export interface Issue {
  severity: Severity;
  /** Kode stabil untuk filter dan statistik temuan. */
  code: string;
  /** Header CSV terkait, jika ada. */
  column?: string;
  /** Pesan tanpa nilai data pribadi, aman disimpan di tabel baris bermasalah. */
  message: string;
}

export interface ValidatedRow {
  rowNumber: number;
  studentCode: string | null;
  /** Hanya field yang kolomnya ada di file. Nilai kosong = null (Jawaban H6: kosongkan nilai). */
  values: StudentValues;
  issues: Issue[];
}

export interface ValidatedFile {
  /** Field yang kolomnya ada di file; field lain tidak disentuh saat pembaruan. */
  presentFields: EditableField[];
  fileIssues: Issue[];
  rows: ValidatedRow[];
}

const MIN_ARRIVAL_YEAR = 1950;
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function validateCsvText(text: string, now: Date = new Date()): ValidatedFile {
  const fileIssues: Issue[] = [];
  let parsed;
  try {
    parsed = parseCsv(text);
  } catch (e) {
    const message = e instanceof CsvError ? e.message : 'Struktur file CSV tidak dapat dibaca.';
    return { presentFields: [], fileIssues: [{ severity: 'error', code: 'struktur_file', message }], rows: [] };
  }

  if (parsed.headers.length === 0) {
    return { presentFields: [], fileIssues: [{ severity: 'error', code: 'file_kosong', message: 'File kosong atau tidak memiliki header.' }], rows: [] };
  }

  const seen = new Set<string>();
  const columnAt: (ColumnDef | null)[] = [];
  for (const header of parsed.headers) {
    const col = resolveHeader(header);
    if (!col) {
      fileIssues.push({ severity: 'error', code: 'header_tidak_dikenal', column: header || '(kosong)', message: `Kolom "${header || '(tanpa nama)'}" tidak dikenali. Hapus kolom ini atau sesuaikan namanya dengan format impor.` });
    } else if (seen.has(col.header)) {
      fileIssues.push({ severity: 'error', code: 'header_ganda', column: col.header, message: `Kolom "${col.header}" muncul lebih dari sekali.` });
    }
    if (col) seen.add(col.header);
    columnAt.push(col);
  }
  for (const col of COLUMNS) {
    if (seen.has(col.header)) continue;
    if (col.required) {
      fileIssues.push({ severity: 'error', code: 'header_wajib_hilang', column: col.header, message: `Kolom wajib "${col.header}" tidak ada di file.` });
    } else {
      fileIssues.push({ severity: 'warning', code: 'header_tidak_ada', column: col.header, message: `Kolom "${col.header}" tidak ada di file. Nilai kolom ini di database tidak akan diubah.` });
    }
  }
  if (parsed.rows.length === 0) {
    fileIssues.push({ severity: 'error', code: 'tanpa_baris', message: 'File hanya berisi header tanpa baris data.' });
  }
  if (fileIssues.some((i) => i.severity === 'error')) {
    return { presentFields: [], fileIssues, rows: [] };
  }

  const presentFields = COLUMNS.filter((c) => seen.has(c.header) && c.field !== 'student_code').map((c) => c.field as EditableField);
  const maxYear = now.getUTCFullYear() + 1;

  const rows: ValidatedRow[] = parsed.rows.map(({ rowNumber, cells }) => {
    const issues: Issue[] = [];
    const values: StudentValues = {};
    let studentCode: string | null = null;

    if (cells.length !== parsed.headers.length) {
      issues.push({ severity: 'error', code: 'jumlah_kolom', message: `Baris memiliki ${cells.length} kolom, seharusnya ${parsed.headers.length}.` });
    }

    columnAt.forEach((col, idx) => {
      if (!col) return;
      const { value, issues: cellIssues } = normalizeCell(col, cleanText(cells[idx] ?? ''));
      if (col.field === 'student_code') {
        studentCode = value;
      } else {
        values[col.field as EditableField] = value;
      }
      issues.push(...cellIssues, ...checkValue(col, value, maxYear));
    });

    // Tahun kedatangan vs angkatan di ID: angkatan 26 bisa datang akhir 2025, jadi hanya warning (Jawaban H4).
    if (studentCode && STUDENT_CODE_PATTERN.test(studentCode) && values.arrival_date) {
      const year = arrivalYear(values.arrival_date);
      if (year && String(year).slice(2) !== (studentCode as string).slice(0, 2)) {
        issues.push({ severity: 'warning', code: 'tahun_tidak_cocok_id', column: 'Kedatangan_di_Mesir', message: 'Tahun kedatangan berbeda dari angkatan di ID (dua digit awal). Hanya catatan: wajar bila datang sebelum tahun angkatannya; ID dan tanggal tidak diubah.' });
      }
    }
    return { rowNumber, studentCode, values, issues };
  });

  // ID ganda di dalam file: semua kemunculan ditahan (§4.4).
  const byCode = new Map<string, ValidatedRow[]>();
  for (const r of rows) {
    if (!r.studentCode) continue;
    const list = byCode.get(r.studentCode) ?? [];
    list.push(r);
    byCode.set(r.studentCode, list);
  }
  for (const list of byCode.values()) {
    if (list.length < 2) continue;
    const lines = list.map((r) => r.rowNumber).join(', ');
    for (const r of list) {
      r.issues.push({ severity: 'error', code: 'id_ganda_di_file', column: 'ID_Mahasiswa', message: `ID yang sama dipakai di baris ${lines}.` });
    }
  }

  return { presentFields, fileIssues, rows };
}

/** Penyesuaian nilai yang aman sebelum disimpan; setiap penyesuaian dilaporkan. */
function normalizeCell(col: ColumnDef, value: string | null): { value: string | null; issues: Issue[] } {
  if (value == null) return { value, issues: [] };
  const at = { column: col.header };
  if (col.kind === 'arrival') {
    // Spreadsheet kadang menyimpan tahun dua digit sebagai 00YY (contoh 0025-12-29).
    const repaired = repairTwoDigitYear(value);
    if (repaired) {
      return { value: repaired, issues: [{ severity: 'warning', code: 'tahun_diperbaiki', ...at, message: `Tahun kedatangan tertulis 00YY; dibaca sebagai 20YY (${repaired.slice(0, 4)}). Periksa sel ini di spreadsheet.` }] };
    }
  }
  if (col.kind === 'category') {
    const canonical = canonicalCategory(col.field as EditableField, value);
    if (canonical === null) {
      return { value, issues: [{ severity: 'warning', code: 'kategori_tidak_dikenal', ...at, message: `${col.label} tidak ada di daftar baku. Nilai tetap disimpan apa adanya dan dihitung sebagai kategori tersendiri.` }] };
    }
    if (canonical) return { value: canonical, issues: [] };
  }
  return { value, issues: [] };
}

function checkValue(col: ColumnDef, value: string | null, maxYear: number): Issue[] {
  const out: Issue[] = [];
  const at = { column: col.header };
  if (value == null) {
    if (col.required) out.push({ severity: 'error', code: 'wajib_kosong', ...at, message: `${col.label} wajib diisi.` });
    else if (col.analytic) out.push({ severity: 'warning', code: 'analitik_kosong', ...at, message: `${col.label} belum diisi; tidak dihitung sebagai kategori yang diketahui.` });
    return out;
  }
  switch (col.kind) {
    case 'id':
      if (!STUDENT_CODE_PATTERN.test(value)) out.push({ severity: 'error', code: 'format_id', ...at, message: 'Format ID harus 6 angka (YYNNNN), contoh 260128.' });
      break;
    case 'email':
      if (!EMAIL_PATTERN.test(value)) out.push({ severity: 'warning', code: 'format_email', ...at, message: 'Format email tampak tidak valid.' });
      break;
    case 'phone':
      if (/[a-z]/i.test(value)) out.push({ severity: 'warning', code: 'format_telepon', ...at, message: 'Nomor telepon berisi huruf.' });
      break;
    case 'date':
      if (!isValidIsoDate(value)) out.push({ severity: 'error', code: 'format_tanggal', ...at, message: 'Tanggal harus berformat YYYY-MM-DD dan merupakan tanggal yang ada.' });
      break;
    case 'arrival': {
      const year = arrivalYear(value);
      if (year == null) out.push({ severity: 'error', code: 'format_kedatangan', ...at, message: 'Kedatangan harus berupa tahun (YYYY) atau tanggal (YYYY-MM-DD).' });
      else if (year < MIN_ARRIVAL_YEAR || year > maxYear) out.push({ severity: 'error', code: 'rentang_kedatangan', ...at, message: `Tahun kedatangan harus antara ${MIN_ARRIVAL_YEAR} dan ${maxYear}.` });
      break;
    }
    case 'gender':
      if (!normalizeGender(value)) out.push({ severity: 'warning', code: 'kategori_tidak_dikenal', ...at, message: 'Jenis kelamin tidak dikenali (gunakan Laki-laki/Perempuan atau Banin/Banat).' });
      break;
    default:
      break;
  }
  return out;
}

export function hasErrors(issues: Issue[]): boolean {
  return issues.some((i) => i.severity === 'error');
}

export type { StudentField };
