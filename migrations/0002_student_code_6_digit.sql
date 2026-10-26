-- ID Mahasiswa mengikuti format spreadsheet Biro: 6 angka YYNNNN (contoh 260128),
-- menggantikan YY-NNNN. SQLite tidak bisa mengubah CHECK, jadi tabel students dibangun ulang.
-- ID lama YY-NNNN (jika ada) dikonversi dengan membuang tanda hubung.
-- student_revisions (satu-satunya tabel yang mereferensikan students) ikut dibangun ulang
-- lebih dulu, supaya DROP TABLE students tidak pernah melanggar foreign key.

CREATE TABLE students_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_code TEXT NOT NULL UNIQUE CHECK (student_code GLOB '[0-9][0-9][0-9][0-9][0-9][0-9]'),
  email TEXT,
  gender TEXT,
  name_latin TEXT NOT NULL,
  name_arab TEXT,
  passport_no TEXT,
  birth_place TEXT,
  birth_date TEXT,
  origin_regency TEXT,
  origin_province TEXT,
  whatsapp_no TEXT,
  phone_no TEXT,
  arrival_date TEXT,
  egypt_domicile TEXT,
  kekeluargaan TEXT,
  education_level TEXT,
  faculty TEXT,
  major TEXT,
  mediator TEXT,
  gender_code TEXT CHECK (gender_code IN ('L', 'P')),
  arrival_year INTEGER,
  record_status TEXT NOT NULL DEFAULT 'active' CHECK (record_status IN ('active', 'inactive')),
  inactive_reason TEXT,
  inactive_note TEXT,
  row_version INTEGER NOT NULL DEFAULT 1,
  created_change_set_id INTEGER NOT NULL,
  last_change_set_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO students_new
SELECT id, replace(student_code, '-', ''), email, gender, name_latin, name_arab, passport_no, birth_place, birth_date,
       origin_regency, origin_province, whatsapp_no, phone_no, arrival_date, egypt_domicile, kekeluargaan,
       education_level, faculty, major, mediator, gender_code, arrival_year, record_status, inactive_reason,
       inactive_note, row_version, created_change_set_id, last_change_set_id, created_at, updated_at
FROM students;

CREATE TABLE student_revisions_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  change_set_id INTEGER NOT NULL REFERENCES change_sets (id),
  student_id INTEGER NOT NULL REFERENCES students_new (id),
  op TEXT NOT NULL CHECK (op IN ('create', 'update', 'status')),
  before_json TEXT,
  after_json TEXT NOT NULL
);
INSERT INTO student_revisions_new SELECT id, change_set_id, student_id, op, before_json, after_json FROM student_revisions;

DROP TABLE student_revisions;
DROP TRIGGER students_no_delete;
DROP TABLE students;
-- RENAME memperbarui referensi student_revisions_new ke nama tabel yang baru.
ALTER TABLE students_new RENAME TO students;
ALTER TABLE student_revisions_new RENAME TO student_revisions;

CREATE INDEX idx_revisions_change_set ON student_revisions (change_set_id);
CREATE INDEX idx_revisions_student ON student_revisions (student_id);

CREATE INDEX idx_students_status ON students (record_status);
CREATE INDEX idx_students_name ON students (name_latin COLLATE NOCASE);

-- Tidak ada penghapusan permanen mahasiswa di V1 (§3.6E).
CREATE TRIGGER students_no_delete BEFORE DELETE ON students
BEGIN SELECT RAISE(ABORT, 'record mahasiswa tidak boleh dihapus; gunakan penonaktifan'); END;
