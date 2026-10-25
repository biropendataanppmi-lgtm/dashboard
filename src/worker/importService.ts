// Alur impor CSV (§3.6A): unggah → validasi → preview → konfirmasi → penerapan atomik → log.
import { COLUMN_BY_FIELD, IMPORT_LIMITS, type EditableField, type ImportMode, type StudentValues } from '../shared/columns';
import { planImport, type PlanSummary } from '../shared/plan';
import { validateCsvText, type Issue } from '../shared/validation';
import { logStatement, nowIso, writeLog } from './log';
import {
  changeSetStatement,
  currentVersion,
  insertStudentStatement,
  isVersionConflict,
  loadAllForMatching,
  pickValues,
  revisionStatement,
  updateStudentStatement,
  versionGuard,
  type StudentRow,
} from './students';

export class ImportError extends Error {
  constructor(
    public status: 400 | 404 | 409 | 413 | 500,
    message: string,
  ) {
    super(message);
  }
}

export interface PreviewRow {
  rowNumber: number;
  studentCode: string | null;
  name: string | null;
  action: string;
  changedColumns: string[];
  clearedColumns: string[];
  issues: Issue[];
}

export interface PreviewResult {
  jobId: number;
  fileName: string;
  mode: ImportMode;
  status: string;
  baseVersion: number;
  createdAt: string;
  expiresAt: string;
  summary: PlanSummary;
  fileIssues: Issue[];
  needsWarningConfirmation: boolean;
  rows: PreviewRow[];
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function addHours(iso: string, hours: number): string {
  return new Date(Date.parse(iso) + hours * 3600_000).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/** Membersihkan preview yang kedaluwarsa beserta data staging-nya. */
export async function expireStaleJobs(db: D1Database): Promise<void> {
  const at = nowIso();
  await db.batch([
    db.prepare(`DELETE FROM import_staging WHERE job_id IN (SELECT id FROM import_jobs WHERE status = 'previewed' AND expires_at < ?)`).bind(at),
    db.prepare(`UPDATE import_jobs SET status = 'expired', finished_at = ? WHERE status = 'previewed' AND expires_at < ?`).bind(at, at),
  ]);
}

export async function createPreview(db: D1Database, actor: string, fileName: string, text: string, mode: ImportMode): Promise<PreviewResult> {
  if (new TextEncoder().encode(text).length > IMPORT_LIMITS.maxBytes) {
    throw new ImportError(413, `Ukuran file melebihi batas ${IMPORT_LIMITS.maxBytes / 1024 / 1024} MB.`);
  }
  await expireStaleJobs(db);

  const validated = validateCsvText(text);
  if (validated.rows.length > IMPORT_LIMITS.maxRows) {
    throw new ImportError(413, `File berisi ${validated.rows.length} baris; batas per impor adalah ${IMPORT_LIMITS.maxRows}.`);
  }
  const [existing, version, active] = await Promise.all([
    loadAllForMatching(db),
    currentVersion(db),
    db.prepare(`SELECT COUNT(*) AS n FROM students WHERE record_status = 'active'`).first<{ n: number }>(),
  ]);
  const plan = planImport(validated, mode, existing, active?.n ?? 0);
  const sha = await sha256Hex(text);
  const previous = await db
    .prepare(`SELECT id, finished_at FROM import_jobs WHERE file_sha256 = ? AND status = 'applied' ORDER BY id DESC LIMIT 1`)
    .bind(sha)
    .first<{ id: number; finished_at: string }>();
  if (previous) {
    plan.fileIssues.push({ severity: 'warning', code: 'file_sudah_diterapkan', message: `File yang sama persis sudah pernah diterapkan (impor #${previous.id}).` });
  }

  const createdAt = nowIso();
  const expiresAt = addHours(createdAt, IMPORT_LIMITS.previewTtlHours);
  const fileFatal = plan.fileIssues.some((i) => i.severity === 'error');
  const job = await db
    .prepare(
      `INSERT INTO import_jobs (file_name, file_sha256, mode, status, base_version, actor_email, created_at, expires_at, summary_json, file_issues_json, present_fields_json, finished_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    )
    .bind(
      fileName.slice(0, 200),
      sha,
      mode,
      fileFatal ? 'failed' : 'previewed',
      version,
      actor,
      createdAt,
      expiresAt,
      JSON.stringify(plan.summary),
      JSON.stringify(plan.fileIssues),
      JSON.stringify(plan.presentFields),
      fileFatal ? createdAt : null,
    )
    .first<{ id: number }>();
  const jobId = job!.id;

  const stmts: D1PreparedStatement[] = [];
  for (const r of plan.rows) {
    if (!fileFatal) {
      stmts.push(
        db
          .prepare(
            `INSERT INTO import_staging (job_id, row_number, student_code, action, has_warning, changes_json, issues_json) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(jobId, r.rowNumber, r.studentCode, r.action, r.issues.some((i) => i.severity === 'warning') ? 1 : 0, JSON.stringify(r.changes), JSON.stringify(r.issues)),
      );
    }
    // Baris yang ditahan dicatat sebagai baris bermasalah, tanpa data pribadi.
    if (r.action === 'held') {
      for (const issue of r.issues.filter((i) => i.severity === 'error')) {
        stmts.push(
          db
            .prepare(
              `INSERT INTO import_row_issues (job_id, row_number, student_code, issue_code, column_name, message, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            )
            .bind(jobId, r.rowNumber, r.studentCode, issue.code, issue.column ?? null, issue.message, createdAt, createdAt),
        );
      }
    }
  }
  const s = plan.summary;
  stmts.push(
    logStatement(db, {
      actor,
      action: 'impor_validasi',
      status: fileFatal ? 'failure' : 'success',
      summary: fileFatal
        ? `Impor #${jobId} (${mode}) ditolak: struktur file tidak valid.`
        : `Impor #${jobId} (${mode}): ${s.rowsRead} baris dibaca, ${s.create} baru, ${s.update} diperbarui, ${s.unchanged} tidak berubah, ${s.held} ditahan, ${s.withWarnings} dengan peringatan.`,
      target: `impor:${jobId}`,
      versionBefore: version,
    }),
  );
  await db.batch(stmts);
  return getPreview(db, jobId);
}

export async function getPreview(db: D1Database, jobId: number): Promise<PreviewResult> {
  const job = await db.prepare('SELECT * FROM import_jobs WHERE id = ?').bind(jobId).first<Record<string, any>>();
  if (!job) throw new ImportError(404, 'Impor tidak ditemukan.');
  const { results } = await db
    .prepare('SELECT row_number, student_code, action, changes_json, issues_json FROM import_staging WHERE job_id = ? ORDER BY row_number')
    .bind(jobId)
    .all<{ row_number: number; student_code: string | null; action: string; changes_json: string; issues_json: string }>();

  // Nama ditampilkan untuk membantu peninjauan; kolom pribadi lain tidak dikirim.
  const codes = results.filter((r) => r.action !== 'create' && r.student_code).map((r) => r.student_code!);
  const names = new Map<string, string>();
  for (let i = 0; i < codes.length; i += 90) {
    const chunk = codes.slice(i, i + 90);
    const { results: rs } = await db
      .prepare(`SELECT student_code, name_latin FROM students WHERE student_code IN (${chunk.map(() => '?').join(',')})`)
      .bind(...chunk)
      .all<{ student_code: string; name_latin: string }>();
    for (const r of rs) names.set(r.student_code, r.name_latin);
  }

  const summary = JSON.parse(job.summary_json) as PlanSummary;
  const fileIssues = JSON.parse(job.file_issues_json) as Issue[];
  const rows: PreviewRow[] = results.map((r) => {
    const changes = JSON.parse(r.changes_json) as StudentValues;
    const issues = JSON.parse(r.issues_json) as Issue[];
    const header = (f: string) => COLUMN_BY_FIELD.get(f as EditableField)?.header ?? f;
    return {
      rowNumber: r.row_number,
      studentCode: r.student_code,
      name: changes.name_latin ?? (r.student_code ? names.get(r.student_code) ?? null : null),
      action: r.action,
      changedColumns: r.action === 'update' ? Object.keys(changes).map(header) : [],
      clearedColumns: r.action === 'update' ? Object.entries(changes).filter(([, v]) => v == null).map(([k]) => header(k)) : [],
      issues,
    };
  });
  return {
    jobId,
    fileName: job.file_name,
    mode: job.mode,
    status: job.status,
    baseVersion: job.base_version,
    createdAt: job.created_at,
    expiresAt: job.expires_at,
    summary,
    fileIssues,
    needsWarningConfirmation: fileIssues.some((i) => i.severity === 'warning') || summary.withWarnings > 0,
    rows,
  };
}

export interface ApplyOptions {
  /** Admin telah meninjau dan mengonfirmasi peringatan. */
  confirmWarnings: boolean;
  /** false = baris dengan peringatan dilewati; hanya baris valid yang diterapkan. */
  includeWarningRows: boolean;
}

export interface ApplyResult {
  jobId: number;
  version: number;
  created: number;
  updated: number;
  skippedWarningRows: number;
}

export async function applyImport(db: D1Database, actor: string, jobId: number, opts: ApplyOptions): Promise<ApplyResult> {
  await expireStaleJobs(db);
  const job = await db.prepare('SELECT * FROM import_jobs WHERE id = ?').bind(jobId).first<Record<string, any>>();
  if (!job) throw new ImportError(404, 'Impor tidak ditemukan.');
  if (job.status !== 'previewed') throw new ImportError(409, `Impor ini berstatus "${job.status}" dan tidak dapat diterapkan.`);

  const summary = JSON.parse(job.summary_json) as PlanSummary;
  const fileIssues = JSON.parse(job.file_issues_json) as Issue[];
  const needsConfirm = fileIssues.some((i) => i.severity === 'warning') || summary.withWarnings > 0;
  if (needsConfirm && !opts.confirmWarnings) throw new ImportError(400, 'Peringatan harus ditinjau dan dikonfirmasi sebelum penerapan.');

  const version = await currentVersion(db);
  if (version !== job.base_version) {
    throw new ImportError(409, 'Data telah berubah sejak preview dibuat (ada impor atau suntingan lain). Validasi ulang file sebelum menerapkan.');
  }

  const { results: staged } = await db
    .prepare(`SELECT row_number, student_code, action, has_warning, changes_json FROM import_staging WHERE job_id = ? AND action IN ('create', 'update') ORDER BY row_number`)
    .bind(jobId)
    .all<{ row_number: number; student_code: string; action: 'create' | 'update'; has_warning: number; changes_json: string }>();
  const toApply = staged.filter((r) => opts.includeWarningRows || r.has_warning === 0);
  const skippedWarningRows = staged.length - toApply.length;

  // Nilai sebelum perubahan untuk revisi. Konsisten karena penjaga versi membatalkan batch bila ada penulisan lain.
  const updateCodes = toApply.filter((r) => r.action === 'update').map((r) => r.student_code);
  const before = new Map<string, StudentRow>();
  for (let i = 0; i < updateCodes.length; i += 90) {
    const chunk = updateCodes.slice(i, i + 90);
    const { results } = await db.prepare(`SELECT * FROM students WHERE student_code IN (${chunk.map(() => '?').join(',')})`).bind(...chunk).all<StudentRow>();
    for (const r of results) before.set(r.student_code, r);
  }

  const at = nowIso();
  const next = version + 1;
  let created = 0;
  let updated = 0;
  const stmts: D1PreparedStatement[] = [versionGuard(db, version, next, at)];
  const body: D1PreparedStatement[] = [];
  for (const r of toApply) {
    const changes = JSON.parse(r.changes_json) as StudentValues;
    if (r.action === 'create') {
      body.push(insertStudentStatement(db, r.student_code, changes, next, at));
      body.push(revisionStatement(db, next, r.student_code, 'create', null, changes));
      created++;
    } else {
      const prev = before.get(r.student_code);
      if (!prev) throw new ImportError(409, 'Data telah berubah sejak preview dibuat. Validasi ulang file.');
      const prevValues = pickValues(prev);
      const beforeChanged: Record<string, unknown> = {};
      for (const k of Object.keys(changes)) beforeChanged[k] = prevValues[k as EditableField] ?? null;
      body.push(updateStudentStatement(db, r.student_code, changes, next, at));
      body.push(revisionStatement(db, next, r.student_code, 'update', beforeChanged, changes));
      updated++;
    }
  }
  const csSummary = { created, updated, skippedWarningRows, rowsRead: summary.rowsRead, held: summary.held, unchanged: summary.unchanged };
  stmts.push(changeSetStatement(db, next, 'import', actor, at, csSummary, { importJobId: jobId }));
  stmts.push(...body);
  stmts.push(db.prepare(`UPDATE import_jobs SET status = 'applied', finished_at = ?, change_set_id = ? WHERE id = ? AND status = 'previewed'`).bind(at, next, jobId));
  stmts.push(db.prepare('DELETE FROM import_staging WHERE job_id = ?').bind(jobId));
  stmts.push(
    logStatement(db, {
      actor,
      action: 'impor_terapkan',
      status: 'success',
      summary: `Impor #${jobId} diterapkan: ${created} record baru, ${updated} diperbarui${skippedWarningRows ? `, ${skippedWarningRows} baris berperingatan dilewati` : ''}.`,
      target: `impor:${jobId}`,
      versionBefore: version,
      versionAfter: next,
    }),
  );

  try {
    // Satu batch D1 = satu transaksi: gagal satu pernyataan, semuanya dibatalkan (§3.6A ketentuan transaksi).
    await db.batch(stmts);
  } catch (e) {
    const conflict = isVersionConflict(e);
    await db.batch([
      db.prepare(`UPDATE import_jobs SET status = 'failed', finished_at = ? WHERE id = ? AND status = 'previewed'`).bind(nowIso(), jobId),
      db.prepare('DELETE FROM import_staging WHERE job_id = ?').bind(jobId),
      logStatement(db, {
        actor,
        action: 'impor_terapkan',
        status: 'failure',
        summary: conflict
          ? `Impor #${jobId} gagal: data berubah selama penerapan. Tidak ada perubahan yang disimpan.`
          : `Impor #${jobId} gagal diterapkan. Tidak ada perubahan yang disimpan.`,
        target: `impor:${jobId}`,
        versionBefore: version,
      }),
    ]);
    throw new ImportError(
      conflict ? 409 : 500,
      conflict
        ? 'Data berubah selama penerapan. Tidak ada perubahan yang disimpan; validasi ulang file.'
        : 'Penerapan gagal di database. Tidak ada perubahan yang disimpan; dataset aktif tetap seperti sebelumnya.',
    );
  }
  return { jobId, version: next, created, updated, skippedWarningRows };
}

export async function cancelImport(db: D1Database, actor: string, jobId: number): Promise<void> {
  const at = nowIso();
  const res = await db.batch([
    db.prepare(`UPDATE import_jobs SET status = 'cancelled', finished_at = ? WHERE id = ? AND status = 'previewed'`).bind(at, jobId),
    db.prepare(`DELETE FROM import_staging WHERE job_id = ? AND EXISTS (SELECT 1 FROM import_jobs WHERE id = ? AND status = 'cancelled')`).bind(jobId, jobId),
  ]);
  if ((res[0].meta.changes ?? 0) === 0) throw new ImportError(409, 'Impor ini tidak sedang menunggu konfirmasi.');
  await writeLog(db, { actor, action: 'impor_batal', status: 'success', summary: `Preview impor #${jobId} dibatalkan oleh administrator.`, target: `impor:${jobId}` });
}
