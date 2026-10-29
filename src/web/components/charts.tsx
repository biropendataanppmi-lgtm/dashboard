// Grafik ringan tanpa library: bar horizontal satu warna dan bar komposisi.
// Setiap grafik menampilkan nilai dan penyebut persentase, serta jumlah "belum diisi" terpisah.
import { fmt, pct } from '../format';

export interface BarItem {
  key: string;
  label: string;
  count: number;
  /** Kategori pelengkap (Lainnya) digambar dengan warna netral. */
  muted?: boolean;
  note?: string;
}

export function HBarChart({
  items,
  denominator,
  denominatorLabel,
  unknown,
  unknownLabel = 'Belum diisi',
  emptyText = 'Belum ada nilai yang terisi untuk dimensi ini.',
  onSelect,
  selectedKey,
}: {
  items: BarItem[];
  denominator: number;
  denominatorLabel: string;
  unknown?: number;
  unknownLabel?: string;
  emptyText?: string;
  onSelect?: (key: string) => void;
  selectedKey?: string | null;
}) {
  if (items.length === 0 || items.every((i) => i.count === 0)) {
    return (
      <div className="state">
        <b>Tidak ada data untuk ditampilkan</b>
        <span>{emptyText}</span>
        {unknown ? <span className="small">{fmt(unknown)} record belum diisi.</span> : null}
      </div>
    );
  }
  const max = Math.max(...items.map((i) => i.count));
  return (
    <div>
      <div className="hbar" role="list">
        {items.map((i) => {
          const title = `${i.label}: ${fmt(i.count)} (${pct(i.count, denominator) ?? '—'} dari ${denominatorLabel})${i.note ? ` — ${i.note}` : ''}`;
          const row = (
            <>
              <span className="hbar-label">
                {i.label}
                {i.note ? <small className="hbar-note"> · {i.note}</small> : null}
              </span>
              <span className="hbar-track" aria-hidden="true">
                {i.count > 0 ? (
                  <span className={`hbar-fill${i.muted ? ' muted' : ''}`} style={{ width: `${max ? (i.count / max) * 100 : 0}%` }} />
                ) : null}
              </span>
              <span className="hbar-value">
                {fmt(i.count)} <small>{pct(i.count, denominator)}</small>
              </span>
            </>
          );
          return onSelect && !i.muted ? (
            <button
              key={i.key}
              type="button"
              role="listitem"
              className="hbar-row is-button"
              title={title}
              onClick={() => onSelect(i.key)}
              aria-pressed={selectedKey === i.key}
            >
              {row}
            </button>
          ) : (
            <div key={i.key} role="listitem" className="hbar-row" title={title}>
              {row}
            </div>
          );
        })}
      </div>
      <div className="chart-foot" style={{ marginTop: 10 }}>
        <span>
          Persentase dihitung dari {fmt(denominator)} {denominatorLabel}.
        </span>
        {unknown ? (
          <span>
            {unknownLabel}: {fmt(unknown)} record (tidak dihitung sebagai kategori).
          </span>
        ) : null}
      </div>
    </div>
  );
}

export interface CompositionPart {
  key: string;
  label: string;
  count: number;
  color: string;
}

export function CompositionBar({ parts, unknown, unknownLabel = 'Belum diisi / tidak dikenali' }: { parts: CompositionPart[]; unknown: number; unknownLabel?: string }) {
  const known = parts.reduce((s, p) => s + p.count, 0);
  if (known === 0) {
    return (
      <div className="state">
        <b>Komposisi belum dapat ditampilkan</b>
        <span>Belum ada nilai yang terisi{unknown ? `; ${fmt(unknown)} record belum diisi` : ''}.</span>
      </div>
    );
  }
  return (
    <div className="composition">
      <div className="composition-bar" role="img" aria-label={parts.map((p) => `${p.label} ${fmt(p.count)}`).join(', ')}>
        {parts
          .filter((p) => p.count > 0)
          .map((p) => (
            <div key={p.key} style={{ width: `${(p.count / known) * 100}%`, background: p.color }} title={`${p.label}: ${fmt(p.count)} (${pct(p.count, known)})`} />
          ))}
      </div>
      <div className="legend">
        {parts.map((p) => (
          <span key={p.key}>
            <i style={{ background: p.color }} />
            {p.label} <b className="num">{fmt(p.count)}</b> <span className="muted">{pct(p.count, known)}</span>
          </span>
        ))}
      </div>
      <div className="chart-foot">
        <span>Persentase dihitung dari {fmt(known)} record dengan nilai terisi.</span>
        {unknown ? (
          <span>
            {unknownLabel}: {fmt(unknown)} record.
          </span>
        ) : null}
      </div>
    </div>
  );
}
