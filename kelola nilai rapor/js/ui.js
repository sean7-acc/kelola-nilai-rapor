'use strict';

/* Bantuan antarmuka: elemen, toast, dialog modal, pemformatan. */

function el(html) {
  const template = document.createElement('template');
  template.innerHTML = String(html).trim();
  return template.content.firstElementChild;
}

function esc(teks) {
  return String(teks == null ? '' : teks)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toast(pesan, jenis = 'sukses', durasi = 3600) {
  const area = document.getElementById('area-toast');
  const node = el(
    '<div class="toast toast-' + esc(jenis) + '" role="status">' +
      '<span class="toast-ikon" aria-hidden="true"></span>' +
      '<span class="toast-teks">' + esc(pesan) + '</span>' +
    '</div>'
  );
  area.appendChild(node);
  requestAnimationFrame(() => node.classList.add('tampil'));
  setTimeout(() => {
    node.classList.remove('tampil');
    setTimeout(() => node.remove(), 300);
  }, durasi);
}

/* Dialog modal. Mengembalikan fungsi untuk menutup. */
function bukaModal({ judul, isi, aksi }) {
  const area = document.getElementById('area-modal');
  area.hidden = false;
  area.innerHTML = '';

  const node = el(
    '<div class="modal-dialog" role="dialog" aria-modal="true" aria-label="' + esc(judul) + '">' +
      '<div class="modal-kepala">' +
        '<h2>' + esc(judul) + '</h2>' +
        '<button type="button" class="icon-btn" data-tutup aria-label="Tutup">&times;</button>' +
      '</div>' +
      '<div class="modal-badan"></div>' +
      '<div class="modal-kaki"></div>' +
    '</div>'
  );

  node.querySelector('.modal-badan').appendChild(
    typeof isi === 'string' ? el('<div>' + isi + '</div>') : isi);

  if (aksi && aksi.length) {
    const kaki = node.querySelector('.modal-kaki');
    aksi.forEach(t => {
      const tombol = el('<button type="button" class="btn ' + esc(t.kelas || 'btn-terang') + '">' +
        esc(t.label) + '</button>');
      tombol.addEventListener('click', async () => {
        if (t.diam) tombol.disabled = true;
        try {
          const hasil = await t.aktif(node);
          if (hasil !== false) tutup();
        } catch (e) {
          toast(e.message || 'Terjadi kesalahan.', 'galat');
        } finally {
          if (t.diam) tombol.disabled = false;
        }
      });
      kaki.appendChild(tombol);
    });
  }

  area.appendChild(node);
  const fokusAwal = node.querySelector('input, select, textarea, [data-tutup]');
  if (fokusAwal) fokusAwal.focus();

  function tutup() {
    if (tutup.selesai) return;
    tutup.selesai = true;
    area.hidden = true;
    area.innerHTML = '';
    document.removeEventListener('keydown', padaEsc);
  }

  function padaEsc(ev) {
    if (ev.key === 'Escape') tutup();
  }

  node.querySelector('[data-tutup]').addEventListener('click', tutup);
  area.addEventListener('mousedown', ev => {
    if (ev.target === area) tutup();
  });
  document.addEventListener('keydown', padaEsc);

  return { tutup, node };
}

function tanggalIndo(waktu) {
  if (!waktu) return '—';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(new Date(waktu));
  } catch (e) {
    return '—';
  }
}

function angkaIndo(n) {
  return new Intl.NumberFormat('id-ID').format(n == null ? 0 : n);
}
