# Arsitektur dan model data

## Gambaran

```
Browser ──► Cloudflare Access (login Google, cek akun) ──► Worker
                                                          ├─ /api/*  → API (Hono) ──► D1
                                                          └─ lainnya → file frontend (React)
```

- Database adalah sumber kebenaran. CSV hanya untuk impor massal; penyuntingan satu record lewat dashboard.
- Halaman analitik hanya menerima angka agregat dari `/api/stats/*`. Record individual hanya keluar dari `/api/students/*`.
- Semua aturan validasi ada di `src/shared/validation.ts` dan dipakai oleh impor maupun penyuntingan, sehingga tidak ada dua sumber aturan.

## Struktur folder

| Folder | Isi |
|---|---|
| `src/shared` | Kontrak kolom CSV, parser CSV, normalisasi, validasi, perencanaan impor (fungsi murni, diuji tanpa database) |
| `src/worker` | API: autentikasi, impor, perubahan dan pembatalan, statistik, log |
| `src/web` | Frontend React: layout, komponen bersama, halaman |
| `migrations` | Skema database D1 (dijalankan berurutan oleh wrangler) |
| `test` | Tes otomatis dan data sintetis |

## Model data

Mengikuti Jawaban H1 (pembatalan per perubahan) dan rekomendasi audit E1 opsi B.

| Tabel | Fungsi |
|---|---|
| `students` | Satu baris per mahasiswa, selalu berisi nilai terkini. `id` internal terpisah dari `student_code` (ID Mahasiswa 6 angka `YYNNNN`, migrasi 0002). Tidak dapat dihapus (dijaga trigger). |
| `change_sets` | Satu baris per tindakan yang mengubah data (impor, suntingan, penonaktifan, pengaktifan, pembatalan). `id` = nomor versi dataset. |
| `student_revisions` | Nilai sebelum/sesudah untuk kolom yang berubah. Dasar pembatalan. Berisi data pribadi; tidak pernah dikirim utuh ke frontend. |
| `dataset_state` | Versi dataset terkini dan keterangan cakupan data. |
| `import_jobs` | Metadata setiap impor (nama file, hash, mode, status, ringkasan). |
| `import_staging` | Hasil validasi per baris antara preview dan penerapan. Dihapus setelah diterapkan, dibatalkan, atau kedaluwarsa (24 jam). |
| `import_row_issues` | Baris yang ditahan karena error, tanpa data pribadi. |
| `activity_logs` | Log audit. Trigger menolak UPDATE dan DELETE. |
| `admin_allowlist` | Email administrator yang diizinkan. |

### Versi dan konkurensi

Setiap tindakan tulis dijalankan sebagai satu `db.batch()` D1, yang berlaku sebagai satu transaksi: jika satu pernyataan gagal, semuanya dibatalkan. Pernyataan pertama di batch adalah penjaga versi: ia menaikkan `dataset_state.version` hanya jika versinya masih sama dengan versi saat preview dibuat. Jika ada impor atau suntingan lain di antaranya, batch gagal dan pengguna diminta memvalidasi ulang. Penyuntingan juga memakai `row_version` per record agar dua admin tidak saling menimpa.

### Pembatalan perubahan

Pembatalan bekerja maju: sistem membuat versi baru yang mengembalikan nilai lama.

- Record yang dibuat oleh impor yang dibatalkan **dinonaktifkan** dengan alasan `pembatalan_impor`, tidak dihapus. ID-nya tetap tercatat dan tidak akan dipakai ulang.
- Record yang sudah diubah lagi setelah perubahan yang dibatalkan **dilewati** dan dilaporkan, agar perubahan yang lebih baru tidak hilang.
- Sebuah perubahan hanya dapat dibatalkan sekali.

### Statistik

- Hanya record `active` yang dihitung.
- Kategori dikelompokkan tanpa membedakan huruf besar/kecil; label yang ditampilkan adalah ejaan yang paling sering muncul. Daftar baku kategori belum ada (lihat KEPUTUSAN.md).
- Persentase dihitung dari record yang nilainya terisi untuk dimensi tersebut. Jumlah yang belum diisi selalu ditampilkan terpisah.
- "Lainnya" pada provinsi hanya berisi provinsi valid di luar Top 10.

## Keamanan

| Lapisan | Kontrol |
|---|---|
| Autentikasi | Cloudflare Access memverifikasi login Google. Worker memverifikasi JWT Access (tanda tangan, issuer, audience) di setiap permintaan API. |
| Otorisasi | Email dari JWT harus ada di `admin_allowlist` dengan `active = 1`. Dicek di setiap permintaan, sehingga pencabutan berlaku seketika. |
| CSRF | Permintaan selain GET harus membawa header `Origin` yang sama dengan domain aplikasi. |
| Data pribadi | Endpoint analitik hanya agregat. Tabel utama tidak menampilkan paspor, email, dan telepon. Pembukaan detail record dicatat di log. |
| Log | Ringkasan log tidak memuat nilai data pribadi, isi CSV, atau token. |
| Mode simulasi | `AUTH_MODE=dev` hanya diterima jika host adalah localhost, dan menampilkan banner kuning di aplikasi. |
