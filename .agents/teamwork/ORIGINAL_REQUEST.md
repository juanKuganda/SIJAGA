# Original User Request

## Initial Request — 2026-11-08T13:46:25Z

This is a single self-contained fix; keep it small and focused. Implementasi fitur UI baru "Bukti Kepemilikan" (Challenge) pada halaman sertifikat `app/ijazah/[id]/page.tsx` untuk verifikasi kepemilikan ijazah via tanda tangan dompet Solana pada branch `feat/bab4-experiments`.

Integrity mode: development

## Requirements

### R1. Seksi UI "Buktikan Kepemilikan"
Tambahkan satu seksi baru "Buktikan Kepemilikan" pada halaman `app/ijazah/[id]/page.tsx`, tepat di bawah seksi "Verifikasi Kriptografis" yang sudah ada.
- Seksi ini HANYA tampil bila sertifikat ditemukan (tidak boleh muncul saat state "Ijazah Tidak Ditemukan").
- Jangan ubah tampilan sertifikat yang sudah ada, dan jangan ubah teks/angka lain di halaman tersebut.
- Bahasa UI: Bahasa Indonesia.

### R2. Alur Interaksi dan State Koneksi Dompet
1. Sediakan tombol "Hubungkan Dompet & Tanda Tangani".
2. Hubungkan dompet menggunakan pola yang SUDAH ADA di `app/claim/[nim]/page.tsx` (`getWalletProvider` — Phantom/Solflare). Jangan tambah library wallet baru. Bila wallet tidak terdeteksi, tampilkan peringatan yang sama seperti di halaman klaim (install Phantom + refresh).
3. Tangani siklus status UI:
   - `idle` -> `connecting` -> `challenge diminta` -> `menunggu tanda tangan` -> `memverifikasi` -> `sukses` / `gagal`.
   - Sediakan tombol "Minta Challenge Baru" bila nonce kedaluwarsa (5 menit).

### R3. Integrasi Kontrak API Challenge dan Verifikasi Kriptografis
Gunakan kontrak endpoint `/api/verify/challenge` tanpa mengubah endpoint maupun file `lib/challenge.ts`:
1. Permintaan Challenge:
   - Request: `POST /api/verify/challenge` dengan body `{ walletAddress }`.
   - Response: `200 { success: true, nonce, message, expiresAt }`.
2. Penandatanganan Pesan:
   - Minta dompet menandatangani string `message` secara byte-exact (UTF-8 encode string `message` dari response apa adanya, jangan dimodifikasi).
3. Verifikasi Tanda Tangan:
   - Request: `POST /api/verify/challenge` dengan body `{ action: "verify", walletAddress, nonce, signature, message, expectedOwner }`.
   - `signature` HARUS ter-encode base58 (`bs58.encode`).
   - `expectedOwner` diambil dari alamat pemilik aset dari data sertifikat yang sudah dimuat halaman itu (periksa nama field-nya di kode, jangan ditebak).
   - Response: `200 { verified: true }` atau `400 { verified: false, error, message }`.
4. Tampilan Hasil:
   - Sukses: tampilkan status "Kepemilikan Terverifikasi" (warna hijau, dompet ini pemilik sah ijazah).
   - Gagal: tampilkan kode error dari API apa adanya (`INVALID_SIGNATURE`, `OWNER_MISMATCH` = "Dompet ini bukan pemilik ijazah", `NONCE_EXPIRED`, `NONCE_ALREADY_USED`, `NONCE_NOT_FOUND`, `MESSAGE_MISMATCH`, `WALLET_MISMATCH`, `MALFORMED_INPUT`).

### R4. Batasan & Larangan (Guardrails)
- Jangan sentuh data n=30 dan jangan jalankan benchmark.
- Jangan ubah endpoint challenge maupun `lib/challenge.ts` (sudah terverifikasi).
- Jangan ubah tampilan sertifikat yang sudah ada — hanya TAMBAH satu seksi.
- JANGAN restart dev server yang sedang jalan.
- JANGAN deploy ke production.
- JANGAN sentuh file `experiments/` atau `BAB4_PROGRESS.md` / `CHECKPOINT.json`.
- JANGAN tes manual untuk pengguna — pengguna yang akan mengetes sendiri di localhost.

### R5. Penyelesaian dan Delivery
Jalankan `npm run build` dan `lint` untuk memastikan compile bersih tanpa error. Lakukan commit dan push ke branch `feat/bab4-experiments`, lalu BERHENTI menunggu.

## Acceptance Criteria

### Penempatan UI & Bahasa
- [ ] Seksi "Buktikan Kepemilikan" muncul di `app/ijazah/[id]/page.tsx` tepat di bawah seksi "Verifikasi Kriptografis".
- [ ] Seksi "Buktikan Kepemilikan" tidak muncul pada kondisi sertifikat tidak ditemukan ("Ijazah Tidak Ditemukan").
- [ ] Tampilan sertifikat yang sudah ada serta teks/angka lain di halaman tetap utuh tanpa perubahan.
- [ ] Seluruh teks dan label baru disajikan dalam Bahasa Indonesia.

### Integrasi Dompet & Alur Challenge
- [ ] Koneksi dompet menggunakan fungsi `getWalletProvider` yang sudah ada (Phantom/Solflare) tanpa dependensi library wallet eksternal baru.
- [ ] Peringatan untuk menginstal Phantom dan merefresh halaman muncul jika dompet tidak terdeteksi.
- [ ] Challenge diminta melalui `POST /api/verify/challenge` dengan `{ walletAddress }`.
- [ ] Pesan tantangan ditandatangani oleh dompet secara byte-exact UTF-8.
- [ ] Request verifikasi dikirim melalui `POST /api/verify/challenge` dengan `{ action: "verify", walletAddress, nonce, signature, message, expectedOwner }`.
- [ ] Nilai `signature` dikirim dalam format base58 (`bs58.encode`).
- [ ] Nilai `expectedOwner` merujuk langsung ke nama field pemilik aset pada data sertifikat yang dimuat halaman.
- [ ] Status transisi antarmuka tertangani dengan jelas: idle, connecting, challenge diminta, menunggu tanda tangan, memverifikasi, hingga selesai (sukses/gagal).
- [ ] Tampilan sukses menampilkan "Kepemilikan Terverifikasi" berwarna hijau.
- [ ] Tampilan gagal menampilkan kode error spesifik dari API (seperti `OWNER_MISMATCH` = "Dompet ini bukan pemilik ijazah", `NONCE_EXPIRED`, dsb).
- [ ] Tombol "Minta Challenge Baru" tersedia dan dapat diklik untuk memperbarui challenge saat nonce kedaluwarsa.

### Kepatuhan Guardrails
- [ ] File `lib/challenge.ts`, route API challenge, data n=30, direktori `experiments/`, `BAB4_PROGRESS.md`, dan `CHECKPOINT.json` tidak mengalami perubahan.
- [ ] Dev server tidak direstart dan tidak ada aksi deploy production.

### Verifikasi Teknis & Delivery
- [ ] Perintah `npm run build` berhasil dieksekusi tanpa error.
- [ ] Perintah `npm run lint` berhasil dieksekusi tanpa error.
- [ ] Seluruh perubahan di-commit dan di-push ke branch `feat/bab4-experiments`.
