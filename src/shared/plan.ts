// Perencanaan impor: membandingkan baris tervalidasi dengan isi database tanpa menulis apa pun.
// Hasilnya menjadi preview (§3.6A) dan satu-satunya masukan untuk tahap penerapan.
import type { EditableField, ImportMode, StudentValues } from './columns';
import { COLUMN_BY_FIELD } from './columns';
import { normalizeEmail, normalizePassport, normalizePhone } from './normalize';
import type { Issue, ValidatedFile } from './validation';
import { hasErrors } from './validation';

export interface ExistingStudent {
  id: number;
  student_code: string;
  record_status: 'active' | 'inactive';
  values: StudentValues;
}

export type RowAction = 'create' | 'update' | 'unchanged' | 'held';

export interface PlannedRow {
  rowNumber: number;
  studentCode: string | null;
  action: RowAction;
  /** Untuk create: semua field yang ada di file. Untuk update: hanya field yang berubah. */
  changes: StudentValues;
  /** Field yang akan dikosongkan (nilai lama ada, file kosong). */
  cleared: EditableField[];
  issues: Issue[];
  duplicateCandidate: boolean;
}

export interface ImportPlan {
  mode: ImportMode;
  presentFields: EditableField[];
  fileIssues: Issue[];
  rows: PlannedRow[];
  summary: PlanSummary;
}

export interface PlanSummary {
  rowsRead: number;
  create: number;
  update: number;
  unchanged: number;
  held: number;
  withWarnings: number;
  duplicateCandidates: number;
  /** Jumlah nilai yang akan dikosongkan per header kolom. */
  clearedByColumn: Record<string, number>;
}

export function planImport(file: ValidatedFile, mode: ImportMode, existing: ExistingStudent[], activeCount: number): ImportPlan {
  const byCode = new Map(existing.map((s) => [s.student_code, s]));
  const fileIssues = [...file.fileIssues];

  // Indeks kunci identitas dari database untuk kandidat duplikat (bukan penggabungan otomatis, §4.4).
  const keyOwners = new Map<string, Set<string>>();
  const addKey = (key: string | null, code: string) => {
    if (!key) return;
    const set = keyOwners.get(key) ?? new Set<string>();
    set.add(code);
    keyOwners.set(key, set);
  };
  const identityKeys = (v: StudentValues): string[] =>
    [
      v.passport_no ? 'p:' + normalizePassport(v.passport_no) : null,
      v.email ? 'e:' + normalizeEmail(v.email) : null,
      v.whatsapp_no ? 't:' + normalizePhone(v.whatsapp_no) : null,
      v.phone_no ? 't:' + normalizePhone(v.phone_no) : null,
    ].filter((k): k is string => !!k && !k.endsWith(':null'));

  for (const s of existing) for (const k of identityKeys(s.values)) addKey(k, s.student_code);

  const rows: PlannedRow[] = file.rows.map((r) => {
    const issues = [...r.issues];
    const code = r.studentCode;
    const current = code ? byCode.get(code) : undefined;

    if (code && !hasErrors(issues)) {
      if (current && mode === 'add_only') {
        issues.push({ severity: 'error', code: 'id_sudah_ada', column: 'ID_Mahasiswa', message: 'ID sudah dipakai record di database. Mode Add Only tidak menimpa record yang ada.' });
      }
      if (!current && mode === 'update_existing') {
        issues.push({ severity: 'error', code: 'id_tidak_ditemukan', column: 'ID_Mahasiswa', message: 'ID tidak ditemukan di database. Mode Update Existing tidak membuat record baru.' });
      }
    }

    if (hasErrors(issues)) {
      return { rowNumber: r.rowNumber, studentCode: code, action: 'held', changes: {}, cleared: [], issues, duplicateCandidate: false };
    }

    if (current?.record_status === 'inactive') {
      issues.push({ severity: 'warning', code: 'record_nonaktif', column: 'ID_Mahasiswa', message: 'Record ini nonaktif. Perubahan disimpan, tetapi record tetap nonaktif.' });
    }

    let action: RowAction;
    const changes: StudentValues = {};
    const cleared: EditableField[] = [];
    if (!current) {
      action = 'create';
      for (const f of file.presentFields) changes[f] = r.values[f] ?? null;
    } else {
      for (const f of file.presentFields) {
        const next = r.values[f] ?? null;
        const prev = current.values[f] ?? null;
        if (next !== prev) {
          changes[f] = next;
          if (next == null) cleared.push(f);
        }
      }
      action = Object.keys(changes).length === 0 ? 'unchanged' : 'update';
      if (cleared.length > 0) {
        const cols = cleared.map((f) => COLUMN_BY_FIELD.get(f)!.header).join(', ');
        issues.push({ severity: 'warning', code: 'nilai_dikosongkan', message: `Nilai lama akan dikosongkan: ${cols}.` });
      }
    }

    // Kandidat duplikat: kunci identitas sama dengan record lain (ID berbeda).
    let duplicateCandidate = false;
    if (action !== 'unchanged') {
      for (const k of identityKeys(r.values)) {
        const owners = keyOwners.get(k);
        if (owners && [...owners].some((c) => c !== code)) duplicateCandidate = true;
      }
      if (duplicateCandidate) {
        issues.push({ severity: 'warning', code: 'kandidat_duplikat', message: 'Paspor, email, atau telepon sama dengan record lain. Periksa apakah orangnya sama; sistem tidak menggabungkan otomatis.' });
      }
    }
    return { rowNumber: r.rowNumber, studentCode: code, action, changes, cleared, issues, duplicateCandidate };
  });

  // Kandidat duplikat antarbaris di dalam file yang sama.
  const fileKeyRows = new Map<string, PlannedRow[]>();
  file.rows.forEach((r, idx) => {
    const planned = rows[idx];
    if (planned.action === 'held') return;
    for (const k of identityKeys(r.values)) {
      const list = fileKeyRows.get(k) ?? [];
      list.push(planned);
      fileKeyRows.set(k, list);
    }
  });
  for (const list of fileKeyRows.values()) {
    const codes = new Set(list.map((p) => p.studentCode));
    if (codes.size < 2) continue;
    for (const p of list) {
      if (p.duplicateCandidate) continue;
      p.duplicateCandidate = true;
      p.issues.push({ severity: 'warning', code: 'kandidat_duplikat', message: 'Paspor, email, atau telepon sama dengan baris lain di file ini.' });
    }
  }

  const summary: PlanSummary = {
    rowsRead: rows.length,
    create: 0,
    update: 0,
    unchanged: 0,
    held: 0,
    withWarnings: 0,
    duplicateCandidates: 0,
    clearedByColumn: {},
  };
  for (const p of rows) {
    if (p.action === 'create') summary.create++;
    else if (p.action === 'update') summary.update++;
    else if (p.action === 'unchanged') summary.unchanged++;
    else summary.held++;
    if (p.action !== 'held' && p.issues.some((i) => i.severity === 'warning')) summary.withWarnings++;
    if (p.duplicateCandidate) summary.duplicateCandidates++;
    for (const f of p.cleared) {
      const h = COLUMN_BY_FIELD.get(f)!.header;
      summary.clearedByColumn[h] = (summary.clearedByColumn[h] ?? 0) + 1;
    }
  }

  // Peringatan tingkat file (§4.4): kolom yang akan dikosongkan seluruhnya, dan jumlah record berbeda drastis.
  const updates = rows.filter((p) => p.action === 'update' || p.action === 'unchanged');
  for (const [header, n] of Object.entries(summary.clearedByColumn)) {
    if (updates.length >= 5 && n >= updates.length * 0.5) {
      fileIssues.push({ severity: 'warning', code: 'pengosongan_massal', column: header, message: `${n} nilai di kolom ${header} akan dikosongkan. Pastikan file ini bukan versi lama atau berkolom kosong.` });
    }
  }
  if (mode === 'full_sync' && activeCount >= 20 && rows.length < activeCount * 0.5) {
    fileIssues.push({ severity: 'warning', code: 'jumlah_berbeda_drastis', message: `File berisi ${rows.length} baris, sedangkan database memiliki ${activeCount} record aktif. Record yang tidak ada di file tidak akan diubah.` });
  }

  return { mode, presentFields: file.presentFields, fileIssues, rows, summary };
}
