// Klien API. Semua permintaan memakai origin yang sama sehingga cookie Cloudflare Access ikut terkirim.
import { useCallback, useEffect, useState } from 'react';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details: unknown = null,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  let res: Response;
  try {
    res = await fetch(`/api${path}`, { ...init, headers, credentials: 'same-origin' });
  } catch {
    throw new ApiError(0, 'Tidak dapat terhubung ke server. Periksa koneksi internet lalu coba lagi.');
  }
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Respons non-JSON biasanya halaman login Access saat sesi berakhir.
  }
  if (!res.ok || data === null) {
    const msg = data?.error ?? (res.status === 401 || res.redirected ? 'Sesi login berakhir. Muat ulang halaman untuk login kembali.' : `Permintaan gagal (kode ${res.status}).`);
    throw new ApiError(res.status, msg, data?.issues ?? null);
  }
  return data as T;
}

export const postJson = <T>(path: string, body: unknown, method = 'POST') => api<T>(path, { method, body: JSON.stringify(body) });

export interface AsyncState<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  reload: () => void;
}

/** Memuat data dengan status loading/error/data yang eksplisit (§2.2). */
export function useApi<T>(path: string | null): AsyncState<T> {
  const [state, setState] = useState<{ data: T | null; error: ApiError | null; loading: boolean }>({ data: null, error: null, loading: !!path });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!path) return;
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    api<T>(path)
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((error: ApiError) => alive && setState({ data: null, error, loading: false }));
    return () => {
      alive = false;
    };
  }, [path, tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}
