// Agregat untuk halaman Kekeluargaan, Pendidikan, Persebaran, dan Kualitas Data (§3.2–§3.5).
// Seperti stats.ts: hanya angka agregat dari record aktif, tidak pernah record individual.
import { COLUMNS, type EditableField } from '../shared/columns';
import { JENJANG, REFERENCE_LISTS, canonicalCategory, referenceKey } from '../shared/reference';
import { distribution, whereClause, type CategoryCount, type GlobalFilters } from './stats';

export interface RefCount extends CategoryCount {
  /** false = nilai di luar daftar baku (tetap dihitung sebagai kategori tersendiri). */
  official: boolean;
}

export interface RefDistribution {
  items: RefCount[];
  unknown: number;
  knownTotal: number;
}

/**
 * Distribusi kolom berdaftar baku: semua kategori baku selalu tampil (termasuk yang nol),
 * nilai di luar daftar ditandai. Urutan: jumlah terbesar, lalu abjad.
 */
export async function referenceDistribution(db: D1Database, field: EditableField, f: GlobalFilters): Promise<RefDistribution> {
  const list = REFERENCE_LISTS[field];
  if (!list) throw new Error('kolom tanpa daftar baku');
  const d = await distribution(db, field, f);
  const merged = new Map<string, RefCount>(list.map((v) => [v, { key: referenceKey(v), label: v, count: 0, official: true }]));
  const outside: RefCount[] = [];
  for (const it of d.items) {
    const canonical = canonicalCategory(field, it.label);
    if (canonical) merged.get(canonical)!.count += it.count;
    else outside.push({ ...it, official: false });
  }
  const items = [...merged.values(), ...outside].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'id'));
  return { items, unknown: d.unknown, knownTotal: d.knownTotal };
}

/** Label baku untuk kunci huruf kecil, atau ejaan data jika tidak ada di daftar. */
function labelFor(field: EditableField, key: string | null, raw: string | null): string | null {
  if (key == null) return null;
  return canonicalCategory(field, raw ?? key) || raw || key;
}

// ---------- Kekeluargaan ----------

export interface KekeluargaanRow {
  key: string;
  label: string;
  official: boolean;
  total: number;
  banin: number;
  banat: number;
  genderUnknown: number;
  /** Jumlah per jenjang baku, ditambah "lainnya" (di luar daftar) dan "unknown" (kosong). */
  jenjang: Record<string, number>;
}

export async function kekeluargaanSummary(db: D1Database, f: GlobalFilters) {
  const dist = await referenceDistribution(db, 'kekeluargaan', f);
  const w = whereClause(f);
  const { results } = await db
    .prepare(
      `SELECT lower(kekeluargaan) AS k, gender_code AS g, lower(education_level) AS j, MIN(education_level) AS jraw, COUNT(*) AS n
       FROM students WHERE ${w.sql} AND kekeluargaan IS NOT NULL GROUP BY 1, 2, 3`,
    )
    .bind(...w.params)
    .all<{ k: string; g: 'L' | 'P' | null; j: string | null; jraw: string | null; n: number }>();

  const rows = new Map<string, KekeluargaanRow>(
    dist.items.map((i) => [i.key, { key: i.key, label: i.label, official: i.official, total: i.count, banin: 0, banat: 0, genderUnknown: 0, jenjang: {} }]),
  );
  for (const r of results) {
    const row = rows.get(canonicalKey('kekeluargaan', r.k));
    if (!row) continue;
    if (r.g === 'L') row.banin += r.n;
    else if (r.g === 'P') row.banat += r.n;
    else row.genderUnknown += r.n;
    const j = r.j == null ? 'unknown' : (canonicalCategory('education_level', r.jraw ?? r.j) ?? 'lainnya');
    row.jenjang[j] = (row.jenjang[j] ?? 0) + r.n;
  }
  return { rows: [...rows.values()], unknown: dist.unknown, knownTotal: dist.knownTotal, jenjangOrder: JENJANG };
}

function canonicalKey(field: EditableField, key: string): string {
  const c = canonicalCategory(field, key);
  return c ? referenceKey(c) : key;
}

/** Profil satu kelompok (dipakai panel detail kekeluargaan dan fakultas). */
export async function profile(db: D1Database, f: GlobalFilters) {
  const w = whereClause(f);
  const [education, faculty, provinces, domicile, years] = await Promise.all([
    referenceDistribution(db, 'education_level', f),
    referenceDistribution(db, 'faculty', f),
    distribution(db, 'origin_province', f),
    referenceDistribution(db, 'egypt_domicile', f),
    db
      .prepare(`SELECT arrival_year AS year, COUNT(*) AS count FROM students WHERE ${w.sql} AND arrival_year IS NOT NULL GROUP BY arrival_year ORDER BY arrival_year`)
      .bind(...w.params)
      .all<{ year: number; count: number }>(),
  ]);
  const gender = await genderTotals(db, f);
  return {
    gender,
    education: dropZeros(education),
    faculty: dropZeros(faculty),
    provinces: topWithOther(provinces, 10),
    domicile: dropZeros(domicile),
    arrivalYears: years.results,
  };
}

function dropZeros(d: RefDistribution): RefDistribution {
  return { ...d, items: d.items.filter((i) => i.count > 0) };
}

async function genderTotals(db: D1Database, f: GlobalFilters) {
  const w = whereClause(f);
  const r = await db
    .prepare(
      `SELECT COUNT(*) AS total, SUM(gender_code = 'L') AS banin, SUM(gender_code = 'P') AS banat, SUM(gender_code IS NULL) AS unknown FROM students WHERE ${w.sql}`,
    )
    .bind(...w.params)
    .first<{ total: number; banin: number | null; banat: number | null; unknown: number | null }>();
  return { total: r?.total ?? 0, banin: r?.banin ?? 0, banat: r?.banat ?? 0, unknown: r?.unknown ?? 0 };
}

/** Top N + "Lainnya". Lainnya hanya kategori valid di luar Top N, bukan data kosong (§3.1). */
export function topWithOther<T extends CategoryCount>(d: { items: T[]; unknown: number; knownTotal: number }, n: number) {
  const rest = d.items.slice(n);
  return {
    top: d.items.slice(0, n),
    other: { count: rest.reduce((s, r) => s + r.count, 0), categories: rest.length },
    unknown: d.unknown,
    knownTotal: d.knownTotal,
  };
}

// ---------- Pendidikan ----------

export interface MajorRow {
  facultyKey: string | null;
  faculty: string | null;
  majorKey: string | null;
  major: string | null;
  total: number;
  banin: number;
  banat: number;
}

export async function pendidikan(db: D1Database, f: GlobalFilters) {
  const w = whereClause(f);
  const [education, faculty, gender] = await Promise.all([
    referenceDistribution(db, 'education_level', f),
    referenceDistribution(db, 'faculty', f),
    genderTotals(db, f),
  ]);
  // Jurusan dikelompokkan per fakultas: nama jurusan yang sama di fakultas berbeda adalah jurusan berbeda.
  const { results } = await db
    .prepare(
      `SELECT lower(faculty) AS fk, MIN(faculty) AS fraw, lower(major) AS mk, MIN(major) AS mraw,
              COUNT(*) AS total, SUM(gender_code = 'L') AS banin, SUM(gender_code = 'P') AS banat
       FROM students WHERE ${w.sql} AND (faculty IS NOT NULL OR major IS NOT NULL)
       GROUP BY 1, 3 ORDER BY total DESC`,
    )
    .bind(...w.params)
    .all<{ fk: string | null; fraw: string | null; mk: string | null; mraw: string | null; total: number; banin: number; banat: number }>();
  const majors: MajorRow[] = results.map((r) => ({
    facultyKey: r.fk == null ? null : canonicalKey('faculty', r.fk),
    faculty: labelFor('faculty', r.fk, r.fraw),
    majorKey: r.mk,
    major: r.mraw,
    total: r.total,
    banin: r.banin ?? 0,
    banat: r.banat ?? 0,
  }));
  const noMajor = await db
    .prepare(`SELECT COUNT(*) AS n FROM students WHERE ${w.sql} AND major IS NULL`)
    .bind(...w.params)
    .first<{ n: number }>();
  return { gender, education, faculty, majors, majorUnknown: noMajor?.n ?? 0 };
}

// ---------- Persebaran ----------

export async function persebaran(db: D1Database, f: GlobalFilters, provinceKey: string | null) {
  const [provinces, domicile] = await Promise.all([distribution(db, 'origin_province', f), referenceDistribution(db, 'egypt_domicile', f)]);
  const w = whereClause(f);
  const params = [...w.params];
  let sql = w.sql;
  if (provinceKey) {
    sql += ' AND lower(origin_province) = ?';
    params.push(provinceKey);
  }
  // Kabupaten/kota dikelompokkan bersama provinsinya agar nama yang sama di provinsi berbeda tidak tergabung.
  const { results } = await db
    .prepare(
      `WITH v AS (SELECT lower(origin_regency) AS k, origin_regency AS raw, lower(origin_province) AS pk, origin_province AS praw FROM students WHERE ${sql}),
            grp AS (SELECT k, pk, MIN(raw) AS label, MIN(praw) AS province, COUNT(*) AS count FROM v WHERE k IS NOT NULL GROUP BY k, pk)
       SELECT k, pk, label, province, count FROM grp ORDER BY count DESC, label`,
    )
    .bind(...params)
    .all<{ k: string; pk: string | null; label: string; province: string | null; count: number }>();
  const unk = await db.prepare(`SELECT COUNT(*) AS n FROM students WHERE ${sql} AND origin_regency IS NULL`).bind(...params).first<{ n: number }>();
  const regencyItems = results.map((r) => ({
    key: `${r.pk ?? ''}|${r.k}`,
    label: r.label,
    count: r.count,
    note: provinceKey ? undefined : (labelFor('origin_province', r.pk, r.province) ?? 'provinsi belum diisi'),
  }));
  const regencies = topWithOther({ items: regencyItems, unknown: unk?.n ?? 0, knownTotal: regencyItems.reduce((s, r) => s + r.count, 0) }, 10);
  const selected = provinceKey ? provinces.items.find((p) => p.key === provinceKey) ?? null : null;
  return {
    provinces: topWithOther(provinces, 10),
    provinceOptions: provinces.items.map((p) => ({ key: p.key, label: p.label, count: p.count, official: canonicalCategory('origin_province', p.label) != null })),
    selectedProvince: selected ? { key: selected.key, label: selected.label } : null,
    regencies,
    domicile,
  };
}

// ---------- Kualitas Data ----------

export async function kualitas(db: D1Database, f: GlobalFilters) {
  const w = whereClause(f);
  const fields = COLUMNS.filter((c) => c.field !== 'student_code');
  // Kelengkapan per kolom: satu query dengan SUM per kolom (nama kolom dari kontrak, bukan input).
  const filledSql = fields.map((c) => `SUM(${c.field} IS NOT NULL) AS "${c.field}"`).join(', ');
  const filled = await db
    .prepare(`SELECT COUNT(*) AS total, ${filledSql} FROM students WHERE ${w.sql}`)
    .bind(...w.params)
    .first<Record<string, number | null>>();
  const total = filled?.total ?? 0;
  const completeness = fields.map((c) => ({
    field: c.field,
    header: c.header,
    label: c.label,
    analytic: c.analytic,
    sensitive: c.sensitive,
    filled: filled?.[c.field] ?? 0,
    total,
  }));

  // Cakupan daftar baku: nilai di luar daftar per kolom (nilai kategori, bukan data pribadi).
  const coverage = [];
  for (const field of Object.keys(REFERENCE_LISTS) as EditableField[]) {
    const d = await referenceDistribution(db, field, f);
    const outside = d.items.filter((i) => !i.official);
    coverage.push({
      field,
      label: COLUMNS.find((c) => c.field === field)!.label,
      officialCategories: REFERENCE_LISTS[field]!.length,
      usedOfficial: d.items.filter((i) => i.official && i.count > 0).length,
      unusedOfficial: d.items.filter((i) => i.official && i.count === 0).map((i) => i.label),
      outside: outside.map((i) => ({ label: i.label, count: i.count })),
      outsideRecords: outside.reduce((s, i) => s + i.count, 0),
      knownTotal: d.knownTotal,
    });
  }

  // Variasi penulisan untuk kolom tanpa daftar baku: satu kategori ditulis dengan beberapa ejaan.
  const variants = [];
  for (const field of ['origin_regency', 'major'] as const) {
    const { results } = await db
      .prepare(
        `SELECT lower(${field}) AS k, COUNT(DISTINCT ${field}) AS spellings, COUNT(*) AS records, group_concat(DISTINCT ${field}) AS forms
         FROM students WHERE ${w.sql} AND ${field} IS NOT NULL GROUP BY 1 HAVING spellings > 1 ORDER BY records DESC LIMIT 20`,
      )
      .bind(...w.params)
      .all<{ k: string; spellings: number; records: number; forms: string }>();
    variants.push({ field, label: COLUMNS.find((c) => c.field === field)!.label, groups: results.map((r) => ({ forms: r.forms.split(','), records: r.records })) });
  }

  // Indikasi duplikasi: hanya jumlah kelompok dan record, tanpa nilai paspor/email/telepon.
  const dupSql = (expr: string) =>
    `SELECT COUNT(*) AS groups, COALESCE(SUM(n), 0) AS records FROM (SELECT COUNT(*) AS n FROM students WHERE ${w.sql} AND ${expr} IS NOT NULL AND ${expr} <> '' GROUP BY ${expr} HAVING n > 1)`;
  const dupDefs = [
    { key: 'passport', label: 'Nomor paspor sama', expr: `upper(replace(replace(passport_no, ' ', ''), '-', ''))` },
    { key: 'email', label: 'Email sama', expr: 'lower(trim(email))' },
    { key: 'whatsapp', label: 'Nomor WhatsApp sama', expr: `replace(replace(replace(replace(whatsapp_no, ' ', ''), '-', ''), '+', ''), '.', '')` },
    { key: 'name', label: 'Nama Latin dan tanggal lahir sama', expr: `CASE WHEN birth_date IS NULL THEN NULL ELSE lower(name_latin) || '|' || birth_date END` },
  ];
  const duplicates = [];
  for (const d of dupDefs) {
    const r = await db.prepare(dupSql(d.expr)).bind(...w.params).first<{ groups: number; records: number }>();
    duplicates.push({ key: d.key, label: d.label, groups: r?.groups ?? 0, records: r?.records ?? 0 });
  }

  const mismatch = await db
    .prepare(`SELECT COUNT(*) AS n FROM students WHERE ${w.sql} AND arrival_year IS NOT NULL AND substr(arrival_year, 3, 2) <> substr(student_code, 1, 2)`)
    .bind(...w.params)
    .first<{ n: number }>();

  // Temuan impor dan status record tidak mengikuti filter: keduanya tentang proses, bukan populasi.
  const issues = await db
    .prepare(`SELECT review_status AS status, COUNT(*) AS n FROM import_row_issues GROUP BY review_status`)
    .all<{ status: string; n: number }>();
  const inactive = await db
    .prepare(`SELECT inactive_reason AS reason, COUNT(*) AS n FROM students WHERE record_status = 'inactive' GROUP BY inactive_reason`)
    .all<{ reason: string | null; n: number }>();

  return {
    total,
    completeness,
    coverage,
    variants,
    duplicates,
    arrivalIdMismatch: mismatch?.n ?? 0,
    rowIssues: Object.fromEntries(issues.results.map((r) => [r.status, r.n])),
    inactive: inactive.results,
  };
}
