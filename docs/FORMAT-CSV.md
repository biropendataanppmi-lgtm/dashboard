# Format CSV dan aturan validasi

## Format file

- Teks UTF-8 (di Google Sheets: *File › Download › Comma-separated values*; di Excel: *CSV UTF-8*).
- Baris pertama adalah header. Satu baris per mahasiswa.
- Maksimal 5 MB dan 5.000 baris per impor (batas sementara, dapat diubah di `src/shared/columns.ts`).
- Tanggal memakai format `YYYY-MM-DD`.

## Kolom

Urutan kolom bebas. Nama header harus persis seperti di bawah.

| Header | Wajib | Keterangan |
|---|---|---|
| `ID_Mahasiswa` | Ya | Format `YY-NNNN`, contoh `25-0128`. Dibuat di spreadsheet (Register ID), bukan oleh sistem. |
| `Email_Address` | | Peringatan jika formatnya tampak salah. |
| `Jenis_Kelamin` | | Dikenali: Laki-laki/Perempuan, L/P, Banin/Banat, Pria/Wanita. |
| `Nama_Lengkap_Latin` | Ya | |
| `Nama_Lengkap_Arab` | | |
| `Nomor_Paspor` | | Disimpan sebagai teks. |
| `Tempat_Lahir` | | |
| `Tanggal_Lahir` | | Harus `YYYY-MM-DD` dan tanggal yang ada. |
| `Domisili_Indonesia_Kabupaten_Kota` | | |
| `Domisili_Indonesia_Provinsi` | | |
| `Nomor_WhatsApp_Aktif` | | Teks; tanda + dan nol di depan dipertahankan. |
| `Nomor_Telepon_Aktif` | | Teks; tanda + dan nol di depan dipertahankan. |
| `Kedatangan_di_Mesir` | | Kedatangan **pertama** di Mesir (angkatan). Tahun `YYYY` atau tanggal `YYYY-MM-DD`, Masehi. |
| `Domisili_di_Mesir` | | |
| `Kekeluargaan_Konsulat` | | |
| `Jenjang_Pendidikan` | | |
| `Fakultas` | | |
| `Jurusan` | | |
| `Mediator` | | |

`Status_Data` tidak ada di CSV; status aktif/nonaktif dikelola sistem.

## Arti sel kosong dan kolom yang tidak ada

- **Sel kosong berarti nilai dikosongkan** (Jawaban H6). Preview menunjukkan berapa nilai yang akan dikosongkan per kolom, dan memberi peringatan jika sebagian besar nilai satu kolom akan dikosongkan.
- **Kolom yang tidak ada di file tidak diubah.** Jika hanya ingin memperbarui jurusan, cukup kirim `ID_Mahasiswa`, `Nama_Lengkap_Latin`, dan `Jurusan`.
- Nilai kosong tidak pernah diisi nol atau "Lainnya" dan tidak dihitung sebagai kategori.

## Mode impor

| Mode | ID sudah ada | ID belum ada |
|---|---|---|
| Add Only | Ditahan (error) | Record baru |
| Update Existing | Diperbarui | Ditahan (error) |
| Full Sync | Diperbarui | Record baru |

Tidak ada mode yang menghapus atau menonaktifkan record yang tidak ada di file. Record yang nilainya sama persis tidak ditulis ulang.

## Error (baris ditahan)

| Kode | Arti |
|---|---|
| `format_id` | ID bukan `YY-NNNN` |
| `wajib_kosong` | ID atau nama Latin kosong |
| `id_ganda_di_file` | ID yang sama dipakai lebih dari satu baris di file |
| `id_sudah_ada` | Add Only: ID sudah ada di database |
| `id_tidak_ditemukan` | Update Existing: ID tidak ada di database |
| `format_tanggal` | Tanggal lahir tidak valid |
| `format_kedatangan`, `rentang_kedatangan` | Kedatangan tidak valid atau di luar 1950 sampai tahun depan |
| `jumlah_kolom` | Jumlah sel di baris tidak sama dengan header |

Error tingkat file (seluruh file ditolak): file kosong, header tidak dikenal, header ganda, kolom wajib tidak ada, kutip tidak tertutup.

## Peringatan (diterapkan setelah dikonfirmasi)

Kolom analitik kosong, jenis kelamin tidak dikenali, format email/telepon meragukan, tahun kedatangan berbeda dari dua digit awal ID (ID tidak diubah), record nonaktif ikut diperbarui, nilai akan dikosongkan, dan **kandidat duplikat** (paspor, email, atau telepon sama dengan record lain). Kandidat duplikat tidak pernah digabung otomatis.

Saat konfirmasi, admin dapat memilih untuk menerapkan baris berperingatan atau melewatinya.

## Unggahan ulang

File yang identik dengan file yang pernah diterapkan diberi peringatan. Dengan Add Only, semua barisnya ditahan karena ID-nya sudah ada, sehingga tidak ada duplikasi.
