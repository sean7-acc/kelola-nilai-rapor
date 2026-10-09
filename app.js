'use strict';

/* Aplikasi Pengelolaan Nilai — Prototype 1
   Cakupan: pemasangan PWA, impor template Excel, penguraian kelas dan
   mata pelajaran, pilih kelas dan mata pelajaran, daftar siswa. */

const APP = document.getElementById('app');

/* ------------------------------------------------------------------ */
/* Router berbasis hash                                                */
/* ------------------------------------------------------------------ */

function bacaRute() {
  const mentah = location.hash.replace(/^#\/?/, '');
  const potong = mentah.split('?');
  const nama = (potong[0] || 'beranda').toLowerCase();
  const param = new URLSearchParams(potong[1] || '');
  return { nama, param };
}

let tokenRender = 0;

async function render() {
  const token = ++tokenRender;
  const { nama, param } = bacaRute();
  const tampil = RUTE[nama] || RUTE.beranda;

  APP.innerHTML = '<div class="memuat">Memuat…</div>';
  tandaiNav(RUTE[nama] ? nama : 'beranda');

  try {
    const isi = await tampil(param);
    if (token !== tokenRender) return;
    APP.innerHTML = '';
    APP.appendChild(isi);
    APP.focus({ preventScroll: true });
  } catch (e) {
    if (token !== tokenRender) return;
    console.error(e);
    APP.innerHTML = '';
    APP.appendChild(el(
      '<section class="panel panel-galat">' +
        '<h1>Terjadi kesalahan</h1>' +
        '<p class="paragraf">' + esc(e.message || e) + '</p>' +
        '<button type="button" class="btn btn-utama" id="ulang-render">Muat ulang</button>' +
      '</section>'
    ));
    const b = document.getElementById('ulang-render');
    if (b) b.addEventListener('click', () => render());
  }
}

function tandaiNav(nama) {
  document.querySelectorAll('#nav-utama a').forEach(a => {
    const aktif = a.dataset.rute === nama ||
      (nama === 'pilih' && a.dataset.rute === 'kelas') ||
      (nama === 'siswa' && a.dataset.rute === 'kelas') ||
      (nama === 'komponen' && a.dataset.rute === 'kelas');
    a.classList.toggle('aktif', aktif);
    if (aktif) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

function pergi(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

/* ------------------------------------------------------------------ */
/* Beranda                                                             */
/* ------------------------------------------------------------------ */

async function tampilkanBeranda() {
  const pasangan = await daftarKelasMapel();
  const status = await statusPenyimpanan();

  const kartu = pasangan.length
    ? pasangan.map(p => kartuKelasMapel(p)).join('')
    : (
      '<div class="keadaan-kosong">' +
        '<h2>Belum ada data</h2>' +
        '<p class="paragraf">Impor template Excel e-rapor untuk satu kelas dan mata pelajaran ' +
        'untuk memulai.</p>' +
        '<a class="btn btn-utama" href="#/impor">Impor Template Excel</a>' +
      '</div>'
    );

  return el(
    '<div>' +
      '<section class="hero">' +
        '<p class="hero-label">Pendukung e-rapor SMK Negeri 2 Kasongan</p>' +
        '<h1>Pengelolaan Nilai Rapor</h1>' +
        '<p class="paragraf hero-teks">Impor template Excel e-rapor, atur komponen dan bobot, ' +
        'lalu hitung nilai rapor secara otomatis tanpa salah hitung. Berjalan tanpa internet ' +
        'setelah dipasang.</p>' +
        '<div class="hero-aksi">' +
          '<a class="btn btn-utama btn-besar" href="#/impor">Impor Template Excel</a>' +
          (pasangan.length ? '<a class="btn btn-terang btn-besar" href="#/kelas">Kelas &amp; Mapel</a>' : '') +
        '</div>' +
      '</section>' +

      '<section class="bagian">' +
        '<div class="bagian-kepala">' +
          '<h2>Kelas &amp; Mata Pelajaran</h2>' +
          (pasangan.length ? '<a class="tautan" href="#/kelas">Lihat semua</a>' : '') +
        '</div>' +
        '<div class="kartu-grid">' + kartu + '</div>' +
      '</section>' +

      '<section class="bagian">' +
        '<div class="bagian-kepala"><h2>Status</h2></div>' +
        '<div class="status-grid">' +
          kartuStatus('Kapasitas tersimpan', 'Berjalan lokal di browser', 'data') +
          kartuStatus('Penyimpanan permanen', teksPenyimpanan(status), 'ram' +
            (status === 'aktif' ? ' baik' : '')) +
          kartuStatus('Koneksi', navigator.onLine ? 'Online' : 'Offline — semua fitur tetap berjalan', 'wifi') +
          kartuStatus('Versi aplikasi', APP_VERSION, 'info') +
        '</div>' +
      '</section>' +
    '</div>'
  );
}

function kartuStatus(judul, isi, ikon) {
  return (
    '<div class="status-kartu">' +
      '<span class="status-ikon ikon-' + esc(ikon.split(' ')[0]) + '" aria-hidden="true"></span>' +
      '<div>' +
        '<p class="status-judul">' + esc(judul) + '</p>' +
        '<p class="status-isi">' + esc(isi) + '</p>' +
      '</div>' +
    '</div>'
  );
}

function teksPenyimpanan(status) {
  if (status === 'aktif') return 'Aktif — data tahan meski data situs dibersihkan';
  if (status === 'belum-aktif') return 'Belum aktif — cadangkan data secara berkala';
  if (status === 'ditolak') return 'Ditolak browser — cadangkan data secara berkala';
  if (status === 'tidak-didukung') return 'Tidak didukung browser ini';
  return 'Tidak diketahui';
}

function kartuKelasMapel(p) {
  return (
    '<a class="kartu-km" href="#/pilih?km=' + encodeURIComponent(p.id) + '">' +
      '<div class="kartu-km-kepala">' +
        '<span class="lencana lencana-kelas">' + esc(p.kelasNama) + '</span>' +
        '<span class="lencana lencana-mapel">' + esc(p.mapelNama) + '</span>' +
      '</div>' +
      '<p class="kartu-km-jumlah">' + angkaIndo(p.jumlahSiswa) + ' siswa</p>' +
      '<p class="kartu-km-meta">Diperbarui ' + esc(tanggalIndo(p.diperbarui)) + '</p>' +
      '<span class="kartu-km-buka">Buka daftar siswa &rarr;</span>' +
    '</a>'
  );
}

/* ------------------------------------------------------------------ */
/* Impor template (FR-02, FR-03)                                       */
/* ------------------------------------------------------------------ */

async function tampilkanImpor() {
  const node = el(
    '<div>' +
      '<section class="bagian">' +
        '<div class="bagian-kepala">' +
          '<h1>Impor Template Excel E-Rapor</h1>' +
        '</div>' +
        '<p class="paragraf">Pilih berkas <code>.xlsx</code> template e-rapor untuk satu kelas ' +
        'dan satu mata pelajaran. Aplikasi hanya membaca berkas — template tidak pernah ' +
        'diubah maupun disimpan ulang.</p>' +
      '</section>' +

      '<section class="panel dropzone" id="dropzone" tabindex="0">' +
        '<span class="ikon-berkas" aria-hidden="true"></span>' +
        '<p class="dropzone-teks">Seret berkas ke sini, atau</p>' +
        '<label class="btn btn-utama btn-besar" for="berkas-template">Pilih berkas template</label>' +
        '<input type="file" id="berkas-template" accept=".xlsx,.xlsm,.xls" hidden>' +
        '<p class="dropzone-catatan">Format: .xlsx — template e-rapor SMK</p>' +
        '<div class="proses" id="proses-impor" hidden>' +
          '<span class="spin" aria-hidden="true"></span>' +
          '<span>Membaca berkas…</span>' +
        '</div>' +
      '</section>' +

      '<section class="bagian">' +
        '<div class="bagian-kepala"><h2>Yang dibaca aplikasi</h2></div>' +
        '<ol class="langkah">' +
          '<li>Judul pada baris 1 untuk mengenali <strong>mata pelajaran</strong> dan <strong>kelas</strong>.</li>' +
          '<li>Baris judul kolom untuk menemukan kolom <strong>NISN</strong> dan <strong>nama siswa</strong> ' +
          '(dicari dari teks kolom, bukan posisi tetap).</li>' +
          '<li>Daftar siswa beserta <strong>urutannya</strong>, dipertahankan persis seperti di template.</li>' +
        '</ol>' +
        '<div class="catatan">' +
          '<strong>Penting:</strong> kolom TP (T/R) dan status Valid tidak dikelola aplikasi. ' +
          'Pengisian dan pemeriksaannya tetap dilakukan guru di template e-rapor.' +
        '</div>' +
      '</section>' +
    '</div>'
  );

  const input = node.querySelector('#berkas-template');
  const zona = node.querySelector('#dropzone');
  const proses = node.querySelector('#proses-impor');

  async function prosesBerkas(file) {
    if (!file) return;
    proses.hidden = false;
    try {
      const hasil = await bacaTemplate(file);
      dialogKonfirmasiImpor(hasil);
    } catch (e) {
      toast(e.message || 'Berkas tidak dapat dibaca.', 'galat', 5200);
    } finally {
      proses.hidden = true;
      input.value = '';
    }
  }

  input.addEventListener('change', () => prosesBerkas(input.files[0]));

  zona.addEventListener('dragover', ev => {
    ev.preventDefault();
    zona.classList.add('seret');
  });
  zona.addEventListener('dragleave', () => zona.classList.remove('seret'));
  zona.addEventListener('drop', ev => {
    ev.preventDefault();
    zona.classList.remove('seret');
    if (ev.dataTransfer.files && ev.dataTransfer.files[0]) prosesBerkas(ev.dataTransfer.files[0]);
  });

  return node;
}

function dialogKonfirmasiImpor(hasil) {
  const parse = parseJudulTemplate(hasil.judul);

  const peringatanHtml = hasil.peringatan.length
    ? '<ul class="peringatan">' + hasil.peringatan.map(p => '<li>' + esc(p) + '</li>').join('') + '</ul>'
    : '';

  const peringatanParse = parse.peringatan
    ? '<p class="parse-peringatan">' + esc(parse.peringatan) + '</p>'
    : '';

  const parseHtml = parse.berhasil
    ? '<p class="parse-info">Judul terbaca: <code>' + esc(parse.judulAsli) + '</code><br>' +
      'Pola yang cocok: <strong>' + esc(parse.pola) + '</strong></p>' + peringatanParse
    : '<p class="parse-info parse-galat">Judul tidak dapat diuraikan otomatis: ' +
      esc(parse.alasan) + '<br>' + esc(parse.saran || '') + '</p>';

  const isi =
    parseHtml +
    '<div class="form">' +
      '<div class="form-baris">' +
        '<label for="inp-kelas">Kelas</label>' +
        '<input type="text" id="inp-kelas" value="' + esc(parse.kelas) + '" ' +
          'placeholder="mis. X TSM - REGULER" autocomplete="off" required>' +
        '<p class="bantuan">Hasil pembacaan judul. Bila keliru, silakan perbaiki.</p>' +
      '</div>' +
      '<div class="form-baris">' +
        '<label for="inp-mapel">Mata Pelajaran</label>' +
        '<input type="text" id="inp-mapel" value="' + esc(parse.mapel) + '" ' +
          'placeholder="mis. BAHASA INDONESIA" autocomplete="off" required>' +
      '</div>' +
    '</div>' +
    '<p class="ringkas"><strong>' + angkaIndo(hasil.siswa.length) + '</strong> siswa terbaca dari ' +
      '<span class="ringkas-berkas">' + esc(hasil.meta.namaBerkas) + '</span> ' +
      '(lembar "' + esc(hasil.meta.namaLembar) + '", baris judul kolom: ' + hasil.meta.barisKepala + ').</p>' +
    peringatanHtml +
    '<div class="pratinjau">' +
      '<p class="pratinjau-kepala">Pratinjau 5 siswa pertama</p>' +
      '<ol class="pratinjau-daftar">' +
        hasil.siswa.slice(0, 5).map(s =>
          '<li><span class="pratinjau-nisn">' + esc(s.nisn) + '</span> ' + esc(s.nama) + '</li>'
        ).join('') +
      '</ol>' +
    '</div>';

  bukaModal({
    judul: 'Konfirmasi hasil impor',
    isi,
    aksi: [
      { label: 'Batal', kelas: 'btn-terang', aktif: () => true },
      {
        label: 'Simpan',
        kelas: 'btn-utama',
        diam: true,
        aktif: async node => {
          const kelas = node.querySelector('#inp-kelas').value.trim();
          const mapel = node.querySelector('#inp-mapel').value.trim();

          if (!kelas) { toast('Nama kelas wajib diisi.', 'galat'); return false; }
          if (!mapel) { toast('Nama mata pelajaran wajib diisi.', 'galat'); return false; }

          const simpan = await simpanImpor(hasil, kelas, mapel);

          const bagian = [];
          if (simpan.baru) bagian.push(simpan.baru + ' siswa baru');
          if (simpan.diperbarui) bagian.push(simpan.diperbarui + ' siswa diperbarui');
          if (simpan.sisih) bagian.push(simpan.sisih + ' siswa lama dipertahankan di belakang');

          toast(
            'Tersimpan: ' + simpan.kelasNama + ' — ' + simpan.mapelNama +
            (bagian.length ? ' (' + bagian.join(', ') + ')' : ''),
            'sukses', 4600
          );

          pergi('#/pilih?km=' + encodeURIComponent(simpan.kelasMapelId));
          return true;
        }
      }
    ]
  });
}

/* ------------------------------------------------------------------ */
/* Daftar kelas dan mata pelajaran                                     */
/* ------------------------------------------------------------------ */

async function tampilkanKelas() {
  const pasangan = await daftarKelasMapel();

  if (!pasangan.length) {
    return el(
      '<section class="bagian">' +
        '<div class="bagian-kepala"><h1>Kelas &amp; Mata Pelajaran</h1></div>' +
        '<div class="keadaan-kosong">' +
          '<h2>Belum ada template yang diimpor</h2>' +
          '<p class="paragraf">Setiap baris di bawah mewakili satu template e-rapor — satu kelas ' +
          'dan satu mata pelajaran.</p>' +
          '<a class="btn btn-utama" href="#/impor">Impor Template Excel</a>' +
        '</div>' +
      '</section>'
    );
  }

  const baris = pasangan.map((p, i) =>
    '<tr>' +
      '<td class="kolom-no">' + (i + 1) + '</td>' +
      '<td data-label="Kelas"><span class="lencana lencana-kelas">' + esc(p.kelasNama) + '</span></td>' +
      '<td data-label="Mata Pelajaran">' + esc(p.mapelNama) + '</td>' +
      '<td data-label="Siswa" class="kolom-angka">' + angkaIndo(p.jumlahSiswa) + '</td>' +
      '<td data-label="Diperbarui" class="kolom-tgl">' + esc(tanggalIndo(p.diperbarui)) + '</td>' +
      '<td data-label="Aksi" class="kolom-aksi">' +
        '<a class="btn btn-kecil btn-terang" href="#/pilih?km=' + encodeURIComponent(p.id) + '">Buka</a>' +
      '</td>' +
    '</tr>'
  ).join('');

  return el(
    '<section class="bagian">' +
      '<div class="bagian-kepala">' +
        '<h1>Kelas &amp; Mata Pelajaran</h1>' +
        '<a class="btn btn-utama btn-kecil" href="#/impor">Impor lagi</a>' +
      '</div>' +
      '<div class="tabel-bungkus">' +
        '<table class="tabel">' +
          '<thead><tr>' +
            '<th class="kolom-no">No</th>' +
            '<th>Kelas</th><th>Mata Pelajaran</th>' +
            '<th class="kolom-angka">Siswa</th>' +
            '<th class="kolom-tgl">Diperbarui</th>' +
            '<th class="kolom-aksi">Aksi</th>' +
          '</tr></thead>' +
          '<tbody>' + baris + '</tbody>' +
        '</table>' +
      '</div>' +
      '<p class="catatan-kecil">Urutan siswa pada setiap kelas mengikuti urutan template terakhir ' +
      'yang diimpor.</p>' +
    '</section>'
  );
}

/* ------------------------------------------------------------------ */
/* Pilih kelas dan mata pelajaran + daftar siswa (FR-04, FR-05)        */
/* ------------------------------------------------------------------ */

async function tampilkanPilih(param) {
  const kelas = await daftarKelas();

  const node = el(
    '<section class="bagian">' +
      '<div class="bagian-kepala"><h1>Pilih Kelas &amp; Mata Pelajaran</h1></div>' +
      (kelas.length ? (
        '<div class="panel panel-pilih">' +
          '<div class="form-baris">' +
            '<label for="sel-kelas">Kelas</label>' +
            '<select id="sel-kelas"></select>' +
          '</div>' +
          '<div class="form-baris">' +
            '<label for="sel-mapel">Mata Pelajaran</label>' +
            '<select id="sel-mapel"></select>' +
            '<p class="bantuan" id="bantuan-mapel">Daftar mata pelajaran menyesuaikan kelas yang dipilih.</p>' +
          '</div>' +
        '</div>' +
        '<div id="wadah-siswa"></div>'
      ) : (
        '<div class="keadaan-kosong">' +
          '<h2>Belum ada kelas</h2>' +
          '<p class="paragraf">Impor template Excel terlebih dahulu.</p>' +
          '<a class="btn btn-utama" href="#/impor">Impor Template Excel</a>' +
        '</div>'
      )) +
    '</section>'
  );

  if (!kelas.length) return node;

  const selKelas = node.querySelector('#sel-kelas');
  const selMapel = node.querySelector('#sel-mapel');
  const bantuan = node.querySelector('#bantuan-mapel');
  const wadah = node.querySelector('#wadah-siswa');

  selKelas.innerHTML = '<option value="">— pilih kelas —</option>' +
    kelas.map(k => '<option value="' + k.id + '">' + esc(k.nama) + '</option>').join('');

  const kmAwal = param.get('km');
  let kelasMapelAwal = null;
  if (kmAwal) {
    kelasMapelAwal = await db.kelasMapel.get(Number(kmAwal)) || null;
    if (kelasMapelAwal && kelas.some(k => k.id === kelasMapelAwal.kelasId)) {
      selKelas.value = String(kelasMapelAwal.kelasId);
    } else {
      kelasMapelAwal = null;
    }
  }

  async function muatMapel(mapelId) {
    const kelasId = Number(selKelas.value);
    selMapel.innerHTML = '<option value="">— pilih mata pelajaran —</option>';
    wadah.innerHTML = '';
    bantuan.classList.remove('bantuan-galat');

    if (!kelasId) {
      bantuan.textContent = 'Pilih kelas terlebih dahulu.';
      selMapel.disabled = true;
      return;
    }

    const daftar = await mapelUntukKelas(kelasId);
    if (!daftar.length) {
      selMapel.disabled = true;
      bantuan.textContent = 'Belum ada template yang diimpor untuk kelas ini.';
      bantuan.classList.add('bantuan-galat');
      wadah.appendChild(el(
        '<div class="keadaan-kosong keadaan-kecil">' +
          '<p class="paragraf">Kelas ini belum memiliki mata pelajaran. ' +
          'Impor template e-rapor kelas ini terlebih dahulu.</p>' +
          '<a class="btn btn-utama" href="#/impor">Impor Template Excel</a>' +
        '</div>'
      ));
      return;
    }

    selMapel.disabled = false;
    selMapel.innerHTML = daftar.map(m =>
      '<option value="' + m.id + '">' + esc(m.nama) + '</option>').join('');

    const ada = mapelId && daftar.some(m => m.id === Number(mapelId));
    selMapel.value = ada ? String(mapelId) : String(daftar[0].id);

    bantuan.textContent = 'Daftar mata pelajaran menyesuaikan kelas yang dipilih.';
    await muatSiswa();
  }

  async function muatSiswa() {
    const kelasId = Number(selKelas.value);
    const mapelId = Number(selMapel.value);
    wadah.innerHTML = '<div class="memuat">Memuat daftar siswa…</div>';

    if (!kelasId || !mapelId) {
      wadah.innerHTML = '';
      return;
    }

    const pasangan = await cariKelasMapel(kelasId, mapelId);
    const siswa = await siswaKelas(kelasId);

    if (!pasangan) {
      wadah.innerHTML = '';
      wadah.appendChild(el(
        '<div class="keadaan-kosong keadaan-kecil">' +
          '<p class="paragraf">Pasangan kelas dan mata pelajaran ini belum ada.</p>' +
        '</div>'
      ));
      return;
    }

    if (kmTerpilih() !== pasangan.id) {
      history.replaceState(null, '', '#/pilih?km=' + encodeURIComponent(pasangan.id));
    }

    wadah.innerHTML = '';
    wadah.appendChild(await panelPilih(pasangan, siswa));
  }

  selKelas.addEventListener('change', () => muatMapel());
  selMapel.addEventListener('change', () => muatSiswa());

  if (selKelas.value) {
    await muatMapel(kelasMapelAwal ? kelasMapelAwal.mapelId : null);
  } else {
    bantuan.textContent = 'Pilih kelas terlebih dahulu.';
    selMapel.disabled = true;
  }

  return node;
}

function kmTerpilih() {
  const hash = location.hash || '';
  const kueri = hash.split('?')[1] || '';
  return Number(new URLSearchParams(kueri).get('km') || 0);
}

/* ------------------------------------------------------------------ */
/* Ruang kerja input nilai satu kelas & mata pelajaran (FR-07, FR-11,  */
/* FR-12, FR-13)                                                       */
/* ------------------------------------------------------------------ */

function panelKomponenKosong(pasangan) {
  return el(
    '<div class="bagian">' +
      '<div class="bagian-kepala">' +
        '<h2>Input Nilai — ' + esc(pasangan.kelasNama) + ' · ' + esc(pasangan.mapelNama) + '</h2>' +
      '</div>' +
      '<div class="keadaan-kosong">' +
        '<h2>Belum ada komponen nilai</h2>' +
        '<p class="paragraf">Atur dulu komponen penilaian dan bobotnya — misalnya HARIAN (50%), ' +
        'UTS (25%), UAS (25%). Nilai rapor dihitung otomatis dari komponen tersebut.</p>' +
        '<a class="btn btn-utama" href="#/komponen?km=' + encodeURIComponent(pasangan.id) + '">' +
          'Atur Komponen &amp; Bobot</a>' +
      '</div>' +
    '</div>'
  );
}

async function panelPilih(pasangan, siswa) {
  const komponen = await komponenKelasMapel(pasangan.id);

  if (!komponen.length) return panelKomponenKosong(pasangan);

  const nilaiTersimpan = await nilaiKomponen(komponen.map(k => k.id));

  if (!siswa.length) {
    return el(
      '<div class="bagian">' +
        '<div class="bagian-kepala">' +
          '<h2>Input Nilai — ' + esc(pasangan.kelasNama) + ' · ' + esc(pasangan.mapelNama) + '</h2>' +
          '<a class="btn btn-terang btn-kecil" href="#/komponen?km=' + encodeURIComponent(pasangan.id) + '">' +
            'Atur Komponen &amp; Bobot</a>' +
        '</div>' +
        '<div class="keadaan-kosong keadaan-kecil">' +
          '<p class="paragraf">Belum ada siswa untuk kombinasi ini.</p>' +
        '</div>' +
      '</div>'
    );
  }

  const node = el(
    '<div class="bagian">' +
      '<div class="bagian-kepala">' +
        '<h2>Input Nilai — ' + esc(pasangan.kelasNama) + ' · ' + esc(pasangan.mapelNama) + '</h2>' +
        '<span class="lencana lencana-ringkas">' + angkaIndo(siswa.length) + ' siswa</span>' +
      '</div>' +

      '<div class="panel toolbar-nilai">' +
        '<a class="btn btn-terang btn-kecil" href="#/komponen?km=' + encodeURIComponent(pasangan.id) + '">' +
          'Atur Komponen &amp; Bobot</a>' +
        '<span class="toolbar-status" id="status-simpan">Tidak ada perubahan</span>' +
        '<span class="toolbar-geser"></span>' +
        '<button type="button" class="btn btn-terang btn-kecil" id="tombol-ekspor">Ekspor .xlsx</button>' +
        '<button type="button" class="btn btn-terang btn-kecil" id="tombol-salin">Salin Nilai Rapor</button>' +
        '<button type="button" class="btn btn-utama btn-kecil" id="tombol-simpan">Simpan Nilai</button>' +
      '</div>' +

      '<div class="tabel-bungkus">' +
        '<table class="tabel tabel-nilai">' +
          '<thead><tr>' +
            '<th class="kolom-no">No</th>' +
            '<th class="kolom-nisn">NISN</th>' +
            '<th>Nama Siswa</th>' +
            komponen.map(k =>
              '<th class="kolom-input">' + esc(k.nama) +
                '<span class="sub">bobot ' + angkaIndo(k.bobot) + '%</span></th>'
            ).join('') +
            '<th class="kolom-rapor">Nilai Rapor</th>' +
            '<th class="kolom-aksi"></th>' +
          '</tr></thead>' +
          '<tbody></tbody>' +
        '</table>' +
      '</div>' +

      '<p class="catatan-kecil">Rumus: nilai rapor = Σ (bobot × nilai) ÷ total bobot, ' +
      'dibulatkan ke bilangan bulat terdekat. Nilai harus angka 1–100. ' +
      'Total bobot saat ini: <strong>' + angkaIndo(totalBobot(komponen)) + '%</strong>.</p>' +
    '</div>'
  );

  const tbody = node.querySelector('tbody');
  let dikotori = false;

  function tandaiStatus() {
    const elSt = node.querySelector('#status-simpan');
    if (elSt) {
      elSt.textContent = dikotori ? 'Perubahan belum disimpan' : 'Tersimpan';
      elSt.classList.toggle('status-baru', dikotori);
    }
  }

  /* Baris siswa dari skema tabel menjadi {siswa, nilaiMap, rapor}. */
  function barisDariDom() {
    const hasil = [];
    tbody.querySelectorAll('tr').forEach(tr => {
      const nilaiMap = {};
      tr.querySelectorAll('.inp-nilai').forEach(inp => {
        nilaiMap[Number(inp.dataset.komponen)] = parseNilaiAngka(inp.value);
      });
      const nisn = tr.dataset.nisn;
      const nama = tr.dataset.nama;
      hasil.push({
        nisn,
        nama,
        siswa: { nisn, nama },
        nilaiMap,
        rapor: hitungRapor(komponen, nilaiMap)
      });
    });
    return hasil;
  }

  function perbaruiRaporSel(tr) {
    const nilaiMap = {};
    tr.querySelectorAll('.inp-nilai').forEach(inp => {
      nilaiMap[Number(inp.dataset.komponen)] = parseNilaiAngka(inp.value);
    });
    const rapor = hitungRapor(komponen, nilaiMap);
    const sel = tr.querySelector('.sel-rapor');
    if (rapor == null) {
      sel.textContent = '—';
      sel.classList.remove('nilai-oke', 'nilai-setengah');
      sel.classList.add('nilai-belum');
    } else if (nilaiKomponenLengkap(komponen, nilaiMap)) {
      sel.textContent = rapor;
      sel.classList.remove('nilai-belum', 'nilai-setengah');
      sel.classList.add('nilai-oke');
    } else {
      sel.textContent = rapor;
      sel.classList.remove('nilai-belum', 'nilai-oke');
      sel.classList.add('nilai-setengah');
    }
  }

  siswa.forEach((s, i) => {
    const href = '#/siswa?km=' + encodeURIComponent(pasangan.id) +
      '&nisn=' + encodeURIComponent(s.nisn);
    const simpan = nilaiTersimpan.get(s.nisn) || {};

    const tr = el(
      '<tr class="baris-siswa" data-nisn="' + esc(s.nisn) + '" data-nama="' + esc(s.nama) + '">' +
        '<td class="kolom-no">' + (i + 1) + '</td>' +
        '<td class="kolom-nisn" data-label="NISN">' + esc(s.nisn) + '</td>' +
        '<td data-label="Nama"><a class="tautan-nama" href="' + href + '">' + esc(s.nama) + '</a></td>' +
        komponen.map(k =>
          '<td class="kolom-input" data-label="' + esc(k.nama) + '">' +
            '<input type="number" inputmode="decimal" min="1" max="100" step="any" ' +
              'class="inp-nilai" data-nisn="' + esc(s.nisn) + '" ' +
              'data-komponen="' + k.id + '" value="' + (simpan[k.id] ?? '') + '">' +
          '</td>'
        ).join('') +
        '<td class="kolom-rapor" data-label="Nilai Rapor">' +
          '<span class="sel-rapor nilai-belum"></span></td>' +
        '<td class="kolom-aksi" data-label="Nilai">' +
          '<a class="btn btn-kecil btn-terang" href="' + href + '">Rinci</a>' +
        '</td>' +
      '</tr>'
    );

    tr.querySelectorAll('.inp-nilai').forEach(inp => {
      inp.addEventListener('input', () => {
        dikotori = true;
        tandaiStatus();
        perbaruiRaporSel(tr);
      });
      inp.addEventListener('change', () => {
        const n = parseNilaiAngka(inp.value);
        if (n != null && !nilaiValid(n)) {
          toast('Nilai harus antara 1 dan 100.', 'galat', 3000);
        }
      });
    });

    tr.addEventListener('click', ev => {
      if (ev.target.closest('a') || ev.target.closest('input')) return;
      location.hash = href;
    });

    tbody.appendChild(tr);
    perbaruiRaporSel(tr);
  });

  tandaiStatus();

  /* Simpan seluruh sel. Perubahan hanya boleh menolak nilai di luar 1–100. */
  async function simpanSemua() {
    const data = [];
    const salah = [];
    tbody.querySelectorAll('tr').forEach(tr => {
      tr.querySelectorAll('.inp-nilai').forEach(inp => {
        const nilai = parseNilaiAngka(inp.value);
        const komponenId = Number(inp.dataset.komponen);
        if (nilai != null && !nilaiValid(nilai)) {
          salah.push(tr.dataset.nama + ' — ' + komponenNama(komponenId));
        } else {
          data.push({ nisn: tr.dataset.nisn, komponenId, nilai });
        }
      });
    });

    if (salah.length) {
      toast('Tidak dapat menyimpan: ' + ringkasMasalah(salah) + ' di luar 1–100.', 'galat', 6000);
      return false;
    }

    await simpanNilaiKelas(data);
    dikotori = false;
    tandaiStatus();
    return true;
  }

  function komponenNama(id) {
    const k = komponen.find(x => x.id === id);
    return k ? k.nama : id;
  }

  async function salinNilai() {
    const baris = barisDariDom();
    const masalah = masalahNilai(komponen, baris);
    if (masalah.length) {
      toast('Belum bisa disalin. ' + ringkasMasalah(masalah), 'galat', 7000);
      return;
    }
    await simpanSemua();
    await salinTeksKePapanKlip(teksKolomNilaiRapor(baris));
    toast('Nilai rapor ' + baris.length + ' siswa disalin ke papan klip.', 'sukses');
  }

  async function eksporNilai() {
    const baris = barisDariDom();
    const masalah = masalahNilai(komponen, baris);
    if (masalah.length) {
      toast('Belum bisa diekspor. ' + ringkasMasalah(masalah), 'galat', 7000);
      return;
    }
    await simpanSemua();
    eksporNilaiXlsx({
      kelasNama: pasangan.kelasNama,
      mapelNama: pasangan.mapelNama,
      komponen,
      baris
    });
    toast('Berkas daftar nilai diunduh.', 'sukses');
  }

  node.querySelector('#tombol-simpan').addEventListener('click', async () => {
    const oke = await simpanSemua();
    if (oke) toast('Nilai tersimpan.', 'sukses');
  });
  node.querySelector('#tombol-salin').addEventListener('click', salinNilai);
  node.querySelector('#tombol-ekspor').addEventListener('click', eksporNilai);

  return node;
}

/* ------------------------------------------------------------------ */
/* Halaman nilai satu siswa (FR-06)                                    */
/* ------------------------------------------------------------------ */

async function tampilkanSiswa(param) {
  const kmId = Number(param.get('km'));
  const nisn = param.get('nisn') || '';

  const pasangan = kmId ? await db.kelasMapel.get(kmId) : null;
  if (!pasangan) throw new Error('Data kelas dan mata pelajaran tidak ditemukan.');

  const kelas = await db.kelas.get(pasangan.kelasId);
  const mapel = await db.mapel.get(pasangan.mapelId);
  const siswa = await db.siswa.get([nisn, pasangan.kelasId]);
  if (!siswa) throw new Error('Siswa dengan NISN ' + nisn + ' tidak ditemukan pada kelas ini.');

  const komponen = await komponenKelasMapel(pasangan.id);
  const kmKueri = encodeURIComponent(pasangan.id);

  if (!komponen.length) {
    return el(
      '<section class="bagian">' +
        '<div class="bagian-kepala">' +
          '<h1>Nilai Siswa</h1>' +
          '<a class="btn btn-kecil btn-terang" href="#/pilih?km=' + kmKueri + '">' +
            '&larr; Kembali ke daftar</a>' +
        '</div>' +
        '<div class="panel identitas">' +
          '<div class="identitas-item"><span class="identitas-label">NISN</span>' +
            '<span class="identitas-nisn">' + esc(siswa.nisn) + '</span></div>' +
          '<div class="identitas-item"><span class="identitas-label">Nama</span>' +
            '<span class="identitas-nama">' + esc(siswa.nama) + '</span></div>' +
        '</div>' +
        '<div class="keadaan-kosong">' +
          '<h2>Komponen nilai belum diatur</h2>' +
          '<p class="paragraf">Atur komponen penilaian dan bobotnya terlebih dahulu.</p>' +
          '<a class="btn btn-utama" href="#/komponen?km=' + kmKueri + '">Atur Komponen &amp; Bobot</a>' +
        '</div>' +
      '</section>'
    );
  }

  const tersimpan = await nilaiSiswa(nisn, komponen.map(k => k.id));
  const nilaiMap = {};
  komponen.forEach(k => { nilaiMap[k.id] = parseNilaiAngka(tersimpan[k.id]); });

  const node = el(
    '<section class="bagian">' +
      '<div class="bagian-kepala">' +
        '<h1>Nilai Siswa</h1>' +
        '<a class="btn btn-kecil btn-terang" href="#/pilih?km=' + kmKueri + '">' +
          '&larr; Kembali ke tabel</a>' +
      '</div>' +

      '<div class="panel identitas">' +
        '<div class="identitas-item"><span class="identitas-label">NISN</span>' +
          '<span class="identitas-nisn">' + esc(siswa.nisn) + '</span></div>' +
        '<div class="identitas-item"><span class="identitas-label">Nama</span>' +
          '<span class="identitas-nama">' + esc(siswa.nama) + '</span></div>' +
        '<div class="identitas-item"><span class="identitas-label">Kelas</span>' +
          '<span>' + esc(kelas ? kelas.nama : '—') + '</span></div>' +
        '<div class="identitas-item"><span class="identitas-label">Mata Pelajaran</span>' +
          '<span>' + esc(mapel ? mapel.nama : '—') + '</span></div>' +
      '</div>' +

      '<div class="panel">' +
        '<div class="bagian-kepala">' +
          '<h2>Nilai Komponen</h2>' +
          '<span class="toolbar-status" id="status-siswa">Tersimpan</span>' +
        '</div>' +
        '<div class="grid-komponen">' +
          komponen.map(k =>
            '<div class="form-baris">' +
              '<label for="val-' + k.id + '">' + esc(k.nama) +
                ' <span class="sub">bobot ' + angkaIndo(k.bobot) + '%</span></label>' +
              '<input type="number" inputmode="decimal" min="1" max="100" step="any" ' +
                'id="val-' + k.id + '" data-komponen="' + k.id + '" ' +
                'value="' + (nilaiMap[k.id] ?? '') + '">' +
            '</div>'
          ).join('') +
        '</div>' +
        '<div class="rapor-ringkas">' +
          '<div><span class="rapor-label">Nilai Rapor</span>' +
            '<span class="bantuan">Σ (bobot × nilai) ÷ total bobot</span></div>' +
          '<span class="rapor-angka" id="rapor-angka">—</span>' +
        '</div>' +
        '<div class="form-aksi">' +
          '<button type="button" class="btn btn-utama" id="simpan-siswa">Simpan Nilai</button>' +
        '</div>' +
      '</div>' +
    '</section>'
  );

  const st = node.querySelector('#status-siswa');
  const raporAngka = node.querySelector('#rapor-angka');
  let berubah = false;

  function perbarui() {
    const hasil = hitungRapor(komponen, nilaiMap);
    if (hasil == null) {
      raporAngka.textContent = '—';
      raporAngka.classList.add('nilai-belum');
    } else {
      raporAngka.textContent = hasil;
      raporAngka.classList.remove('nilai-belum');
    }
    st.textContent = berubah ? 'Perubahan belum disimpan' : 'Tersimpan';
    st.classList.toggle('status-baru', berubah);
  }

  node.querySelectorAll('input[data-komponen]').forEach(inp => {
    inp.addEventListener('input', () => {
      const id = Number(inp.dataset.komponen);
      const v = parseNilaiAngka(inp.value);
      nilaiMap[id] = v;
      berubah = true;
      perbarui();
    });
    inp.addEventListener('change', () => {
      const v = parseNilaiAngka(inp.value);
      if (v != null && !nilaiValid(v)) {
        toast('Nilai harus antara 1 dan 100.', 'galat', 3000);
      }
    });
  });

  node.querySelector('#simpan-siswa').addEventListener('click', async () => {
    const data = [];
    const salah = [];
    komponen.forEach(k => {
      const v = nilaiMap[k.id];
      if (v != null && !nilaiValid(v)) {
        salah.push(k.nama + ' (' + v + ')');
      } else {
        data.push({ nisn, komponenId: k.id, nilai: v });
      }
    });

    if (salah.length) {
      toast('Tidak dapat menyimpan: ' + salah.join('; ') + ' di luar 1–100.', 'galat', 5000);
      return;
    }
    await simpanNilaiKelas(data);
    berubah = false;
    perbarui();
    toast('Nilai ' + siswa.nama + ' tersimpan.', 'sukses');
  });

  perbarui();
  return node;
}

/* ------------------------------------------------------------------ */
/* Pengaturan komponen dan bobot (FR-08)                               */
/* ------------------------------------------------------------------ */

const MAKS_KOMPONEN = 8;

async function tampilkanKomponen(param) {
  const kmId = Number(param.get('km'));
  const pasangan = kmId ? await db.kelasMapel.get(kmId) : null;
  if (!pasangan) throw new Error('Data kelas dan mata pelajaran tidak ditemukan.');

  const kelas = await db.kelas.get(pasangan.kelasId);
  const mapel = await db.mapel.get(pasangan.mapelId);
  const kmKueri = encodeURIComponent(pasangan.id);

  const lama = await komponenKelasMapel(pasangan.id);
  const baris = lama.length
    ? lama.map(k => ({ id: k.id, nama: k.nama, bobot: k.bobot }))
    : BOBOT_DEFAULT.map(d => ({ id: null, nama: d.nama, bobot: d.bobot }));

  const node = el(
    '<section class="bagian">' +
      '<div class="bagian-kepala">' +
        '<h1>Atur Komponen &amp; Bobot</h1>' +
        '<a class="btn btn-kecil btn-terang" href="#/pilih?km=' + kmKueri + '">' +
          '&larr; Kembali</a>' +
      '</div>' +
      '<p class="paragraf">Komponen penilaian untuk <strong>' +
        esc(kelas ? kelas.nama : '—') + ' — ' + esc(mapel ? mapel.nama : '—') +
        '</strong>. Nilai rapor dihitung dengan <code>Σ (bobot × nilai) ÷ total bobot</code>. ' +
        'Jumlah bobot yang umumnya digunakan sekolah adalah 100%.</p>' +
      '<div class="panel">' +
        '<div class="daftar-komponen" id="daftar-komponen"></div>' +
        '<div class="aksi-komponen">' +
          '<button type="button" class="btn btn-terang btn-kecil" id="tambah-komponen">' +
            '+ Tambah Komponen</button>' +
          '<div class="bobot-ringkas" id="bobot-ringkas"></div>' +
        '</div>' +
        '<div class="form-aksi">' +
          '<button type="button" class="btn btn-utama" id="simpan-komponen">Simpan Komponen</button>' +
        '</div>' +
      '</div>' +
    '</section>'
  );

  const wadah = node.querySelector('#daftar-komponen');
  const tombolTambah = node.querySelector('#tambah-komponen');
  const indikator = node.querySelector('#bobot-ringkas');

  function tambahBaris(data = { id: null, nama: '', bobot: 0 }, fokus = false) {
    const r = el(
      '<div class="komponen-baris" data-id="' + (data.id || '') + '">' +
        '<div class="form-baris komponen-nama">' +
          '<label>Nama komponen</label>' +
          '<input type="text" class="inp-kn" value="' + esc(data.nama) + '" ' +
            'placeholder="mis. HARIAN" autocomplete="off">' +
        '</div>' +
        '<div class="form-baris komponen-bobot">' +
          '<label>Bobot (%)</label>' +
          '<div class="bobot-input">' +
            '<input type="number" class="inp-kb" min="1" max="100" step="any" value="' +
            (data.bobot || '') + '" placeholder="50">' +
            '<span>%</span>' +
          '</div>' +
        '</div>' +
        '<button type="button" class="btn btn-terang btn-kecil hapus-komponen" aria-label="Hapus komponen">Hapus</button>' +
      '</div>'
    );
    r.querySelector('.inp-kn').addEventListener('input', perbaruiTotal);
    r.querySelector('.inp-kb').addEventListener('input', perbaruiTotal);
    r.querySelector('.hapus-komponen').addEventListener('click', () => {
      r.remove();
      perbaruiTotal();
    });
    wadah.appendChild(r);
    if (fokus) r.querySelector('.inp-kn').focus();
  }

  function perbaruiTotal() {
    const total = [...wadah.querySelectorAll('.inp-kb')]
      .reduce((t, inp) => {
        const n = parseNilaiAngka(inp.value);
        return t + (n != null && n > 0 ? n : 0);
      }, 0);

    const banyak = wadah.children.length;
    tombolTambah.disabled = banyak >= MAKS_KOMPONEN;

    if (banyak === 0) {
      indikator.textContent = 'Belum ada komponen.';
      indikator.className = 'bobot-ringkas bobot-alert';
      return;
    }
    if (Math.abs(total - 100) < 0.001) {
      indikator.textContent = 'Total bobot: ' + angkaIndo(total) + '% ✓';
      indikator.className = 'bobot-ringkas bobot-oke';
    } else {
      indikator.textContent = 'Total bobot: ' + angkaIndo(total) +
        '% — belum sama dengan 100%.';
      indikator.className = 'bobot-ringkas bobot-alert';
    }
  }

  baris.forEach(b => tambahBaris(b));
  tombolTambah.addEventListener('click', () => {
    if (wadah.children.length < MAKS_KOMPONEN) tambahBaris({}, true);
  });
  perbaruiTotal();

  node.querySelector('#simpan-komponen').addEventListener('click', async () => {
    const daftar = [...wadah.querySelectorAll('.komponen-baris')].map(r => ({
      id: r.dataset.id || null,
      nama: r.querySelector('.inp-kn').value,
      bobot: parseNilaiAngka(r.querySelector('.inp-kb').value)
    }));

    const rusak = daftar.filter(d =>
      !String(d.nama || '').trim() || d.bobot == null || d.bobot <= 0 || d.bobot > 100);
    if (!daftar.length) {
      toast('Tambahkan minimal satu komponen.', 'galat');
      return;
    }
    if (rusak.length) {
      toast('Nama komponen harus diisi dan bobot harus angka 1–100.', 'galat', 5000);
      return;
    }

    const total = daftar.reduce((t, d) => t + d.bobot, 0);

    await simpanKomponen(pasangan.id, daftar);
    toast(
      'Komponen tersimpan (total bobot ' + angkaIndo(total) + '%).',
      total === 100 ? 'sukses' : 'info', 4200
    );
    pergi('#/pilih?km=' + kmKueri);
  });

  return node;
}

const RUTE = {
  beranda: tampilkanBeranda,
  impor: tampilkanImpor,
  kelas: tampilkanKelas,
  pilih: tampilkanPilih,
  siswa: tampilkanSiswa,
  komponen: tampilkanKomponen
};

/* ------------------------------------------------------------------ */
/* Pemasangan PWA                                                      */
/* ------------------------------------------------------------------ */

let promptPasang = null;

function siapkanPemasangan() {
  const tombol = document.getElementById('tombol-pasang');

  window.addEventListener('beforeinstallprompt', ev => {
    ev.preventDefault();
    promptPasang = ev;
    tombol.hidden = false;
  });

  tombol.addEventListener('click', async () => {
    if (!promptPasang) return;
    promptPasang.prompt();
    await promptPasang.userChoice;
    promptPasang = null;
    tombol.hidden = true;
  });

  window.addEventListener('appinstalled', () => {
    tombol.hidden = true;
    toast('Aplikasi berhasil dipasang di perangkat ini.', 'sukses');
  });
}

function siapkanStatusJaringan() {
  const lencana = document.getElementById('lencana-offline');
  const perbarui = () => { lencana.hidden = navigator.onLine; };
  window.addEventListener('online', () => {
    perbarui();
    toast('Koneksi internet tersambung kembali.', 'sukses', 2400);
  });
  window.addEventListener('offline', () => {
    perbarui();
    toast('Mode offline — aplikasi tetap dapat digunakan.', 'info', 3000);
  });
  perbarui();
}

async function daftarkanServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost' &&
      location.hostname !== '127.0.0.1') return;
  try {
    await navigator.serviceWorker.register('sw.js');
  } catch (e) {
    console.warn('Service worker gagal didaftarkan:', e);
  }
}

/* ------------------------------------------------------------------ */
/* Mulai                                                               */
/* ------------------------------------------------------------------ */

async function mulai() {
  document.getElementById('lencana-versi').textContent = 'v' + APP_VERSION;
  document.getElementById('kaki-versi').textContent = 'Versi ' + APP_VERSION;

  siapkanPemasangan();
  siapkanStatusJaringan();
  daftarkanServiceWorker();
  mintaPenyimpananPermanen();

  window.addEventListener('hashchange', render);
  if (!location.hash) location.hash = '#/';
  await render();
}

document.addEventListener('DOMContentLoaded', mulai);
