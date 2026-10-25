// Kontrak kolom CSV impor (Dokumen Induk §4.2).
// Nama header CSV adalah kontrak publik; nama field adalah kolom database.

export type FieldKind = 'id' | 'text' | 'email' | 'phone' | 'passport' | 'date' | 'arrival' | 'gender' | 'category';

export interface ColumnDef {
  header: string;
  field: StudentField;
  label: string;
  kind: FieldKind;
  /** Data pribadi yang dibatasi (§5.6): tidak pernah keluar dari endpoint analitik. */
  sensitive: boolean;
  /** Wajib ada isinya agar record dapat diterapkan (identitas minimum §4.5). */
  required: boolean;
  /** Kolom analitik: kosong menghasilkan warning, bukan error (§4.4). */
  analytic: boolean;
}

export const STUDENT_FIELDS = [
  'student_code',
  'email',
  'gender',
  'name_latin',
  'name_arab',
  'passport_no',
  'birth_place',
  'birth_date',
  'origin_regency',
  'origin_province',
  'whatsapp_no',
  'phone_no',
  'arrival_date',
  'egypt_domicile',
  'kekeluargaan',
  'education_level',
  'faculty',
  'major',
  'mediator',
] as const;

export type StudentField = (typeof STUDENT_FIELDS)[number];

/** Field yang dapat diubah lewat impor atau penyuntingan (student_code tidak pernah berubah). */
export type EditableField = Exclude<StudentField, 'student_code'>;

export const COLUMNS: ColumnDef[] = [
  { header: 'ID_Mahasiswa', field: 'student_code', label: 'ID Mahasiswa', kind: 'id', sensitive: false, required: true, analytic: false },
  { header: 'Email_Address', field: 'email', label: 'Email', kind: 'email', sensitive: true, required: false, analytic: false },
  { header: 'Jenis_Kelamin', field: 'gender', label: 'Jenis kelamin', kind: 'gender', sensitive: false, required: false, analytic: true },
  { header: 'Nama_Lengkap_Latin', field: 'name_latin', label: 'Nama lengkap (Latin)', kind: 'text', sensitive: false, required: true, analytic: false },
  { header: 'Nama_Lengkap_Arab', field: 'name_arab', label: 'Nama lengkap (Arab)', kind: 'text', sensitive: false, required: false, analytic: false },
  { header: 'Nomor_Paspor', field: 'passport_no', label: 'Nomor paspor', kind: 'passport', sensitive: true, required: false, analytic: false },
  { header: 'Tempat_Lahir', field: 'birth_place', label: 'Tempat lahir', kind: 'text', sensitive: true, required: false, analytic: false },
  { header: 'Tanggal_Lahir', field: 'birth_date', label: 'Tanggal lahir', kind: 'date', sensitive: true, required: false, analytic: false },
  { header: 'Domisili_Indonesia_Kabupaten_Kota', field: 'origin_regency', label: 'Kabupaten/kota asal', kind: 'category', sensitive: false, required: false, analytic: true },
  { header: 'Domisili_Indonesia_Provinsi', field: 'origin_province', label: 'Provinsi asal', kind: 'category', sensitive: false, required: false, analytic: true },
  { header: 'Nomor_WhatsApp_Aktif', field: 'whatsapp_no', label: 'Nomor WhatsApp', kind: 'phone', sensitive: true, required: false, analytic: false },
  { header: 'Nomor_Telepon_Aktif', field: 'phone_no', label: 'Nomor telepon', kind: 'phone', sensitive: true, required: false, analytic: false },
  { header: 'Kedatangan_di_Mesir', field: 'arrival_date', label: 'Kedatangan pertama di Mesir', kind: 'arrival', sensitive: false, required: false, analytic: true },
  { header: 'Domisili_di_Mesir', field: 'egypt_domicile', label: 'Domisili di Mesir', kind: 'category', sensitive: false, required: false, analytic: true },
  { header: 'Kekeluargaan_Konsulat', field: 'kekeluargaan', label: 'Kekeluargaan', kind: 'category', sensitive: false, required: false, analytic: true },
  { header: 'Jenjang_Pendidikan', field: 'education_level', label: 'Jenjang pendidikan', kind: 'category', sensitive: false, required: false, analytic: true },
  { header: 'Fakultas', field: 'faculty', label: 'Fakultas', kind: 'category', sensitive: false, required: false, analytic: true },
  { header: 'Jurusan', field: 'major', label: 'Jurusan', kind: 'category', sensitive: false, required: false, analytic: true },
  { header: 'Mediator', field: 'mediator', label: 'Mediator', kind: 'text', sensitive: true, required: false, analytic: false },
];

export const COLUMN_BY_HEADER = new Map(COLUMNS.map((c) => [c.header, c]));
export const COLUMN_BY_FIELD = new Map(COLUMNS.map((c) => [c.field, c]));
export const EDITABLE_FIELDS = STUDENT_FIELDS.filter((f): f is EditableField => f !== 'student_code');

/** Kolom yang aman ditampilkan di tabel utama Data Mahasiswa (§3.6B). */
export const LIST_FIELDS: StudentField[] = ['student_code', 'name_latin', 'kekeluargaan', 'education_level', 'faculty'];

export type StudentValues = Partial<Record<EditableField, string | null>>;

export const IMPORT_MODES = ['add_only', 'update_existing', 'full_sync'] as const;
export type ImportMode = (typeof IMPORT_MODES)[number];

export const IMPORT_MODE_LABELS: Record<ImportMode, string> = {
  add_only: 'Add Only — tambah record baru',
  update_existing: 'Update Existing — perbarui record yang ada',
  full_sync: 'Full Sync — tambah dan perbarui',
};

/** Alasan penonaktifan (Jawaban H7: pulang dibedakan dari data salah). */
export const DEACTIVATION_REASONS = {
  pulang_lulus: 'Pulang / lulus / tidak lagi di Mesir',
  data_salah: 'Data salah atau duplikat',
  pembatalan_impor: 'Pembatalan impor',
  lainnya: 'Lainnya',
} as const;
export type DeactivationReason = keyof typeof DEACTIVATION_REASONS;

/** Batas impor sementara (§8.2 masih terbuka). Mudah diubah di satu tempat. */
export const IMPORT_LIMITS = {
  maxBytes: 5 * 1024 * 1024,
  maxRows: 5000,
  previewTtlHours: 24,
};
