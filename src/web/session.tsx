import { createContext, useContext, type ReactNode } from 'react';
import { useApi, type ApiError } from './api';
import { ErrorState, Loading } from './components/ui';

export interface Session {
  email: string;
  displayName: string | null;
  simulated: boolean;
}

const Ctx = createContext<Session | null>(null);
export const useSession = () => useContext(Ctx)!;

/** Halaman terautentikasi hanya dirender setelah backend memverifikasi sesi dan allowlist. */
export function SessionGate({ children }: { children: ReactNode }) {
  const me = useApi<Session>('/me');
  if (me.loading) {
    return (
      <div style={{ padding: 32 }}>
        <Loading label="Memeriksa sesi login…" />
      </div>
    );
  }
  if (me.error) return <Denied error={me.error} onRetry={me.reload} />;
  return <Ctx.Provider value={me.data}>{children}</Ctx.Provider>;
}

function Denied({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  const forbidden = error.status === 403;
  return (
    <div className="landing">
      <div className="landing-inner">
        <span className="eyebrow">Sistem Pendataan PPMI Mesir</span>
        <h1>{forbidden ? 'Akun tidak memiliki akses' : 'Belum masuk'}</h1>
        <p>
          {forbidden
            ? 'Akun ini berhasil login, tetapi tidak terdaftar sebagai administrator Biro Data dan Statistika. Hubungi kepala biro jika akses Anda seharusnya ada.'
            : error.message}
        </p>
        <div className="btn-row">
          <a className="btn primary" href={forbidden ? '/cdn-cgi/access/logout' : '/app'}>
            {forbidden ? 'Keluar dan ganti akun' : 'Login'}
          </a>
          {!forbidden && error.status !== 401 && (
            <div style={{ width: '100%' }}>
              <ErrorState error={error} onRetry={onRetry} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
