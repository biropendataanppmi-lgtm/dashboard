# Keputusan, asumsi, dan hal yang masih terbuka

Dokumen ini memisahkan keputusan pemilik proyek, asumsi teknis sementara, dan hal yang belum diputuskan (Dokumen Induk §9-B aturan 4–5).

## Keputusan pemilik proyek (25 Oktober 2026)

| No. | Keputusan | Penerapan di kode |
|---|---|---|
| H1 | Pembatalan per impor/perubahan, bukan kembali ke titik waktu | Model tabel aktif + riwayat revisi; pembatalan maju |
| H2 + kartu | Spreadsheet hanya untuk mahasiswa baru; data lama disunting di web | Add Only sebagai mode bawaan |
| H3 | `Kedatangan_di_Mesir` = kedatangan pertama (angkatan) | Tahun diturunkan ke `arrival_year`, dipakai filter |
| H4 | ID tetap walau tahun kedatangan dikoreksi | Tahun berbeda dari prefiks ID hanya warning |
| H5 (diubah) | ID dibuat di spreadsheet, tanpa sistem | Sistem tidak membuat ID; hanya memvalidasi format dan keunikan |
| H6 | Sel kosong = kosongkan nilai | Diterapkan, dengan hitungan dan peringatan di preview |
| H7 | Tidak ada status kemahasiswaan | Hanya alasan penonaktifan (pulang/lulus, data salah, lainnya) |
| H9 | Agregat dibagikan lewat laporan berkala | V1 hanya untuk admin Biro |
| H13 | Anggaran Workers Paid tersedia | |
| Login | Cloudflare Access | Diimplementasikan; menunggu konfigurasi akun |

## Asumsi sementara (mudah diubah)

| Asumsi | Lokasi |
|---|---|
| Batas impor 5 MB dan 5.000 baris | `src/shared/columns.ts` |
| Preview impor berlaku 24 jam | `src/shared/columns.ts` |
| Nilai jenis kelamin yang dikenali (Laki-laki/Perempuan, L/P, Banin/Banat, Pria/Wanita) | `src/shared/normalize.ts` |
| Tahun kedatangan valid 1950 sampai tahun depan | `src/shared/validation.ts` |
| Identitas minimum: ID dan nama Latin | `src/shared/columns.ts` (`required`) |
| Kandidat duplikat: paspor, email, atau nomor telepon sama | `src/shared/plan.ts` |
| Kategori dikelompokkan tanpa membedakan huruf besar/kecil | `src/worker/stats.ts` |
| Persentase memakai penyebut "record dengan nilai terisi" | `src/worker/stats.ts` |
| Waktu ditampilkan dalam zona Kairo, disimpan UTC | `src/web/format.ts` |

## Belum diputuskan

- Daftar resmi 16 kekeluargaan dan urutannya. Sampai ada, kategori ditampilkan sesuai isi data.
- Daftar baku jenjang (termasuk tingkat Ma'had Bu'uts), fakultas, jurusan, provinsi, kabupaten/kota, domisili Mesir.
- Pembedaan "tidak berlaku" (misalnya siswa ma'had tanpa fakultas) dan "belum diisi". Saat ini keduanya tampil sebagai belum diisi.
- Kegunaan tertulis tiap kolom data pribadi (terutama `Mediator`).
- Retensi riwayat perubahan, backup, dan log.
- Ambang angka kecil untuk laporan yang dibagikan ke luar Biro.
- Pemberitahuan privasi di titik pengumpulan (kekeluargaan).
