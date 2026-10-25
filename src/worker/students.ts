// Akses tabel mahasiswa dan pembentukan pernyataan tulis yang dipakai bersama oleh
// impor, penyuntingan, dan pembatalan perubahan.
import { EDITABLE_FIELDS, type EditableField, type StudentValues } from '../shared/columns';
import { arrivalYear, normalizeGender } from '../shared/normalize';
import type { ExistingStudent } from '../shared/plan';

export interface StudentRow extends Record<EditableField, string | null> {
  id: number;
  student_code: string;
  record_status: 'active' | 'inactive';
  inactive_reason: string | null;
  inactive_note: string | null;
  row_version: number;
  last_change_set_id: number;
  created_at: string;
  updated_at: string;
}

const FIELD_LIST = EDITABLE_FIELDS.join(', ');

export function pickValues(row: StudentRow): StudentValues {
  const v: StudentValues = {};
  for (const f of EDITABLE_FIELDS) v[f] = row[f] ?? null;
  return v;
}

export async function loadAllForMatching(db: D1Database): Promise<ExistingStudent[]> {
  const { results } = await db
    .prepare(`SELECT id, student_code, record_status, ${FIELD_LIST} FROM students`)
    .all<StudentRow>();
  return results.map((r) => ({ id: r.id, student_code: r.student_code, record_status: r.record_status, values: pickValues(r) }));
}

export async function currentVersion(db: D1Database): Promise<number> {
  const row = await db.prepare('SELECT version FROM dataset_state WHERE id = 1').first<{ version: number }>();
  return row?.version ?? 0;
}

/**
 * Penjaga konkurensi: menaikkan versi hanya jika versi masih sama dengan versi dasar.
 * Jika tidak sama, kolom NOT NULL menerima NULL sehingga seluruh batch dibatalkan.
 */
export function versionGuard(db: D1Database, base: number, next: number, at: string): D1PreparedStatement {
  return db
    .prepare('UPDATE dataset_state SET version = CASE WHEN version = ? THEN ? ELSE NULL END, updated_at = ? WHERE id = 1')
    .bind(base, next, at);
}

export function isVersionConflict(e: unknown): boolean {
  return String((e as Error)?.message ?? e).includes('dataset_state.version');
}

function derived(values: StudentValues): { gender_code?: string | null; arrival_year?: number | null } {
  const out: { gender_code?: string | null; arrival_year?: number | null } = {};
  if ('gender' in values) out.gender_code = normalizeGender(values.gender ?? null);
  if ('arrival_date' in values) out.arrival_year = values.arrival_date ? arrivalYear(values.arrival_date) : null;
  return out;
}

export function insertStudentStatement(db: D1Database, code: string, values: StudentValues, changeSetId: number, at: string): D1PreparedStatement {
  const full: StudentValues = {};
  for (const f of EDITABLE_FIELDS) full[f] = values[f] ?? null;
  const d = derived({ gender: full.gender, arrival_date: full.arrival_date });
  const cols = [...EDITABLE_FIELDS, 'gender_code', 'arrival_year'];
  const params = [...EDITABLE_FIELDS.map((f) => full[f] ?? null), d.gender_code ?? null, d.arrival_year ?? null];
  return db
    .prepare(
      `INSERT INTO students (student_code, ${cols.join(', ')}, created_change_set_id, last_change_set_id, created_at, updated_at)
       VALUES (?, ${cols.map(() => '?').join(', ')}, ?, ?, ?, ?)`,
    )
    .bind(code, ...params, changeSetId, changeSetId, at, at);
}

export function updateStudentStatement(
  db: D1Database,
  code: string,
  changes: StudentValues,
  changeSetId: number,
  at: string,
  extra: Record<string, string | number | null> = {},
): D1PreparedStatement {
  const sets: Record<string, string | number | null> = {};
  for (const [k, v] of Object.entries(changes)) sets[k] = v ?? null;
  Object.assign(sets, derived(changes), extra);
  const keys = Object.keys(sets);
  const assignments = keys.map((k) => `${k} = ?`);
  return db
    .prepare(
      `UPDATE students SET ${[...assignments, 'row_version = row_version + 1', 'last_change_set_id = ?', 'updated_at = ?'].join(', ')}
       WHERE student_code = ?`,
    )
    .bind(...keys.map((k) => sets[k]), changeSetId, at, code);
}

export function revisionStatement(
  db: D1Database,
  changeSetId: number,
  code: string,
  op: 'create' | 'update' | 'status',
  before: Record<string, unknown> | null,
  after: Record<string, unknown>,
): D1PreparedStatement {
  return db
    .prepare(
      `INSERT INTO student_revisions (change_set_id, student_id, op, before_json, after_json)
       VALUES (?, (SELECT id FROM students WHERE student_code = ?), ?, ?, ?)`,
    )
    .bind(changeSetId, code, op, before ? JSON.stringify(before) : null, JSON.stringify(after));
}

export function changeSetStatement(
  db: D1Database,
  id: number,
  kind: string,
  actor: string,
  at: string,
  summary: Record<string, unknown>,
  opts: { importJobId?: number; revertsId?: number; reason?: string | null } = {},
): D1PreparedStatement {
  return db
    .prepare(
      `INSERT INTO change_sets (id, kind, actor_email, created_at, import_job_id, reverts_change_set_id, summary_json, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, kind, actor, at, opts.importJobId ?? null, opts.revertsId ?? null, JSON.stringify(summary), opts.reason ?? null);
}
