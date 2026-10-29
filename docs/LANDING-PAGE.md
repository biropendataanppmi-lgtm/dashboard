# Landing Page Publik

Halaman `/` untuk pengunjung yang belum login. Halaman ini tidak memanggil API dan tidak menampilkan data mahasiswa.

## Struktur

| File | Isi |
| --- | --- |
| `src/web/pages/landing/LandingPage.tsx` | Navbar desktop dengan indikator hijau, lima panel yang bergeser horizontal, tombol panah kiri/kanan keyboard, navigasi ikon di bawah layar (tablet dan HP), gestur geser |
| `src/web/pages/landing/sound.ts` | Bunyi pendek "plup" saat panel berganti, disintesis dengan Web Audio API (tanpa file audio) |
| `src/web/pages/landing/panels.tsx` | Isi panel Beranda (termasuk tombol Login Admin), About Us, Tentang Sistem, Dashboard, Privasi Data, dan dekorasi tiap panel |
| `src/web/pages/landing/HeroVisual.tsx` | Ilustrasi 3D (SVG isometrik) empat keadaan dan ikon kategori pada orbit dengan efek Dock |
| `src/web/pages/landing/icons.tsx` | Satu keluarga ikon garis untuk seluruh landing |
| `src/web/pages/landing/landing.css` | Semua gaya landing, seluruhnya di bawah `.public-landing` |

## Aturan yang harus dijaga

- Tombol **Login Admin** tetap tautan biasa `<a href="/app">`, bukan navigasi SPA, agar permintaan melewati Cloudflare Access.
- Panel aktif disimpan di hash URL (`/#about-us`, `/#tentang-sistem`, `/#dashboard`, `/#privasi-data`; Beranda = `/`). Tidak ada route baru.
- Gaya landing tidak memakai `.landing`, `.landing-inner`, atau `.eyebrow`; class itu milik layar Belum masuk / Akun tidak memiliki akses (`session.tsx`).
- Panel Dashboard hanya pratinjau konseptual tanpa angka. Jangan menambahkan endpoint publik untuk landing.
- Bunyi hanya dibuat setelah pengguna mengklik atau mengetuk navigasi (aturan autoplay browser), tidak berbunyi saat hover atau saat memilih panel yang sama, dan diberi jeda minimal 450 ms. Jika audio gagal, navigasi tetap berjalan.
- `viewport-fit=cover` ditambahkan ke meta viewport hanya selama landing tampil (untuk safe area iOS), lalu dikembalikan saat keluar dari landing.
- Dekorasi panel berada di `.lp-deco` dengan `pointer-events: none`; animasi dimatikan saat `prefers-reduced-motion`.

## Aset

- Logo PPMI: `src/web/assets/logo-ppmi.png` (192×192, dipotong dari logo resmi tanpa mengubah isinya), tampil di navbar.
- Foto anggota tim: `src/web/assets/tim/{azriel,fathan,indyra,unaysa}.webp` (480×600, rasio 4:5).
- Favicon: `public/favicon.png` (64×64) dan `public/apple-touch-icon.png` (180×180), dipasang di `index.html` sehingga berlaku juga untuk dashboard.

## Aset sementara yang perlu diganti

| Aset | Kondisi sekarang | Cara mengganti |
| --- | --- | --- |
| Foto anggota tim | Foto asli dari Biro | Ganti file WebP di `src/web/assets/tim/` dengan nama yang sama (disarankan 480×600). Anggota baru: impor fotonya di `panels.tsx` dan tambahkan ke `TEAM`. Tanpa foto, kartu menampilkan inisial |
| Ilustrasi 3D Hero | SVG isometrik buatan kode, tanpa file eksternal | Bisa diganti render 3D (WebP/PNG transparan, 4 keadaan) di komponen `SCENES` pada `HeroVisual.tsx` |

## Keterbatasan

- Konten panel yang lebih tinggi dari layar (terutama Dashboard di ponsel) digulir vertikal di dalam panelnya sendiri.
- Teks "PPMI Mesir" berwarna Lime Green di atas latar putih memiliki kontras rendah (sekitar 1,8:1). Ini sesuai spesifikasi desain, tetapi di bawah ambang WCAG 3:1 untuk teks besar.
