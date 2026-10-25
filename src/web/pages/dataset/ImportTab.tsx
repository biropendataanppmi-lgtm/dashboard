import { useState } from 'react';
import { IMPORT_MODES, IMPORT_MODE_LABELS, IMPORT_LIMITS, type ImportMode } from '../../../shared/columns';
import { api, postJson, type ApiError } from '../../api';
import { Badge, ErrorState, IssueList, useToast } from '../../components/ui';
import { fmt, fmtTime } from '../../format';

interface Issue {
  severity: 'error' | 'warning';
  code: string;
  column?: string;
  message: string;
}
interface Preview {
  jobId: number;
  fileName: string;
  mode: ImportMode;
  status: string;
  expiresAt: string;
  summary: { rowsRead: number; create: number; update: number; unchanged: number; held: number; withWarnings: number; duplicateCandidates: number; clearedByColumn: Record<string, number> };
  fileIssues: Issue[];
  needsWarningConfirmation: boolean;
  rows: { rowNumber: number; studentCode: string | null; name: string | null; action: string; changedColumns: string[]; clearedColumns: string[]; issues: Issue[] }[];
}

const MODE_HELP: Record<ImportMode, string> = {
  add_only: 'Untuk mahasiswa baru dari spreadsheet. ID yang sudah ada di database ditolak, tidak ditimpa.',
  update_existing: 'Memperbarui record yang sudah ada. ID yang tidak ditemukan ditahan; tidak membuat record baru.',
  full_sync: 'Menambah record baru dan memperbarui yang ada. Record yang tidak ada di file tidak dihapus atau dinonaktifkan.',
};
const ACTION_LABEL: Record<string, [string, 'ok' | 'warn' | 'err' | 'neutral']> = {
  create: ['Baru', 'ok'],
  update: ['Diperbarui', 'ok'],
  unchanged: ['Tidak berubah', 'neutral'],
  held: ['Ditahan', 'err'],
};

export function ImportTab() {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<ImportMode>('add_only');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [includeWarnings, setIncludeWarnings] = useState(true);
  const [rowFilter, setRowFilter] = useState<'issues' | 'all'>('issues');

  const validate = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    setPreview(null);
    setConfirmed(false);
    try {
      const fd = new FormData();
      fd.set('file', file);
      fd.set('mode', mode);
      setPreview(await api<Preview>('/imports', { method: 'POST', body: fd }));
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      const r = await postJson<{ created: number; updated: number; version: number; skippedWarningRows: number }>(`/imports/${preview.jobId}/apply`, {
        confirmWarnings: confirmed,
        includeWarningRows: includeWarnings,
      });
      // Hasil hanya diumumkan setelah backend memastikan penerapan (§3.6A).
      toast('ok', `Impor diterapkan: ${fmt(r.created)} record baru, ${fmt(r.updated)} diperbarui. Versi dataset sekarang ${r.version}.`);
      setPreview(null);
      setFile(null);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      await postJson(`/imports/${preview.jobId}/cancel`, {});
      toast('ok', 'Preview impor dibatalkan. Tidak ada data yang berubah.');
      setPreview(null);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setBusy(false);
    }
  };

  const s = preview?.summary;
  const fileErrors = preview?.fileIssues.filter((i) => i.severity === 'error') ?? [];
  const fileWarnings = preview?.fileIssues.filter((i) => i.severity === 'warning') ?? [];
  const applicable = s ? s.create + s.update : 0;
  // Baris yang ditahan ditampilkan lebih dulu karena tidak akan diterapkan.
  const rows = (preview?.rows.filter((r) => rowFilter === 'all' || r.issues.length > 0 || r.action === 'held') ?? []).sort(
    (a, b) => Number(b.action === 'held') - Number(a.action === 'held') || a.rowNumber - b.rowNumber,
  );

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section className="card">
        <h2>1. Pilih file dan mode impor</h2>
        <p className="card-sub">
          CSV UTF-8, satu baris per mahasiswa, header sesuai format impor. Maksimal {IMPORT_LIMITS.maxBytes / 1024 / 1024} MB dan {fmt(IMPORT_LIMITS.maxRows)} baris. Sel kosong
          berarti nilai dikosongkan; kolom yang tidak ada di file tidak diubah.
        </p>
        <div className="field">
          <label htmlFor="imp-file">File CSV</label>
          <input id="imp-file" type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 8 }}>
          <legend className="small" style={{ fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }}>
            Mode impor
          </legend>
          {IMPORT_MODES.map((m) => (
            <label key={m} style={{ display: 'flex', gap: 8, alignItems: 'start' }}>
              <input type="radio" name="mode" value={m} checked={mode === m} onChange={() => setMode(m)} />
              <span>
                <b>{IMPORT_MODE_LABELS[m]}</b>
                <br />
                <span className="muted small">{MODE_HELP[m]}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <div className="btn-row">
          <button className="btn primary" disabled={!file || busy} onClick={validate}>
            {busy && !preview ? 'Memvalidasi…' : 'Validasi file'}
          </button>
          <span className="muted small">Validasi tidak mengubah data. Perubahan baru terjadi setelah konfirmasi.</span>
        </div>
      </section>

      {error && <ErrorState error={error} />}

      {preview && s && (
        <section className="card">
          <h2>2. Tinjau hasil validasi</h2>
          <p className="card-sub">
            {preview.fileName} · {IMPORT_MODE_LABELS[preview.mode]} · impor #{preview.jobId} · berlaku sampai {fmtTime(preview.expiresAt)}
          </p>
          {fileErrors.length > 0 ? (
            <div className="notice err">
              <b>File ditolak sebelum baris diperiksa.</b>
              <IssueList issues={fileErrors} />
            </div>
          ) : (
            <>
              <div className="kpis">
                {[
                  ['Baris dibaca', s.rowsRead],
                  ['Record baru', s.create],
                  ['Diperbarui', s.update],
                  ['Tidak berubah', s.unchanged],
                  ['Dengan peringatan', s.withWarnings],
                  ['Ditahan (error)', s.held],
                  ['Kandidat duplikat', s.duplicateCandidates],
                ].map(([label, v]) => (
                  <div className="kpi" key={label as string}>
                    <span className="label">{label}</span>
                    <span className="value" style={{ fontSize: 22 }}>
                      {fmt(v as number)}
                    </span>
                  </div>
                ))}
              </div>
              {Object.keys(s.clearedByColumn).length > 0 && (
                <div className="notice warn">
                  <b>Nilai yang akan dikosongkan</b>
                  <span>
                    {Object.entries(s.clearedByColumn)
                      .map(([c, n]) => `${c}: ${fmt(n)}`)
                      .join(' · ')}
                  </span>
                </div>
              )}
              {fileWarnings.length > 0 && (
                <div className="notice warn">
                  <b>Peringatan tingkat file</b>
                  <IssueList issues={fileWarnings} />
                </div>
              )}
              <div className="btn-row">
                <span className="small" style={{ fontWeight: 600 }}>
                  Tampilkan:
                </span>
                <button className={`btn${rowFilter === 'issues' ? ' primary' : ''}`} onClick={() => setRowFilter('issues')}>
                  Baris bermasalah/berperingatan
                </button>
                <button className={`btn${rowFilter === 'all' ? ' primary' : ''}`} onClick={() => setRowFilter('all')}>
                  Semua baris
                </button>
              </div>
              {rows.length === 0 ? (
                <div className="notice ok">Semua baris valid tanpa peringatan.</div>
              ) : (
                <div className="table-wrap" style={{ maxHeight: 420, overflowY: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th className="num">Baris</th>
                        <th>ID</th>
                        <th>Nama</th>
                        <th>Hasil</th>
                        <th>Kolom berubah</th>
                        <th>Temuan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 500).map((r) => (
                        <tr key={r.rowNumber}>
                          <td className="num">{r.rowNumber}</td>
                          <td className="mono">{r.studentCode ?? '—'}</td>
                          <td>{r.name ?? '—'}</td>
                          <td>
                            <Badge tone={ACTION_LABEL[r.action][1]}>{ACTION_LABEL[r.action][0]}</Badge>
                          </td>
                          <td className="small">{r.changedColumns.length ? r.changedColumns.join(', ') : '—'}</td>
                          <td className="small">
                            <IssueList issues={r.issues} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {rows.length > 500 && <span className="muted small">Menampilkan 500 baris pertama dari {fmt(rows.length)}.</span>}

              <h2 style={{ marginTop: 8 }}>3. Konfirmasi penerapan</h2>
              {s.held > 0 && <div className="notice info">{fmt(s.held)} baris ditahan dan tidak akan diterapkan. Baris ini tercatat di tab Baris Bermasalah.</div>}
              {preview.needsWarningConfirmation && (
                <div style={{ display: 'grid', gap: 8 }}>
                  <label style={{ display: 'flex', gap: 8 }}>
                    <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                    <span>Saya sudah meninjau semua peringatan di atas.</span>
                  </label>
                  {s.withWarnings > 0 && (
                    <label style={{ display: 'flex', gap: 8 }}>
                      <input type="checkbox" checked={includeWarnings} onChange={(e) => setIncludeWarnings(e.target.checked)} />
                      <span>Terapkan juga {fmt(s.withWarnings)} baris yang memiliki peringatan (jika tidak dicentang, hanya baris tanpa peringatan yang diterapkan).</span>
                    </label>
                  )}
                </div>
              )}
              <div className="btn-row">
                <button className="btn primary" disabled={busy || applicable === 0 || (preview.needsWarningConfirmation && !confirmed)} onClick={apply}>
                  {busy ? 'Menerapkan…' : `Terapkan perubahan`}
                </button>
                <button className="btn" disabled={busy} onClick={cancel}>
                  Batalkan
                </button>
                {applicable === 0 && <span className="muted small">Tidak ada record baru atau perubahan untuk diterapkan.</span>}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
