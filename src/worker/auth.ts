// Autentikasi dan otorisasi backend (§5.5).
// Produksi: Cloudflare Access memverifikasi login Google di depan aplikasi, lalu setiap
// permintaan API di sini memverifikasi JWT Access DAN mencocokkan email ke allowlist.
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { MiddlewareHandler } from 'hono';
import type { AdminUser, AppEnv, Env } from './env';

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export class AuthError extends Error {
  constructor(
    public status: 401 | 403,
    message: string,
    public email: string | null = null,
  ) {
    super(message);
  }
}

function isLocalhost(url: string): boolean {
  const host = new URL(url).hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
}

/** Mengembalikan identitas terverifikasi atau melempar AuthError. */
export async function authenticate(req: Request, env: Env): Promise<AdminUser> {
  let email: string;
  let issuedAt: number | null = null;
  let simulated = false;

  if (env.AUTH_MODE === 'dev') {
    // Simulasi hanya untuk pengembangan lokal. Tidak pernah aktif di domain publik.
    if (!isLocalhost(req.url)) throw new AuthError(401, 'Mode simulasi login hanya dapat dipakai di localhost.');
    if (!env.DEV_USER_EMAIL) throw new AuthError(401, 'DEV_USER_EMAIL belum diatur untuk mode simulasi.');
    email = env.DEV_USER_EMAIL;
    simulated = true;
  } else if (env.AUTH_MODE === 'access') {
    if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) throw new AuthError(401, 'Konfigurasi Cloudflare Access belum lengkap.');
    const token = req.headers.get('Cf-Access-Jwt-Assertion');
    if (!token) throw new AuthError(401, 'Sesi login tidak ditemukan. Silakan login kembali.');
    const issuer = `https://${env.ACCESS_TEAM_DOMAIN}`;
    let jwks = jwksCache.get(issuer);
    if (!jwks) {
      jwks = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
      jwksCache.set(issuer, jwks);
    }
    try {
      const { payload } = await jwtVerify(token, jwks, { issuer, audience: env.ACCESS_AUD });
      if (typeof payload.email !== 'string') throw new Error('email tidak ada');
      email = payload.email;
      issuedAt = typeof payload.iat === 'number' ? payload.iat : null;
    } catch {
      throw new AuthError(401, 'Sesi login tidak valid atau sudah berakhir. Silakan login kembali.');
    }
  } else {
    throw new AuthError(401, 'AUTH_MODE tidak dikenal; akses ditolak.');
  }

  const row = await env.DB.prepare('SELECT email, display_name FROM admin_allowlist WHERE email = ? AND active = 1')
    .bind(email)
    .first<{ email: string; display_name: string | null }>();
  if (!row) throw new AuthError(403, 'Akun ini tidak memiliki izin akses ke sistem.', email);
  return { email: row.email, displayName: row.display_name, sessionIssuedAt: issuedAt, simulated };
}

export const requireAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  // Perlindungan CSRF sederhana: permintaan yang mengubah data harus berasal dari origin yang sama.
  if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
    const origin = c.req.header('Origin');
    if (!origin || origin !== new URL(c.req.url).origin) {
      return c.json({ error: 'Permintaan ditolak: origin tidak sesuai.' }, 403);
    }
  }
  try {
    c.set('user', await authenticate(c.req.raw, c.env));
  } catch (e) {
    if (e instanceof AuthError) return c.json({ error: e.message }, e.status);
    throw e;
  }
  await next();
};
