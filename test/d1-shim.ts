// Pengganti D1 untuk tes, di atas node:sqlite (SQLite yang sama dengan D1).
// Meniru bagian API D1 yang dipakai aplikasi: prepare/bind/first/all/run dan batch() atomik.
// Catatan: ini bukan D1 sungguhan; batas layanan D1 (ukuran batch, CPU) tidak diuji di sini.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const returnsRows = (sql: string) => /^\s*(SELECT|WITH|PRAGMA)\b/i.test(sql) || /\bRETURNING\b/i.test(sql);

class Stmt {
  constructor(
    private db: DatabaseSync,
    readonly sql: string,
    private params: unknown[] = [],
  ) {}
  bind(...params: unknown[]) {
    return new Stmt(this.db, this.sql, params);
  }
  private exec() {
    const st = this.db.prepare(this.sql);
    const args = this.params as any[];
    if (returnsRows(this.sql)) {
      const rows = st.all(...args).map((r) => ({ ...r }));
      return { results: rows, success: true, meta: { changes: 0 } };
    }
    const info = st.run(...args);
    return { results: [], success: true, meta: { changes: Number(info.changes), last_row_id: Number(info.lastInsertRowid) } };
  }
  async first<T>(col?: string): Promise<T | null> {
    const r = this.exec().results[0] as any;
    if (!r) return null;
    return (col ? r[col] : r) as T;
  }
  async all<T>() {
    return this.exec() as unknown as { results: T[]; success: boolean; meta: any };
  }
  async run() {
    return this.exec();
  }
  _execSync() {
    return this.exec();
  }
}

export class D1Shim {
  readonly raw: DatabaseSync;
  /** Untuk tes kegagalan: dipanggil sebelum setiap pernyataan di dalam batch. */
  beforeBatchStatement: ((sql: string, index: number) => void) | null = null;
  constructor() {
    this.raw = new DatabaseSync(':memory:');
    this.raw.exec('PRAGMA foreign_keys = ON');
  }
  prepare(sql: string) {
    return new Stmt(this.raw, sql);
  }
  async batch(stmts: Stmt[]) {
    this.raw.exec('BEGIN');
    try {
      const out = stmts.map((s, i) => {
        this.beforeBatchStatement?.(s.sql, i);
        return s._execSync();
      });
      this.raw.exec('COMMIT');
      return out;
    } catch (e) {
      this.raw.exec('ROLLBACK');
      throw e;
    }
  }
  async exec(sql: string) {
    this.raw.exec(sql);
  }
}

export function createTestDb(): D1Database {
  const db = new D1Shim();
  const dir = join(import.meta.dirname, '..', 'migrations');
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    db.raw.exec(readFileSync(join(dir, f), 'utf8'));
  }
  return db as unknown as D1Database;
}
