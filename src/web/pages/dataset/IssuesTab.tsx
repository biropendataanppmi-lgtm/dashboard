import { useState } from 'react';
import { postJson, useApi } from '../../api';
import { EmptyState, ErrorState, Loading, useToast } from '../../components/ui';
import { fmtTime } from '../../format';

interface IssueRow {
  id: number;
  job_id: number;
  row_number: number;
  student_code: string | null;
  issue_code: string;
  column_name: string | null;
  message: string;
  review_status: 'belum_ditinjau' | 'perlu_perbaikan' | 'selesai';
  created_at: string;
  actor_email: string;
  file_name: string;
}

const STATUS = { belum_ditinjau: 'Belum ditinjau', perlu_perbaikan: 'Perlu perbaikan', selesai: 'Selesai ditangani' } as const;

export function IssuesTab() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const res = useApi<IssueRow[]>(`/row-issues${status ? `?status=${status}` : ''}`);
  const update = async (id: number, s: string) => {
    try {
      await postJson(`/row-issues/${id}`, { status: s }, 'PATCH');
      res.reload();
    } catch (e) {
      toast('err', (e as Error).message);
    }
  };
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <p className="muted small" style={{ margin: 0 }}>
        Baris yang ditahan saat impor karena error. Tabel ini tidak memuat data pribadi; perbaiki baris di spreadsheet lalu impor ulang.
      </p>
      <div className="filter-bar">
        <div className="field">
          <label htmlFor="i-status">Status pemeriksaan</label>
          <select id="i-status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Semua</option>
            {Object.entries(STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>
      {res.loading && !res.data && <Loading />}
      {res.error && <ErrorState error={res.error} onRetry={res.reload} />}
      {res.data && res.data.length === 0 && <EmptyState title="Tidak ada baris bermasalah" />}
      {res.data && res.data.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Impor</th>
                <th className="num">Baris</th>
                <th>ID</th>
                <th>Kolom</th>
                <th>Alasan penahanan</th>
                <th>Waktu impor</th>
                <th>Pengimpor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {res.data.map((r) => (
                <tr key={r.id}>
                  <td>
                    #{r.job_id}
                    <div className="muted small">{r.file_name}</div>
                  </td>
                  <td className="num">{r.row_number}</td>
                  <td className="mono">{r.student_code ?? '—'}</td>
                  <td className="mono small">{r.column_name ?? '—'}</td>
                  <td>{r.message}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtTime(r.created_at)}</td>
                  <td>{r.actor_email}</td>
                  <td>
                    <select aria-label={`Status baris ${r.row_number}`} value={r.review_status} onChange={(e) => update(r.id, e.target.value)}>
                      {Object.entries(STATUS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
