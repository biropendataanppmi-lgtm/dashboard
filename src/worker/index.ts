// Titik masuk Worker: API di /api/*, selebihnya aset frontend (SPA).
import { Hono } from 'hono';
import { DEACTIVATION_REASONS, EDITABLE_FIELDS, IMPORT_MODES, LIST_FIELDS, type DeactivationReason, type EditableField, type ImportMode } from '../shared/columns';
import { AuthError, authenticate, requireAdmin } from './auth';
import { ChangeError, applyRevert, editStudent, planRevert, setStudentStatus } from './changeService';
import type { AppEnv } from './env';
import { ImportError, applyImport, cancelImport, createPreview, getPreview } from './importService';
import { nowIso, writeLog } from './log';
import { datasetMeta, filterOptions, overview, parseFilters } from './stats';

const app = new Hono<AppEnv>();

app.onError((err, c) => {
  if (err instanceof ImportError) return c.json({ error: err.message }, err.status);
  if (err instanceof ChangeError) return c.json({ error: err.message, issues: err.issues }, err.status);
  console.error('Kesalahan tak terduga', err instanceof Error ? err.message : err);
  return c.json({ error: 'Terjadi kesalahan di server. Coba lagi; jika berulang, periksa log Worker.' }, 500);
});

// Sesi: dipanggil frontend saat memuat aplikasi. Mencatat login sekali per token sesi.
app.get('/api/me', async (c) => {
  try {
    const user = await authenticate(c.req.raw, c.env);
    const target = user.sessionIssuedAt ? `sesi:${user.sessionIssuedAt}` : 'sesi:simulasi';
    const seen = await c.env.DB.prepare(`SELECT 1 FROM activity_logs WHERE action = 'login' AND actor_email = ? AND target = ? LIMIT 1`).bind(user.email, target).first();
    if (!seen) {
      await writeLog(c.env.DB, { actor: user.email, action: 'login', status: 'success', summary: user.simulated ? 'Login simulasi (pengembangan lokal).' : 'Login melalui Cloudflare Access.', target });
    }
    return c.json({ email: user.email, displayName: user.displayName, simulated: user.simulated, sessionIssuedAt: user.sessionIssuedAt });
  } catch (e) {
    if (e instanceof AuthError) {
      if (e.status === 403 && e.email) {
        await writeLog(c.env.DB, { actor: e.email, action: 'login_ditolak', status: 'denied', summary: 'Akun terautentikasi tetapi tidak ada di allowlist.' });
      }
      return c.json({ error: e.message }, e.status);
    }
    throw e;
  }
});

const api = new Hono<AppEnv>();
api.use('*', requireAdmin);

// ---------- Analitik (agregat saja) ----------
api.get('/stats/meta', async (c) => c.json({ meta: await datasetMeta(c.env.DB), options: await filterOptions(c.env.DB) }));
api.get('/stats/overview', async (c) => {
  const filters = parseFilters(c.req.query());
  return c.json({ meta: await datasetMeta(c.env.DB), filters, data: await overview(c.env.DB, filters) });
});

// ---------- Impor CSV ----------
api.post('/imports', async (c) => {
  const form = await c.req.formData();
  const file = form.get('file');
  const mode = String(form.get('mode') ?? '') as ImportMode;
  if (!(file instanceof File)) return c.json({ error: 'Pilih file CSV terlebih dahulu.' }, 400);
  if (!IMPORT_MODES.includes(mode)) return c.json({ error: 'Pilih mode impor.' }, 400);
  if (!/\.csv$/i.test(file.name)) return c.json({ error: 'File harus berekstensi .csv.' }, 400);
  const bytes = new Uint8Array(await file.arrayBuffer());
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes);
  } catch {
    return c.json({ error: 'File bukan teks UTF-8. Simpan ulang sebagai "CSV UTF-8".' }, 400);
  }
  const preview = await createPreview(c.env.DB, c.get('user').email, file.name, text, mode);
  return c.json(preview, 201);
});
api.get('/imports', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT id, file_name, mode, status, actor_email, created_at, finished_at, summary_json, change_set_id FROM import_jobs ORDER BY id DESC LIMIT 50`,
  ).all<Record<string, any>>();
  return c.json(results.map((r) => ({ ...r, summary: JSON.parse(r.summary_json), summary_json: undefined })));
});
api.get('/imports/:id', async (c) => c.json(await getPreview(c.env.DB, Number(c.req.param('id')))));
api.post('/imports/:id/apply', async (c) => {
  const body = await c.req.json<{ confirmWarnings?: boolean; includeWarningRows?: boolean }>().catch(() => ({}) as any);
  const res = await applyImport(c.env.DB, c.get('user').email, Number(c.req.param('id')), {
    confirmWarnings: body.confirmWarnings === true,
    includeWarningRows: body.includeWarningRows !== false,
  });
  return c.json(res);
});
api.post('/imports/:id/cancel', async (c) => {
  await cancelImport(c.env.DB, c.get('user').email, Number(c.req.param('id')));
  return c.json({ ok: true });
});

// ---------- Baris bermasalah ----------
api.get('/row-issues', async (c) => {
  const status = c.req.query('status');
  const params: string[] = [];
  let where = '1 = 1';
  if (status) {
    where = 'i.review_status = ?';
    params.push(status);
  }
  const { results } = await c.env.DB.prepare(
    `SELECT i.id, i.job_id, i.row_number, i.student_code, i.issue_code, i.column_name, i.message, i.review_status, i.created_at, j.actor_email, j.file_name
     FROM import_row_issues i JOIN import_jobs j ON j.id = i.job_id WHERE ${where} ORDER BY i.id DESC LIMIT 500`,
  )
    .bind(...params)
    .all();
  return c.json(results);
});
api.patch('/row-issues/:id', async (c) => {
  const { status } = await c.req.json<{ status: string }>();
  if (!['belum_ditinjau', 'perlu_perbaikan', 'selesai'].includes(status)) return c.json({ error: 'Status tidak dikenal.' }, 400);
  const id = Number(c.req.param('id'));
  const res = await c.env.DB.prepare('UPDATE import_row_issues SET review_status = ?, updated_at = ? WHERE id = ?').bind(status, nowIso(), id).run();
  if (!res.meta.changes) return c.json({ error: 'Baris tidak ditemukan.' }, 404);
  await writeLog(c.env.DB, { actor: c.get('user').email, action: 'status_baris_bermasalah', status: 'success', summary: `Status baris bermasalah #${id} menjadi ${status}.`, target: `baris:${id}` });
  return c.json({ ok: true });
});

// ---------- Data mahasiswa ----------
api.get('/students', async (c) => {
  const q = (c.req.query('q') ?? '').trim();
  const status = c.req.query('status') === 'inactive' ? 'inactive' : c.req.query('status') === 'all' ? 'all' : 'active';
  const page = Math.max(1, Number(c.req.query('page') ?? 1) || 1);
  const pageSize = 50;
  const parts: string[] = [];
  const params: (string | number)[] = [];
  if (status !== 'all') {
    parts.push('record_status = ?');
    params.push(status);
  }
  if (q) {
    parts.push('(student_code LIKE ? OR name_latin LIKE ?)');
    const like = `%${q.slice(0, 40).replace(/[%_]/g, '')}%`;
    params.push(like, like);
  }
  const where = parts.length ? `WHERE ${parts.join(' AND ')}` : '';
  const cols = [...LIST_FIELDS, 'record_status'].join(', ');
  const { results } = await c.env.DB.prepare(`SELECT ${cols} FROM students ${where} ORDER BY student_code LIMIT ? OFFSET ?`)
    .bind(...params, pageSize, (page - 1) * pageSize)
    .all();
  const total = await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM students ${where}`).bind(...params).first<{ n: number }>();
  return c.json({ rows: results, total: total?.n ?? 0, page, pageSize });
});
api.get('/students/:code', async (c) => {
  const code = c.req.param('code');
  const row = await c.env.DB.prepare(
    `SELECT student_code, ${EDITABLE_FIELDS.join(', ')}, record_status, inactive_reason, inactive_note, row_version, created_at, updated_at FROM students WHERE student_code = ?`,
  )
    .bind(code)
    .first();
  if (!row) return c.json({ error: 'Record tidak ditemukan.' }, 404);
  // Akses baca data pribadi dicatat (audit F-21), tanpa menyimpan isinya.
  await writeLog(c.env.DB, { actor: c.get('user').email, action: 'lihat_detail', status: 'success', summary: `Detail record ${code} dibuka.`, target: `mahasiswa:${code}` });
  return c.json(row);
});
api.put('/students/:code', async (c) => {
  const body = await c.req.json<{ rowVersion: number; values: Partial<Record<EditableField, string | null>>; reason?: string }>();
  const values: Partial<Record<EditableField, string | null>> = {};
  for (const f of EDITABLE_FIELDS) if (body.values && f in body.values) values[f] = body.values[f] == null ? null : String(body.values[f]);
  const res = await editStudent(c.env.DB, c.get('user').email, c.req.param('code'), Number(body.rowVersion), values, body.reason ?? null);
  return c.json(res);
});
api.post('/students/:code/status', async (c) => {
  const body = await c.req.json<{ active: boolean; reason?: DeactivationReason; note?: string }>();
  const reason = body.reason && body.reason in DEACTIVATION_REASONS ? body.reason : null;
  const res = await setStudentStatus(c.env.DB, c.get('user').email, c.req.param('code'), body.active === true, reason, body.note ?? null);
  return c.json(res);
});

// ---------- Riwayat dataset ----------
api.get('/changes', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT id, kind, actor_email, created_at, import_job_id, reverts_change_set_id, reverted_by_change_set_id, summary_json, reason FROM change_sets ORDER BY id DESC LIMIT 100`,
  ).all<Record<string, any>>();
  return c.json(results.map((r) => ({ ...r, summary: JSON.parse(r.summary_json), summary_json: undefined })));
});
api.get('/changes/:id/revert-plan', async (c) => c.json(await planRevert(c.env.DB, Number(c.req.param('id')))));
api.post('/changes/:id/revert', async (c) => {
  const body = await c.req.json<{ reason?: string }>().catch(() => ({}) as { reason?: string });
  return c.json(await applyRevert(c.env.DB, c.get('user').email, Number(c.req.param('id')), body.reason ?? null));
});
api.put('/dataset/scope', async (c) => {
  const { scopeDescription } = await c.req.json<{ scopeDescription: string }>();
  const text = (scopeDescription ?? '').trim().slice(0, 500) || null;
  await c.env.DB.prepare('UPDATE dataset_state SET scope_description = ? WHERE id = 1').bind(text).run();
  await writeLog(c.env.DB, { actor: c.get('user').email, action: 'ubah_cakupan', status: 'success', summary: 'Keterangan cakupan data diperbarui.' });
  return c.json({ ok: true });
});

// ---------- Log aktivitas (baca saja) ----------
api.get('/logs', async (c) => {
  const q = c.req.query();
  const parts: string[] = [];
  const params: (string | number)[] = [];
  if (q.actor) {
    parts.push('actor_email = ?');
    params.push(q.actor);
  }
  if (q.action) {
    parts.push('action = ?');
    params.push(q.action);
  }
  if (q.status) {
    parts.push('status = ?');
    params.push(q.status);
  }
  if (q.from && /^\d{4}-\d{2}-\d{2}$/.test(q.from)) {
    parts.push('at >= ?');
    params.push(`${q.from}T00:00:00Z`);
  }
  if (q.to && /^\d{4}-\d{2}-\d{2}$/.test(q.to)) {
    parts.push('at <= ?');
    params.push(`${q.to}T23:59:59Z`);
  }
  const page = Math.max(1, Number(q.page ?? 1) || 1);
  const where = parts.length ? `WHERE ${parts.join(' AND ')}` : '';
  const { results } = await c.env.DB.prepare(`SELECT * FROM activity_logs ${where} ORDER BY id DESC LIMIT 100 OFFSET ?`)
    .bind(...params, (page - 1) * 100)
    .all();
  const actors = await c.env.DB.prepare('SELECT DISTINCT actor_email FROM activity_logs WHERE actor_email IS NOT NULL ORDER BY actor_email').all<{ actor_email: string }>();
  return c.json({ rows: results, page, actors: actors.results.map((a) => a.actor_email) });
});

app.route('/api', api);
app.all('/api/*', (c) => c.json({ error: 'Endpoint tidak ditemukan.' }, 404));
app.all('*', (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
