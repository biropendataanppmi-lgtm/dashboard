# Sistem Pendataan PPMI Mesir 2026/2027

Sistem pengelolaan data mahasiswa Indonesia di Mesir milik Biro Data dan Statistika PPMI Mesir.

> “Selalu ada cerita di balik setiap angka yang ada.”

**Status: V1 tahap 2 (daftar baku dan halaman analitik).** Fitur yang sudah berjalan dan diuji:

- Impor CSV dengan validasi backend, preview, konfirmasi peringatan, dan penerapan atomik (Add Only, Update Existing, Full Sync).
- Data Mahasiswa: pencarian ID/nama, detail terlindungi, penyuntingan tervalidasi, penonaktifan dengan alasan, pengaktifan kembali.
- Riwayat Dataset: setiap perubahan menjadi satu versi; satu impor atau perubahan dapat dibatalkan tanpa menghapus perubahan yang lebih baru.
- Baris Bermasalah, Log Aktivitas (append-only), keterangan cakupan data.
- Overview: KPI, distribusi kekeluargaan, komposisi jenis kelamin, jenjang pendidikan, Top 10 provinsi + Lainnya, filter global.
- Kekeluargaan (16 kekeluargaan baku, tabel ringkasan, profil per kekeluargaan), Pendidikan (jenjang, fakultas, tabel jurusan yang dapat dicari), Persebaran (Top 10 provinsi, Top 10 kabupaten/kota nasional atau per provinsi, domisili di Mesir), Kualitas Data (kelengkapan, cakupan daftar baku, variasi ejaan, indikasi duplikasi).
- Daftar baku kategori dan header spreadsheet asli Biro (lihat Format CSV).
- Autentikasi Cloudflare Access + allowlist yang diperiksa backend di setiap endpoint.

Belum dibangun: peta Indonesia (menunggu data batas wilayah yang andal) dan deployment ke akun Cloudflare organisasi.

## Teknologi

| Bagian | Pilihan |
|---|---|
| Frontend | React + TypeScript, dibangun dengan Vite |
| Backend/API | Cloudflare Workers (Hono) |
| Database | Cloudflare D1 (SQLite) |
| Login | Cloudflare Access (Google) + allowlist di database |
| Tes | Vitest |

Frontend dan API berjalan dalam satu Worker: `/api/*` ditangani API, selebihnya file frontend.

## Menjalankan di komputer sendiri

Butuh Node.js 22 atau lebih baru.

```bash
npm install
cp .dev.vars.example .dev.vars          # mode login simulasi, hanya berlaku di localhost
npm run db:migrate:local                # membuat database lokal
npx wrangler d1 execute ppmi-db --local --command \
  "INSERT INTO admin_allowlist (email, display_name) VALUES ('admin.lokal@example.org', 'Admin Lokal')"
npm run dev                             # buka http://localhost:5173
```

Untuk mencoba impor, buat CSV sintetis: `node scripts/generate-synthetic-csv.mjs 1600 > /tmp/sintetis.csv` (tambahkan `--header-spreadsheet` untuk memakai header spreadsheet asli).
**Jangan memakai data mahasiswa asli di komputer pengembangan.**

## Perintah lain

| Perintah | Fungsi |
|---|---|
| `npm test` | Menjalankan seluruh tes otomatis |
| `npm run typecheck` | Pemeriksaan tipe TypeScript |
| `npm run build` | Build produksi |
| `npm run deploy` | Build dan deploy ke Cloudflare (lihat dokumentasi deployment) |

## Dokumentasi

- [Arsitektur dan model data](docs/ARSITEKTUR.md)
- [Format CSV dan aturan validasi](docs/FORMAT-CSV.md)
- [Deployment, akun, backup, dan pemulihan](docs/DEPLOYMENT.md)
- [Keputusan, asumsi, dan hal yang masih terbuka](docs/KEPUTUSAN.md)
