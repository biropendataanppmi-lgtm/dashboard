import { useState } from 'react';
import { postJson, useApi } from '../../api';
import { Badge, EmptyState, ErrorState, Loading, Modal, useToast } from '../../components/ui';
import { fmt, fmtTime } from '../../format';

interface ChangeSet {
  id: number;
  kind: 'import' | 'edit' | 'deactivate' | 'reactivate' | 'revert' | 'scope';
  actor_email: string;
  created_at: string;
  import_job_id: number | null;
  reverts_change_set_id: number | null;
  reverted_by_change_set_id: number | null;
  summary: Record<string, any>;
  reason: string | null;
}
interface RevertPlan {
  changeSetId: number;
  total: number;
  applicable: number;
  conflicts: { studentCode: string; laterChangeSetId: number }[];
  effects: { deactivate: number; restoreValues: number; restoreStatus: number };
}

const KIND: Record<ChangeSet['kind'], string> = {
  import: 'Impor CSV',
  edit: 'Penyuntingan',
  deactivate: 'Penonaktifan',
  reactivate: 'Pengaktifan kembali',
  revert: 'Pembatalan',
  scope: 'Cakupan data',
};

function describe(c: ChangeSet): string {
  const s = c.summary;
  switch (c.kind) {
    case 'import':
      return `Impor #${c.import_job_id}: ${fmt(s.created)} baru, ${fmt(s.updated)} diperbarui${s.skippedWarningRows ? `, ${fmt(s.skippedWarningRows)} baris berperingatan dilewati` : ''}`;
    case 'edit':
      return `${s.student}: ${(s.fields ?? []).length} kolom diubah`;
    case 'deactivate':
    case 'reactivate':
      return `${s.student}`;
    case 'revert':
      return `Membatalkan perubahan #${c.reverts_change_set_id} untuk ${fmt(s.reverted)} record${s.skipped ? ` (${fmt(s.skipped)} dilewati)` : ''}`;
    default:
      return '';
  }
}

export function HistoryTab() {
  const res = useApi<ChangeSet[]>('/changes');
  const [target, setTarget] = useState<ChangeSet | null>(null);
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <ScopeEditor />
      <div className="notice info">
        Setiap impor, suntingan, dan penonaktifan menjadi satu versi dataset. Pembatalan mengembalikan nilai lama hanya untuk record yang belum diubah lagi sesudahnya,
        sehingga perubahan yang lebih baru tidak hilang. Record yang dibuat oleh impor yang dibatalkan dinonaktifkan, bukan dihapus, sehingga ID-nya tidak dipakai ulang.
      </div>
      {res.loading && !res.data && <Loading />}
      {res.error && <ErrorState error={res.error} onRetry={res.reload} />}
      {res.data && res.data.length === 0 && <EmptyState title="Belum ada riwayat perubahan">Versi pertama terbentuk setelah impor pertama diterapkan.</EmptyState>}
      {res.data && res.data.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="num">Versi</th>
                <th>Waktu</th>
                <th>Administrator</th>
                <th>Jenis</th>
                <th>Ringkasan</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {res.data.map((c, i) => (
                <tr key={c.id}>
                  <td className="num">{c.id}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtTime(c.created_at)}</td>
                  <td>{c.actor_email}</td>
                  <td>{KIND[c.kind]}</td>
                  <td>
                    {describe(c)}
                    {c.reason && <div className="muted small">Alasan: {c.reason}</div>}
                  </td>
                  <td>
                    {i === 0 && <Badge tone="ok">Aktif</Badge>} {c.reverted_by_change_set_id && <Badge tone="neutral">Dibatalkan oleh #{c.reverted_by_change_set_id}</Badge>}
                  </td>
                  <td>
                    {['import', 'edit', 'deactivate', 'reactivate'].includes(c.kind) && !c.reverted_by_change_set_id && (
                      <button className="btn" onClick={() => setTarget(c)}>
                        Batalkan…
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {target && (
        <RevertDialog
          change={target}
          onClose={() => setTarget(null)}
          onDone={() => {
            setTarget(null);
            res.reload();
          }}
        />
      )}
    </div>
  );
}

function RevertDialog({ change, onClose, onDone }: { change: ChangeSet; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const plan = useApi<RevertPlan>(`/changes/${change.id}/revert-plan`);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await postJson<{ reverted: number; skipped: number; version: number }>(`/changes/${change.id}/revert`, { reason });
      toast('ok', `Perubahan #${change.id} dibatalkan untuk ${fmt(r.reverted)} record. Versi dataset sekarang ${r.version}.`);
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const p = plan.data;
  return (
    <Modal title={`Batalkan perubahan #${change.id}?`} onClose={onClose}>
      {plan.loading && <Loading label="Menghitung dampak pembatalan…" />}
      {plan.error && <ErrorState error={plan.error} onRetry={plan.reload} />}
      {p && (
        <>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {p.effects.deactivate > 0 && <li>{fmt(p.effects.deactivate)} record hasil impor akan dinonaktifkan (tidak dihapus).</li>}
            {p.effects.restoreValues > 0 && <li>{fmt(p.effects.restoreValues)} record dikembalikan ke nilai sebelum perubahan.</li>}
            {p.effects.restoreStatus > 0 && <li>{fmt(p.effects.restoreStatus)} record dikembalikan ke status sebelumnya.</li>}
          </ul>
          {p.conflicts.length > 0 && (
            <div className="notice warn">
              <b>{fmt(p.conflicts.length)} record dilewati karena sudah diubah lagi setelah perubahan ini.</b>
              <span className="small">
                {p.conflicts
                  .slice(0, 20)
                  .map((c) => `${c.studentCode} (versi ${c.laterChangeSetId})`)
                  .join(', ')}
                {p.conflicts.length > 20 ? ', …' : ''}
              </span>
              <span className="small">Periksa record tersebut secara manual jika perlu.</span>
            </div>
          )}
          <div className="field">
            <label htmlFor="rv-reason">Alasan pembatalan (wajib, tercatat di log)</label>
            <textarea id="rv-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          {err && <div className="notice err">{err}</div>}
          <div className="btn-row">
            <button className="btn danger" disabled={busy || !reason.trim() || p.applicable === 0} onClick={submit}>
              {busy ? 'Membatalkan…' : `Batalkan untuk ${fmt(p.applicable)} record`}
            </button>
            <button className="btn" onClick={onClose}>
              Tutup
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

function ScopeEditor() {
  const toast = useToast();
  const meta = useApi<{ meta: { scopeDescription: string | null } }>('/stats/meta');
  const [value, setValue] = useState<string | null>(null);
  const current = value ?? meta.data?.meta.scopeDescription ?? '';
  const save = async () => {
    try {
      await postJson('/dataset/scope', { scopeDescription: current }, 'PUT');
      toast('ok', 'Keterangan cakupan data disimpan.');
      meta.reload();
      setValue(null);
    } catch (e) {
      toast('err', (e as Error).message);
    }
  };
  return (
    <section className="card">
      <h2>Keterangan cakupan data</h2>
      <p className="card-sub">Ditampilkan di setiap halaman analitik. Jelaskan siapa saja yang tercakup, misalnya "Mahasiswa baru angkatan 2025 yang mendaftar melalui kekeluargaan".</p>
      <div className="field">
        <label htmlFor="scope">Cakupan</label>
        <textarea id="scope" maxLength={500} value={current} onChange={(e) => setValue(e.target.value)} />
      </div>
      <div className="btn-row">
        <button className="btn primary" disabled={value === null} onClick={save}>
          Simpan cakupan
        </button>
      </div>
    </section>
  );
}
