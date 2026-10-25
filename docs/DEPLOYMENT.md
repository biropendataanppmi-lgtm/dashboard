# Deployment, akun, backup, dan pemulihan

> Belum ada yang dideploy. Langkah di bawah adalah prosedur yang perlu dijalankan oleh pemilik akun Cloudflare organisasi.
> Jangan menulis password, token, atau ID rahasia di dokumen ini atau di repository.

## 1. Akun

- Gunakan akun Cloudflare milik organisasi, bukan akun pribadi.
- Undang setiap anggota biro sebagai **member** akun dengan email masing-masing (Cloudflare Dashboard › Manage Account › Members), dengan MFA aktif. Ini lebih aman daripada satu password bersama: setiap tindakan tercatat per orang, dan akses tidak bergantung pada satu orang.
- Simpan kode pemulihan akun organisasi di tempat yang diketahui minimal dua orang.
- Paket: Workers Paid (USD 5/bulan per akun). Batas CPU paket gratis (10 ms per permintaan) kemungkinan tidak cukup untuk impor ±1.600 baris.

## 2. Database

Database `ppmi-db` sudah dibuat (25 Oktober 2026) dan ID-nya sudah ada di `wrangler.jsonc`. Tabel dibuat otomatis oleh perintah deploy (`npm run deploy:ci` menjalankan migrasi lalu deploy).

## 2a. Deploy otomatis dari GitHub (tanpa terminal)

Cloudflare Dashboard › Workers & Pages › Create › **Import a repository** › pilih `biropendataanppmi-lgtm/dashboard`:

| Isian | Nilai |
|---|---|
| Project name | `sistem-pendataan-ppmi` (harus sama dengan `name` di `wrangler.jsonc`) |
| Build command | `npm run build` |
| Deploy command | `npm run deploy:ci` |
| Production branch | `main` |

Setiap merge ke `main` akan ter-deploy otomatis. GitHub Pages tidak dipakai (Settings › Pages › Source: None).

## 3. Cloudflare Access (login)

1. Cloudflare Dashboard › Zero Trust › Settings › Authentication: tambahkan **Google** sebagai login method.
2. Zero Trust › Access › Applications › Add › Self-hosted:
   - Domain aplikasi, path `app` dan path `api` (halaman depan `/` boleh publik).
   - Policy: *Allow* untuk email administrator Biro.
3. Salin **Application Audience (AUD) tag** dan nama **team domain** (`<team>.cloudflareaccess.com`).
4. Isi di `wrangler.jsonc`: `ACCESS_TEAM_DOMAIN` dan `ACCESS_AUD`. Keduanya bukan rahasia.

## 4. Allowlist administrator

Access memeriksa login; aplikasi memeriksa ulang allowlist di database pada setiap permintaan. Daftar ini dikelola lewat perintah, bukan dashboard:

```bash
# menambah
npx wrangler d1 execute ppmi-db --remote --command \
  "INSERT INTO admin_allowlist (email, display_name) VALUES ('nama@organisasi.org', 'Nama Admin')"
# mencabut (berlaku seketika)
npx wrangler d1 execute ppmi-db --remote --command \
  "UPDATE admin_allowlist SET active = 0 WHERE email = 'nama@organisasi.org'"
```

Cabut juga dari policy Access. Mencabut di salah satu tempat sudah cukup untuk menolak akses.

## 5. Deploy

```bash
npm test
npm run deploy
```

## 6. Backup

D1 Time Travel memulihkan **seluruh database ke titik waktu** (maksimal 30 hari di Workers Paid), termasuk tabel log. Jadi Time Travel hanya untuk bencana, bukan untuk membatalkan impor. Pembatalan impor dilakukan di aplikasi (Kelola Dataset › Riwayat Dataset).

Backup jangka panjang (usulan dari audit, retensi final menunggu keputusan Biro):

| Jenis | Frekuensi | Disimpan |
|---|---|---|
| Ekspor penuh | Harian | 30 hari |
| Ekspor penuh | Bulanan | Jangka panjang |

```bash
npx wrangler d1 export ppmi-db --remote --output backup-$(date +%Y%m%d).sql
```

File backup berisi data pribadi. Simpan hanya di folder organisasi yang aksesnya terbatas, jangan di laptop pribadi atau grup chat.

## 7. Pemulihan

**Dari Time Travel (≤30 hari, seluruh database):**

```bash
npx wrangler d1 time-travel info ppmi-db
npx wrangler d1 time-travel restore ppmi-db --timestamp=2026-10-25T10:00:00Z
```

**Dari file backup:** buat database baru, impor file, lalu arahkan `database_id` di `wrangler.jsonc` ke database baru dan deploy ulang.

```bash
npx wrangler d1 create ppmi-db-pulih
npx wrangler d1 execute ppmi-db-pulih --remote --file backup-20261025.sql
```

Prosedur pemulihan perlu diuji minimal sekali per semester. Catat tanggal uji dan hasilnya.
