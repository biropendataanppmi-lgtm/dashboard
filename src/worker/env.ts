export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  /** "access" (produksi: Cloudflare Access) atau "dev" (simulasi lokal, hanya di localhost). */
  AUTH_MODE: string;
  /** Contoh: ppmi-mesir.cloudflareaccess.com */
  ACCESS_TEAM_DOMAIN?: string;
  /** Application Audience (AUD) tag dari aplikasi Cloudflare Access. */
  ACCESS_AUD?: string;
  /** Email simulasi untuk AUTH_MODE=dev. */
  DEV_USER_EMAIL?: string;
}

export interface AdminUser {
  email: string;
  displayName: string | null;
  /** Waktu terbit token sesi; dipakai untuk mencatat login sekali per sesi. */
  sessionIssuedAt: number | null;
  simulated: boolean;
}

export type AppEnv = { Bindings: Env; Variables: { user: AdminUser } };
