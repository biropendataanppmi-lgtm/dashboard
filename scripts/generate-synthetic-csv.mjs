// Pemakaian: node scripts/generate-synthetic-csv.mjs 1600 > /tmp/sintetis.csv
// Hasilnya DATA SINTETIS untuk uji tampilan dan impor. Jangan dicampur dengan data produksi.
// Generator CSV sintetis (semua nilai fiktif) dengan "kekacauan" realistis.
const H = ['ID_Mahasiswa','Email_Address','Jenis_Kelamin','Nama_Lengkap_Latin','Nama_Lengkap_Arab','Nomor_Paspor','Tempat_Lahir','Tanggal_Lahir','Domisili_Indonesia_Kabupaten_Kota','Domisili_Indonesia_Provinsi','Nomor_WhatsApp_Aktif','Nomor_Telepon_Aktif','Kedatangan_di_Mesir','Domisili_di_Mesir','Kekeluargaan_Konsulat','Jenjang_Pendidikan','Fakultas','Jurusan','Mediator'];
let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
const pick = (a, w) => { if (!w) return a[Math.floor(r()*a.length)]; let x=r()*w.reduce((p,c)=>p+c,0); for (let i=0;i<a.length;i++){x-=w[i]; if(x<=0) return a[i];} return a.at(-1); };
const kek = Array.from({length:16},(_,i)=>`Kekeluargaan Sintetis ${String(i+1).padStart(2,'0')}`);
const kw = kek.map((_,i)=> 40 - i*2);
const prov = Array.from({length:20},(_,i)=>`Provinsi Sintetis ${String.fromCharCode(65+i)}`);
const pw = prov.map((_,i)=> 30 / (i+1));
const jenjang = ['S1','Ma\'had (Tsanawiyah)','Ma\'had (I\'dadiyah)','S2','S3'];
const fak = ['Fakultas Sintetis Ushuluddin','Fakultas Sintetis Syariah','Fakultas Sintetis Bahasa Arab','Fakultas Sintetis Dirasat'];
const rows = [];
const n = Number(process.argv[2] || 1600);
for (let i = 1; i <= n; i++) {
  const id = `25-${String(i).padStart(4,'0')}`;
  const g = pick(['Laki-laki','Perempuan','laki-laki','Banat',''],[50,40,5,3,2]);
  let k = pick(kek, kw); if (r()<0.03) k = k.toUpperCase(); if (r()<0.02) k = '';
  let p = pick(prov, pw); if (r()<0.04) p = '';
  const j = r()<0.06 ? '' : pick(jenjang,[70,12,8,7,3]);
  const isMahad = j.startsWith('Ma');
  const f = isMahad || r()<0.05 ? '' : pick(fak);
  let lahir = `200${Math.floor(r()*8)}-0${1+Math.floor(r()*9)}-1${Math.floor(r()*9)}`;
  if (r()<0.01) lahir = '15/08/2005';
  rows.push([id, `sintetis${i}@contoh.invalid`, g, `Nama Sintetis ${i}`, '', `S${String(100000+i)}`, 'Kota Sintetis', lahir, 'Kabupaten Sintetis', p, `+62813${String(1000000+i)}`, `0813${String(1000000+i)}`, r()<0.05 ? '' : '2025-0'+(8+Math.floor(r()*2))+'-1'+Math.floor(r()*9), pick(['Wilayah Sintetis 1','Wilayah Sintetis 2','Wilayah Sintetis 3']), k, j, f, f ? 'Jurusan Sintetis' : '', '']);
}
// Kandidat duplikat dan ID ganda yang disengaja.
if (rows.length > 12) rows[10][5] = rows[11][5];
if (rows.length > 3) rows.push([...rows[Math.min(20, rows.length - 1)]]);
const esc = v => /[",\n]/.test(v) ? `"${v.replace(/"/g,'""')}"` : v;
process.stdout.write([H.join(','), ...rows.map(x=>x.map(esc).join(','))].join('\r\n')+'\r\n');
