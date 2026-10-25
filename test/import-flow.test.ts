import { beforeEach, describe, expect, it } from 'vitest';
import { applyRevert, editStudent, planRevert, setStudentStatus } from '../src/worker/changeService';
import { applyImport, cancelImport, createPreview } from '../src/worker/importService';
import { overview } from '../src/worker/stats';
import type { D1Shim } from './d1-shim';
import { createTestDb } from './d1-shim';
import { student, toCsv } from './fixtures';

const ADMIN = 'admin@example.org';
const noFilter = { year: null, kekeluargaan: null, gender: null };
const confirm = { confirmWarnings: true, includeWarningRows: true };

let db: D1Database;
const count = async (sql: string) => (await db.prepare(sql).first<{ n: number }>())!.n;

beforeEach(() => {
  db = createTestDb();
});

describe('impor CSV ujung ke ujung', () => {
  it('preview tidak menulis data; penerapan membuat record, versi, revisi, dan log', async () => {
    const csv = toCsv([student({ ID_Mahasiswa: '25-0001' }), student({ ID_Mahasiswa: '25-0002' })]);
    const p = await createPreview(db, ADMIN, 'angkatan25.csv', csv, 'add_only');
    expect(p.summary.create).toBe(2);
    expect(await count('SELECT COUNT(*) n FROM students')).toBe(0);

    const r = await applyImport(db, ADMIN, p.jobId, confirm);
    expect(r).toMatchObject({ created: 2, updated: 0, version: 1 });
    expect(await count('SELECT COUNT(*) n FROM students')).toBe(2);
    expect(await count('SELECT COUNT(*) n FROM student_revisions')).toBe(2);
    expect(await count('SELECT COUNT(*) n FROM import_staging')).toBe(0);
    expect(await count(`SELECT COUNT(*) n FROM activity_logs WHERE action = 'impor_terapkan' AND status = 'success'`)).toBe(1);
  });

  it('mengunggah ulang file yang sama di Add Only tidak menggandakan record', async () => {
    const csv = toCsv([student({ ID_Mahasiswa: '25-0001' }), student({ ID_Mahasiswa: '25-0002' })]);
    await applyImport(db, ADMIN, (await createPreview(db, ADMIN, 'a.csv', csv, 'add_only')).jobId, confirm);
    const again = await createPreview(db, ADMIN, 'a.csv', csv, 'add_only');
    expect(again.summary).toMatchObject({ create: 0, held: 2 });
    expect(again.fileIssues.map((i) => i.code)).toContain('file_sudah_diterapkan');
    expect(await count(`SELECT COUNT(*) n FROM import_row_issues WHERE issue_code = 'id_sudah_ada'`)).toBe(2);
    await applyImport(db, ADMIN, again.jobId, confirm);
    expect(await count('SELECT COUNT(*) n FROM students')).toBe(2);
  });

  it('peringatan wajib dikonfirmasi, dan baris berperingatan dapat dilewati', async () => {
    const csv = toCsv([student({ ID_Mahasiswa: '25-0001' }), student({ ID_Mahasiswa: '25-0002', Fakultas: '' })]);
    const p = await createPreview(db, ADMIN, 'w.csv', csv, 'add_only');
    await expect(applyImport(db, ADMIN, p.jobId, { confirmWarnings: false, includeWarningRows: true })).rejects.toThrow(/dikonfirmasi/);
    const r = await applyImport(db, ADMIN, p.jobId, { confirmWarnings: true, includeWarningRows: false });
    expect(r).toMatchObject({ created: 1, skippedWarningRows: 1 });
  });

  it('kegagalan di tengah penerapan tidak meninggalkan data parsial', async () => {
    const csv = toCsv([student({ ID_Mahasiswa: '25-0001' }), student({ ID_Mahasiswa: '25-0002' }), student({ ID_Mahasiswa: '25-0003' })]);
    const p = await createPreview(db, ADMIN, 'f.csv', csv, 'add_only');
    let inserts = 0;
    (db as unknown as D1Shim).beforeBatchStatement = (sql) => {
      if (sql.includes('INSERT INTO students') && ++inserts === 3) throw new Error('simulasi kegagalan penyimpanan');
    };
    await expect(applyImport(db, ADMIN, p.jobId, confirm)).rejects.toThrow(/Tidak ada perubahan/);
    (db as unknown as D1Shim).beforeBatchStatement = null;
    expect(await count('SELECT COUNT(*) n FROM students')).toBe(0);
    expect(await count('SELECT version n FROM dataset_state')).toBe(0);
    expect(await count(`SELECT COUNT(*) n FROM import_jobs WHERE status = 'failed'`)).toBe(1);
    expect(await count(`SELECT COUNT(*) n FROM activity_logs WHERE action = 'impor_terapkan' AND status = 'failure'`)).toBe(1);
  });

  it('dua preview dari versi yang sama: yang kedua ditolak setelah yang pertama diterapkan', async () => {
    const a = await createPreview(db, ADMIN, 'a.csv', toCsv([student({ ID_Mahasiswa: '25-0001' })]), 'add_only');
    const b = await createPreview(db, 'admin2@example.org', 'b.csv', toCsv([student({ ID_Mahasiswa: '25-0002' })]), 'add_only');
    await applyImport(db, ADMIN, a.jobId, confirm);
    await expect(applyImport(db, 'admin2@example.org', b.jobId, confirm)).rejects.toThrow(/berubah sejak preview/);
    expect(await count('SELECT COUNT(*) n FROM students')).toBe(1);
  });

  it('Update Existing tidak membuat record baru; Full Sync tidak menonaktifkan record yang tidak ada di file', async () => {
    const one = student({ ID_Mahasiswa: '25-0001' });
    const two = student({ ID_Mahasiswa: '25-0002' });
    await applyImport(db, ADMIN, (await createPreview(db, ADMIN, 'a.csv', toCsv([one, two]), 'add_only')).jobId, confirm);

    const upd = await createPreview(db, ADMIN, 'u.csv', toCsv([{ ...one, Jurusan: 'Jurusan Baru' }, student({ ID_Mahasiswa: '25-0050' })]), 'update_existing');
    expect(upd.summary).toMatchObject({ update: 1, create: 0, held: 1 });
    await applyImport(db, ADMIN, upd.jobId, confirm);

    const sync = await createPreview(db, ADMIN, 's.csv', toCsv([{ ...one, Jurusan: 'Jurusan Baru' }]), 'full_sync');
    expect(sync.summary).toMatchObject({ unchanged: 1, update: 0 });
    await cancelImport(db, ADMIN, sync.jobId);
    expect(await count(`SELECT COUNT(*) n FROM students WHERE record_status = 'active'`)).toBe(2);
    expect(await count('SELECT COUNT(*) n FROM students')).toBe(2);
  });
});

describe('pembatalan perubahan (Jawaban H1)', () => {
  it('membatalkan satu impor tanpa menghapus suntingan yang lebih baru', async () => {
    const a = student({ ID_Mahasiswa: '25-0001' });
    const b = student({ ID_Mahasiswa: '25-0002' });
    const imp = await applyImport(db, ADMIN, (await createPreview(db, ADMIN, 'a.csv', toCsv([a, b]), 'add_only')).jobId, confirm);

    // Record 25-0002 disunting setelah impor: pembatalan harus melewatinya.
    const rv = (await db.prepare(`SELECT row_version n FROM students WHERE student_code = '25-0002'`).first<{ n: number }>())!.n;
    await editStudent(db, ADMIN, '25-0002', rv, { major: 'Disunting' }, null);

    const plan = await planRevert(db, imp.version);
    expect(plan).toMatchObject({ total: 2, applicable: 1 });
    expect(plan.conflicts.map((c) => c.studentCode)).toEqual(['25-0002']);

    await applyRevert(db, ADMIN, imp.version, 'File salah angkatan');
    const rows = (await db.prepare('SELECT student_code, record_status, inactive_reason, major FROM students ORDER BY student_code').all()).results;
    expect(rows).toEqual([
      { student_code: '25-0001', record_status: 'inactive', inactive_reason: 'pembatalan_impor', major: 'Jurusan Contoh' },
      { student_code: '25-0002', record_status: 'active', inactive_reason: null, major: 'Disunting' },
    ]);
    // ID tetap tercatat sehingga tidak diberikan ulang kepada orang lain.
    expect(await count('SELECT COUNT(*) n FROM students')).toBe(2);
    await expect(applyRevert(db, ADMIN, imp.version, 'lagi')).rejects.toThrow(/sudah dibatalkan/);
  });

  it('membatalkan pembaruan mengembalikan nilai lama', async () => {
    const a = student({ ID_Mahasiswa: '25-0001' });
    await applyImport(db, ADMIN, (await createPreview(db, ADMIN, 'a.csv', toCsv([a]), 'add_only')).jobId, confirm);
    const upd = await applyImport(db, ADMIN, (await createPreview(db, ADMIN, 'u.csv', toCsv([{ ...a, Fakultas: '' }]), 'update_existing')).jobId, confirm);
    expect(await db.prepare(`SELECT faculty n FROM students`).first('n')).toBeNull();
    await applyRevert(db, ADMIN, upd.version, 'Kolom fakultas terhapus tidak sengaja');
    expect(await db.prepare(`SELECT faculty n FROM students`).first('n')).toBe('Fakultas Contoh');
  });
});

describe('statistik', () => {
  it('kosong tidak masuk kategori, Lainnya hanya provinsi valid di luar Top 10, nonaktif tidak dihitung', async () => {
    const rows = [];
    for (let i = 0; i < 12; i++) rows.push(student({ ID_Mahasiswa: `25-${String(100 + i).padStart(4, '0')}`, Domisili_Indonesia_Provinsi: `Provinsi ${String.fromCharCode(65 + i)}` }));
    rows.push(student({ ID_Mahasiswa: '25-0200', Domisili_Indonesia_Provinsi: 'provinsi a', Jenis_Kelamin: '' }));
    rows.push(student({ ID_Mahasiswa: '25-0201', Domisili_Indonesia_Provinsi: '', Kekeluargaan_Konsulat: '' }));
    rows.push(student({ ID_Mahasiswa: '25-0202' }));
    await applyImport(db, ADMIN, (await createPreview(db, ADMIN, 'a.csv', toCsv(rows), 'add_only')).jobId, confirm);
    await setStudentStatus(db, ADMIN, '25-0202', false, 'pulang_lulus', null);

    const o = await overview(db, noFilter);
    expect(o.totals.total).toBe(14);
    expect(o.totals.banin + o.totals.banat + o.totals.genderUnknown).toBe(14);
    expect(o.totals.genderUnknown).toBe(1);
    expect(o.provinces.top[0]).toMatchObject({ key: 'provinsi a', count: 2 });
    expect(o.provinces.top).toHaveLength(10);
    expect(o.provinces.other).toEqual({ count: 2, categories: 2 });
    expect(o.provinces.unknown).toBe(1);
    expect(o.provinces.top.reduce((s, r) => s + r.count, 0) + o.provinces.other.count + o.provinces.unknown).toBe(14);
    expect(o.kekeluargaan.unknown).toBe(1);
    expect(o.kekeluargaanRepresented).toBe(1);

    const banat = await overview(db, { ...noFilter, gender: 'P' });
    expect(banat.totals.total).toBe(o.totals.banat);
  });
});

describe('perlindungan data', () => {
  it('log aktivitas tidak dapat diubah atau dihapus, dan mahasiswa tidak dapat dihapus', async () => {
    await applyImport(db, ADMIN, (await createPreview(db, ADMIN, 'a.csv', toCsv([student({ ID_Mahasiswa: '25-0001' })]), 'add_only')).jobId, confirm);
    await expect(db.prepare(`UPDATE activity_logs SET summary = 'x'`).run()).rejects.toThrow(/append-only/);
    await expect(db.prepare('DELETE FROM activity_logs').run()).rejects.toThrow(/append-only/);
    await expect(db.prepare('DELETE FROM students').run()).rejects.toThrow(/tidak boleh dihapus/);
  });

  it('log impor tidak memuat nama, paspor, atau nomor telepon', async () => {
    const s = student({ ID_Mahasiswa: '25-0001', Nama_Lengkap_Latin: 'Nama Rahasia', Nomor_Paspor: 'PASPOR999' });
    await applyImport(db, ADMIN, (await createPreview(db, ADMIN, 'a.csv', toCsv([s]), 'add_only')).jobId, confirm);
    const logs = JSON.stringify((await db.prepare('SELECT * FROM activity_logs').all()).results);
    expect(logs).not.toMatch(/Nama Rahasia|PASPOR999|0812000/);
  });

  it('penyuntingan ditolak bila record sudah diubah orang lain (penguncian optimistis)', async () => {
    await applyImport(db, ADMIN, (await createPreview(db, ADMIN, 'a.csv', toCsv([student({ ID_Mahasiswa: '25-0001' })]), 'add_only')).jobId, confirm);
    await editStudent(db, ADMIN, '25-0001', 1, { major: 'A' }, null);
    await expect(editStudent(db, 'lain@example.org', '25-0001', 1, { major: 'B' }, null)).rejects.toThrow(/sudah diubah/);
  });
});
