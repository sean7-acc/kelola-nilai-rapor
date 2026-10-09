'use strict';

/* FR-03 — Penguraian kelas dan mata pelajaran dari judul baris 1 template.
   Pola resmi (Lampiran PRD):
     FORMAT IMPORT NILAI RAPOR (mata pelajaran), KELAS (kelas)
   Contoh:
     FORMAT IMPORT NILAI RAPOR BAHASA INDONESIA, KELAS KELAS X TSM - REGULER
   Kata KELAS pada contoh tampak ganda, sehingga pengulangan dibuang dan
   hasilnya menjadi "X TSM - REGULER". Seluruh hasil dapat diperbaiki
   manual oleh guru pada dialog konfirmasi. */

function normalisasiJudul(teks) {
  return String(teks == null ? '' : teks)
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseJudulTemplate(judul) {
  const asli = normalisasiJudul(judul);

  if (!asli) {
    return {
      berhasil: false,
      alasan: 'Judul baris 1 tidak ditemukan atau kosong.',
      saran: 'Isi mata pelajaran dan kelas secara manual.'
    };
  }

  const polaUji = /^FORMAT\s+IMPORT\s+NILAI\s+RAPOR/i;
  if (!polaUji.test(asli)) {
    return {
      berhasil: false,
      alasan: 'Judul tidak diawali "FORMAT IMPORT NILAI RAPOR".',
      judulAsli: asli,
      saran: 'Isi mata pelajaran dan kelas secara manual.'
    };
  }

  const isi = asli
    .replace(polaUji, '')
    .replace(/^[\s:,\-–—]+/, '')
    .replace(/\s+$/, '');

  if (!isi) {
    return {
      berhasil: false,
      alasan: 'Setelah keterangan "FORMAT IMPORT NILAI RAPOR" tidak ada teks.',
      judulAsli: asli,
      saran: 'Isi mata pelajaran dan kelas secara manual.'
    };
  }

  const buangPengulanganKelas = t =>
    String(t || '')
      .trim()
      .replace(/^KELAS\s+/i, '')
      .replace(/\s+$/, '');

  /* Pola A: "<mata pelajaran>, KELAS <kelas>" — pola resmi pada lampiran PRD */
  let cocok = isi.match(/^(.+?),\s*KELAS\s+(.+)$/i);
  if (cocok) {
    return hasil(true, cocok[1], buangPengulanganKelas(cocok[2]), 'pola A', asli);
  }

  /* Pola A2: "<mata pelajaran> - KELAS <kelas>" (pemisah hubung) */
  cocok = isi.match(/^(.+?)\s+[-–—]\s+KELAS\s+(.+)$/i);
  if (cocok) {
    return hasil(true, cocok[1], buangPengulanganKelas(cocok[2]), 'pola A2', asli);
  }

  /* Pola B: "<mata pelajaran>, <kelas>" tanpa kata KELAS */
  cocok = isi.match(/^(.+?),\s*(.+)$/);
  if (cocok) {
    return hasil(true, cocok[1], buangPengulanganKelas(cocok[2]), 'pola B', asli);
  }

  /* Pola B2: "<mata pelajaran> KELAS <kelas>" tanpa tanda baca */
  cocok = isi.match(/^(.+?)\s+KELAS\s+(.+)$/i);
  if (cocok) {
    return hasil(true, cocok[1], buangPengulanganKelas(cocok[2]), 'pola B2', asli);
  }

  /* Pola C: hanya mata pelajaran, kelas harus diisi manual */
  return {
    berhasil: true,
    mapel: isi,
    kelas: '',
    pola: 'pola C',
    judulAsli: asli,
    peringatan: 'Nama kelas tidak terbaca dari judul. Isi kelas secara manual pada kolom di bawah.'
  };
}

function hasil(berhasil, mapel, kelas, pola, judulAsli) {
  const bersihMapel = String(mapel || '').trim().replace(/\s+$/, '');
  const bersihKelas = String(kelas || '').trim();
  if (!bersihMapel) {
    return {
      berhasil: false,
      alasan: 'Mata pelajaran tidak terbaca dari judul.',
      judulAsli,
      saran: 'Isi mata pelajaran dan kelas secara manual.'
    };
  }
  return {
    berhasil,
    mapel: bersihMapel,
    kelas: bersihKelas,
    pola,
    judulAsli
  };
}
