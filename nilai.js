'use strict';

/* FR-09, FR-11, FR-12, FR-13 — perhitungan nilai rapor, validasi,
   salin ke clipboard, dan ekspor daftar nilai. */

/* Nilai wajib angka 1–100. Nilai kosong dianggap "belum diisi". */
function parseNilaiAngka(nilai) {
  if (nilai === '' || nilai == null) return null;
  const angka = Number(String(nilai).trim().replace(/,/g, '.'));
  return Number.isFinite(angka) ? angka : null;
}

function nilaiValid(nilai) {
  return nilai != null && Number.isFinite(nilai) && nilai >= 1 && nilai <= 100;
}

/* Seluruh komponen siswa terisi dengan nilai sah 1–100. */
function nilaiKomponenLengkap(komponen, nilaiMap) {
  for (const k of komponen) {
    const n = nilaiMap ? nilaiMap[k.id] : null;
    if (!nilaiValid(n)) return false;
  }
  return true;
}

/* Nilai rapor = Σ (bobot × nilai) ÷ total bobot, dibulatkan terdekat.
   Hasil ditampilkan jika seluruh komponen siswa terisi. */
function hitungRapor(komponen, nilaiMap) {
  let jumlah = 0;
  let totalBobot = 0;
  for (const k of komponen) {
    const n = nilaiMap ? nilaiMap[k.id] : null;
    if (n == null || Number.isNaN(n)) return null;
    jumlah += n * k.bobot;
    totalBobot += k.bobot;
  }
  if (totalBobot <= 0) return null;
  return Math.round(jumlah / totalBobot);
}

/* Kumpulkan masalah sebelum simpan/salin/ekspor: kosong, atau di luar 1–100.
   barisState: [{ siswa, nilaiMap }] — nilaiMap per komponenId. */
function masalahNilai(komponen, barisState) {
  const masalah = [];

  for (const b of barisState) {
    for (const k of komponen) {
      const n = b.nilaiMap[k.id];
      const namaSiswa = (b.siswa && b.siswa.nama) || b.nisn;
      if (n == null) {
        masalah.push(namaSiswa + ' — ' + k.nama + ' belum diisi');
      } else if (!nilaiValid(n)) {
        masalah.push(namaSiswa + ' — ' + k.nama + ' di luar 1–100 (' + n + ')');
      }
    }
  }

  return masalah;
}

/* Ringkas daftar masalah agar pesan tidak kepanjangan. */
function ringkasMasalah(masalah) {
  const maks = 5;
  if (masalah.length <= maks) return masalah.join('; ');
  const sisa = masalah.length - maks;
  return masalah.slice(0, maks).join('; ') +
    '; dan ' + sisa + ' masalah lainnya';
}

function totalBobot(komponen) {
  return komponen.reduce((t, k) => t + Number(k.bobot || 0), 0);
}

/* ---------- Salin ke clipboard (FR-12) ---------- */

async function salinTeksKePapanKlip(teks) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(teks);
      return;
    } catch (e) { /* lanjut ke cadangan */ }
  }

  const area = document.createElement('textarea');
  area.value = teks;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.left = '-9999px';
  document.body.appendChild(area);
  area.select();
  const berhasil = document.execCommand('copy');
  area.remove();
  if (!berhasil) throw new Error('Browser tidak mengizinkan akses papan klip.');
}

/* Satu kolom nilai rapor, satu nilai per baris sesuai urutan siswa. */
function teksKolomNilaiRapor(baris) {
  return baris.map(b => b.rapor).join('\r\n');
}

/* ---------- Ekspor daftar nilai (FR-13) ---------- */

function namaBerkasAman(teks) {
  return String(teks || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '') || 'nilai';
}

function eksporNilaiXlsx({ kelasNama, mapelNama, komponen, baris }) {
  const aoa = [
    ['NISN', 'Nama Siswa', 'Nilai Rapor'],
    ...baris.map(b => [
      b.nisn,
      b.nama,
      b.rapor == null ? '' : b.rapor
    ])
  ];

  const lembar = XLSX.utils.aoa_to_sheet(aoa);
  lembar['!cols'] = [
    { wch: 14 },
    { wch: 34 },
    { wch: 12 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, lembar, 'Nilai Rapor');
  XLSX.writeFile(
    wb,
    'nilai_rapor_' + namaBerkasAman(kelasNama) + '_' + namaBerkasAman(mapelNama) + '.xlsx'
  );
}