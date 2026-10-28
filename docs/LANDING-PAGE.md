# Landing Page Publik

Halaman `/` untuk pengunjung yang belum login. Halaman ini tidak memanggil API dan tidak menampilkan data mahasiswa.

## Struktur

| File | Isi |
| --- | --- |
| `src/web/pages/landing/LandingPage.tsx` | Navbar, lima panel yang bergeser horizontal, pager, gestur geser di layar sentuh |
| `src/web/pages/landing/panels.tsx` | Isi panel Beranda, About Us, Tentang Sistem, Dashboard, Privasi Data |
| `src/web/pages/landing/HeroVisual.tsx` | Ilustrasi 3D (SVG isometrik) empat keadaan dan ikon kategori pada orbit dengan efek Dock |
| `src/web/pages/landing/icons.tsx` | Satu keluarga ikon garis untuk seluruh landing |
| `src/web/pages/landing/landing.css` | Semua gaya landing, seluruhnya di bawah `.public-landing` |

## Aturan yang harus dijaga

- Tombol **Login Admin** tetap tautan biasa `<a href="/app">`, bukan navigasi SPA, agar permintaan melewati Cloudflare Access.
- Panel aktif disimpan di hash URL (`/#about-us`, `/#tentang-sistem`, `/#dashboard`, `/#privasi-data`; Beranda = `/`). Tidak ada route baru.
- Gaya landing tidak memakai `.landing`, `.landing-inner`, atau `.eyebrow`; class itu milik layar Belum masuk / Akun tidak memiliki akses (`session.tsx`).
- Panel Dashboard hanya pratinjau konseptual tanpa angka. Jangan menambahkan endpoint publik untuk landing.

## Aset sementara yang perlu diganti

| Aset | Kondisi sekarang | Cara mengganti |
| --- | --- | --- |
| Logo PPMI | Belum ada di repository. Navbar menampilkan teks "PPMI Mesir / Biro Data dan Statistika" | Simpan file (mis. `src/web/assets/logo-ppmi.svg`), impor di `LandingPage.tsx`, isi konstanta `LOGO_SRC` |
| Favicon | Belum ada | Tambahkan file ikon dan `<link rel="icon">` di `index.html` (berlaku juga untuk dashboard) |
| Foto anggota tim | Slot inisial (MA, IN, UL) | Simpan foto di `src/web/assets/tim/`, impor di `panels.tsx`, isi field `photo` pada `TEAM` |
| Ilustrasi 3D Hero | SVG isometrik buatan kode, tanpa file eksternal | Bisa diganti render 3D (WebP/PNG transparan, 4 keadaan) di komponen `SCENES` pada `HeroVisual.tsx` |

## Keterbatasan

- Konten panel yang lebih tinggi dari layar (terutama Dashboard di ponsel) digulir vertikal di dalam panelnya sendiri.
- Teks "PPMI Mesir" berwarna Lime Green di atas latar putih memiliki kontras rendah (sekitar 1,8:1). Ini sesuai spesifikasi desain, tetapi di bawah ambang WCAG 3:1 untuk teks besar.
