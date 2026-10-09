'use strict';

/* FR-02 — Impor template Excel e-rapor (hanya dibaca, tidak pernah ditulis).
   FR-16 — Impor ulang: siswa dicocokkan lewat NISN agar tidak ganda. */

const BATAS_BACA_KALI = 5000;

async function bacaTemplate(file) {
  if (!file) throw new Error('Berkas tidak ditemukan.');

  if (!/\.(xlsx|xlsm|xls|csv)$/i.test(file.name)) {
    throw new Error('Berkas harus berformat .xlsx (template e-rapor).');
  }

  const isiBerkas = await file.arrayBuffer();
  const wb = XLSX.read(isiBerkas, { type: 'array' });

  if (!wb.SheetNames.length) throw new Error('Berkas tidak memiliki lembar kerja.');

  const namaLembar = wb.SheetNames[0];
  const ws = wb.Sheets[namaLembar];
  if (!ws) throw new Error('Lembar kerja pertama tidak dapat dibaca.');

  const baris = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: true
  });

  if (!baris.length) throw new Error('Lembar kerja kosong.');

  const peringatan = [];

  /* --- Judul pada baris pertama --- */
  const judul = cariJudul(baris);
  if (!judul.teks) {
    peringatan.push('Judul "FORMAT IMPORT NILAI RAPOR" tidak ditemukan pada baris awal.');
  }

  /* --- Baris judul kolom (NISN dan NAMA) --- */
  const kepala = cariBarisKepala(baris);
  if (!kepala) {
    throw new Error('Baris judul kolom dengan kata NISN dan NAMA tidak ditemukan.');
  }

  /* --- Ambil data siswa --- */
  const siswa = [];
  let tanpaNisn = 0;
  let tanpaNama = 0;
  let nisnTidakValid = 0;
  const dipakai = new Set();

  for (let r = kepala.baris + 1; r < baris.length && siswa.length < BATAS_BACA_KALI; r++) {
    const barisData = baris[r] || [];
    const nisnAsli = barisData[kepala.kolomNisn];
    const namaAsli = barisData[kepala.kolomNama];

    const nama = normalisasiJudul(namaAsli);
    const nisn = bersihkanNisn(nisnAsli);

    if (!nisn && !nama) continue;                 // baris kosong / spasi
    if (!nama) { tanpaNama++; continue; }         // baris tanpa nama (mis. footer)
    if (!nisn) { tanpaNisn++; continue; }         // baris tanpa NISN

    if (!/^\d{5,20}$/.test(nisn)) {
      nisnTidakValid++;
      continue;
    }

    if (dipakai.has(nisn)) {
      peringatan.push('NISN ' + nisn + ' muncul lebih dari satu kali dalam berkas, data kedua dilewati.');
      continue;
    }

    dipakai.add(nisn);
    siswa.push({ nisn, nama, urutan: siswa.length + 1 });
  }

  if (siswa.length === 0) {
    throw new Error('Tidak ada data siswa yang terbaca. Periksa apakah berkas ini template e-rapor yang benar.');
  }

  if (tanpaNisn) peringatan.push(tanpaNisn + ' baris berisi nama tanpa NISN (dilewati).');
  if (tanpaNama) peringatan.push(tanpaNama + ' baris berisi NISN tanpa nama (dilewati).');
  if (nisnTidakValid) peringatan.push(nisnTidakValid + ' baris memiliki NISN bukan angka (dilewati).');

  return {
    judul: judul.teks,
    judulDitemukan: judul.ditemukan,
    siswa,
    peringatan,
    meta: {
      namaBerkas: file.name,
      ukuran: file.size,
      namaLembar,
      barisKepala: kepala.baris + 1,
      kolomNisn: kepala.kolomNisn + 1,
      kolomNama: kepala.kolomNama + 1
    }
  };
}

/* Judul template: dicari di 5 baris pertama, kolom mana pun. */
function cariJudul(baris) {
  const batas = Math.min(baris.length, 5);
  for (let r = 0; r < batas; r++) {
    const sel = baris[r] || [];
    for (let c = 0; c < sel.length; c++) {
      const teks = normalisasiJudul(sel[c]);
      if (/FORMAT\s+IMPORT\s+NILAI\s+RAPOR/i.test(teks)) {
        return { teks, baris: r, kolom: c, ditemukan: true };
      }
    }
  }
  const barisPertama = (baris[0] || []).map(normalisasiJudul).find(t => t);
  return { teks: barisPertama || '', baris: 0, kolom: 0, ditemukan: false };
}

/* Baris judul kolom: baris pertama yang memuat kata NISN dan NAMA. */
function cariBarisKepala(baris) {
  const batas = Math.min(baris.length, 30);
  for (let r = 1; r < batas; r++) {
    const sel = (baris[r] || []).map(v => normalisasiJudul(v).toUpperCase());
    if (!sel.length) continue;

    let kolomNisn = -1;
    let kolomNama = -1;
    let peringkatNama = 99;

    for (let c = 0; c < sel.length; c++) {
      const t = sel[c];
      if (!t) continue;
      if (kolomNisn < 0 && /NISN/.test(t)) kolomNisn = c;

      if (kolomNama >= 0) continue;
      if (t === 'NAMA' || t === 'NAMA SISWA' || t === 'NAMA PESERTA DIDIK') {
        kolomNama = c; peringkatNama = 0;
      } else if (/^NAMA\s+SISWA/.test(t) || /^NAMA\s+PESERTA/.test(t)) {
        kolomNama = c; peringkatNama = 1;
      } else if (peringkatNama > 1 && /^NAMA\b/.test(t)) {
        kolomNama = c; peringkatNama = 2;
      }
    }

    if (kolomNisn >= 0 && kolomNama >= 0) {
      return { baris: r, kolomNisn, kolomNama };
    }
  }
  return null;
}

/* NISN boleh tersimpan sebagai angka atau teks. Buang pemisah ribuan dan
   akhiran ".0" hasil pembacaan angka desimal. */
function bersihkanNisn(nilai) {
  let teks = String(nilai == null ? '' : nilai).trim();
  if (!teks) return '';
  if (/^\d+\.0+$/.test(teks)) teks = teks.replace(/\.0+$/, '');
  teks = teks.replace(/[\s.\-_]/g, '');
  if (/[a-zA-Z]/.test(teks)) return '';
  return teks.replace(/\D/g, '');
}

/* ---------- Penyimpanan hasil impor (FR-16) ---------- */

async function simpanImpor(hasil, kelasNama, mapelNama) {
  const kelasBersih = normalisasiJudul(kelasNama);
  const mapelBersih = normalisasiJudul(mapelNama);

  if (!kelasBersih) throw new Error('Nama kelas wajib diisi.');
  if (!mapelBersih) throw new Error('Nama mata pelajaran wajib diisi.');

  return db.transaction(
    'rw',
    db.kelas,
    db.mapel,
    db.kelasMapel,
    db.siswa,
    async () => {
      /* 1. Kelas milik pengguna aktif (cari dengan pencocokan tanpa huruf besar-kecil) */
      const kelasSaya = await db.kelas.where('pengguna').equals(PENGGUNA_AKTIF).toArray();
      let kelas = kelasSaya.find(
        k => k.nama.toLocaleLowerCase('id') === kelasBersih.toLocaleLowerCase('id'));

      if (!kelas) {
        const id = await db.kelas.add({ nama: kelasBersih, pengguna: PENGGUNA_AKTIF });
        kelas = { id, nama: kelasBersih, pengguna: PENGGUNA_AKTIF };
      }

      /* 2. Mata pelajaran (kamus bersama, sesuai model data PRD) */
      const semuaMapel = await db.mapel.toArray();
      let mapel = semuaMapel.find(
        m => m.nama.toLocaleLowerCase('id') === mapelBersih.toLocaleLowerCase('id'));

      if (!mapel) {
        const id = await db.mapel.add({ nama: mapelBersih });
        mapel = { id, nama: mapelBersih };
      }

      /* 3. Pasangan kelas + mata pelajaran, satu baris per template */
      const sekarang = Date.now();
      let km = await cariKelasMapel(kelas.id, mapel.id);
      let kelasMapelId;

      if (km) {
        kelasMapelId = km.id;
        await db.kelasMapel.update(km.id, {
          judulAsli: hasil.judul || '',
          namaBerkas: hasil.meta ? hasil.meta.namaBerkas : '',
          diperbarui: sekarang
        });
      } else {
        kelasMapelId = await db.kelasMapel.add({
          kelasId: kelas.id,
          mapelId: mapel.id,
          judulAsli: hasil.judul || '',
          namaBerkas: hasil.meta ? hasil.meta.namaBerkas : '',
          dibuat: sekarang,
          diperbarui: sekarang
        });
      }

      /* 4. Siswa: cocokkan dengan NISN agar tidak ganda dan nilai tidak hilang */
      const lama = await db.siswa.where('kelasId').equals(kelas.id).toArray();
      const petaLama = new Map(lama.map(s => [s.nisn, s]));
      const datang = new Set();

      let baru = 0;
      let diperbarui = 0;

      for (const s of hasil.siswa) {
        datang.add(s.nisn);
        const ada = petaLama.get(s.nisn);
        if (ada) {
          await db.siswa.put({
            nisn: ada.nisn,
            kelasId: kelas.id,
            nama: s.nama,
            urutan: s.urutan
          });
          diperbarui++;
        } else {
          await db.siswa.put({
            nisn: s.nisn,
            kelasId: kelas.id,
            nama: s.nama,
            urutan: s.urutan
          });
          baru++;
        }
      }

      /* Siswa lama yang tidak ada di template tetap disimpan (nilai tidak
         hilang), tetapi dipindahkan ke urutan belakang. */
      const sisih = lama.filter(s => !datang.has(s.nisn))
        .sort((a, b) => a.urutan - b.urutan);
      let urut = hasil.siswa.length;
      for (const s of sisih) {
        urut++;
        await db.siswa.put({
          nisn: s.nisn,
          kelasId: kelas.id,
          nama: s.nama,
          urutan: urut
        });
      }

      return {
        kelasId: kelas.id,
        kelasNama: kelas.nama,
        mapelId: mapel.id,
        mapelNama: mapel.nama,
        kelasMapelId,
        baru,
        diperbarui,
        sisih: sisih.length,
        total: hasil.siswa.length
      };
    }
  );
}
