-- Skema awal Sistem Pendataan PPMI Mesir.
-- Model data (audit E1 opsi B, Jawaban H1): satu tabel mahasiswa yang selalu terkini,
-- setiap perubahan dicatat sebagai revisi di dalam paket perubahan (change_sets).
-- Nomor versi dataset = id paket perubahan terakhir.

-- Penanda versi dataset aktif. Dipakai sebagai penjaga konkurensi saat penerapan.
CREATE TABLE dataset_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  scope_description TEXT
);
INSERT INTO dataset_state (id, version, scope_description) VALUES (1, 0, NULL);

CREATE TABLE students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,          -- primary key internal (§4.6)
  student_code TEXT NOT NULL UNIQUE CHECK (student_code GLOB '[0-9][0-9]-[0-9][0-9][0-9][0-9]'),
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
  -- Kolom turunan untuk analitik (dihitung backend dari nilai asli).
  gender_code TEXT CHECK (gender_code IN ('L', 'P')),
  arrival_year INTEGER,
  record_status TEXT NOT NULL DEFAULT 'active' CHECK (record_status IN ('active', 'inactive')),
  inactive_reason TEXT,
  inactive_note TEXT,
  row_version INTEGER NOT NULL DEFAULT 1,        -- penguncian optimistis untuk penyuntingan
  created_change_set_id INTEGER NOT NULL,
  last_change_set_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_students_status ON students (record_status);
CREATE INDEX idx_students_name ON students (name_latin COLLATE NOCASE);

CREATE TABLE change_sets (
  id INTEGER PRIMARY KEY,                        -- = nomor versi dataset sesudah perubahan
  kind TEXT NOT NULL CHECK (kind IN ('import', 'edit', 'deactivate', 'reactivate', 'revert', 'scope')),
  actor_email TEXT NOT NULL,
  created_at TEXT NOT NULL,
  import_job_id INTEGER,
  reverts_change_set_id INTEGER,
  reverted_by_change_set_id INTEGER,
  summary_json TEXT NOT NULL,                    -- hitungan saja, tanpa data pribadi
  reason TEXT
);

-- Nilai sebelum/sesudah hanya untuk field yang berubah. Memuat data pribadi: hanya
-- dibaca backend untuk pembatalan, tidak pernah dikirim utuh ke frontend.
CREATE TABLE student_revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  change_set_id INTEGER NOT NULL REFERENCES change_sets (id),
  student_id INTEGER NOT NULL REFERENCES students (id),
  op TEXT NOT NULL CHECK (op IN ('create', 'update', 'status')),
  before_json TEXT,
  after_json TEXT NOT NULL
);
CREATE INDEX idx_revisions_change_set ON student_revisions (change_set_id);
CREATE INDEX idx_revisions_student ON student_revisions (student_id);

CREATE TABLE import_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_name TEXT NOT NULL,
  file_sha256 TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('add_only', 'update_existing', 'full_sync')),
  status TEXT NOT NULL CHECK (status IN ('previewed', 'applied', 'cancelled', 'expired', 'failed')),
  base_version INTEGER NOT NULL,
  actor_email TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  finished_at TEXT,
  summary_json TEXT NOT NULL,
  file_issues_json TEXT NOT NULL,
  present_fields_json TEXT NOT NULL,
  change_set_id INTEGER
);
CREATE INDEX idx_import_jobs_sha ON import_jobs (file_sha256);

-- Staging sementara antara preview dan penerapan. Dihapus setelah diterapkan,
-- dibatalkan, atau kedaluwarsa (audit F-32).
CREATE TABLE import_staging (
  job_id INTEGER NOT NULL REFERENCES import_jobs (id),
  row_number INTEGER NOT NULL,
  student_code TEXT,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'unchanged', 'held')),
  has_warning INTEGER NOT NULL DEFAULT 0,
  changes_json TEXT NOT NULL,
  issues_json TEXT NOT NULL,
  PRIMARY KEY (job_id, row_number)
);

-- Baris bermasalah (§3.6D). Tanpa data pribadi: hanya nomor baris, ID, dan alasan.
CREATE TABLE import_row_issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL REFERENCES import_jobs (id),
  row_number INTEGER NOT NULL,
  student_code TEXT,
  issue_code TEXT NOT NULL,
  column_name TEXT,
  message TEXT NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'belum_ditinjau' CHECK (review_status IN ('belum_ditinjau', 'perlu_perbaikan', 'selesai')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_row_issues_job ON import_row_issues (job_id);

-- Log aktivitas (§3.8). Hanya ditulis backend; tidak ada endpoint ubah/hapus.
CREATE TABLE activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL,
  actor_email TEXT,
  action TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failure', 'denied')),
  summary TEXT NOT NULL,
  reason TEXT,
  target TEXT,
  version_before INTEGER,
  version_after INTEGER
);
CREATE INDEX idx_logs_at ON activity_logs (at);
CREATE INDEX idx_logs_actor ON activity_logs (actor_email);

-- Allowlist administrator (§5.5). Dikelola lewat perintah wrangler, tidak lewat dashboard (§3.7).
CREATE TABLE admin_allowlist (
  email TEXT PRIMARY KEY COLLATE NOCASE,
  display_name TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  added_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  note TEXT
);

-- Pemicu: log tidak dapat diubah atau dihapus, bahkan oleh kode aplikasi.
CREATE TRIGGER activity_logs_no_update BEFORE UPDATE ON activity_logs
BEGIN SELECT RAISE(ABORT, 'activity_logs bersifat append-only'); END;
CREATE TRIGGER activity_logs_no_delete BEFORE DELETE ON activity_logs
BEGIN SELECT RAISE(ABORT, 'activity_logs bersifat append-only'); END;
-- Tidak ada penghapusan permanen mahasiswa di V1 (§3.6E).
CREATE TRIGGER students_no_delete BEFORE DELETE ON students
BEGIN SELECT RAISE(ABORT, 'record mahasiswa tidak boleh dihapus; gunakan penonaktifan'); END;
