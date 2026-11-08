# SIJAGA — Bab IV Experiments & Handoff Progress Tracker

> **PETUNJUK BAGI MODEL AI APAPUN YANG MENERUSKAN PEKERJAAN INI (CLAUDE / GEMINI / GPT / DLL):**
> 1. File ini adalah *Single Source of Truth* status pengerjaan Bab IV SIJAGA.
> 2. Periksa status terakhir pada file `experiments/CHECKPOINT.json` dan daftar checklist di bawah ini.
> 3. Jangan mengulang analisis atau mengubah keputusan arsitektur yang sudah ditandai selesai.
> 4. Lanjutkan langsung pada task pertama yang masih berstatus `[ ]` (Belum Selesai).
> 5. Selalu jalankan `npm run lint` dan `npm run build` setelah mengubah kode TypeScript/React.
> 6. Perbarui file ini dan `experiments/CHECKPOINT.json` setiap kali sebuah sub-task selesai.

---

## 1. Metadata Lingkungan & Keputusan Disepakati (Koreksi Pemilik 7 Nov 2026)

- **Baseline Commit:** `3fe64f0744e8c5a4638a2bcb4fbe736cf247a0c0` ("Merge pull request #18 from juanKuganda/dev").
- **Branch Kerja:** `feat/bab4-experiments` (dibuat langsung dari commit `3fe64f0`).
- **Cluster Blockchain:** Solana Devnet ONLY (`devnet.helius-rpc.com`, core 4.4.1).
- **Admin Keypair & Public Key:**
  - Diturunkan secara kriptografis dari `ADMIN_WALLET_PRIVATE_KEY` di `.env.local`.
  - Public Key: `Bat5VTbjGqsThS5oERuXVi7d2JY2TBNomJD2ZciaztaQ`.
  - Saldo Admin: ~9.587 SOL (terverifikasi di Devnet).
- **DG-1 (Claim Fee Payer):** `"OPTION_A_OWNER_APPROVED"`. Institusi mensponsori fee transaksi klaim (admin wallet sebagai *fee payer* dengan *partial signing*). Mahasiswa tidak butuh saldo SOL devnet. Biaya klaim disponsori dicatat terpisah.
- **DG-2 (Status Thresholds):** `"AUTHOR_PROPOSAL"`. Ambang batas pada Tabel 3.5 proposal dijadikan kriteria kerja (*working criteria*). Status dicatat jujur sebagai usulan peneliti (*author's proposal*), menunggu pertemuan dengan dosen pembimbing pada Senin 9 Nov 2026.
- **Dependensi Kriptografi:** `tweetnacl` versi `^1.0.3` telah diinstal sebagai **dependensi langsung** di `package.json`.
- **Status Build:** `npm run build` **LULUS 100% (exit code 0)** pada 7 Nov 2026.

---

## 2. Checklist Pelaksanaan Berfase

### Fase 0 — Penutupan Celah Kode (Code Gaps) — [SELESAI 100%]
- [x] **P0.0: Setup Baseline Branch & Kontinuitas Tracker**
  - Branch `feat/bab4-experiments` dibuat dari commit `3fe64f0`.
  - Dependensi langsung `tweetnacl` terpasang di `package.json`.
  - `experiments/CHECKPOINT.json` & `BAB4_PROGRESS.md` disinkronkan dengan koreksi pemilik.
- [x] **P0.1: Verification Challenge Endpoint (TC-05 / TC-06)**
  - Model `VerificationNonce` di `prisma/schema.prisma` disinkronkan ke PostgreSQL Neon.
  - Endpoint `POST /api/verify/challenge` dan modul `lib/challenge.ts` selesai.
  - Pengujian TC-05 dan varian TC-06a..d sukses diverifikasi via `scripts/test-challenge.ts`.
- [x] **P0.2: Implementasi Pemeriksaan ISSUER (TC-07a)**
  - `app/api/verify/route.ts` dan `app/api/actions/verify/route.ts` selesai membandingkan `inspection.updateAuthority` dengan admin wallet address (`getAdminWalletAddress()`).
  - Mengembalikan `mismatch: "ISSUER"` jika updateAuthority tidak cocok.
- [x] **P0.3: Endpoint Re-issuance ke Wallet Baru (TC-09)**
  - Endpoint `POST /api/admin/reissue` selesai dengan verifikasi identitas ketat (kelulusan, role, data consent aktif).
  - Alur atomik: mint aset baru, visual revoke aset lama di Solana, simpan link riwayat (`replacedById`, `replacedAt`, dan `CertificateBackup`).
- [x] **P0.4: Penyelesaian Sponsor Biaya Klaim (DG-1)**
  - `app/api/actions/claim/route.ts`: admin wallet sebagai `feePayer` dengan `transaction.partialSign(adminKeypair)`. Mahasiswa tidak bayar SOL.
  - `app/api/actions/claim-callback/route.ts`: verifikasi tanda tangan mahasiswa melalui `allSigners` dan instruksi Memo.
- [x] **P0.5: Verifikasi Penghapusan Salt pada `delete-pii` (TC-11)**
  - Terverifikasi menghapus `dataSalt: null` di `app/api/admin/delete-pii/route.ts`.
  - Diuji secara empiris via `scripts/test-delete-pii.ts`: hash tidak dapat direkonstruksi pasca penghapusan.
- [x] **P0.6: Setup Lingkungan Pengukuran Devnet & Build Verification**
  - RPC Helius Devnet terkonfirmasi (`devnet.helius-rpc.com`, core 4.4.1).
  - Saldo admin wallet terverifikasi 9.587 SOL.
  - Pinata API auth terverifikasi.
  - `npm run build` lulus 100% tanpa error di 42 rute.

---

### Fase 1 — Pembuatan Measurement Harness — [SELESAI 100%]
- [x] **P1.1: Pembuatan Direktori & Modul `scripts/benchmark/`**
  - Seluruh modul pengujian tersedia: `common.ts`, `bench-mint.ts`, `bench-revoke.ts`, `bench-verify.ts`, `bench-negative.ts`, `test-tc.ts`.
  - Semua 14 error TypeScript berhasil diatasi (`asset: asset.publicKey`, `updatePlugin`, penyempitan discriminated union `ChallengeVerificationResult`).
  - Pembersihan ESLint tuntas; `npx tsc --noEmit`, `npm run lint`, dan `npm run build` lulus 100% dengan exit code 0.
- [x] **P1.2: Pencatatan Transaksi Lengkap (Receipt Logger JSONL & CSV)**
  - `recordReceipt()` mencatat 19 field mandat P1.2 secara dual-stream ke `experiments/<YYYY-MM-DD>/run-<op>.jsonl` dan `summary-<op>.csv`.
  - Snapshot harian `run-metadata.json` menyimpan provider RPC, host, cluster version, dan versi software.
- [x] **P1.3: Penerapan Retry Policy Maks 2 Kali (Error Jaringan)**
  - `executeWithProposalRetry()` menerapkan batas maksimal 2 attempts secara ketat hanya untuk error jaringan transient (bukan error deterministik/program).
  - Attempt 1 failure dan Attempt 2 retry tercatat terpisah pada receipt untuk kalkulasi laju sukses 1-attempt dan 2-attempt.
- [x] **P1.4: Jadwal Pengukuran $n=30$ Tersebar Waktu**
  - Rencana pengukuran 30 trial per operasi didokumentasikan di `scripts/benchmark/README.md` dengan matriks 4 batch waktu berbeda (WITA / UTC) untuk menangkap variabilitas jaringan.
  - Smoke test Devnet berhasil dieksekusi dengan receipt terverifikasi (Mint: `CLmHhVKTM5QeonTwWFCKA9h2phgfacLYb4J4ZbAMFohR`, Tx: `aacAZgh2DPYjM3Ce1dJfvq2MzwDNpXSR3Nkx2a3xrDPbi1TmKzMJjwR2Tt26yHJ9AYhnG9JGzVuin786LdSWqGC`).

### Fase 2 — Eksekusi 14 Test Case & Pengujian Performa — [CURRENT PHASE]
- [ ] **P2.1: Performance Experiment (Mint, Revoke, Verify $n=30$)**
- [ ] **P2.2: Negative Tests (TC-02, TC-03, TC-04, TC-13 via raw Metaplex Core instructions)**
- [ ] **P2.3: Challenge Tests (TC-05, TC-06)**
- [ ] **P2.4: Validity Tests (TC-07, TC-08, TC-09, TC-12, TC-14)**
- [ ] **P2.5: Privacy Tests (TC-10, TC-11)**
- [ ] **P2.6: End-to-end Demonstration Trace (TC-01)**

### Fase 3 — Analisis & Penyusunan Dokumen Bab IV
- [ ] **P3.1: Tabel Statistik per Operasi**
- [ ] **P3.2: Tabel Perbandingan Ambang Batas (Tabel 3.5)**
- [ ] **P3.3: Tabel Hasil 14 Test Case**
- [ ] **P3.4: Tabel Proyeksi Biaya (SOL, USD, IDR)**
- [ ] **P3.5: Analisis Privasi & Batasan (Limitations)**
- [ ] **P3.6: Dokumen Final `bab4-results.md`**

---

## 3. Log Perubahan Terverifikasi
- **7 Nov 2026:** Branch `feat/bab4-experiments` di-checkout dari commit `3fe64f0744e8c5a4638a2bcb4fbe736cf247a0c0`.
- **7 Nov 2026:** Dependensi langsung `tweetnacl@^1.0.3` ditambahkan ke `package.json`.
- **7 Nov 2026:** Koreksi DG-1 (`OPTION_A_OWNER_APPROVED`) dan DG-2 (`AUTHOR_PROPOSAL`) diterapkan.
- **7 Nov 2026:** Implementasi P0.1 (challenge endpoint), P0.2 (ISSUER check), P0.3 (reissue endpoint), P0.4 (claim sponsorship), P0.5 (delete-pii salt).
- **7 Nov 2026:** `npm run build` sukses 100% tanpa error. Fase 0 selesai tuntas.
- **7 Nov 2026:** Fase 1 selesai 100%: 14 error TypeScript diatasi, receipt logger ganda JSONL/CSV & metadata klaster selesai, retry policy P1.3 diterapkan, jadwal time-spread P1.4 didokumentasikan di `scripts/benchmark/README.md`. `npx tsc --noEmit`, `npm run lint`, `npm run build`, dan smoke test Devnet lulus 100%.
- **7 Nov 2026 (Gate 1 Iteration 2 Hardening):** Perbaikan ketahanan harness diterapkan dan diverifikasi:
  - `isNetworkError` diperbarui dengan evaluasi simetris pada seluruh konteks (`msg`, `cause`, `code`, `logs`) sehingga error deterministik kontrak (frozen, custom program error) tidak pernah di-retry secara keliru.
  - Dukungan eksplisit kode transient gateway (HTTP 502, 503, 504, bad gateway, gateway timeout) ditambahkan ke `isNetworkError`.
  - Modul `getTransactionWithRetry` ditambahkan pada `scripts/benchmark/common.ts` dengan retry ber-backoff untuk mengatasi indexing latency RPC Devnet.
  - `bench-mint.ts` dan `bench-revoke.ts` diperkaya dengan `getTransactionWithRetry`; smoke test Devnet mengonfirmasi `slot`, `feeLamports`, dan `rentDepositLamports` terisi lengkap 100% tanpa nilai null.
  - Validasi ketat: Adversarial classification test 15/15 PASS, `npx tsc --noEmit` exit 0, `npm run lint` exit 0, `npm run build` exit 0.
- **8 Nov 2026 (Perbaikan 9 Poin Review Pengukuran & 14 Black-Box Test Cases):** Seluruh 9 temuan review selesai diperbaiki dan diverifikasi:
  1. **BUG `replacedById` diperbaiki:** Baris `Certificate` lama tetap mempertahankan `nftAddress` lama, status `REVOKED`, dan `replacedById` menunjuk ke ID baris `Certificate` baru. Baris baru memiliki status `MINTED` dan `replacedById: null`. Skema Prisma diperbarui dengan relasi `activeCertificate` dan indeks `userId`.
  2. **Revoke gagal fail-loud:** Jika `revokeSoulboundNFT` pada aset lama gagal saat proses reissue, endpoint mengembalikan HTTP 502, tidak menandai reissue sukses, dan mencatat alert `ORPHANED_ASSET_ALERT` di `AuditLog`.
  3. **TC-07 & TC-09 memanggil endpoint asli via HTTP:** `TC-07` memanggil `GET /api/verify` (HTTP) dengan aset ber-`updateAuthority` asing (terkonfirmasi `mismatch: "ISSUER"`), dan aset dengan hash DB rusak (terkonfirmasi `mismatch: "HASH"`). `TC-09` memanggil `POST /api/admin/reissue` (HTTP dengan autentikasi `x-admin-key`), memverifikasi aset baru di wallet baru, aset lama `[DIBATALKAN]`, dan link database lama -> baru.
  4. **Varian tantangan TC-06 lengkap:** Menambahkan varian expired nonce (`NONCE_EXPIRED`) dan tampered message (`MESSAGE_MISMATCH`) selain replay (`NONCE_ALREADY_USED`) dan foreign wallet (`INVALID_SIGNATURE`).
  5. **TC-11 & TC-12 endpoint asli:** `TC-11` memanggil `POST /api/admin/delete-pii` (HTTP), memverifikasi `dataSalt: null`, membuktikan rekonstruksi hash dengan salt fiktif gagal, dan memverifikasi `piiDeleted: true` di portal publik. `TC-12` menguji dead RPC dan blocked IPFS, memastikan sistem mengembalikan status tidak dapat ditentukan / UNAVAILABLE dan tidak pernah menyatakan ijazah valid.
  6. **Sinkronisasi lockfile:** `npm install` dan `npm ci` berhasil dieksekusi dengan exit code 0.
  7. **ESLint rules dikembalikan:** Semua rule ESLint dikembalikan ke level `error`, semua penggunaan `any` dan hooks effect diselesaikan dengan tepat (0 error tersisa).
  8. **Pembersihan harness:** Hardcoded `adminWallet` diganti dengan `getAdminWalletAddress()`, retry Pinata dicatat pada receipt logger (`pinataRetries`), penomoran trial di-offset dari jumlah receipt tersimpan (`getExistingTrialCount`) agar kontinu antar batch.
  9. **Verifikasi komprehensif:** `scripts/test-challenge.ts` lulus 100%, `npm run test:tc` lulus 14/14 (100.0%), `npm run lint` lulus (0 error, 40 warning), dan `npm run build` lulus (42 rute statis/dinamis teroptimasi).

---

## 4. Status Pengukuran Batch & Realisasi Pelaksanaan

**STATUS REALISASI PER BATCH (n=30 TARGET PER OPERASI):**
- **Batch 4 (Jendela Malam 22:00–23:00 WITA, 7 Nov 2026):**
  - Mint: **7 trial selesai** (6 sukses + 1 gagal; trial gagal tetap dicatat sebagai data empiris).
  - Verify: **1 trial selesai** (Trial #1).
  - Revoke: **0 trial**.
- **Batch 1 (Jendela Pagi/Siang 11:00–11:25 WITA, 8 Nov 2026) — [SELESAI 100%]:**
  - Mint: **8/8 trial sukses** (Trial #8 s/d #15). Median p50: 10.96 s (On-chain p50: 4.15 s).
  - Verify: **8/8 trial sukses** (Trial #2 s/d #9). Median p50: 6.80 s.
  - Revoke: **8/8 trial sukses** (Trial #1 s/d #8). Median p50: 10.40 s (On-chain p50: 4.15 s).
- **Batch 2 Instrumentasi & Smoke Test (12:22 WITA, 8 Nov 2026):**
  - Rincian langkah `onchainElapsedSeconds` (RPC), `ipfsElapsedSeconds` (IPFS JSON), dan `challengeElapsedSeconds` diimplementasikan di `inspectCertificate` dan `bench-verify.ts`.
  - Definisi median standar (ganjil = nilai tengah, genap = rata-rata dua nilai tengah) diterapkan di `common.ts`, `bench-mint.ts`, `bench-verify.ts`, dan `bench-revoke.ts`.
  - `mintAddress` ditambahkan pada receipt verifikasi.
  - Smoke test 2 trial verifikasi (Trial #10 dan #11) sukses 100% dan dicatat sebagai 2 trial pertama Batch 2.
- **Total Akumulasi Tersimpan Saat Ini:**
  - **Mint**: **15 / 30 trial** (50% progress).
  - **Verify**: **11 / 30 trial** (36.7% progress).
  - **Revoke**: **8 / 30 trial** (26.7% progress).
  - **Saldo Admin Wallet**: **8.675 SOL** di Solana Devnet (sangat aman).

- **Jadwal Sisa Batch Hari Ini (8 Nov 2026):**
  - **Batch 2 (~14:00 – 14:30 WITA):**
    - Mint: 8 trial (Trial #16 s/d #23).
    - Verify: **6 trial lagi** (Trial #12 s/d #17, karena #10 dan #11 sudah selesai di smoke test).
    - Revoke: 8 trial (Trial #9 s/d #16).
  - **Batch 3 (~17:30 – 18:00 WITA):**
    - Mint: 7 trial (Trial #24 s/d #30) $\rightarrow$ **Minting SELESAI 30/30 (100%)**.
    - Verify: 13 trial (Trial #18 s/d #30) $\rightarrow$ **Verifikasi SELESAI 30/30 (100%)**.
    - Revoke: 14 trial (Trial #17 s/d #30) $\rightarrow$ **Revocation SELESAI 30/30 (100%)**.


