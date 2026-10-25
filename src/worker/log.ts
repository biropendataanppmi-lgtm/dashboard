// Penulisan log aktivitas (§3.8). Ringkasan tidak boleh memuat password, token, isi CSV, atau data pribadi.

export type LogStatus = 'success' | 'failure' | 'denied';

export interface LogEntry {
  actor: string | null;
  action: string;
  status: LogStatus;
  summary: string;
  reason?: string | null;
  target?: string | null;
  versionBefore?: number | null;
  versionAfter?: number | null;
}

export function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function logStatement(db: D1Database, e: LogEntry): D1PreparedStatement {
  return db
    .prepare(
      `INSERT INTO activity_logs (at, actor_email, action, status, summary, reason, target, version_before, version_after)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(nowIso(), e.actor, e.action, e.status, e.summary, e.reason ?? null, e.target ?? null, e.versionBefore ?? null, e.versionAfter ?? null);
}

export async function writeLog(db: D1Database, e: LogEntry): Promise<void> {
  await logStatement(db, e).run();
}

export const LOG_ACTIONS: Record<string, string> = {
  login: 'Login',
  login_ditolak: 'Login ditolak',
  impor_validasi: 'Validasi impor CSV',
  impor_terapkan: 'Penerapan impor',
  impor_batal: 'Pembatalan preview impor',
  sunting_record: 'Penyuntingan record',
  nonaktifkan_record: 'Penonaktifan record',
  aktifkan_record: 'Pengaktifan kembali record',
  pembatalan_perubahan: 'Pembatalan perubahan dataset',
  lihat_detail: 'Membuka detail record',
  ubah_cakupan: 'Perubahan keterangan cakupan data',
  status_baris_bermasalah: 'Perubahan status baris bermasalah',
};
