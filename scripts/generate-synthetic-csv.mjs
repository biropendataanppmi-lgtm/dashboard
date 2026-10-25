// Pemakaian: node scripts/generate-synthetic-csv.mjs 1600 [--header-spreadsheet] > /tmp/sintetis.csv
// Hasilnya DATA SINTETIS untuk uji tampilan dan impor. Jangan dicampur dengan data produksi.
// Kategori memakai daftar baku Biro; nama, nomor, kabupaten/kota, dan jurusan semuanya fiktif.
// Sengaja diberi "kekacauan" realistis: huruf besar/kecil, sel kosong, tahun 00YY, kandidat duplikat, ID ganda.
const H = ['ID_Mahasiswa','Email_Address','Jenis_Kelamin','Nama_Lengkap_Latin','Nama_Lengkap_Arab','Nomor_Paspor','Tempat_Lahir','Tanggal_Lahir','Domisili_Indonesia_Kabupaten_Kota','Domisili_Indonesia_Provinsi','Nomor_WhatsApp_Aktif','Nomor_Telepon_Aktif','Kedatangan_di_Mesir','Domisili_di_Mesir','Kekeluargaan_Konsulat','Jenjang_Pendidikan','Fakultas','Jurusan','Mediator'];
const H_SHEET = ['ID Mahasiswa','Email Address','Jenis Kelamin','Nama Lengkap (Latin)','Nama Lengkap (Arab)','Nomor Paspor','Tempat Lahir','Tanggal Lahir','Domisili di Indonesia (Kabupaten/Kota)','Domisili di Indonesia (Provinsi)','Nomor WhatsApp (Aktif)','Nomor Telepon (Aktif)','Kedatangan di Mesir','Domisili di Mesir','Kekeluargaan/Konsulat','Jenjang Pendidikan','Fakultas','Jurusan','Mediator'];
let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
const pick = (a, w) => { if (!w) return a[Math.floor(r()*a.length)]; let x=r()*w.reduce((p,c)=>p+c,0); for (let i=0;i<a.length;i++){x-=w[i]; if(x<=0) return a[i];} return a.at(-1); };
const kek = ['FOSGAMA','GAMAJATIM','HMMSU','IKMAL','KEMASS','KKS','KMA','KMB','KMJ','KMKM','KMM','KMNTB','KPJ','KPMJB','KSMR','KSW'];
const kw = kek.map((_,i)=> 10 + ((i * 7) % 16) * 3);
const prov = ['Jawa Timur','Jawa Tengah','Jawa Barat','Sumatera Utara','Sumatera Barat','Aceh','Kalimantan Selatan','Sulawesi Selatan','Nusa Tenggara Barat','Banten','DKI Jakarta','Riau','Lampung','Sumatera Selatan','Jambi','DI Yogyakarta','Kalimantan Barat','Kalimantan Timur','Sulawesi Tengah','Kepulauan Riau','Bengkulu','Gorontalo','Maluku','Bali'];
const pw = prov.map((_,i)=> 40 / (i+1));
const domisili = ['Abbasiyah',"Bu'uts",'Darrasah dan sekitarnya','Hay Asyir',"Hay Sabi'",'Hay Tsamin','Mukottom',"Rab'ah",'Sayyidah Aisyah','Zahra'];
const dw = [6,10,14,20,12,18,8,4,3,5];
const fakS1 = ['Ushuluddin','Syariah wal Qanun','Dirasat Islamiyah (Banin)','Dirasat Islamiyah (Banat)','Lughah Arabiyah','Dakwah','Dirasat Insaniyah','Tijarah','Kedokteran','Teknik'];
const fw = [30,22,14,12,10,6,4,2,1,1];
const rows = [];
const n = Number(process.argv[2] || 1600);
const sheetHeaders = process.argv.includes('--header-spreadsheet');
for (let i = 1; i <= n; i++) {
  const year = pick([2022, 2023, 2024, 2025], [15, 22, 28, 35]);
  const id = `${String(year).slice(2)}-${String(i).padStart(4,'0')}`;
  const g = pick(['Laki-laki','Perempuan','laki-laki','Banat',''],[50,40,5,3,2]);
  let k = pick(kek, kw); if (r()<0.03) k = k.toLowerCase(); if (r()<0.02) k = '';
  const pi = prov.indexOf(pick(prov, pw));
  let p = prov[pi]; if (r()<0.02) p = p.toUpperCase(); if (r()<0.04) p = '';
  const kab = p ? `Kab. Sintetis ${String(pi + 1).padStart(2, '0')}-${1 + Math.floor(r() * 6)}` : '';
  const j = r()<0.04 ? '' : pick(['S1',"Ma'had",'Daurah Lughah'],[78,14,8]);
  const f = j === 'S1' ? (r()<0.04 ? '' : pick(fakS1, fw)) : j === "Ma'had" ? "Ma'had" : '';
  const jur = j === 'S1' && f ? `Jurusan Sintetis ${f.split(' ')[0]} ${1 + Math.floor(r() * 3)}` : '';
  let lahir = `200${Math.floor(r()*6)}-0${1+Math.floor(r()*9)}-1${Math.floor(r()*9)}`;
  if (r()<0.01) lahir = '15/08/2005';
  let datang = r()<0.05 ? '' : `${year}-0${8+Math.floor(r()*2)}-1${Math.floor(r()*9)}`;
  if (datang && r()<0.02) datang = `00${datang.slice(2)}`;
  rows.push([id, `sintetis${i}@contoh.invalid`, g, `Nama Sintetis ${i}`, '', `S${String(100000+i)}`, 'Kota Sintetis', lahir, kab, p, `62813${String(1000000+i)}`, `0813${String(1000000+i)}`, datang, r()<0.05 ? '' : pick(domisili, dw), k, j, f, jur, r()<0.3 ? 'Mediator Sintetis' : '']);
}
// Kandidat duplikat dan ID ganda yang disengaja.
if (rows.length > 12) rows[10][5] = rows[11][5];
if (rows.length > 3) rows.push([...rows[Math.min(20, rows.length - 1)]]);
const esc = v => /[",\n]/.test(v) ? `"${v.replace(/"/g,'""')}"` : v;
process.stdout.write([(sheetHeaders ? H_SHEET : H).map(esc).join(','), ...rows.map(x=>x.map(esc).join(','))].join('\r\n')+'\r\n');
