# LAPORAN VERIFIKASI EMPIRIS & CHALLENGE (TUGAS 2: CHALLENGE ON REVOKED CERTIFICATE)

**Penyusun:** `teamwork_challenger_2` (Role: Revoked Challenge Empirical Verifier)  
**ID Percakapan:** `dfb931a3-41f1-4875-b89e-157d12b4ac85`  
**Penerima:** `b129e651-00c4-4cf6-b087-5c8baeee3744` (Orchestrator)  
**Branch:** `feat/bab4-experiments`  
**Verdict:** **APPROVE**  
**Tanggal:** 17 November 2026 (Waktu Sistem: 18 November 2026)  

---

## 1. OBSERVATION

Pengujian empiris langsung (code execution, stress harness, dan edge case testing) telah dijalankan terhadap implementasi Tugas 2 (Challenge pada Ijazah REVOKED).

### 1.1 Eksekusi Uji Regresi Eksisting (`scripts/test-challenge.ts`)
Perintah yang dijalankan:
```bash
node --env-file=.env.local ./node_modules/tsx/dist/cli.mjs scripts/test-challenge.ts
```
**Hasil Verbatim:**
```
=== Testing TC-05 & TC-06 (Verification Challenge) ===
Owner Wallet: 7rVJj36NnZWZpPcH7eNtfK5EnFggDmz848YApTMhUHYa
Foreign Wallet: HNrKW3UJFss6br6TVQABk2AKs2Cor7eBE4hXfXRP3n89

[TC-05] Testing valid signature...
✓ TC-05 PASSED: Valid signature verified successfully.

[TC-06a] Testing replayed nonce (single-use enforcement)...
✓ TC-06a PASSED: Replayed nonce rejected (NONCE_ALREADY_USED).

[TC-06b] Testing foreign wallet signature...
✓ TC-06b PASSED: Foreign wallet rejected (3a: INVALID_SIGNATURE, 3b: WALLET_MISMATCH).

[TC-06c] Testing expired nonce...
✓ TC-06c PASSED: Expired nonce rejected (NONCE_EXPIRED).

[TC-06d] Testing tampered message (even one byte)...
✓ TC-06d PASSED: Tampered message rejected (MESSAGE_MISMATCH).

=== ALL TC-05 & TC-06 CHALLENGE TESTS PASSED! ===
```
*Status: Exit code 0. Seluruh kasus TC-05 dan TC-06 lulus 100% tanpa regresi.*

---

### 1.2 Eksekusi Test Harness Empiris Komprehensif (`scripts/test-challenger-revoked.ts`)
Harness pengujian empiris khusus dibuat pada `scripts/test-challenger-revoked.ts` untuk menguji:
1. Penolakan `verifyVerificationChallenge` pada sertifikat `REVOKED`.
2. Penolakan `POST /api/verify/challenge` Mode B (Issue Nonce) pada sertifikat `REVOKED`.
3. Penolakan `POST /api/verify/challenge` Mode A (Verify Signature) pada sertifikat `REVOKED` (baik direct `certificateId` maupun fallback via `expectedOwner`).
4. Edge Case 1: `certificateId` tidak ditemukan di DB.
5. Edge Case 2: `certificateId` tidak disertakan (backward compatibility).
6. Edge Case 3: Sertifikat berstatus aktif (`MINTED` dan `CLAIMED`).
7. Edge Case 4: Skenario kegagalan kriptografis (wrong wallet, tampered signature, tampered message, replayed nonce, expired nonce, malformed input).

Perintah yang dijalankan:
```bash
node --env-file=.env.local ./node_modules/tsx/dist/cli.mjs scripts/test-challenger-revoked.ts
```
**Hasil Verbatim:**
```
===============================================================
   SIJAGA CHALLENGER: EMPIRICAL STRESS TEST HARNESS (TUGAS 2)  
===============================================================

--- Category 1: verifyVerificationChallenge Revocation Rejection ---
[PASS] TC-REV-01a: verifyVerificationChallenge returns CERT_REVOKED for revoked certificate
[PASS] TC-REV-01b: Nonce is NOT consumed/marked used when rejected for CERT_REVOKED

--- Category 2: Mode B Route Issue Nonce on REVOKED Certificate ---
[PASS] TC-REV-02a: Mode B returns HTTP 400 for revoked certificate
[PASS] TC-REV-02b: Mode B payload contains success: false and error: 'CERT_REVOKED'
[PASS] TC-REV-02c: Mode B payload includes specific revokeReason
[PASS] TC-REV-02d: Mode B does NOT persist any nonce in DB on revoked cert

--- Category 3: Mode A Route Verify Signature on REVOKED (Direct ID) ---
[PASS] TC-REV-03a: Mode A returns HTTP 400 for revoked certificate
[PASS] TC-REV-03b: Mode A payload contains verified: false and error: 'CERT_REVOKED'

--- Category 4: Mode A Route Verify Signature on REVOKED (Fallback expectedOwner) ---
[PASS] TC-REV-04a: Mode A fallback returns HTTP 400 when expectedOwner holds REVOKED cert
[PASS] TC-REV-04b: Mode A fallback payload has verified: false and error: 'CERT_REVOKED'

--- Category 5: Edge Case — Non-existent certificateId in DB ---
[PASS] TC-EDGE-01a: Mode B handles non-existent certId gracefully without 500 error
[PASS] TC-EDGE-01b: Mode A handles non-existent certId gracefully and verifies valid crypto

--- Category 6: Edge Case — Missing certificateId (Backward Compatibility) ---
[PASS] TC-EDGE-02a: verifyVerificationChallenge succeeds when certificateId is omitted
[PASS] TC-EDGE-02b: Mode B succeeds when certificateId is omitted
[PASS] TC-EDGE-02c: Mode A succeeds when certificateId is omitted

--- Category 7: Edge Case — Active Certificates (MINTED & CLAIMED) ---
[PASS] TC-EDGE-03a (MINTED): Mode B issues challenge for active cert
[PASS] TC-EDGE-03b (MINTED): Mode A verifies successfully for active cert
[PASS] TC-EDGE-03a (CLAIMED): Mode B issues challenge for active cert
[PASS] TC-EDGE-03b (CLAIMED): Mode A verifies successfully for active cert

--- Category 8: Edge Cases — Cryptographic Negative Tests ---
[PASS] TC-EDGE-04a: Foreign wallet rejected with WALLET_MISMATCH
[PASS] TC-EDGE-04b: Explicit OWNER_MISMATCH returned when expectedOwner differs from signer
[PASS] TC-EDGE-04c: Signature signed by wrong private key rejected as INVALID_SIGNATURE
[PASS] TC-EDGE-04d: Tampered message rejected as MESSAGE_MISMATCH
[PASS] Pre-requisite: Valid challenge succeeds and marks used
[PASS] TC-EDGE-04e: Replayed challenge rejected as NONCE_ALREADY_USED
[PASS] TC-EDGE-04f: Expired nonce rejected as NONCE_EXPIRED
[PASS] TC-EDGE-04g: Non-existent nonce rejected as NONCE_NOT_FOUND
[PASS] TC-EDGE-04h: Incomplete Mode A verification input rejected with HTTP 400

===============================================================
   ALL EMPIRICAL TESTS PASSED! (28/28 assertions)
===============================================================
```
*Status: Exit code 0. Sebanyak 28 dari 28 pengujian empiris berhasil lolos 100%.*

---

### 1.3 Verifikasi Statis: Compiler & Linter
1. **TypeScript Typecheck (`npx tsc --noEmit`):**
   - Exit code: 0, 0 error.
2. **ESLint (`npx eslint lib/challenge.ts app/api/verify/challenge/route.ts app/ijazah/[id]/page.tsx`):**
   - Exit code: 0, 0 warning, 0 error.

---

### 1.4 Inspeksi Kode UI Defense-in-Depth (`app/ijazah/[id]/page.tsx`)
1. **Definisi State:**
   - Baris 214: `const isRevoked = cert?.status === "REVOKED";`
2. **Early Abort:**
   - Baris 303–310: `handleVerifyOwnership` memeriksa `if (isRevoked)` sebelum menghubungi provider dompet Solana apa pun, langsung menyetel `challengeStatus = "gagal"`, `errorCode = "CERT_REVOKED"`, dan menghentikan eksekusi.
3. **Response Handler Guard:**
   - Baris 449: `if (verifyRes.ok && verifyJson.verified && !isRevoked)` memastikan state `"sukses"` tidak pernah diaktifkan untuk ijazah yang dicabut.
4. **Visual Rendering Guards:**
   - Baris 693–743: Status badge menampilkan `"Ijazah Dicabut"` dengan ikon merah `XCircle` jika `isRevoked`.
   - Baris 747–760: Banner peringatan merah memaparkan bahwa pembuktian kepemilikan dinonaktifkan beserta `revokeReason`.
   - Baris 911: Kartu hijau kepemilikan terverifikasi diproteksi ketat dengan `{!isRevoked && challengeStatus === "sukses" && (...)}` sehingga mustahil muncul pada sertifikat yang dicabut.
   - Baris 968 & 977: Kotak pesan kegagalan menangani judul `"Ijazah Telah Dicabut"` dan deskripsi khusus saat `errorCode === "CERT_REVOKED"`.
   - Baris 1027–1038: Tombol verifikasi disetel `disabled={isRevoked || ...}` dengan label `"Ijazah Telah Dicabut"`.
   - Baris 1054: Tombol sekunder "Minta Challenge Baru" disembunyikan jika `isRevoked`.

---

## 2. LOGIC CHAIN

1. **Dari Observasi 1.1:**
   - Script `scripts/test-challenge.ts` menguji TC-05 (tanda tangan valid) dan seluruh varian TC-06 (replay attack, foreign wallet, expired nonce, tampered message) tanpa menyertakan `certificateId`.
   - Karena seluruh skenario lulus tanpa kegagalan (exit code 0), disimpulkan bahwa penambahan parameter opsional `certificateId?: string` pada `verifyVerificationChallenge` bersifat 100% backward-compatible dan tidak mengganggu mekanisme kriptografi Ed25519 (tweetnacl) yang sudah ada.

2. **Dari Observasi 1.2 (Kategori 1):**
   - Pada `lib/challenge.ts` (baris 116–130), pemeriksaan status sertifikat dilakukan pada Langkah 0, yaitu *sebelum* pengecekan nonce dan sebelum proses verifikasi tanda tangan atau pembaruan `usedAt`.
   - Hasil pengujian empiris `TC-REV-01a` dan `TC-REV-01b` membuktikan bahwa ketika `certificateId` berstatus `REVOKED`, fungsi langsung mengembalikan `{ success: false, error: "CERT_REVOKED" }` dan nonce yang ada di basis data tetap bersih (`usedAt === null`). Hal ini mencegah konsumsi nonce sia-sia pada ijazah yang dicabut.

3. **Dari Observasi 1.2 (Kategori 2 & 3):**
   - Pada `app/api/verify/challenge/route.ts`:
     - Mode B (baris 136–153) menolak penerbitan tantangan dengan status HTTP 400 `{ success: false, error: "CERT_REVOKED", revokeReason: "..." }` jika `certificateId` berstatus `REVOKED`. Pengujian `TC-REV-02d` memastikan tidak ada nonce baru yang tersimpan di DB.
     - Mode A (baris 44–96) meneruskan `certificateId` ke `verifyVerificationChallenge`, mengembalikan status HTTP 400 `{ verified: false, error: "CERT_REVOKED" }`. Pengujian `TC-REV-03a` dan `TC-REV-03b` memverifikasi penolakan ini secara empiris.

4. **Dari Observasi 1.2 (Kategori 4):**
   - Pada Mode A baris 68–87, terdapat mekanisme cadangan (*defense-in-depth fallback*): jika klien lalai mengirimkan `certificateId` namun menyertakan `expectedOwner`, endpoint mencari sertifikat pemilik melalui relasi `prisma.user.findFirst`.
   - Pengujian `TC-REV-04a` dan `TC-REV-04b` membuktikan bahwa sekalipun `certificateId` dihapus secara sengaja dari payload request, penolakan HTTP 400 `CERT_REVOKED` tetap bekerja secara proaktif.

5. **Dari Observasi 1.2 (Kategori 5, 6, 7):**
   - Pengujian `TC-EDGE-01` membuktikan jika `certificateId` tidak ditemukan di database (`cert === null`), endpoint tidak melempar HTTP 500 unhandled exception melainkan mengizinkan proses kriptografi berjalan normal.
   - Pengujian `TC-EDGE-02` membuktikan jika `certificateId` diabaikan, endpoint dan lib challenge tetap berfungsi normal.
   - Pengujian `TC-EDGE-03` membuktikan ijazah sah berstatus `MINTED` dan `CLAIMED` dapat menerbitkan nonce (Mode B) dan memverifikasi tanda tangan (Mode A) hingga status HTTP 200 `{ verified: true }`.

6. **Dari Observasi 1.2 (Kategori 8) & Observasi 1.4:**
   - Pengujian `TC-EDGE-04` menegaskan seluruh kontrol kriptografis negatif (pemalsuan tanda tangan, tampering pesan, replay nonce, expired nonce) tetap terlindungi penuh dengan kode error masing-masing.
   - Inspeksi pada `app/ijazah/[id]/page.tsx` membuktikan UI telah dipagari dengan 6 lapisan proteksi visual (Early Abort, Response Guard, No-Success-Card Guard, Red Badge, Warning Banner, Disabled Button).

---

## 3. CAVEATS

- **No caveats.** Seluruh aspek pengujian fungsional, edge case, integritas kriptografi, fallback basis data, serta pertahanan UI telah diverifikasi secara independen dan empiris tanpa ada anomali atau celah yang tersisa.

---

## 4. CONCLUSION

Berdasarkan seluruh observasi dan rantai logika pembuktian empiris di atas:
1. Perbaikan Tugas 2 (Challenge pada Ijazah REVOKED) telah diimplementasikan secara kokoh, benar, dan memenuhi prinsip *defense-in-depth* pada 3 lapis: Core Library (`lib/challenge.ts`), API Route (`app/api/verify/challenge/route.ts`), dan UI Frontend (`app/ijazah/[id]/page.tsx`).
2. Tidak ditemukan regresi pada fungsionalitas yang ada (TC-05 dan TC-06 tetap 100% lulus).
3. Penolakan status `REVOKED` terbukti mengembalikan `{ success: false, error: "CERT_REVOKED" }` pada library dan HTTP 400 pada route handler.
4. Seluruh skenario edge case (non-existent cert, omitted certId, MINTED/CLAIMED certs, wrong wallet / OWNER_MISMATCH) beroperasi sesuai kontrak spesifikasi.

**Verdict: APPROVE**

---

## 5. VERIFICATION METHOD

Untuk mereproduksi dan memvalidasi temuan ini secara independen:

1. **Jalankan Uji Regresi TC-05 & TC-06:**
   ```bash
   node --env-file=.env.local ./node_modules/tsx/dist/cli.mjs scripts/test-challenge.ts
   ```
   *Ekspektasi: Exit code 0, 5/5 skenario TC-05 & TC-06 lolos.*

2. **Jalankan Suite Pengujian Empiris Challenger:**
   ```bash
   node --env-file=.env.local ./node_modules/tsx/dist/cli.mjs scripts/test-challenger-revoked.ts
   ```
   *Ekspektasi: Exit code 0, 28/28 assertions lolos.*

3. **Jalankan Typecheck & Linting:**
   ```bash
   npx tsc --noEmit
   npx eslint lib/challenge.ts app/api/verify/challenge/route.ts app/ijazah/[id]/page.tsx
   ```
   *Ekspektasi: Exit code 0, 0 warning, 0 error.*

4. **Kondisi Pembatalan (*Invalidation Conditions*):**
   Laporan ini dinyatakan tidak valid jika salah satu dari 28 pengujian empiris pada `scripts/test-challenger-revoked.ts` gagal, atau jika ijazah `REVOKED` dapat menghasilkan respons `{ verified: true }` atau menampilkan banner/badge hijau di UI.
