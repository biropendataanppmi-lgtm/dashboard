// Komponen bersama (§6.5): header halaman, metadata dataset, KPI, state, badge, modal, notifikasi.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { ApiError } from '../api';
import { fmt, fmtTime } from '../format';

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-header">
      <div className="btn-row" style={{ justifyContent: 'space-between' }}>
        <h1>{title}</h1>
        {actions}
      </div>
      {description && <p>{description}</p>}
    </header>
  );
}

export interface DatasetMetaInfo {
  version: number;
  updatedAt: string;
  scopeDescription: string | null;
  activeRecords: number;
}

/** Cakupan data wajib terlihat di setiap halaman analitik (§1.5). */
export function DatasetMeta({ meta }: { meta: DatasetMetaInfo | null | undefined }) {
  if (!meta) return null;
  return (
    <div className="meta-bar" role="note">
      <span>
        Cakupan data:{' '}
        {meta.scopeDescription ? <b>{meta.scopeDescription}</b> : <span className="scope-missing">belum dijelaskan — isi di Kelola Dataset › Riwayat Dataset</span>}
      </span>
      <span>
        Record aktif: <b className="num">{fmt(meta.activeRecords)}</b>
      </span>
      <span>
        Pembaruan terakhir: <b>{meta.version === 0 ? 'belum ada data' : fmtTime(meta.updatedAt)}</b>
      </span>
      <span>
        Versi dataset: <b className="num">{meta.version}</b>
      </span>
    </div>
  );
}

export function Kpi({ label, value, hint }: { label: string; value: number | null; hint?: ReactNode }) {
  return (
    <div className="kpi">
      <span className="label">{label}</span>
      <span className="value">{fmt(value)}</span>
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function Loading({ label = 'Memuat data…' }: { label?: string }) {
  return (
    <div aria-busy="true" aria-live="polite" style={{ display: 'grid', gap: 10 }}>
      <span className="muted small">{label}</span>
      <div className="skeleton" style={{ height: 72 }} />
      <div className="skeleton" style={{ height: 180 }} />
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: ApiError | Error; onRetry?: () => void }) {
  return (
    <div className="state error" role="alert">
      <b style={{ color: 'inherit' }}>Data tidak dapat dimuat</b>
      <span>{error.message}</span>
      {onRetry && (
        <button className="btn" onClick={onRetry}>
          Coba lagi
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="state">
      <b>{title}</b>
      {children && <span>{children}</span>}
    </div>
  );
}

export function Badge({ tone, children }: { tone: 'ok' | 'warn' | 'err' | 'neutral'; children: ReactNode }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    ref.current?.querySelector<HTMLElement>('input, select, textarea, button')?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

type Toast = { tone: 'ok' | 'err'; text: string } | null;
const ToastCtx = createContext<(tone: 'ok' | 'err', text: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast>(null);
  const show = useCallback((tone: 'ok' | 'err', text: string) => setToast({ tone, text }), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.tone === 'err' ? 8000 : 4000);
    return () => clearTimeout(t);
  }, [toast]);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && (
        <div className={`toast ${toast.tone}`} role="status" aria-live="polite">
          {toast.text}
        </div>
      )}
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

export function IssueList({ issues }: { issues: { severity: string; message: string; column?: string }[] }) {
  if (!issues.length) return null;
  return (
    <ul style={{ margin: 0, paddingLeft: 18 }}>
      {issues.map((i, idx) => (
        <li key={idx}>
          <Badge tone={i.severity === 'error' ? 'err' : 'warn'}>{i.severity === 'error' ? 'Error' : 'Peringatan'}</Badge> {i.column && <span className="mono">{i.column}</span>} {i.message}
        </li>
      ))}
    </ul>
  );
}
