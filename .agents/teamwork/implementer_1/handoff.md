# Handoff Report: Implementasi UI Bukti Kepemilikan (Challenge-Response)

## 1. Ringkasan Pekerjaan
Telah diimplementasikan fitur antarmuka "Buktikan Kepemilikan" (Challenge-Response) pada halaman verifikasi ijazah `app/ijazah/[id]/page.tsx` untuk membuktikan kepemilikan ijazah via tanda tangan dompet Solana secara terdesentralisasi pada branch `feat/bab4-experiments`.

## 2. Rincian Perubahan Kode
- **File**: `app/ijazah/[id]/page.tsx`
  - Menambahkan provider typing dan fungsi `getWalletProvider()` (pola deteksi Phantom/Solflare/Backpack yang identik dengan `app/claim/[nim]/page.tsx`).
  - Menambahkan state siklus verifikasi: `idle` -> `connecting` -> `challenge diminta` -> `menunggu tanda tangan` -> `memverifikasi` -> `sukses` / `gagal`.
  - Menambahkan integrasi pemanggilan `POST /api/verify/challenge` untuk request challenge (`walletAddress`) dan verifikasi tanda tangan (`action: "verify", walletAddress, nonce, signature, message, expectedOwner: cert.walletAddress`).
  - Menambahkan penandatanganan pesan secara byte-exact UTF-8 melalui dompet dan encoding base58 via `bs58.encode`.
  - Menambahkan peringatan instalasi Phantom Wallet bila wallet tidak terdeteksi.
  - Menambahkan countdown timer 5 menit untuk masa berlaku nonce dan tombol "Minta Challenge Baru" bila kedaluwarsa atau terjadi kegagalan.
  - Menampilkan status "Kepemilikan Terverifikasi" (warna hijau) saat berhasil.
  - Menampilkan kode error API apa adanya (`OWNER_MISMATCH` = "Dompet ini bukan pemilik ijazah", `NONCE_EXPIRED`, `INVALID_SIGNATURE`, dll.) saat verifikasi gagal.
  - Memastikan seksi hanya muncul bila ijazah ditemukan dan diberi tag `print:hidden` agar tidak merusak cetak dokumen.

## 3. Catatan Verifikasi Kepatuhan Guardrails
- `lib/challenge.ts`: Tidak diubah (utuh).
- `app/api/verify/challenge/route.ts`: Tidak diubah (utuh).
- Direktori `experiments/`: Tidak disentuh.
- `BAB4_PROGRESS.md` & `CHECKPOINT.json`: Tidak disentuh.
- Dev server: Tidak direstart.
- Tidak ada deploy production.
- Tidak ada penambahan dependency eksternal baru.

## 4. Verification Record
- **Deep Verification (ran actual tests):**
  - `npm run lint`: Berhasil tanpa error (0 errors, file `app/ijazah/[id]/page.tsx` bersih 100%).
  - `npm run build`: Berhasil tanpa error (42 routes static & dynamic terkompilasi, termasuk `/ijazah/[id]`).
- **Shallow Verification (manual run / code audit):**
  - Verifikasi kesesuaian tipe data dan parameter API dengan kontrak `lib/challenge.ts` & `app/api/verify/challenge/route.ts`.
  - Verifikasi penanganan `expectedOwner` yang merujuk pada `cert.walletAddress`.
  - Verifikasi encoding signature dengan `bs58.encode` dan message encoding dengan `new TextEncoder().encode()`.
- **Unverified aspects:**
  - Pengetesan langsung interaksi ekstensi browser Phantom/Solflare di localhost diserahkan kepada pengguna (sesuai guardrail R4: pengguna yang akan mengetes sendiri di localhost).
