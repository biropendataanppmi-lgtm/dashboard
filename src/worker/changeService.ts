// Penyuntingan, penonaktifan, dan pembatalan perubahan (§3.6B, §3.6C, §3.6E; Jawaban H1).
// Setiap tindakan menjadi satu paket perubahan dengan versi dataset baru.
import { DEACTIVATION_REASONS, EDITABLE_FIELDS, type DeactivationReason, type EditableField, type StudentValues } from '../shared/columns';
import { cleanText } from '../shared/normalize';
import { validateCsvText, type Issue } from '../shared/validation';
import { COLUMNS } from '../shared/columns';
import { logStatement, nowIso } from './log';
import { changeSetStatement, currentVersion, isVersionConflict, pickValues, revisionStatement, updateStudentStatement, versionGuard, type StudentRow } from './students';

export class ChangeError extends Error {
  constructor(
    public status: 400 | 404 | 409 | 500,
    message: string,
    public issues: Issue[] = [],
  ) {
    super(message);
  }
}

async function runGuarded(db: D1Database, stmts: D1PreparedStatement[]): Promise<void> {
  try {
    await db.batch(stmts);
  } catch (e) {
    if (isVersionConflict(e)) throw new ChangeError(409, 'Data berubah oleh tindakan lain pada saat yang sama. Muat ulang lalu coba lagi.');
    throw new ChangeError(500, 'Perubahan gagal disimpan. Tidak ada data yang berubah.');
  }
}

async function loadStudent(db: D1Database, code: string): Promise<StudentRow> {
  const row = await db.prepare('SELECT * FROM students WHERE student_code = ?').bind(code).first<StudentRow>();
  if (!row) throw new ChangeError(404, 'Record mahasiswa tidak ditemukan.');
  return row;
}

/** Validasi suntingan memakai aturan yang sama dengan impor CSV agar tidak ada dua sumber aturan. */
function validateEdit(code: string, values: StudentValues): { issues: Issue[]; values: StudentValues } {
  const headers = COLUMNS.map((c) => c.header);
  const cells = COLUMNS.map((c) => (c.field === 'student_code' ? code : values[c.field as EditableField] ?? ''));
  const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const text = headers.join(',') + '\n' + cells.map(esc).join(',');
  const res = validateCsvText(text);
  // Nilai hasil normalisasi (ejaan baku kategori, perbaikan tahun) dipakai untuk penyimpanan.
  return { issues: [...res.fileIssues, ...(res.rows[0]?.issues ?? [])], values: { ...values, ...(res.rows[0]?.values ?? {}) } };
}

export async function editStudent(
  db: D1Database,
  actor: string,
  code: string,
  expectedRowVersion: number,
  input: Partial<Record<EditableField, string | null>>,
  reason: string | null,
): Promise<{ version: number; changedFields: EditableField[] }> {
  const row = await loadStudent(db, code);
  if (row.row_version !== expectedRowVersion) {
    throw new ChangeError(409, 'Record ini sudah diubah oleh administrator lain sejak dibuka. Muat ulang untuk melihat data terbaru.');
  }
  const prev = pickValues(row);
  const merged: StudentValues = { ...prev };
  for (const f of EDITABLE_FIELDS) if (f in input) merged[f] = cleanText(input[f] ?? null);

  const checked = validateEdit(code, merged);
  Object.assign(merged, checked.values);
  const issues = checked.issues;
  const errors = issues.filter((i) => i.severity === 'error');
  if (errors.length) throw new ChangeError(400, 'Data tidak valid.', errors);

  const changes: StudentValues = {};
  const beforeChanged: Record<string, unknown> = {};
  for (const f of EDITABLE_FIELDS) {
    if ((merged[f] ?? null) !== (prev[f] ?? null)) {
      changes[f] = merged[f] ?? null;
      beforeChanged[f] = prev[f] ?? null;
    }
  }
  const changedFields = Object.keys(changes) as EditableField[];
  if (changedFields.length === 0) return { version: await currentVersion(db), changedFields };

  const version = await currentVersion(db);
  const next = version + 1;
  const at = nowIso();
  const labels = changedFields.map((f) => COLUMNS.find((c) => c.field === f)!.label).join(', ');
  await runGuarded(db, [
    versionGuard(db, version, next, at),
    changeSetStatement(db, next, 'edit', actor, at, { student: code, fields: changedFields }, { reason }),
    updateStudentStatement(db, code, changes, next, at),
    revisionStatement(db, next, code, 'update', beforeChanged, changes),
    // Ringkasan log hanya menyebut nama kolom, bukan nilainya (§3.6B).
    logStatement(db, { actor, action: 'sunting_record', status: 'success', summary: `Record ${code} disunting: ${labels}.`, reason, target: `mahasiswa:${code}`, versionBefore: version, versionAfter: next }),
  ]);
  return { version: next, changedFields };
}

export async function setStudentStatus(
  db: D1Database,
  actor: string,
  code: string,
  active: boolean,
  reasonCode: DeactivationReason | null,
  note: string | null,
): Promise<{ version: number }> {
  const row = await loadStudent(db, code);
  if (active && row.record_status === 'active') throw new ChangeError(409, 'Record sudah aktif.');
  if (!active && row.record_status === 'inactive') throw new ChangeError(409, 'Record sudah nonaktif.');
  const cleanNote = cleanText(note);
  if (!active) {
    if (!reasonCode || !(reasonCode in DEACTIVATION_REASONS)) throw new ChangeError(400, 'Pilih alasan penonaktifan.');
    if (reasonCode === 'lainnya' && !cleanNote) throw new ChangeError(400, 'Tuliskan keterangan untuk alasan "Lainnya".');
  } else if (!cleanNote) {
    throw new ChangeError(400, 'Tuliskan alasan pengaktifan kembali.');
  }

  const version = await currentVersion(db);
  const next = version + 1;
  const at = nowIso();
  const before = { record_status: row.record_status, inactive_reason: row.inactive_reason, inactive_note: row.inactive_note };
  const after = active
    ? { record_status: 'active', inactive_reason: null, inactive_note: null }
    : { record_status: 'inactive', inactive_reason: reasonCode, inactive_note: cleanNote };
  const reasonText = active ? cleanNote : `${DEACTIVATION_REASONS[reasonCode!]}${cleanNote ? ` — ${cleanNote}` : ''}`;
  await runGuarded(db, [
    versionGuard(db, version, next, at),
    changeSetStatement(db, next, active ? 'reactivate' : 'deactivate', actor, at, { student: code }, { reason: reasonText }),
    updateStudentStatement(db, code, {}, next, at, after),
    revisionStatement(db, next, code, 'status', before, after),
    logStatement(db, {
      actor,
      action: active ? 'aktifkan_record' : 'nonaktifkan_record',
      status: 'success',
      summary: `Record ${code} ${active ? 'diaktifkan kembali' : 'dinonaktifkan'}.`,
      reason: reasonText,
      target: `mahasiswa:${code}`,
      versionBefore: version,
      versionAfter: next,
    }),
  ]);
  return { version: next };
}

interface RevisionRow {
  id: number;
  student_id: number;
  op: 'create' | 'update' | 'status';
  before_json: string | null;
  after_json: string;
  student_code: string;
  last_change_set_id: number;
  record_status: string;
}

export interface RevertPlan {
  changeSetId: number;
  kind: string;
  createdAt: string;
  actor: string;
  total: number;
  applicable: number;
  /** Record yang sudah diubah lagi setelah perubahan ini: dilewati agar perubahan yang lebih baru tidak hilang. */
  conflicts: { studentCode: string; laterChangeSetId: number }[];
  effects: { deactivate: number; restoreValues: number; restoreStatus: number };
}

const REVERTIBLE = new Set(['import', 'edit', 'deactivate', 'reactivate']);

async function loadRevertContext(db: D1Database, changeSetId: number) {
  const cs = await db.prepare('SELECT * FROM change_sets WHERE id = ?').bind(changeSetId).first<Record<string, any>>();
  if (!cs) throw new ChangeError(404, 'Perubahan tidak ditemukan.');
  if (!REVERTIBLE.has(cs.kind)) throw new ChangeError(400, 'Jenis perubahan ini tidak dapat dibatalkan.');
  if (cs.reverted_by_change_set_id) throw new ChangeError(409, `Perubahan ini sudah dibatalkan oleh perubahan #${cs.reverted_by_change_set_id}.`);
  const { results } = await db
    .prepare(
      `SELECT r.id, r.student_id, r.op, r.before_json, r.after_json, s.student_code, s.last_change_set_id, s.record_status
       FROM student_revisions r JOIN students s ON s.id = r.student_id WHERE r.change_set_id = ? ORDER BY r.id`,
    )
    .bind(changeSetId)
    .all<RevisionRow>();
  return { cs, revisions: results };
}

export async function planRevert(db: D1Database, changeSetId: number): Promise<RevertPlan> {
  const { cs, revisions } = await loadRevertContext(db, changeSetId);
  const conflicts = revisions.filter((r) => r.last_change_set_id !== changeSetId).map((r) => ({ studentCode: r.student_code, laterChangeSetId: r.last_change_set_id }));
  const ok = revisions.filter((r) => r.last_change_set_id === changeSetId);
  return {
    changeSetId,
    kind: cs.kind,
    createdAt: cs.created_at,
    actor: cs.actor_email,
    total: revisions.length,
    applicable: ok.length,
    conflicts,
    effects: {
      deactivate: ok.filter((r) => r.op === 'create').length,
      restoreValues: ok.filter((r) => r.op === 'update').length,
      restoreStatus: ok.filter((r) => r.op === 'status').length,
    },
  };
}

export async function applyRevert(db: D1Database, actor: string, changeSetId: number, reason: string | null): Promise<{ version: number; reverted: number; skipped: number }> {
  const cleanReason = cleanText(reason);
  if (!cleanReason) throw new ChangeError(400, 'Tuliskan alasan pembatalan.');
  const { cs, revisions } = await loadRevertContext(db, changeSetId);
  const ok = revisions.filter((r) => r.last_change_set_id === changeSetId);
  const skipped = revisions.length - ok.length;
  if (ok.length === 0) throw new ChangeError(409, 'Semua record dalam perubahan ini sudah diubah lagi setelahnya. Tidak ada yang dapat dibatalkan otomatis.');

  const version = await currentVersion(db);
  const next = version + 1;
  const at = nowIso();
  const body: D1PreparedStatement[] = [];
  for (const r of ok) {
    if (r.op === 'create') {
      // Record hasil impor dinonaktifkan, tidak dihapus: ID tetap tercatat dan tidak dipakai ulang.
      const before = { record_status: r.record_status, inactive_reason: null, inactive_note: null };
      const after = { record_status: 'inactive', inactive_reason: 'pembatalan_impor', inactive_note: `Pembatalan perubahan #${changeSetId}` };
      body.push(updateStudentStatement(db, r.student_code, {}, next, at, after));
      body.push(revisionStatement(db, next, r.student_code, 'status', before, after));
    } else if (r.op === 'update') {
      const before = JSON.parse(r.before_json ?? '{}') as StudentValues;
      const after = JSON.parse(r.after_json) as StudentValues;
      body.push(updateStudentStatement(db, r.student_code, before, next, at));
      body.push(revisionStatement(db, next, r.student_code, 'update', after, before));
    } else {
      const before = JSON.parse(r.before_json ?? '{}') as Record<string, string | null>;
      const after = JSON.parse(r.after_json) as Record<string, string | null>;
      body.push(updateStudentStatement(db, r.student_code, {}, next, at, before));
      body.push(revisionStatement(db, next, r.student_code, 'status', after, before));
    }
  }
  await runGuarded(db, [
    versionGuard(db, version, next, at),
    changeSetStatement(db, next, 'revert', actor, at, { reverted: ok.length, skipped, of: cs.kind }, { revertsId: changeSetId, reason: cleanReason }),
    ...body,
    db.prepare('UPDATE change_sets SET reverted_by_change_set_id = ? WHERE id = ? AND reverted_by_change_set_id IS NULL').bind(next, changeSetId),
    logStatement(db, {
      actor,
      action: 'pembatalan_perubahan',
      status: 'success',
      summary: `Perubahan #${changeSetId} (${cs.kind}) dibatalkan untuk ${ok.length} record${skipped ? `; ${skipped} record dilewati karena sudah diubah lagi` : ''}.`,
      reason: cleanReason,
      target: `perubahan:${changeSetId}`,
      versionBefore: version,
      versionAfter: next,
    }),
  ]);
  return { version: next, reverted: ok.length, skipped };
}
