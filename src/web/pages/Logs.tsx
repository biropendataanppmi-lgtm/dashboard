import { useState } from 'react';
import { useApi } from '../api';
import { Badge, EmptyState, ErrorState, Loading, PageHeader } from '../components/ui';
import { fmtTime } from '../format';

const ACTIONS: Record<string, string> = {
  login: 'Login',
  login_ditolak: 'Login ditolak',
  impor_validasi: 'Validasi impor',
  impor_terapkan: 'Penerapan impor',
  impor_batal: 'Pembatalan preview',
  sunting_record: 'Penyuntingan record',
  nonaktifkan_record: 'Penonaktifan',
  aktifkan_record: 'Pengaktifan kembali',
  pembatalan_perubahan: 'Pembatalan perubahan',
  lihat_detail: 'Buka detail record',
  ubah_cakupan: 'Ubah cakupan data',
  status_baris_bermasalah: 'Status baris bermasalah',
};

interface LogRow {
  id: number;
  at: string;
  actor_email: string | null;
  action: string;
  status: 'success' | 'failure' | 'denied';
  summary: string;
  reason: string | null;
  version_before: number | null;
  version_after: number | null;
}

export function LogsPage() {
  const [f, setF] = useState({ actor: '', action: '', status: '', from: '', to: '', page: 1 });
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v !== '' && v !== 1).map(([k, v]) => [k, String(v)])).toString();
  const res = useApi<{ rows: LogRow[]; page: number; actors: string[] }>(`/logs${qs ? `?${qs}` : ''}`);
  const upd = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v, page: 1 }));

  return (
    <>
      <PageHeader title="Log Aktivitas" description="Jejak audit tindakan administrator dan proses penting. Log dibuat backend dan tidak dapat diubah atau dihapus dari dashboard." />
      <div className="filter-bar">
        <div className="field">
          <label htmlFor="l-actor">Administrator</label>
          <select id="l-actor" value={f.actor} onChange={(e) => upd('actor', e.target.value)}>
            <option value="">Semua</option>
            {res.data?.actors.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="l-action">Jenis aktivitas</label>
          <select id="l-action" value={f.action} onChange={(e) => upd('action', e.target.value)}>
            <option value="">Semua</option>
            {Object.entries(ACTIONS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="l-status">Status</label>
          <select id="l-status" value={f.status} onChange={(e) => upd('status', e.target.value)}>
            <option value="">Semua</option>
            <option value="success">Berhasil</option>
            <option value="failure">Gagal</option>
            <option value="denied">Ditolak</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="l-from">Dari tanggal</label>
          <input id="l-from" type="date" value={f.from} onChange={(e) => upd('from', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="l-to">Sampai tanggal</label>
          <input id="l-to" type="date" value={f.to} onChange={(e) => upd('to', e.target.value)} />
        </div>
        <span className="filter-note">Rentang tanggal memakai waktu UTC.</span>
      </div>
      {res.loading && !res.data && <Loading />}
      {res.error && <ErrorState error={res.error} onRetry={res.reload} />}
      {res.data && res.data.rows.length === 0 && <EmptyState title="Tidak ada aktivitas yang cocok dengan filter" />}
      {res.data && res.data.rows.length > 0 && (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Administrator</th>
                  <th>Aktivitas</th>
                  <th>Status</th>
                  <th>Ringkasan</th>
                  <th>Alasan</th>
                  <th>Versi</th>
                </tr>
              </thead>
              <tbody>
                {res.data.rows.map((r) => (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtTime(r.at)}</td>
                    <td>{r.actor_email ?? '—'}</td>
                    <td>{ACTIONS[r.action] ?? r.action}</td>
                    <td>
                      <Badge tone={r.status === 'success' ? 'ok' : r.status === 'denied' ? 'warn' : 'err'}>
                        {r.status === 'success' ? 'Berhasil' : r.status === 'denied' ? 'Ditolak' : 'Gagal'}
                      </Badge>
                    </td>
                    <td>{r.summary}</td>
                    <td>{r.reason ?? '—'}</td>
                    <td className="num" style={{ whiteSpace: 'nowrap' }}>
                      {r.version_before != null || r.version_after != null ? `${r.version_before ?? '—'} → ${r.version_after ?? '—'}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="btn-row">
            <button className="btn" disabled={f.page <= 1} onClick={() => setF((s) => ({ ...s, page: s.page - 1 }))}>
              Sebelumnya
            </button>
            <span className="muted small">Halaman {f.page}</span>
            <button className="btn" disabled={res.data.rows.length < 100} onClick={() => setF((s) => ({ ...s, page: s.page + 1 }))}>
              Berikutnya
            </button>
          </div>
        </>
      )}
    </>
  );
}
