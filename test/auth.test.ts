import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/worker/index';
import { createTestDb } from './d1-shim';

let db: D1Database;
const env = (over: Record<string, unknown> = {}) => ({ DB: db, ASSETS: { fetch: async () => new Response('aset') }, AUTH_MODE: 'dev', DEV_USER_EMAIL: 'admin@example.org', ...over });

beforeEach(async () => {
  db = createTestDb();
  await db.prepare(`INSERT INTO admin_allowlist (email, display_name) VALUES ('admin@example.org', 'Admin Uji')`).run();
});

describe('autentikasi dan otorisasi backend', () => {
  it('mode simulasi hanya berlaku di localhost', async () => {
    const res = await app.request('https://ppmi.example.org/api/stats/overview', {}, env());
    expect(res.status).toBe(401);
    const ok = await app.request('http://localhost/api/stats/overview', {}, env());
    expect(ok.status).toBe(200);
  });

  it('mode Access tanpa token ditolak di setiap endpoint, bukan hanya disembunyikan di frontend', async () => {
    const e = env({ AUTH_MODE: 'access', ACCESS_TEAM_DOMAIN: 'contoh.cloudflareaccess.com', ACCESS_AUD: 'aud' });
    for (const path of ['/api/stats/overview', '/api/students', '/api/logs', '/api/changes', '/api/imports']) {
      expect((await app.request(`https://ppmi.example.org${path}`, {}, e)).status).toBe(401);
    }
  });

  it('AUTH_MODE yang tidak dikenal menolak akses', async () => {
    expect((await app.request('http://localhost/api/students', {}, env({ AUTH_MODE: '' }))).status).toBe(401);
  });

  it('akun di luar allowlist ditolak dan percobaannya dicatat', async () => {
    const res = await app.request('http://localhost/api/me', {}, env({ DEV_USER_EMAIL: 'orang.lain@example.org' }));
    expect(res.status).toBe(403);
    const log = await db.prepare(`SELECT actor_email, status FROM activity_logs WHERE action = 'login_ditolak'`).first();
    expect(log).toEqual({ actor_email: 'orang.lain@example.org', status: 'denied' });
  });

  it('akun yang dicabut (active = 0) langsung kehilangan akses', async () => {
    await db.prepare(`UPDATE admin_allowlist SET active = 0`).run();
    expect((await app.request('http://localhost/api/students', {}, env())).status).toBe(403);
  });

  it('login dicatat sekali per sesi', async () => {
    await app.request('http://localhost/api/me', {}, env());
    await app.request('http://localhost/api/me', {}, env());
    expect(await db.prepare(`SELECT COUNT(*) n FROM activity_logs WHERE action = 'login'`).first('n')).toBe(1);
  });

  it('permintaan yang mengubah data tanpa Origin yang sama ditolak (CSRF)', async () => {
    const body = JSON.stringify({ scopeDescription: 'x' });
    const headers = { 'Content-Type': 'application/json' };
    expect((await app.request('http://localhost/api/dataset/scope', { method: 'PUT', body, headers }, env())).status).toBe(403);
    expect((await app.request('http://localhost/api/dataset/scope', { method: 'PUT', body, headers: { ...headers, Origin: 'https://jahat.example' } }, env())).status).toBe(403);
    expect((await app.request('http://localhost/api/dataset/scope', { method: 'PUT', body, headers: { ...headers, Origin: 'http://localhost' } }, env())).status).toBe(200);
  });

  it('endpoint analitik tidak mengembalikan data pribadi', async () => {
    await db.batch([
      db.prepare(`INSERT INTO change_sets (id, kind, actor_email, created_at, summary_json) VALUES (1, 'import', 'a', '2026-01-01T00:00:00Z', '{}')`),
      db.prepare(
        `INSERT INTO students (student_code, name_latin, passport_no, email, phone_no, kekeluargaan, created_change_set_id, last_change_set_id, created_at, updated_at)
         VALUES ('250001', 'Nama Rahasia', 'PASPOR1', 'r@example.org', '0812', 'Kekeluargaan A', 1, 1, 'x', 'x')`,
      ),
    ]);
    const text = await (await app.request('http://localhost/api/stats/overview', {}, env())).text();
    expect(text).toContain('Kekeluargaan A');
    expect(text).not.toMatch(/Nama Rahasia|PASPOR1|r@example.org|250001/);
  });
});
