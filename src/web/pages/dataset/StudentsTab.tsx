import { useEffect, useState } from 'react';
import { COLUMNS, DEACTIVATION_REASONS, type DeactivationReason, type EditableField } from '../../../shared/columns';
import { api, postJson, useApi, type ApiError } from '../../api';
import { Badge, EmptyState, ErrorState, IssueList, Loading, Modal, useToast } from '../../components/ui';
import { fmt, fmtTime } from '../../format';

interface ListRow {
  student_code: string;
  name_latin: string;
  kekeluargaan: string | null;
  education_level: string | null;
  faculty: string | null;
  record_status: 'active' | 'inactive';
}
type Detail = Record<EditableField, string | null> & {
  student_code: string;
  record_status: 'active' | 'inactive';
  inactive_reason: DeactivationReason | null;
  inactive_note: string | null;
  row_version: number;
  created_at: string;
  updated_at: string;
};

export function StudentsTab() {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'all'>('active');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);
  const res = useApi<{ rows: ListRow[]; total: number; page: number; pageSize: number }>(`/students?status=${status}&page=${page}&q=${encodeURIComponent(query)}`);

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="filter-bar">
        <div className="field" style={{ flex: '1 1 260px' }}>
          <label htmlFor="s-q">Cari ID atau nama</label>
          <input id="s-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="contoh: 25-0128 atau nama" />
        </div>
        <div className="field">
          <label htmlFor="s-status">Status data</label>
          <select id="s-status" value={status} onChange={(e) => (setStatus(e.target.value as typeof status), setPage(1))}>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
            <option value="all">Semua</option>
          </select>
        </div>
      </div>
      {res.loading && !res.data && <Loading />}
      {res.error && <ErrorState error={res.error} onRetry={res.reload} />}
      {res.data && res.data.rows.length === 0 && <EmptyState title={query ? 'Tidak ada record yang cocok' : 'Belum ada record'}>{query ? 'Periksa ejaan ID atau nama.' : 'Impor CSV untuk menambahkan data.'}</EmptyState>}
      {res.data && res.data.rows.length > 0 && (
        <>
          <span className="muted small">{fmt(res.data.total)} record. Nomor paspor, email, dan telepon hanya terlihat di detail.</span>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID Mahasiswa</th>
                  <th>Nama lengkap</th>
                  <th>Kekeluargaan</th>
                  <th>Jenjang</th>
                  <th>Fakultas</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {res.data.rows.map((r) => (
                  <tr key={r.student_code} className="clickable" onClick={() => setOpen(r.student_code)}>
                    <td className="mono">
                      <button className="btn link mono" onClick={() => setOpen(r.student_code)}>
                        {r.student_code}
                      </button>
                    </td>
                    <td>{r.name_latin}</td>
                    <td>{r.kekeluargaan ?? <span className="muted">belum diisi</span>}</td>
                    <td>{r.education_level ?? <span className="muted">belum diisi</span>}</td>
                    <td>{r.faculty ?? <span className="muted">belum diisi</span>}</td>
                    <td>{r.record_status === 'active' ? <Badge tone="ok">Aktif</Badge> : <Badge tone="neutral">Nonaktif</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="btn-row">
            <button className="btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Sebelumnya
            </button>
            <span className="muted small">
              Halaman {page} dari {Math.max(1, Math.ceil(res.data.total / res.data.pageSize))}
            </span>
            <button className="btn" disabled={page * res.data.pageSize >= res.data.total} onClick={() => setPage((p) => p + 1)}>
              Berikutnya
            </button>
          </div>
        </>
      )}
      {open && <StudentDetail code={open} onClose={() => setOpen(null)} onChanged={res.reload} />}
    </div>
  );
}

function StudentDetail({ code, onClose, onChanged }: { code: string; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const det = useApi<Detail>(`/students/${encodeURIComponent(code)}`);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Record<EditableField, string>>>({});
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiError | null>(null);
  const [statusDialog, setStatusDialog] = useState(false);

  const startEdit = () => {
    const d = det.data!;
    setForm(Object.fromEntries(COLUMNS.filter((c) => c.field !== 'student_code').map((c) => [c.field, d[c.field as EditableField] ?? ''])));
    setEditing(true);
    setErr(null);
  };

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await postJson<{ changedFields: string[] }>(`/students/${encodeURIComponent(code)}`, { rowVersion: det.data!.row_version, values: form, reason: reason || null }, 'PUT');
      toast('ok', r.changedFields.length ? `Perubahan disimpan (${r.changedFields.length} kolom).` : 'Tidak ada perubahan untuk disimpan.');
      setEditing(false);
      det.reload();
      onChanged();
    } catch (e) {
      setErr(e as ApiError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Detail record ${code}`} onClose={onClose}>
      {det.loading && <Loading />}
      {det.error && <ErrorState error={det.error} onRetry={det.reload} />}
      {det.data && !editing && (
        <div className="detail-panel">
          <div className="btn-row">
            {det.data.record_status === 'active' ? <Badge tone="ok">Aktif</Badge> : <Badge tone="neutral">Nonaktif</Badge>}
            {det.data.inactive_reason && (
              <span className="small muted">
                {DEACTIVATION_REASONS[det.data.inactive_reason]}
                {det.data.inactive_note ? ` — ${det.data.inactive_note}` : ''}
              </span>
            )}
          </div>
          <dl className="kv">
            {COLUMNS.map((c) => (
              <div key={c.field} style={{ display: 'contents' }}>
                <dt>
                  {c.label}
                  {c.sensitive && <span className="muted small"> · terbatas</span>}
                </dt>
                <dd dir={c.field === 'name_arab' ? 'auto' : undefined}>{(c.field === 'student_code' ? det.data!.student_code : det.data![c.field as EditableField]) ?? <span className="muted">belum diisi</span>}</dd>
              </div>
            ))}
            <dt>Dibuat</dt>
            <dd>{fmtTime(det.data.created_at)}</dd>
            <dt>Terakhir diubah</dt>
            <dd>{fmtTime(det.data.updated_at)}</dd>
          </dl>
          <p className="muted small" style={{ margin: 0 }}>
            Pembukaan detail ini tercatat di log aktivitas.
          </p>
          <div className="btn-row">
            <button className="btn primary" onClick={startEdit}>
              Sunting
            </button>
            <button className="btn" onClick={() => setStatusDialog(true)}>
              {det.data.record_status === 'active' ? 'Nonaktifkan' : 'Aktifkan kembali'}
            </button>
            <button className="btn" onClick={onClose}>
              Tutup
            </button>
          </div>
        </div>
      )}
      {det.data && editing && (
        <div className="detail-panel">
          <span className="muted small">ID Mahasiswa tidak dapat diubah. Kosongkan isian untuk menghapus nilai.</span>
          {COLUMNS.filter((c) => c.field !== 'student_code').map((c) => (
            <div className="field" key={c.field}>
              <label htmlFor={`e-${c.field}`}>
                {c.label}
                {c.required ? ' *' : ''}
              </label>
              <input
                id={`e-${c.field}`}
                type="text"
                dir={c.field === 'name_arab' ? 'auto' : undefined}
                value={form[c.field as EditableField] ?? ''}
                placeholder={c.kind === 'date' ? 'YYYY-MM-DD' : c.kind === 'arrival' ? 'YYYY atau YYYY-MM-DD' : undefined}
                onChange={(e) => setForm((f) => ({ ...f, [c.field]: e.target.value }))}
              />
            </div>
          ))}
          <div className="field">
            <label htmlFor="e-reason">Alasan perubahan (opsional, tercatat di log)</label>
            <input id="e-reason" type="text" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          {err && (
            <div className="notice err">
              <b>{err.message}</b>
              {Array.isArray(err.details) && <IssueList issues={err.details as any[]} />}
            </div>
          )}
          <div className="btn-row">
            <button className="btn primary" disabled={busy} onClick={save}>
              {busy ? 'Menyimpan…' : 'Simpan'}
            </button>
            <button className="btn" disabled={busy} onClick={() => setEditing(false)}>
              Batal
            </button>
          </div>
        </div>
      )}
      {statusDialog && det.data && (
        <StatusDialog
          code={code}
          active={det.data.record_status === 'active'}
          onClose={() => setStatusDialog(false)}
          onDone={() => {
            setStatusDialog(false);
            det.reload();
            onChanged();
          }}
        />
      )}
    </Modal>
  );
}

function StatusDialog({ code, active, onClose, onDone }: { code: string; active: boolean; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [reason, setReason] = useState<DeactivationReason | ''>('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api(`/students/${encodeURIComponent(code)}/status`, { method: 'POST', body: JSON.stringify({ active: !active, reason: reason || undefined, note }) });
      toast('ok', active ? `Record ${code} dinonaktifkan.` : `Record ${code} diaktifkan kembali.`);
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const selectable = Object.entries(DEACTIVATION_REASONS).filter(([k]) => k !== 'pembatalan_impor');
  return (
    <Modal title={active ? `Nonaktifkan ${code}?` : `Aktifkan kembali ${code}?`} onClose={onClose}>
      <p style={{ margin: 0 }}>
        {active
          ? 'Record tidak dihapus. Record nonaktif tidak dihitung di statistik dan disembunyikan dari pencarian standar, dan dapat diaktifkan kembali.'
          : 'Record akan kembali dihitung di statistik aktif. Pastikan data sudah diperiksa.'}
      </p>
      {active && (
        <div className="field">
          <label htmlFor="st-reason">Alasan</label>
          <select id="st-reason" value={reason} onChange={(e) => setReason(e.target.value as DeactivationReason)}>
            <option value="">Pilih alasan</option>
            {selectable.map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="field">
        <label htmlFor="st-note">{active ? 'Keterangan (wajib jika "Lainnya")' : 'Alasan pengaktifan kembali'}</label>
        <textarea id="st-note" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {err && <div className="notice err">{err}</div>}
      <div className="btn-row">
        <button className={`btn ${active ? 'danger' : 'primary'}`} disabled={busy || (active && !reason)} onClick={submit}>
          {active ? 'Nonaktifkan' : 'Aktifkan kembali'}
        </button>
        <button className="btn" onClick={onClose}>
          Batal
        </button>
      </div>
    </Modal>
  );
}
