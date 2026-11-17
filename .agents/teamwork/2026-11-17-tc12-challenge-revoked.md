# Laporan Akhir: Perbaikan TC-12 + Challenge pada Ijazah REVOKED (SIJAGA)

**Tanggal:** 17 November 2026 (Waktu Sistem: 18 November 2026)  
**Branch:** `feat/bab4-experiments` (HEAD `f7bae08`, baseline `27cffac`)  
**Pelaksana:** `teamwork_worker_1` (Core Implementation Worker)  

---

## 1. File yang Diubah dan Ringkasan Perubahan

Total 5 file yang diubah (sesuai mandat exclusive write ownership):

### 1. `app/api/verify/tingkat-1/route.ts`
- **Fungsi/Baris Kunci:** `handleInspection(asset: string)` baris 91–182.
- **Apa yang Berubah:**
  - Menggantikan respons error mentah RPC dan METADATA yang sebelumnya hanya mengembalikan status HTTP tanpa struktur data bisnis.
  - Saat `result.reason === "RPC"`: mengembalikan status HTTP 503 (Service Unavailable) dengan payload JSON terstruktur memuat `success: false`, `level: "TINGKAT 1"`, `verdict: "TIDAK DAPAT DIPASTIKAN"`, rincian evaluasi 7 baris matriks `checks` (semua bertanda `"TIDAK DAPAT DIPASTIKAN"` dengan penjelasan teknis), dan `warning`.
  - Saat `result.reason === "METADATA"`: mengembalikan status HTTP 502 (Bad Gateway) dengan payload terstruktur serupa, di mana `tokenExists.status` bernilai `"DAPAT DIPERIKSA"` (karena aset ditemukan on-chain namun IPFS gateway gagal).
  - Logika dan status HTTP untuk `NOT_FOUND` (404), `NOT_ASSET` (400), serta aset valid (`DAPAT DIPERIKSA`) dan dicabut (`DICABUT`) tetap 100% utuh tanpa perubahan.

### 2. `app/verify-onchain/page.tsx`
- **Fungsi/Baris Kunci:**
  - Interface `InspectionResult` (baris 69–99): Membuat properti on-chain (`owner`, `name`, `uri`, `frozen`, `updateAuthority`, `dataHash`) bersifat opsional/nullable.
  - `handleVerify` (baris 180–196): Menangani parsing JSON sehingga ketika `data.verdict === "TIDAK DAPAT DIPASTIKAN"`, data langsung disimpan ke `setResult(data)` alih-alih dibuang ke kotak merah error mentah.
  - Penentuan status visual & banner (baris 320–385): Menambahkan state `isUndetermined` dan cabang `verdictKind === "undetermined"`. Kartu banner menggunakan gradien amber/orange (`from-amber-600 to-orange-700`), ikon `AlertTriangle`, badge `bg-white text-amber-900`, dan judul banner `"Status Ijazah Tidak Dapat Dipastikan"`.
  - Status Token (baris 625–635): Menampilkan fallback `"TIDAK DIKETAHUI"` bila status freeze tidak dapat dibaca dari RPC.
  - Rincian Aset On-Chain & IPFS (baris 680–770): Memberikan teks fallback yang ramah bila data `owner`, `updateAuthority`, atau `uri` tidak dapat diakses.
  - Buktikan Kepemilikan (baris 895–935): Menambahkan banner informasi bahwa verifikasi kepemilikan dinonaktifkan sementara karena alamat pemilik tidak dapat diambil dari RPC, serta menonaktifkan tombol tantangan dengan teks `"Alamat Pemilik Tidak Tersedia"`.

### 3. `lib/challenge.ts`
- **Fungsi/Baris Kunci:**
  - Tipe union `ChallengeVerificationResult` (baris 71–86): Menambahkan varian error `"CERT_REVOKED"`.
  - `verifyVerificationChallenge` (baris 96–135): Menambahkan parameter opsional `certificateId?: string`. Jika `certificateId` disertakan dan sertifikat terkait di Prisma memiliki `status === "REVOKED"`, fungsi menolak verifikasi dengan mengembalikan `{ success: false, error: "CERT_REVOKED", message: "Ijazah ini telah dicabut oleh Universitas Tadulako. Kepemilikan tidak dapat diverifikasi untuk ijazah yang telah dicabut." }`.
  - Menjaga parameter `certificateId` tetap opsional menjamin backward compatibility 100% dengan seluruh suite pengujian TC-05 dan TC-06.

### 4. `app/api/verify/challenge/route.ts`
- **Fungsi/Baris Kunci:**
  - Mode B / Issue Nonce (baris 87–120): Menerima parameter opsional `certificateId`. Jika disediakan dan sertifikat di Prisma berstatus `REVOKED`, endpoint menolak penerbitan nonce dengan HTTP 400 `{ success: false, error: "CERT_REVOKED", message: "...", revokeReason: "..." }`.
  - Mode A / Verify Signature (baris 43–85): Menerima `certificateId` dan meneruskannya ke `verifyVerificationChallenge`. Menambahkan fallback: jika `!certificateId && expectedOwner`, endpoint mencari data sertifikat pemilik di Prisma. Jika berstatus `REVOKED`, endpoint langsung menolak dengan HTTP 400 `{ verified: false, error: "CERT_REVOKED", message: "..." }`.

### 5. `app/ijazah/[id]/page.tsx`
- **Fungsi/Baris Kunci:**
  - Deklarasi state (baris 214): Mendefinisikan `const isRevoked = cert?.status === "REVOKED";`.
  - `handleVerifyOwnership` (baris 301–312, 360–365, 430–440): Menambahkan guard awal: jika `isRevoked`, batalkan eksekusi, set status `"gagal"` dengan `errorCode = "CERT_REVOKED"` tanpa membuka ekstensi dompet. Mengirimkan `certificateId: resolvedParams.id` pada pemanggilan Mode B dan Mode A.
  - Handler respon sukses (baris 445–465): Menambahkan penjaga `&& !isRevoked` sehingga tidak akan pernah masuk ke state `"sukses"` pada ijazah yang dicabut.
  - Render Seksi Buktikan Kepemilikan (baris 695–740): Jika `isRevoked`, status badge merender badge merah `"Ijazah Dicabut"`, serta merender banner merah `"Pembuktian Kepemilikan Dinonaktifkan"` beserta alasan pencabutannya.
  - Kartu Hasil Sukses Hijau (baris 910–930): Diberi pelindung ganda `{!isRevoked && challengeStatus === "sukses" && (...)}` agar tidak pernah tampil pada ijazah dicabut.
  - Kotak Pesan Gagal (baris 960–990): Menambahkan penanganan judul dan deskripsi khusus untuk `errorCode === "CERT_REVOKED"`.
  - Tombol Aksi (baris 1020–1060): Tombol utama diberi `disabled={isRevoked || ...}` dengan label `"Ijazah Telah Dicabut"`, dan tombol sekunder disembunyikan jika `isRevoked`.

---

## 2. Alasan Desain

### Khusus Tugas 1: Pemilihan Pendekatan (a) vs Pendekatan (b)
Kami memilih **Pendekatan (a)**: Endpoint mempertahankan status error semantik HTTP (503 Service Unavailable untuk RPC mati, 502 Bad Gateway untuk IPFS gateway mati), namun body JSON terstruktur memuat `verdict: "TIDAK DAPAT DIPASTIKAN"`, rincian evaluasi `checks`, dan peringatan; lalu halaman `app/verify-onchain/page.tsx` mem-parse body tersebut dan merender tampilan Bento amber "TIDAK DAPAT DIPASTIKAN".

**Alasan Pilihan:**
1. **Kepatuhan Standar Protokol REST/HTTP (RFC 9110):** Kegagalan menghubungi RPC Solana atau IPFS gateway adalah kegagalan upstream dependency. Menyamarkan kegagalan jaringan eksternal menjadi HTTP 200 OK bertentangan dengan semantik web dan integritas audit sistem desentralisasi.
2. **Pencegahan Cache Poisoning di CDN/Edge Proxy:** Infrastruktur Vercel Edge Cache dan Cloudflare secara default tidak pernah menyimpan cache respons berstatus 5xx. Jika endpoint mengembalikan HTTP 200 dengan status "TIDAK DAPAT DIPASTIKAN", ada risiko respons tersebut ter-cache di level CDN, menyebabkan pengguna tetap melihat status mati sementara RPC sebenarnya telah pulih kembali.
3. **Observabilitas Sistem & APM Telemetry:** Penggunaan kode 502/503 memungkinkan metrik server (Sentry, Datadog, Prometheus) tetap merekam lonjakan error rate ketika Solana Devnet mengalami degraded service atau rate limit.
4. **Resiliensi Parsing Frontend:** Klien `app/verify-onchain/page.tsx` dirancang membaca data terlepas dari `res.ok`, mengecek `data && data.verdict === "TIDAK DAPAT DIPASTIKAN"`. Ini membuat UI aman dan fleksibel terhadap kedua pendekatan.

### Khusus Tugas 2: Defense-in-Depth Tiga Lapis
Memperbaiki celah logika di mana tanda tangan kriptografis Ed25519 secara matematis tetap valid pada dompet pemilik meskipun ijazahnya telah di-revoke. Kami menerapkan pertahanan di 3 lapis:
1. **Lapis Core Library:** Menolak di level fungsi `verifyVerificationChallenge` via Prisma check dengan error `CERT_REVOKED`.
2. **Lapis API Endpoint:** Menolak sejak penerbitan nonce (Mode B) maupun verifikasi tanda tangan (Mode A) dengan HTTP 400.
3. **Lapis UI:** Menonaktifkan tombol, mengganti teks, dan memagari komponen agar badge hijau tidak pernah dirender.

---

## 3. Bukti Verifikasi

Semua pengujian dijalankan dan lolos 100%:

### 3.1 Verifikasi Typecheck dan Linting
- `npx eslint app/api/verify/tingkat-1/route.ts app/verify-onchain/page.tsx lib/challenge.ts app/api/verify/challenge/route.ts app/ijazah/[id]/page.tsx` &rarr; **Exit code 0 (0 warning, 0 error)**.
- `npx tsc --noEmit` &rarr; **Exit code 0 (0 error)**.
- `npm run build` &rarr; **Exit code 0 (Compiled successfully in 15.9s, Finished TypeScript in 29.4s, 44/44 static pages generated)**.

### 3.2 Uji Simulasi TC-12 (RPC Mati)
Menjalankan endpoint tingkat-1 dengan simulasi dead RPC (`SOLANA_RPC_URL="http://127.0.0.1:19999"`):
```
HTTP Status: 503
Verdict: TIDAK DAPAT DIPASTIKAN
Reason: RPC
Level: TINGKAT 1
Success: false
tokenExists check: {
  status: 'TIDAK DAPAT DIPASTIKAN',
  detail: 'Koneksi ke node Solana RPC terganggu / tidak dapat dijangkau'
}
warning: Koneksi ke infrastruktur desentralisasi (Solana RPC / IPFS Gateway) terganggu sehingga keabsahan aset TIDAK DAPAT DIPASTIKAN. Ini BUKAN vonis 'tidak valid' atau 'dicabut'.
```

### 3.3 Uji Simulasi Challenge pada Ijazah REVOKED
Menguji route `POST /api/verify/challenge` dengan ijazah berstatus `REVOKED`:
- **Mode B (Issue Nonce):** Mengembalikan HTTP 400 `{ success: false, error: "CERT_REVOKED", message: "Ijazah ini telah dicabut oleh Universitas Tadulako. Tantangan verifikasi tidak dapat diterbitkan untuk ijazah yang telah dicabut.", revokeReason: "..." }`.
- **Mode A (Verify Signature):** Mengembalikan HTTP 400 `{ verified: false, error: "CERT_REVOKED", message: "Ijazah ini telah dicabut oleh Universitas Tadulako. Kepemilikan tidak dapat diverifikasi untuk ijazah yang telah dicabut." }`.

### 3.4 Uji Regresi Baseline Tanpa Gangguan
- `scripts/test-challenge.ts` (TC-05 & TC-06):
  ```
  ✓ TC-05 PASSED: Valid signature verified successfully.
  ✓ TC-06a PASSED: Replayed nonce rejected (NONCE_ALREADY_USED).
  ✓ TC-06b PASSED: Foreign wallet rejected (3a: INVALID_SIGNATURE, 3b: WALLET_MISMATCH).
  ✓ TC-06c PASSED: Expired nonce rejected (NONCE_EXPIRED).
  ✓ TC-06d PASSED: Tampered message rejected (MESSAGE_MISMATCH).
  === ALL TC-05 & TC-06 CHALLENGE TESTS PASSED! ===
  ```
- Endpoint Tingkat-1:
  - Alamat dompet `DtUVhcmk...` &rarr; HTTP 400, `reason: "NOT_ASSET"`.
  - Alamat acak `11111111...` &rarr; HTTP 400/404 sesuai klasifikasi akun.

---

## 4. Hal yang TIDAK Diubah dan Keterbatasan

1. **Hal yang TIDAK Diubah:**
   - Logika kriptografi inti challenge (pembangkitan nonce 128-bit, batas waktu expiry 5 menit, anti-replay single-use via update atomik `usedAt`, rate limiter 20 req/menit) tetap 100% utuh.
   - Perilaku kasus sukses tingkat-1 (`DAPAT DIPERIKSA`), kasus `NOT_FOUND` (404), kasus `NOT_ASSET` (400), dan kasus `DICABUT` pada `app/api/verify/tingkat-1/route.ts` tidak diubah.
   - Alur revoke dan restore ijazah (`app/api/nft/revoke`, `app/api/admin/recovery`) tidak diubah.
   - Skema Prisma (`prisma/schema.prisma`) tidak diubah.
   - Tidak ada dependensi baru yang ditambahkan ke `package.json`.
2. **Keterbatasan:**
   - Pengujian live terhadap IPFS Gateway down secara nyata bergantung pada ketersediaan gateway Pinata; namun penanganan di `inspectCertificate` yang mengembalikan `reason: "METADATA"` telah terbukti dipetakan secara simetris ke HTTP 502 dengan struktur respons yang sama persis seperti RPC down.

---

## 5. Daftar File untuk Commit (Jangan Commit Sendiri)

1. `app/api/verify/tingkat-1/route.ts`
2. `app/verify-onchain/page.tsx`
3. `lib/challenge.ts`
4. `app/api/verify/challenge/route.ts`
5. `app/ijazah/[id]/page.tsx`

---

Kedua tugas telah selesai sepenuhnya, terverifikasi bebas regresi dengan `npm run build` dan suite pengujian TC, dan siap direview Juan.
