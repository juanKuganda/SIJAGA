# Brief Antigravity — Perbaikan TC-12 + Challenge pada Ijazah REVOKED (SIJAGA)

**Tanggal:** 17 November 2026
**Repo:** `juanKuganda/SIJAGA`, branch `feat/bab4-experiments` (JANGAN sentuh `main`)
**Commit terakhir yang sudah di-push:** `27cffac289a3efbe96625c7595c97b7c78ded95c` — "feat(verify): tingkat-1 issuer + revocation checks, clearer errors, nav + layout fixes"
**Pastikan dulu:** sebelum mulai, pastikan clone lokal ada di branch `feat/bab4-experiments` dan sudah `git pull` sampai commit `27cffac` di atas. Kalau belum, pull dulu.

## Konteks (baca ini dulu)

SIJAGA adalah sistem verifikasi kepemilikan ijazah berbasis token non-transferable di Solana (Metaplex Core + plugin `PermanentFreezeDelegate`, `frozen:true`). Ada dua tingkat verifikasi:

- **Tingkat 1 (mandiri, on-chain):** endpoint `POST /api/verify/tingkat-1` (file `app/api/verify/tingkat-1/route.ts`) + halaman `app/verify-onchain/page.tsx`. Endpoint ini bebas database (hanya impor `inspectCertificate` dari `lib/onchain.ts`). Ia memeriksa aset langsung dari Solana + IPFS publik.
- **Tingkat 2 (lengkap, nominatif):** endpoint `POST /api/verify` (DB-first) + halaman ijazah `app/ijazah/[id]/page.tsx`, termasuk alur **challenge** (pemilik dompet menandatangani pesan tantangan; endpoint `POST /api/verify/challenge`, file `app/api/verify/challenge/route.ts`; state challenge di `lib/challenge.ts`, tabel Prisma `VerificationNonce`).

Draf skripsi (Bab 3, Tabel 3.3) sudah disubmit dan mengklaim perilaku tertentu. Dua perilaku di bawah ini **belum sesuai draf**. Tugasmu adalah memperbaikinya. JANGAN ubah draf skripsi. JANGAN ubah tesis/kode di luar dua tugas ini.

Data uji yang sudah ada (Devnet):
- Admin (update authority): `Bat5VTbjGqsThS5oERuXVi7d2JY2TBNomJD2ZciaztaQ`
- Aset uji Alifa (mahasiswa alifa nursintia marsya, NIM F55124011): mint `GqM5cbrY3QpPV6cHhaFdYzPcgDjzm9M6TchsxBTkUv1q`, pemilik `DtUVhcmkVnj6nfn8DJWnRiU3RqfSz2APBbGXzFdgxkpx`. Status saat ini MINTED (sudah di-restore sesudah revoke).
- Aset uji Trace P2.6: mint `FDQKnrLVQdZqP4efoNarLb87gmZj529kebFPz8SVMQCc`.
- Aset non-admin (untuk tes issuer, SUDAH terverifikasi): `115L61TA4BnrtxVZzVhZhdRw6VeuKfBWQEKVbATsb6d` ("Robot Buddy #3111", updateAuthority `6kh8YpdfB1xcpSsNtyrKoAPRwfRmGBGA9FSPV2sac7iX`).

---

## Tugas 1 — TC-12: RPC/IPFS mati harus menghasilkan "tidak dapat dipastikan", bukan HTTP error mentah

### Masalah
Saat RPC Solana atau gateway IPFS tidak dapat dijangkau, endpoint tingkat-1 saat ini mengembalikan HTTP error mentah:
- `502 METADATA` (gagal ambil metadata IPFS)
- `503 RPC` (gagal koneksi RPC)

Padahal draf (Tabel 3.3, kasus uji TC-12) memberi label hasil untuk kondisi ini: **"tidak dapat dipastikan"**. Pengguna hanya melihat error HTTP, bukan status "tidak dapat dipastikan" seperti yang dijanjikan draf.

### Yang harus dilakukan
Buat kondisi gagal RPC/IPFS menghasilkan status **"TIDAK DAPAT DIPASTIKAN"** yang tampil ke pengguna, sesuai label draf — bukan HTTP error mentah.

Cara implementasi diserahkan kepadamu, pilih yang paling bersih dan konsisten dengan arsitektur yang ada. Dua pendekatan yang masuk akal:
- **(a)** Endpoint tetap mengembalikan status HTTP error (502/503), TAPI body responsnya terstruktur dan memuat `verdict: "TIDAK DAPAT DIPASTIKAN"` beserta status tiap pemeriksaan; lalu halaman `app/verify-onchain/page.tsx` membaca body itu dan menampilkan keadaan "tidak dapat dipastikan" (bukan pesan error generik).
- **(b)** Endpoint mengembalikan HTTP 200 dengan `verdict: "TIDAK DAPAT DIPASTIKAN"` dan status pemeriksaan yang sesuai saat RPC/IPFS gagal.

Pilih salah satu, dan **tulis alasan pilihanmu** di laporan akhir. Yang penting: pengguna akhir melihat "tidak dapat dipastikan", dan label ini sama dengan yang tertulis di draf.

### Batasan Tugas 1
- JANGAN ubah perilaku kasus sukses (aset valid tetap `DAPAT DIPERIKSA`), kasus `404 NOT_FOUND`, kasus `400 NOT_ASSET`, dan kasus `DICABUT` — semuanya sudah benar dan sudah terverifikasi live.
- JANGAN ubah bentuk respons sukses. Hanya tangani jalur gagal RPC/IPFS.
- Pesan ke pengguna harus Bahasa Indonesia yang jelas (ikuti gaya pesan ramah yang sudah ada di codebase hasil audit error-handling 17 Nov).

### Kriteria penerimaan Tugas 1
- [ ] Dengan RPC dimatikan/disimulasi gagal (mis. arahkan RPC ke alamat mati seperti `http://127.0.0.1:19999`), memanggil endpoint tingkat-1 menghasilkan respons yang memuat status "TIDAK DAPAT DIPASTIKAN" (bukan sekadar HTTP error tanpa body terstruktur).
- [ ] Halaman `/verify-onchain` menampilkan keadaan "tidak dapat dipastikan" untuk kasus ini (bukan pesan error mentah/HTTP).
- [ ] Kasus sukses, 404, 400, dan DICABUT tetap berperilaku seperti sebelumnya (uji regresi: aset Trace `FDQKnrLV…` tetap `DAPAT DIPERIKSA`; alamat dompet `DtUVhcmk…` tetap `400 NOT_ASSET`; alamat acak tetap `404 NOT_FOUND`).

---

## Tugas 2 — Challenge pada ijazah REVOKED tidak boleh menampilkan "Kepemilikan Terverifikasi"

### Masalah
Alur challenge di halaman ijazah (`app/ijazah/[id]/page.tsx`) dan endpoint `POST /api/verify/challenge` (`app/api/verify/challenge/route.ts`) **tidak memeriksa `cert.status`**. Akibatnya, sesudah sebuah ijazah di-revoke, pemilik dompet masih bisa menyelesaikan challenge dan halaman menampilkan **"Kepemilikan Terverifikasi"**.

Secara kriptografis tanda tangan itu memang valid (revoke tidak mengubah pemilik aset), TAPI sebagai vonis ijazah ini menyesatkan: ijazah yang sudah dicabut tidak boleh dinyatakan terverifikasi.

Catatan: halaman ijazah SUDAH punya flag `isRevoked` (sekitar baris 502) yang dipakai untuk banner merah "IJAZAH INI TELAH DIREVOKE / DICABUT" — tapi alur challenge tidak memakainya.

### Yang harus dilakukan
Buat challenge menghormati status pencabutan:
- Saat `cert.status` adalah `REVOKED`, challenge TIDAK boleh menghasilkan vonis "Kepemilikan Terverifikasi".
- Tampilkan keadaan yang jelas bahwa **ijazah ini telah dicabut** (mis. blokir challenge dengan pesan "Ijazah ini telah dicabut" atau kembalikan status khusus pencabutan). Pilih implementasi yang paling bersih:
  - Periksa `cert.status` di endpoint `/api/verify/challenge` sebelum/saat verifikasi dan kembalikan error/status khusus (mis. kode error baru yang jelas, mis. `CERT_REVOKED`) — DAN/ATAU
  - Periksa `isRevoked` di halaman sebelum menjalankan challenge dan tampilkan pesan pencabutan.
- Minimal salah satu lapis (endpoint ATAU halaman) harus mencegah vonis "Terverifikasi" untuk ijazah REVOKED. Idealnya endpoint yang menegakkan (supaya tidak bisa diakali dari client), dengan halaman menampilkan pesannya dengan benar.

### Batasan Tugas 2
- JANGAN ubah logika kriptografi challenge (nonce, Ed25519, expiry 5 menit, sekali pakai, rate limit 20/menit) — semuanya sudah benar.
- JANGAN ubah perilaku challenge untuk ijazah yang TIDAK dicabut (positif + negatif `OWNER_MISMATCH` harus tetap jalan).
- Pesan ke pengguna Bahasa Indonesia yang jelas.
- JANGAN ubah alur revoke/restore itu sendiri (`app/api/nft/revoke`, `app/api/admin/recovery`) — hanya alur challenge.

### Kriteria penerimaan Tugas 2
- [ ] Ijazah berstatus REVOKED (uji dengan aset Alifa sesudah di-revoke, atau dengan data uji yang statusnya REVOKED): challenge TIDAK menampilkan "Kepemilikan Terverifikasi". Yang tampil adalah pesan/kondisi pencabutan.
- [ ] Ijazah berstatus MINTED/CLAIMED: challenge positif tetap "Kepemilikan Terverifikasi", challenge dompet lain tetap `OWNER_MISMATCH` (uji regresi).
- [ ] Tidak ada perubahan pada logika kriptografi (nonce/expiry/rate limit).

---

## Aturan kerja umum

- Kerja di branch `feat/bab4-experiments` saja. JANGAN buat branch baru tanpa diminta. JANGAN merge ke `main`.
- JANGAN `git add .` / `git commit` / `git push` tanpa persetujuan eksplisit Juan. Laporkan perubahan sebagai daftar file; Juan yang memutuskan commit/push.
- JANGAN tambah dependensi baru. JANGAN ubah konfigurasi build/lint. Pakai pola yang sudah ada di codebase.
- JANGAN ubah file di luar dua tugas ini, kecuali perubahan itu wajib agar tugas jalan (sebutkan alasannya di laporan).
- JANGAN ubah draf skripsi / file `.docx` / file di Google Drive.
- Sebelum menulis kode, baca file yang relevan (`app/api/verify/tingkat-1/route.ts`, `lib/onchain.ts`, `app/verify-onchain/page.tsx`, `app/ijazah/[id]/page.tsx`, `app/api/verify/challenge/route.ts`, `lib/challenge.ts`). Perhatikan: repo ini memakai Next.js versi yang punya breaking changes — baca panduan di `node_modules/next/dist/docs/` sebelum menulis kode bila ragu.
- Jalankan typecheck/lint pada file yang diubah. Catat error lama yang sudah ada sebelumnya (jangan klaim sebagai error barumu).
- Hemat panggilan RPC eksternal saat menguji (jangan spam).

## Cara menguji (ringkas)

- **Tugas 1:** simulasikan RPC mati (mis. env/konfigurasi RPC diarahkan ke `http://127.0.0.1:19999`) lalu panggil endpoint tingkat-1; verifikasi respons + tampilan halaman. Uji regresi dengan aset Trace (`FDQKnrLV…`), alamat dompet (`DtUVhcmk…`), dan alamat acak.
- **Tugas 2:** revoke aset Alifa lewat UI admin (lalu restore lagi sesudah tes!) dan coba challenge di halaman ijazahnya; atau buat data uji berstatus REVOKED. Uji regresi challenge positif/negatif pada ijazah yang tidak dicabut.
- Catat bukti tiap uji (respons/HTTP status, screenshot bila relevan, dan apa yang tampil di UI).

## Laporan akhir (wajib)

Kembalikan laporan singkat berisi, untuk tiap tugas:
1. File yang diubah (path + fungsi/baris kunci) dan apa yang berubah.
2. Alasan desain (khusus Tugas 1: kenapa pilih pendekatan (a) atau (b)).
3. Bukti verifikasi (hasil uji + regresi, dengan angka/status konkret).
4. Hal yang TIDAK diubah dan keterbatasan (apa yang belum teruji live dan kenapa).
5. Daftar file untuk commit (jangan commit sendiri).

Akhiri dengan satu kalimat: apakah kedua tugas selesai dan siap direview Juan, atau ada yang masih menggantung.
