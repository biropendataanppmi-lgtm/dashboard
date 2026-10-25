// Agregasi statistik di backend (§5.4). Endpoint ini hanya mengembalikan angka agregat,
// tidak pernah record individual. Hanya record aktif yang dihitung (§3.6E).

export interface GlobalFilters {
  year: number | null;
  kekeluargaan: string | null; // kunci kategori (huruf kecil)
  gender: 'L' | 'P' | null;
}

export function parseFilters(q: Record<string, string | undefined>): GlobalFilters {
  const year = q.tahun && /^\d{4}$/.test(q.tahun) ? Number(q.tahun) : null;
  const kek = q.kekeluargaan?.trim().toLowerCase() || null;
  const gender = q.jk === 'L' || q.jk === 'P' ? q.jk : null;
  return { year, kekeluargaan: kek, gender };
}

export function whereClause(f: GlobalFilters): { sql: string; params: (string | number)[] } {
  const parts = [`record_status = 'active'`];
  const params: (string | number)[] = [];
  if (f.year != null) {
    parts.push('arrival_year = ?');
    params.push(f.year);
  }
  if (f.kekeluargaan) {
    parts.push(`lower(kekeluargaan) = ?`);
    params.push(f.kekeluargaan);
  }
  if (f.gender) {
    parts.push('gender_code = ?');
    params.push(f.gender);
  }
  return { sql: parts.join(' AND '), params };
}

export interface CategoryCount {
  key: string;
  label: string;
  count: number;
}

export interface Distribution {
  items: CategoryCount[];
  /** Record dengan nilai kosong: ditampilkan terpisah, bukan kategori (§1.5). */
  unknown: number;
  /** Penyebut persentase: record dengan nilai diketahui (konvensi denominator, audit F-26). */
  knownTotal: number;
}

const CATEGORY_COLUMNS = new Set(['kekeluargaan', 'education_level', 'origin_province', 'faculty', 'major', 'egypt_domicile', 'origin_regency']);

export async function distribution(db: D1Database, column: string, f: GlobalFilters): Promise<Distribution> {
  if (!CATEGORY_COLUMNS.has(column)) throw new Error('kolom tidak diizinkan');
  const w = whereClause(f);
  // Pengelompokan tanpa membedakan huruf besar/kecil; label = ejaan yang paling sering muncul.
  const { results } = await db
    .prepare(
      `WITH v AS (SELECT lower(${column}) AS k, ${column} AS raw FROM students WHERE ${w.sql}),
            spell AS (SELECT k, raw, COUNT(*) AS n FROM v WHERE k IS NOT NULL GROUP BY k, raw),
            best AS (SELECT k, raw, ROW_NUMBER() OVER (PARTITION BY k ORDER BY n DESC, raw) AS rn FROM spell)
       SELECT b.k AS key, b.raw AS label, (SELECT COUNT(*) FROM v WHERE v.k = b.k) AS count
       FROM best b WHERE b.rn = 1 ORDER BY count DESC, label`,
    )
    .bind(...w.params)
    .all<CategoryCount>();
  const unk = await db
    .prepare(`SELECT COUNT(*) AS n FROM students WHERE ${w.sql} AND ${column} IS NULL`)
    .bind(...w.params)
    .first<{ n: number }>();
  const knownTotal = results.reduce((s, r) => s + r.count, 0);
  return { items: results, unknown: unk?.n ?? 0, knownTotal };
}

export interface DatasetMeta {
  version: number;
  updatedAt: string;
  scopeDescription: string | null;
  activeRecords: number;
}

export async function datasetMeta(db: D1Database): Promise<DatasetMeta> {
  const row = await db
    .prepare(`SELECT version, updated_at, scope_description, (SELECT COUNT(*) FROM students WHERE record_status = 'active') AS active FROM dataset_state WHERE id = 1`)
    .first<{ version: number; updated_at: string; scope_description: string | null; active: number }>();
  return { version: row?.version ?? 0, updatedAt: row?.updated_at ?? '', scopeDescription: row?.scope_description ?? null, activeRecords: row?.active ?? 0 };
}

export async function filterOptions(db: D1Database) {
  const years = await db
    .prepare(`SELECT arrival_year AS year, COUNT(*) AS count FROM students WHERE record_status = 'active' AND arrival_year IS NOT NULL GROUP BY arrival_year ORDER BY arrival_year DESC`)
    .all<{ year: number; count: number }>();
  const kek = await distribution(db, 'kekeluargaan', { year: null, kekeluargaan: null, gender: null });
  const gender = await db
    .prepare(`SELECT COUNT(*) AS n FROM students WHERE record_status = 'active' AND gender_code IS NOT NULL`)
    .first<{ n: number }>();
  return {
    years: years.results,
    kekeluargaan: kek.items.map((i) => ({ key: i.key, label: i.label })).sort((a, b) => a.label.localeCompare(b.label, 'id')),
    // Filter hanya ditampilkan jika dimensinya benar-benar tersedia (§5.8).
    available: { tahun: years.results.length > 0, kekeluargaan: kek.items.length > 0, jk: (gender?.n ?? 0) > 0 },
  };
}

export async function overview(db: D1Database, f: GlobalFilters) {
  const w = whereClause(f);
  const totals = await db
    .prepare(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN gender_code = 'L' THEN 1 ELSE 0 END) AS banin,
              SUM(CASE WHEN gender_code = 'P' THEN 1 ELSE 0 END) AS banat,
              SUM(CASE WHEN gender_code IS NULL THEN 1 ELSE 0 END) AS gender_unknown
       FROM students WHERE ${w.sql}`,
    )
    .bind(...w.params)
    .first<{ total: number; banin: number | null; banat: number | null; gender_unknown: number | null }>();

  const [kekeluargaan, education, provinces] = await Promise.all([
    distribution(db, 'kekeluargaan', f),
    distribution(db, 'education_level', f),
    distribution(db, 'origin_province', f),
  ]);

  // Top 10 provinsi + Lainnya. Lainnya hanya provinsi valid di luar Top 10, bukan data kosong (§3.1).
  const top = provinces.items.slice(0, 10);
  const rest = provinces.items.slice(10);
  return {
    totals: {
      total: totals?.total ?? 0,
      banin: totals?.banin ?? 0,
      banat: totals?.banat ?? 0,
      genderUnknown: totals?.gender_unknown ?? 0,
    },
    kekeluargaanRepresented: kekeluargaan.items.length,
    kekeluargaan,
    education,
    provinces: {
      top,
      other: { count: rest.reduce((s, r) => s + r.count, 0), categories: rest.length },
      unknown: provinces.unknown,
      knownTotal: provinces.knownTotal,
    },
  };
}
