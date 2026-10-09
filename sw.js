/* Service worker — mode offline (FR-17).
   Nomor versi di bawah harus disinkronkan dengan APP_VERSION di js/db.js. */

const VERSI = '0.2.0-proto2';
const CACHE = 'kelola-nilai-rapor-v' + VERSI;

const ASET = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/db.js',
  './js/parser.js',
  './js/importer.js',
  './js/ui.js',
  './js/nilai.js',
  './js/app.js',
  './vendor/dexie.min.js',
  './vendor/xlsx.full.min.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', ev => {
  ev.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASET))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys()
      .then(kunci => Promise.all(
        kunci.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', ev => {
  if (ev.data === 'versi') ev.source.postMessage({ versi: VERSI, cache: CACHE });
});

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch (e) {
    return;
  }
  if (url.origin !== self.location.origin) return;

  /* Navigasi halaman: jaringan lebih dulu, cadangan dari cache. */
  if (req.mode === 'navigate') {
    ev.respondWith(
      fetch(req)
        .then(res => {
          const salinan = res.clone();
          caches.open(CACHE).then(c => c.put('./index.html', salinan)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  /* Aset statis: cache lebih dulu, perbarui diam-diam di latar. */
  ev.respondWith(
    caches.match(req).then(cocok => {
      const jaringan = fetch(req)
        .then(res => {
          if (res && res.ok && res.type === 'basic') {
            const salinan = res.clone();
            caches.open(CACHE).then(c => c.put(req, salinan)).catch(() => {});
          }
          return res;
        })
        .catch(() => null);

      if (cocok) {
        jaringan;
        return cocok;
      }
      return jaringan.then(res => {
        if (res) return res;
        return caches.match('./index.html');
      });
    })
  );
});
