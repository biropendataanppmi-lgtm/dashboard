import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const sql = (f: string) => readFileSync(join(import.meta.dirname, '..', 'migrations', f), 'utf8');

describe('migrasi 0002: ID 6 angka', () => {
  it('ID lama YY-NNNN dikonversi, revisi tetap tertaut, dan penghapusan tetap dicegah', () => {
    const db = new DatabaseSync(':memory:');
    db.exec('PRAGMA foreign_keys = ON;');
    db.exec(sql('0001_init.sql'));
    db.exec(`INSERT INTO change_sets (id, kind, actor_email, created_at, summary_json) VALUES (1, 'import', 'a@example.org', 'x', '{}')`);
    db.exec(`INSERT INTO students (student_code, name_latin, created_change_set_id, last_change_set_id, created_at, updated_at)
             VALUES ('25-0001', 'Contoh Sintetis', 1, 1, 'x', 'x')`);
    db.exec(`INSERT INTO student_revisions (change_set_id, student_id, op, after_json) VALUES (1, 1, 'create', '{}')`);
    db.exec(`BEGIN; ${sql('0002_student_code_6_digit.sql')} COMMIT;`);

    expect(db.prepare('SELECT id, student_code FROM students').all()).toEqual([{ id: 1, student_code: '250001' }]);
    expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    expect(db.prepare(`SELECT sql FROM sqlite_master WHERE name = 'student_revisions'`).get()).toMatchObject({ sql: expect.stringMatching(/REFERENCES "?students"? \(id\)/) });
    expect(() => db.exec(`INSERT INTO student_revisions (change_set_id, student_id, op, after_json) VALUES (1, 99, 'create', '{}')`)).toThrow(/FOREIGN KEY/);
    expect(() => db.exec(`DELETE FROM students`)).toThrow(/tidak boleh dihapus/);
    expect(() => db.exec(`INSERT INTO students (student_code, name_latin, created_change_set_id, last_change_set_id, created_at, updated_at)
                          VALUES ('25-0002', 'X', 1, 1, 'x', 'x')`)).toThrow(/CHECK/);
  });
});
