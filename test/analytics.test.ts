import { beforeEach, describe, expect, it } from 'vitest';
import { kekeluargaanSummary, kualitas, pendidikan, persebaran, profile } from '../src/worker/analytics';
import { setStudentStatus } from '../src/worker/changeService';
import { applyImport, createPreview } from '../src/worker/importService';
import { createTestDb } from './d1-shim';
import { student, toCsv, type Row } from './fixtures';

const ADMIN = 'admin@example.org';
const noFilter = { year: null, kekeluargaan: null, gender: null };
const confirm = { confirmWarnings: true, includeWarningRows: true };

let db: D1Database;
let seq = 0;
const id = () => `25-${String(++seq).padStart(4, '0')}`;

async function load(rows: Row[]) {
  const p = await createPreview(db, ADMIN, `f${seq}.csv`, toCsv(rows), 'add_only');
  await applyImport(db, ADMIN, p.jobId, confirm);
}

beforeEach(() => {
  db = createTestDb();
  seq = 0;
});

describe('halaman Kekeluargaan', () => {
  it('ke-16 kekeluargaan selalu tampil; nilai di luar daftar ditandai; jumlah per baris konsisten', async () => {
    await load([
      student({ ID_Mahasiswa: id(), Kekeluargaan_Konsulat: 'KMJ', Jenis_Kelamin: 'Laki-laki', Jenjang_Pendidikan: 'S1' }),
      student({ ID_Mahasiswa: id(), Kekeluargaan_Konsulat: 'kmj', Jenis_Kelamin: 'Perempuan', Jenjang_Pendidikan: "Ma'had" }),
      student({ ID_Mahasiswa: id(), Kekeluargaan_Konsulat: 'KMJ', Jenis_Kelamin: '', Jenjang_Pendidikan: '' }),
      student({ ID_Mahasiswa: id(), Kekeluargaan_Konsulat: 'Kekeluargaan Baru' }),
      student({ ID_Mahasiswa: id(), Kekeluargaan_Konsulat: '' }),
    ]);
    const k = await kekeluargaanSummary(db, noFilter);
    expect(k.rows.filter((r) => r.official)).toHaveLength(16);
    const kmj = k.rows.find((r) => r.label === 'KMJ')!;
    expect(kmj).toMatchObject({ total: 3, banin: 1, banat: 1, genderUnknown: 1, jenjang: { S1: 1, "Ma'had": 1, unknown: 1 } });
    expect(k.rows[0].label).toBe('KMJ');
    expect(k.rows.find((r) => !r.official)).toMatchObject({ label: 'Kekeluargaan Baru', total: 1 });
    expect(k.rows.find((r) => r.label === 'KSW')!.total).toBe(0);
    expect(k.unknown).toBe(1);
    expect(k.knownTotal).toBe(4);

    const detail = await profile(db, { ...noFilter, kekeluargaan: 'kmj' });
    expect(detail.gender).toEqual({ total: 3, banin: 1, banat: 1, unknown: 1 });
    expect(detail.education.items.map((i) => i.label).sort()).toEqual(["Ma'had", 'S1']);
    expect(detail.education.unknown).toBe(1);
  });
});

describe('halaman Pendidikan', () => {
  it('jurusan dikelompokkan per fakultas, fakultas baku yang kosong tetap tampil bernilai nol', async () => {
    await load([
      student({ ID_Mahasiswa: id(), Fakultas: 'Ushuluddin', Jurusan: 'Tafsir' }),
      student({ ID_Mahasiswa: id(), Fakultas: 'ushuluddin', Jurusan: 'tafsir' }),
      student({ ID_Mahasiswa: id(), Fakultas: 'Dakwah', Jurusan: 'Tafsir' }),
      student({ ID_Mahasiswa: id(), Fakultas: '', Jurusan: '' }),
    ]);
    const p = await pendidikan(db, noFilter);
    expect(p.faculty.items).toHaveLength(11);
    expect(p.faculty.items[0]).toMatchObject({ label: 'Ushuluddin', count: 2 });
    expect(p.faculty.unknown).toBe(1);
    const tafsir = p.majors.filter((m) => m.majorKey === 'tafsir');
    expect(tafsir.map((m) => [m.faculty, m.total])).toEqual([
      ['Ushuluddin', 2],
      ['Dakwah', 1],
    ]);
    expect(p.majorUnknown).toBe(1);
  });
});

describe('halaman Persebaran', () => {
  it('kabupaten/kota bernama sama di provinsi berbeda tidak digabung; filter provinsi berlaku', async () => {
    await load([
      student({ ID_Mahasiswa: id(), Domisili_Indonesia_Provinsi: 'Jawa Barat', Domisili_Indonesia_Kabupaten_Kota: 'Kab. Sintetis' }),
      student({ ID_Mahasiswa: id(), Domisili_Indonesia_Provinsi: 'Jawa Barat', Domisili_Indonesia_Kabupaten_Kota: 'Kab. Sintetis' }),
      student({ ID_Mahasiswa: id(), Domisili_Indonesia_Provinsi: 'Jawa Timur', Domisili_Indonesia_Kabupaten_Kota: 'Kab. Sintetis' }),
      student({ ID_Mahasiswa: id(), Domisili_Indonesia_Provinsi: 'Jawa Timur', Domisili_Indonesia_Kabupaten_Kota: '' }),
    ]);
    const all = await persebaran(db, noFilter, null);
    expect(all.regencies.top.map((r) => [r.label, r.count, r.note])).toEqual([
      ['Kab. Sintetis', 2, 'Jawa Barat'],
      ['Kab. Sintetis', 1, 'Jawa Timur'],
    ]);
    expect(all.regencies.unknown).toBe(1);
    expect(all.domicile.items).toHaveLength(10);

    const jatim = await persebaran(db, noFilter, 'jawa timur');
    expect(jatim.selectedProvince).toEqual({ key: 'jawa timur', label: 'Jawa Timur' });
    expect(jatim.regencies.top).toHaveLength(1);
    expect(jatim.regencies.unknown).toBe(1);
  });
});

describe('halaman Kualitas Data', () => {
  it('menghitung kelengkapan, nilai di luar daftar, variasi ejaan, dan indikasi duplikasi tanpa membocorkan nilai pribadi', async () => {
    await load([
      student({ ID_Mahasiswa: id(), Nomor_Paspor: 'A 123', Domisili_Indonesia_Provinsi: 'Papua', Jurusan: 'Tafsir' }),
      student({ ID_Mahasiswa: id(), Nomor_Paspor: 'a-123', Jurusan: 'TAFSIR' }),
      student({ ID_Mahasiswa: id(), Mediator: '', Kedatangan_di_Mesir: '2024' }),
    ]);
    await load([student({ ID_Mahasiswa: id() })]);
    await setStudentStatus(db, ADMIN, '25-0004', false, 'pulang_lulus', null);

    const q = await kualitas(db, noFilter);
    expect(q.total).toBe(3);
    expect(q.completeness.find((c) => c.field === 'mediator')).toMatchObject({ filled: 0, total: 3 });
    expect(q.completeness.find((c) => c.field === 'email')).toMatchObject({ filled: 3, total: 3 });
    const prov = q.coverage.find((c) => c.field === 'origin_province')!;
    expect(prov.outside).toEqual([{ label: 'Papua', count: 1 }]);
    expect(prov.unusedOfficial).not.toContain('Jawa Tengah');
    expect(q.variants.find((v) => v.field === 'major')!.groups).toEqual([{ forms: expect.arrayContaining(['Tafsir', 'TAFSIR']), records: 2 }]);
    expect(q.duplicates.find((d) => d.key === 'passport')).toMatchObject({ groups: 1, records: 2 });
    expect(q.arrivalIdMismatch).toBe(1);
    expect(q.inactive).toEqual([{ reason: 'pulang_lulus', n: 1 }]);
    expect(JSON.stringify(q)).not.toMatch(/A 123|a-123|@example\.org/);
  });
});
