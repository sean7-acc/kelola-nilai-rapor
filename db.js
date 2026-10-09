'use strict';

/* Versi aplikasi. Dinaikkan setiap kali berkas berubah agar service worker
   memperbarui cache. */
const APP_VERSION = '0.2.0-proto2';

/* FR-01 (login lokal) masuk Prototype 3. Selama itu belum ada, seluruh data
   memakai pemilik tetap "lokal" sehingga penambahan login nanti hanya perlu
   mengganti nilai ini. */
const PENGGUNA_AKTIF = 'lokal';

const DB_NAME = 'kelola-nilai-rapor';

const db = new Dexie(DB_NAME);

db.version(1).stores({
  pengguna: 'username',
  kelas: '++id, pengguna, [pengguna+nama]',
  mapel: '++id, nama',
  kelasMapel: '++id, kelasId, mapelId, [kelasId+mapelId]',
  siswa: '[nisn+kelasId], kelasId',
  komponen: '++id, kelasMapelId',
  nilai: '[nisn+komponenId], komponenId'
});

/* ---------- Penyimpanan browser ---------- */

async function mintaPenyimpananPermanen() {
  if (!navigator.storage || !navigator.storage.persist) return 'tidak-didukung';
  try {
    if (await navigator.storage.persisted()) return 'aktif';
    const hasil = await navigator.storage.persist();
    return hasil ? 'aktif' : 'ditolak';
  } catch (e) {
    return 'gagal';
  }
}

async function statusPenyimpanan() {
  if (!navigator.storage || !navigator.storage.persisted) return 'tidak-didukung';
  try {
    return (await navigator.storage.persisted()) ? 'aktif' : 'belum-aktif';
  } catch (e) {
    return 'gagal';
  }
}

/* ---------- Kueri data ---------- */

async function daftarKelas() {
  const kelas = await db.kelas.where('pengguna').equals(PENGGUNA_AKTIF).toArray();
  return kelas.sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
}

/* Semua pasangan kelas + mata pelajaran milik pengguna aktif, disertai
   jumlah siswa dan waktu pembaruan terakhir. */
async function daftarKelasMapel() {
  const kelas = await daftarKelas();
  const petaKelas = new Map(kelas.map(k => [k.id, k]));
  const pasangan = await db.kelasMapel.toArray();
  const mapel = await db.mapel.toArray();
  const petaMapel = new Map(mapel.map(m => [m.id, m]));

  const milik = pasangan.filter(p => petaKelas.has(p.kelasId));
  const hasil = [];
  for (const p of milik) {
    const k = petaKelas.get(p.kelasId);
    const m = petaMapel.get(p.mapelId);
    if (!m) continue;
    const jmlSiswa = await db.siswa.where('kelasId').equals(k.id).count();
    hasil.push({
      id: p.id,
      kelasId: k.id,
      kelasNama: k.nama,
      mapelId: m.id,
      mapelNama: m.nama,
      judulAsli: p.judulAsli || '',
      namaBerkas: p.namaBerkas || '',
      diperbarui: p.diperbarui || p.dibuat || null,
      jumlahSiswa: jmlSiswa
    });
  }

  hasil.sort((a, b) =>
    a.kelasNama.localeCompare(b.kelasNama, 'id') ||
    a.mapelNama.localeCompare(b.mapelNama, 'id'));

  return hasil;
}

/* Daftar mata pelajaran yang tersedia pada suatu kelas (punya kelasMapel). */
async function mapelUntukKelas(kelasId) {
  const km = await db.kelasMapel.where('kelasId').equals(kelasId).toArray();
  if (!km.length) return [];
  const mapel = await db.mapel.toArray();
  const peta = new Map(mapel.map(m => [m.id, m]));
  const hasil = km
    .map(p => peta.get(p.mapelId))
    .filter(Boolean)
    .sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
  return hasil;
}

async function siswaKelas(kelasId) {
  const daftar = await db.siswa.where('kelasId').equals(kelasId).toArray();
  return daftar.sort((a, b) => a.urutan - b.urutan || a.nama.localeCompare(b.nama, 'id'));
}

async function cariKelasMapel(kelasId, mapelId) {
  const km = await db.kelasMapel.where('[kelasId+mapelId]').equals([kelasId, mapelId]).first();
  if (!km) return null;
  const [kelas, mapel] = await Promise.all([
    db.kelas.get(km.kelasId),
    db.mapel.get(km.mapelId)
  ]);
  return Object.assign({}, km, {
    kelasNama: kelas ? kelas.nama : '',
    mapelNama: mapel ? mapel.nama : ''
  });
}

/* ---------- Komponen dan nilai (Proyek 2) ---------- */

const BOBOT_DEFAULT = [
  { nama: 'HARIAN', bobot: 50 },
  { nama: 'UTS', bobot: 25 },
  { nama: 'UAS', bobot: 25 }
];

async function komponenKelasMapel(kelasMapelId) {
  const komp = await db.komponen.where('kelasMapelId').equals(kelasMapelId).toArray();
  return komp.sort((a, b) => (a.urutan || 0) - (b.urutan || 0) || a.id - b.id);
}

/* Semua nilai untuk sekumpulan komponen, dikelompokkan per siswa. */
async function nilaiKomponen(komponenIds) {
  if (!komponenIds.length) return new Map();
  const baris = await db.nilai.where('komponenId').anyOf(komponenIds).toArray();
  const peta = new Map();
  for (const r of baris) {
    if (!peta.has(r.nisn)) peta.set(r.nisn, {});
    peta.get(r.nisn)[r.komponenId] = r.nilai;
  }
  return peta;
}

async function nilaiSiswa(nisn, komponenIds) {
  const semua = await nilaiKomponen(komponenIds);
  return semua.get(nisn) || {};
}

/* Simpan perubahan komponen dan bobot. Komponen yang dihapus ikut
   menghapus nilai terkait. Urutan komponen mengikuti urutan daftar. */
async function simpanKomponen(kelasMapelId, daftar) {
  const daftarBersih = daftar
    .map(d => ({
      id: d.id ? Number(d.id) : null,
      nama: String(d.nama || '').trim().toUpperCase(),
      bobot: Number(d.bobot)
    }))
    .filter(d => d.nama && Number.isFinite(d.bobot) && d.bobot > 0);

  if (!daftarBersih.length) {
    throw new Error('Setidaknya satu komponen dengan bobot harus diisi.');
  }

  return db.transaction('rw', db.komponen, db.nilai, async () => {
    const lama = await db.komponen.where('kelasMapelId').equals(kelasMapelId).toArray();
    const byId = new Map(lama.map(k => [k.id, k]));
    const idTerpakai = new Set();
    const dipakai = [];

    /* Perbarui/include yang ada di daftar */
    for (const d of daftarBersih) {
      if (d.id && byId.has(d.id)) {
        idTerpakai.add(d.id);
        byId.get(d.id).namaBaru = d.nama;
        byId.get(d.id).bobotBaru = d.bobot;
        dipakai.push({ baru: false, id: d.id });
      } else {
        dipakai.push({ baru: true, nama: d.nama, bobot: d.bobot });
      }
    }

    /* tulis ulang seluruh urutan + simpan perubahan */
    let urut = 0;
    for (const kunci of dipakai) {
      urut++;
      if (!kunci.baru) {
        await db.komponen.update(kunci.id, {
          nama: byId.get(kunci.id).namaBaru,
          bobot: byId.get(kunci.id).bobotBaru,
          urutan: urut
        });
      } else {
        await db.komponen.add({
          kelasMapelId, nama: kunci.nama, bobot: kunci.bobot, urutan: urut
        });
      }
    }

    /* hapus komponen yang tidak ada di daftar + nilai terkait */
    for (const k of lama) {
      if (!idTerpakai.has(k.id)) {
        const nilaiTerkait = await db.nilai.where('komponenId').equals(k.id).toArray();
        await db.nilai.bulkDelete(nilaiTerkait.map(n => [n.nisn, n.komponenId]));
        await db.komponen.delete(k.id);
      }
    }
  });
}

/* Simpan nilai serentak untuk banyak sel. nilai null berarti dihapus. */
async function simpanNilaiKelas(list) {
  const hapus = list.filter(x => x.nilai == null).map(x => [x.nisn, x.komponenId]);
  const simpan = list.filter(x => x.nilai != null);

  return db.transaction('rw', db.nilai, async () => {
    if (hapus.length) await db.nilai.bulkDelete(hapus);
    for (const s of simpan) {
      await db.nilai.put({ nisn: s.nisn, komponenId: s.komponenId, nilai: s.nilai });
    }
  });
}

async function hapusNilaiSiswa(nisn, komponenIds) {
  if (!komponenIds.length) return;
  const terkait = await db.nilai
    .where('komponenId').anyOf(komponenIds)
    .filter(r => r.nisn === nisn)
    .toArray();
  await db.nilai.bulkDelete(terkait.map(r => [r.nisn, r.komponenId]));
}
