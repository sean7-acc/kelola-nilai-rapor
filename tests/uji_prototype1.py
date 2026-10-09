"""Uji otomatis Prototype 1 — Kelola Nilai Rapor.

Menjalankan server statis lokal lalu memeriksa alur utama dengan Chrome
(Playwright, channel chrome/msedge):
  FR-02 impor template, FR-03 penguraian judul, FR-04 pilih kelas/mapel,
  FR-05 daftar siswa, FR-16 impor ulang, FR-17 PWA + offline.

Pemakaian:  python tests/uji_prototype1.py
"""
import hashlib
import os
import socket
import subprocess
import sys
import time

PROYEK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIXTURE = os.path.join(PROYEK, "tests", "fixture")
PORT = 8765
BASE = "http://127.0.0.1:%d/" % PORT

gagal = []
langkah_ke = [0]


def langkah(teks):
    langkah_ke[0] += 1
    print("\n[%02d] %s" % (langkah_ke[0], teks), flush=True)


def ok(teks):
    print("     OK  " + teks, flush=True)


def periksa(kondisi, teks):
    if kondisi:
        ok(teks)
    else:
        gagal.append(teks)
        print("  GAGAL  " + teks, flush=True)
    return kondisi


def port_bebas(port):
    with socket.socket() as s:
        return s.connect_ex(("127.0.0.1", port)) != 0


def hash_berkas(path):
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def mulai_server():
    proses = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"],
        cwd=PROYEK,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    for _ in range(60):
        if not port_bebas(PORT):
            return proses
        time.sleep(0.2)
    raise RuntimeError("Server statis tidak dapat dijalankan di port %d" % PORT)


def luncurkan(playwright):
    paksa = os.environ.get("BROWSER_KANAL")
    kanal = (paksa,) if paksa else ("chrome", "msedge")
    for nama in kanal:
        try:
            browser = playwright.chromium.launch(channel=nama, headless=True)
            print("     browser: " + nama, flush=True)
            return browser
        except Exception as e:
            if paksa:
                raise
    return playwright.chromium.launch(headless=True)


def siapkan_komponen(halaman):
    """Pastikan pasangan kelas/mapel yang sedang tampil memiliki komponen.

    Bila belun diatur, halaman pilih menampilkan keadaan kosong dengan
    tombol "Atur Komponen & Bobot". Simpan komponen bawaan (50/25/25)
    lalu tunggu tabel nilai tampil.
    """
    halaman.wait_for_selector("#tombol-simpan, .keadaan-kosong", timeout=8000)
    if halaman.locator(".keadaan-kosong").count():
        halaman.click("a[href^='#/komponen']")
        halaman.wait_for_selector("#simpan-komponen", timeout=8000)
        halaman.click("#simpan-komponen")
    halaman.wait_for_selector(".baris-siswa", timeout=8000)


def main():
    from playwright.sync_api import sync_playwright

    sumber = os.path.join(FIXTURE, "template_bahasa_indonesia.xlsx")
    sebelum = hash_berkas(sumber)

    server = mulai_server()
    kesalahan_konsol = []

    try:
        with sync_playwright() as pw:
            browser = luncurkan(pw)
            konteks = browser.new_context(viewport={"width": 1280, "height": 900})
            halaman = konteks.new_page()

            def pada_konsol(pesan):
                if pesan.type != "error":
                    return
                lokasi = pesan.location or {}
                url = lokasi.get("url", "") if isinstance(lokasi, dict) else ""
                if "favicon" in url or "favicon" in pesan.text:
                    return
                if ".well-known" in url or ".well-known" in pesan.text:
                    return
                kesalahan_konsol.append("console: " + pesan.text + (" @ " + url if url else ""))

            halaman.on("pageerror", lambda e: kesalahan_konsol.append("pageerror: " + str(e)))
            halaman.on("console", pada_konsol)

            # ---------------------------------------------------------- 1
            langkah("Aplikasi termuat dan menampilkan beranda")
            halaman.goto(BASE, wait_until="load")
            halaman.wait_for_selector("h1:has-text('Pengelolaan Nilai Rapor')")
            periksa(True, "beranda tampil")
            periksa(halaman.locator("#lencana-versi").inner_text().startswith("v"),
                    "versi aplikasi ditampilkan")

            # ---------------------------------------------------------- 2
            langkah("FR-02/FR-03 — impor template dan penguraian judul")
            halaman.goto(BASE + "#/impor")
            halaman.wait_for_selector("#berkas-template", state="attached")
            halaman.set_input_files("#berkas-template",
                                     os.path.join(FIXTURE, "template_bahasa_indonesia.xlsx"))
            halaman.wait_for_selector("#area-modal:not([hidden]) #inp-kelas")

            kelas = halaman.input_value("#inp-kelas")
            mapel = halaman.input_value("#inp-mapel")
            periksa(kelas == "X TSM - REGULER",
                    "kelas terbaca (pengulangan KELAS dibuang): %r" % kelas)
            periksa(mapel == "BAHASA INDONESIA",
                    "mata pelajaran terbaca: %r" % mapel)
            teks_modal = halaman.inner_text("#area-modal")
            periksa("40" in teks_modal, "jumlah siswa terbaca: 40")
            periksa("template_bahasa_indonesia.xlsx" in teks_modal,
                    "nama berkas ditampilkan")

            # ---------------------------------------------------------- 3
            langkah("FR-10/FR-05 — simpan dan tampilkan daftar siswa")
            halaman.click("#area-modal button:has-text('Simpan')")
            halaman.wait_for_selector(".keadaan-kosong", timeout=8000)
            siapkan_komponen(halaman)
            jumlah = halaman.locator(".baris-siswa").count()
            periksa(jumlah == 40, "40 baris siswa tampil (dapat %d)" % jumlah)

            nisn_pertama = halaman.locator(".baris-siswa").first.locator(".kolom-nisn").inner_text()
            nisn_terakhir = halaman.locator(".baris-siswa").last.locator(".kolom-nisn").inner_text()
            periksa(nisn_pertama == "1012345601", "urutan pertama sesuai template: %s" % nisn_pertama)
            periksa(nisn_terakhir == "1012345640", "urutan terakhir sesuai template: %s" % nisn_terakhir)

            # ---------------------------------------------------------- 4
            langkah("Kartu kelas dan mata pelajaran")
            halaman.goto(BASE + "#/kelas")
            halaman.wait_for_selector(".tabel tbody tr")
            periksa(halaman.locator(".tabel tbody tr").count() == 1, "1 pasangan kelas-mapel")
            isi_baris = halaman.inner_text(".tabel tbody tr")
            periksa("X TSM - REGULER" in isi_baris, "nama kelas pada tabel")
            periksa("BAHASA INDONESIA" in isi_baris, "mata pelajaran pada tabel")
            periksa("40" in isi_baris, "jumlah siswa pada tabel")

            # ---------------------------------------------------------- 5
            langkah("FR-16 — impor ulang tidak menggandakan siswa")
            halaman.goto(BASE + "#/impor")
            halaman.set_input_files("#berkas-template", sumber)
            halaman.wait_for_selector("#area-modal:not([hidden]) #inp-kelas")
            halaman.click("#area-modal button:has-text('Simpan')")
            halaman.wait_for_selector(".baris-siswa", timeout=5000)
            jumlah_ulang = halaman.locator(".baris-siswa").count()
            periksa(jumlah_ulang == 40,
                    "impor kedua kali tetap 40 siswa (dapat %d)" % jumlah_ulang)
            halaman.goto(BASE + "#/kelas")
            periksa(halaman.locator(".tabel tbody tr").count() == 1,
                    "tidak ada pasangan kelas-mapel ganda")

            # ---------------------------------------------------------- 6
            langkah("FR-02 — template dengan kolom berpindah tetap terbaca")
            halaman.goto(BASE + "#/impor")
            halaman.set_input_files("#berkas-template",
                                     os.path.join(FIXTURE, "template_matematika.xlsx"))
            halaman.wait_for_selector("#area-modal:not([hidden]) #inp-kelas")
            periksa(halaman.input_value("#inp-kelas") == "XI TKJ - REGULER",
                    "kelas varian kedua terbaca: %r" % halaman.input_value("#inp-kelas"))
            periksa(halaman.input_value("#inp-mapel") == "MATEMATIKA",
                    "mapel varian kedua terbaca: %r" % halaman.input_value("#inp-mapel"))
            periksa("35" in halaman.inner_text("#area-modal"), "35 siswa varian kedua")
            halaman.click("#area-modal button:has-text('Simpan')")
            halaman.wait_for_selector(".keadaan-kosong", timeout=8000)
            siapkan_komponen(halaman)
            periksa(halaman.locator(".baris-siswa").count() == 35,
                    "35 siswa tampil dari layout berbeda")

            # ---------------------------------------------------------- 7
            langkah("FR-04 — daftar mapel menyesuaikan kelas")
            halaman.goto(BASE + "#/kelas")
            halaman.click(".tabel tbody tr:first-child a:has-text('Buka')")
            halaman.wait_for_selector("#sel-kelas")
            opsi_kelas = halaman.locator("#sel-kelas option").count()
            periksa(opsi_kelas == 3, "3 pilihan kelas (dapat %d)" % opsi_kelas)

            halaman.select_option("#sel-kelas", label="X TSM - REGULER")
            halaman.wait_for_timeout(300)
            opsi_mapel = halaman.locator("#sel-mapel option").all_inner_texts()
            periksa(opsi_mapel == ["BAHASA INDONESIA"],
                    "mapel kelas X TSM hanya BAHASA INDONESIA: %r" % opsi_mapel)

            halaman.select_option("#sel-kelas", label="XI TKJ - REGULER")
            halaman.wait_for_timeout(300)
            opsi_mapel = halaman.locator("#sel-mapel option").all_inner_texts()
            periksa(opsi_mapel == ["MATEMATIKA"],
                    "mapel kelas XI TKJ hanya MATEMATIKA: %r" % opsi_mapel)
            halaman.wait_for_selector(".baris-siswa", timeout=5000)
            periksa(halaman.locator(".baris-siswa").count() == 35,
                    "daftar siswa kelas XI TKJ tampil")

            # ---------------------------------------------------------- 8
            langkah("FR-05 — klik siswa membuka halaman nilai siswa")
            halaman.click(".baris-siswa:first-child .tautan-nama")
            halaman.wait_for_selector("h1:has-text('Nilai Siswa')")
            identitas = halaman.inner_text(".identitas")
            periksa("1023456701" in identitas, "NISN siswa tampil di halaman nilai")
            periksa("MATEMATIKA" in identitas, "mata pelajaran tampil")
            periksa(halaman.locator("#app input[data-komponen]").count() == 3,
                    "form 3 komponen tampil untuk siswa")
            periksa("Nilai Rapor" in halaman.inner_text("#app"),
                    "ringkasan nilai rapor tampil")

            # ---------------------------------------------------------- 9
            langkah("FR-03 — judul tanpa kelas menyediakan input manual")
            halaman.goto(BASE + "#/impor")
            halaman.set_input_files("#berkas-template",
                                     os.path.join(FIXTURE, "template_tanpa_kelas.xlsx"))
            halaman.wait_for_selector("#area-modal:not([hidden]) #inp-kelas")
            periksa(halaman.input_value("#inp-kelas") == "",
                    "kolom kelas kosong sehingga diisi manual")
            periksa(halaman.input_value("#inp-mapel") == "PENDIDIKAN AGAMA ISLAM",
                    "mata pelajaran tetap terbaca: %r" % halaman.input_value("#inp-mapel"))
            periksa("Isi kelas" in halaman.inner_text("#area-modal"),
                    "petunjuk isi manual tampil")
            periksa("10" in halaman.inner_text("#area-modal"), "10 siswa terbaca")
            halaman.fill("#inp-kelas", "XII TK 1")
            halaman.click("#area-modal button:has-text('Simpan')")
            halaman.wait_for_selector(".keadaan-kosong", timeout=8000)
            siapkan_komponen(halaman)
            periksa(halaman.locator(".baris-siswa").count() == 10,
                    "impor manual berhasil (10 siswa)")

            # ---------------------------------------------------------- 10
            langkah("FR-03 — judul dengan pemisah hubung tetap teruraikan")
            halaman.goto(BASE + "#/impor")
            halaman.set_input_files("#berkas-template",
                                     os.path.join(FIXTURE, "template_gaya_hubung.xlsx"))
            halaman.wait_for_selector("#area-modal:not([hidden]) #inp-kelas")
            periksa(halaman.input_value("#inp-mapel") == "BAHASA INGGRIS",
                    "mapel pola A2: %r" % halaman.input_value("#inp-mapel"))
            periksa(halaman.input_value("#inp-kelas") == "XI AKL - REGULER",
                    "kelas pola A2: %r" % halaman.input_value("#inp-kelas"))
            halaman.click("#area-modal button:has-text('Simpan')")
            halaman.wait_for_selector(".keadaan-kosong", timeout=8000)
            siapkan_komponen(halaman)
            periksa(halaman.locator(".baris-siswa").count() == 12,
                    "12 siswa dari judul gaya hubung")

            # ---------------------------------------------------------- 11
            langkah("FR-02 — NISN ganda dan baris tanpa NISN ditangani")
            halaman.goto(BASE + "#/impor")
            halaman.set_input_files("#berkas-template",
                                     os.path.join(FIXTURE, "template_ganda.xlsx"))
            halaman.wait_for_selector("#area-modal:not([hidden]) #inp-kelas")
            teks = halaman.inner_text("#area-modal")
            periksa("muncul lebih dari satu kali" in teks, "peringatan NISN ganda tampil")
            periksa("nama tanpa NISN" in teks, "peringatan baris tanpa NISN tampil")
            periksa("3 siswa terbaca" in teks, "hanya 3 siswa sah yang diterima")
            halaman.click("#area-modal button:has-text('Batal')")
            halaman.wait_for_selector("#area-modal[hidden]", state="attached")

            # ---------------------------------------------------------- 12
            langkah("Integritas berkas template tidak diubah")
            sesudah = hash_berkas(sumber)
            periksa(sebelum == sesudah, "hash template utama tidak berubah")

            # ---------------------------------------------------------- 13
            langkah("FR-17 — service worker terpasang dan aset di-cache")
            halaman.goto(BASE + "#/")
            halaman.wait_for_function(
                "navigator.serviceWorker && navigator.serviceWorker.controller !== null",
                timeout=15000)
            periksa(True, "service worker mengambil alih halaman")

            ada_cache = halaman.evaluate(
                """async () => {
                    const nama = await caches.keys();
                    for (const n of nama) {
                        const c = await caches.open(n);
                        const k = await c.keys();
                        if (k.some(r => r.url.includes('xlsx.full.min.js'))) return n;
                    }
                    return null;
                }"""
            )
            periksa(bool(ada_cache), "cache berisi pustaka aplikasi: %s" % ada_cache)

            # ---------------------------------------------------------- 14
            langkah("FR-17 — seluruh alur berfungsi saat offline")
            konteks.set_offline(True)
            halaman.reload(wait_until="load")
            halaman.wait_for_selector("h1:has-text('Pengelolaan Nilai Rapor')", timeout=10000)
            periksa(True, "aplikasi termuat ulang tanpa internet")
            periksa(halaman.evaluate("navigator.onLine") is False,
                    "status jaringan dilaporkan offline oleh browser")
            periksa(halaman.locator("#lencana-offline").is_visible(), "lencana Offline tampil")

            halaman.goto(BASE + "#/impor")
            halaman.wait_for_selector("#berkas-template", state="attached")
            halaman.set_input_files("#berkas-template",
                                     os.path.join(FIXTURE, "template_bahasa_indonesia.xlsx"))
            halaman.wait_for_selector("#area-modal:not([hidden]) #inp-kelas", timeout=10000)
            periksa(halaman.input_value("#inp-mapel") == "BAHASA INDONESIA",
                    "impor template berjalan saat offline")

            halaman.goto(BASE + "#/kelas")
            halaman.wait_for_selector(".tabel tbody tr", timeout=10000)
            periksa(halaman.locator(".tabel tbody tr").count() == 4,
                    "data lokal tetap terbaca saat offline (4 kelas-mapel)")
            konteks.set_offline(False)

            # ---------------------------------------------------------- 15
            langkah("Tampilan menyesuaikan layar ponsel (390 px)")
            halaman.set_viewport_size({"width": 390, "height": 844})
            for rute, penanda in (("#/", "Pengelolaan Nilai Rapor"),
                                  ("#/kelas", "Kelas & Mata Pelajaran"),
                                  ("#/pilih?km=1", "Pilih Kelas")):
                halaman.goto(BASE + rute)
                halaman.wait_for_selector("h1:has-text('%s')" % penanda)
                lebar = halaman.evaluate(
                    "[document.documentElement.scrollWidth, window.innerWidth]")
                periksa(lebar[0] <= lebar[1] + 1,
                        "%s tidak meluber horizontal (%d <= %d)" % (rute, lebar[0], lebar[1]))
            halaman.wait_for_selector(".baris-siswa")
            periksa(halaman.locator(".tabel thead").first.is_hidden(),
                    "kepala tabel disembunyikan, baris disusun ulang di ponsel")
            halaman.set_viewport_size({"width": 1280, "height": 900})

            # ---------------------------------------------------------- 16
            langkah("Tanpa galat JavaScript di sepanjang uji")
            unik = sorted(set(kesalahan_konsol))
            for k in unik:
                print("     ! " + k, flush=True)
            periksa(len(unik) == 0, "%d galat konsol" % len(unik))

            browser.close()
    finally:
        server.terminate()

    print("\n" + "=" * 60)
    if gagal:
        print("HASIL: %d pemeriksaan GAGAL" % len(gagal))
        for g in gagal:
            print("  - " + g)
        return 1
    print("HASIL: semua pemeriksaan lulus")
    return 0


if __name__ == "__main__":
    sys.exit(main())
