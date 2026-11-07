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

### Fase 1 — Pembuatan Measurement Harness — [CURRENT PHASE]
- [ ] **P1.1: Pembuatan Direktori & Modul `scripts/benchmark/`**
- [ ] **P1.2: Pencatatan Transaksi Lengkap (Receipt Logger JSONL & CSV)**
- [ ] **P1.3: Penerapan Retry Policy Maks 2 Kali (Error Jaringan)**
- [ ] **P1.4: Jadwal Pengukuran $n=30$ Tersebar Waktu**

### Fase 2 — Eksekusi 14 Test Case & Pengujian Performa
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
