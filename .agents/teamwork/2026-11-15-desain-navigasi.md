# Laporan Perbaikan Desain & Navigasi Antar Halaman Verifikasi SIJAGA

**Tanggal:** 15 November 2026  
**Branch:** `feat/bab4-experiments` (HEAD: `941cb5b` + modifikasi kerja)  
**Status:** SELESAI & TERVERIFIKASI VISUAL DI BROWSER  

---

## 1. Ringkasan Eksekutif

Sesuai instruksi pengguna, seluruh tautan navigasi antar kedua jalur verifikasi (jalur portal institusi dan jalur mandiri on-chain) telah dirapikan agar menyatu sepenuhnya dengan bahasa desain *Modern Enterprise Bento* SIJAGA. Masalah tumpang tindih (*overlap*) antara *floating navbar* dan headline hero di halaman utama telah diperbaiki tuntas, duplikasi tautan pada halaman yang sama telah dieliminasi (tepat 1 tautan per halaman), dan verifikasi visual end-to-end telah dijalankan serta didokumentasikan melalui tangkapan layar browser.

---

## 2. Rincian Perubahan Kode & File

### A. Beranda Utama (`app/page.tsx`)
- **Penyesuaian Padding Hero (Menghilangkan Tumpang Tindih):**
  - **Baris:** 525
  - **Sebelum:** `pt-28 md:pt-36` (ketinggian hanya 112px–144px, sehingga tertutup oleh navbar fixed yang memiliki tinggi total ~132px).
  - **Sesudah:** `pt-36 sm:pt-40 md:pt-48 pb-20 md:pb-24`. Headline hero *"Verifikasi Kredensial Akademik Digital."* dan badge *"Purwarupa SIJAGA Beta"* kini memiliki ruang bernapas yang cukup dan terlihat utuh 100% tanpa tertutup navbar saat scrollY = 0.
- **Keterangan Jalur Utama (Pencarian NIM/Dompet):**
  - **Baris:** 555–559
  - **Gaya:** Pill badge abu-abu modern (`rounded-full bg-zinc-100/80 border border-zinc-200/60 text-xs font-medium text-zinc-600`) dengan ikon `Shield` berukuran proporsional.
- **Tautan Verifikasi Mandiri On-Chain (1 Tautan Tunggal di Homepage):**
  - **Baris:** 591–602
  - **Gaya:** Bento pill interaktif (`rounded-2xl bg-zinc-50/90 hover:bg-red-50/80 border border-zinc-200/80 hover:border-red-200 text-xs font-semibold text-zinc-700 hover:text-red-700 shadow-xs`) dilengkapi indikator status hidup (*pulsing emerald dot*) dan ikon panah dinamis `ArrowRight`. Menggantikan teks merah bergaris bawah (*raw text underline*).

### B. Portal Verifikasi Mandiri On-Chain (`app/verify-onchain/page.tsx`)
- **Tautan Navigasi ke Beranda (1 Tautan Tunggal di Halaman On-Chain):**
  - **Baris:** 296–302
  - **Gaya:** Tombol pill elegan di bilah navigasi atas (`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-zinc-700 hover:text-red-700 bg-zinc-100/80 hover:bg-red-50 border border-zinc-200 hover:border-red-200 transition-all shadow-xs`).
- **Penghapusan Tautan Duplikat:**
  - Menghapus teks merah bergaris bawah `Verifikasi lengkap (dengan data institusi) →` yang sebelumnya menempel di bawah paragraf deskripsi judul.
  - Menghapus tautan serupa pada banner peringatan batasan privasi.
- **Perapian Tombol Aset Uji (Trace P2.6):**
  - **Baris:** 368–374
  - **Gaya:** Code pill modern (`font-mono text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100/80 px-2 py-0.5 rounded-md border border-red-200/80 transition-colors`).

### C. Halaman Pratinjau Ijazah (`app/ijazah/[id]/page.tsx`)
- **Tombol Navigasi ke Verifikasi On-Chain (1 Tautan Tunggal di Halaman Ijazah):**
  - **Baris:** 519–527
  - **Lokasi:** Bilah tindakan atas (*top action bar*) berdampingan dengan tombol *"Kembali"*, *"Solana Explorer"*, dan *"Cetak Dokumen"*.
  - **Gaya:** Tombol primer merah solid berbobot kuat (`inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-sm shadow-red-600/20 transition-all`) dengan ikon `ShieldCheck`.
- **Penghapusan Tautan Duplikat:**
  - Menghapus tautan duplikat teks bergaris bawah `Verifikasi mandiri tanpa server →` yang sebelumnya disematkan di dalam kotak *NFT Address (Soulbound)*. Kotak tersebut dikembalikan ke label teks murni yang bersih.

---

## 3. Matriks Alur Navigasi (Bidirectional & Deep Link)

| Dari Halaman | Ke Halaman | Elemen Pemicu | Parameter yang Dibawa | Status Pengujian Browser |
|---|---|---|---|---|
| Homepage (`/`) | `/verify-onchain` | Bento pill di bawah input pencarian | - | **SUKSES** (Navigasi mulus) |
| `/verify-onchain` | Homepage (`/`) | Pill badge di navbar atas | - | **SUKSES** (Navigasi mulus) |
| `/ijazah/[id]` | `/verify-onchain` | Tombol merah di action bar atas | `?asset=FDQKnrLV...` | **SUKSES** (Input terisi & auto-fetch) |

---

## 4. Bukti Verifikasi Visual (Screenshots)

Tangkapan layar resolusi desktop (1280x800) disimpan pada direktori `.agents/teamwork/screenshots/`:
1. `home-desktop.png` & `home-fullpage.png`:
   - Menunjukkan navbar mengapung bersih di atas hero tanpa menutupi kata *"Verifikasi"*.
   - Bento pill tautan mandiri tampil serasi di bawah kolom input pencarian.
2. `verify-onchain-desktop.png` & `verify-onchain-result-fullpage.png`:
   - Menunjukkan bilah navigasi dengan satu tombol pill terpadu.
   - Tidak ada lagi teks merah bergaris bawah ganda di bawah judul.
   - Hasil evaluasi Tingkat-1 dan matriks pembuktian TC-15 tampil rapi.
3. `ijazah-preview-desktop.png` & `ijazah-preview-fullpage.png`:
   - Menunjukkan bilah aksi atas dengan tombol merah solid *"Verifikasi mandiri tanpa server →"*.
   - Kotak NFT Address (Soulbound) bersih tanpa tautan duplikat di dalamnya.

---

## 5. Pemeriksaan Kualitas Kode

- **ESLint (`npx eslint app/page.tsx app/ijazah/[id]/page.tsx app/verify-onchain/page.tsx`):**
  - Hasil: `0 errors, 0 warnings` (Exit code 0).
- **TypeScript Compiler (`npx tsc --noEmit`):**
  - Hasil: `0 errors` (Exit code 0).
- **Server Integritas:**
  - Tidak ada proses server dev (PID 16821) yang dimatikan atau direstart.
  - Endpoint backend tidak mengalami modifikasi logika.
