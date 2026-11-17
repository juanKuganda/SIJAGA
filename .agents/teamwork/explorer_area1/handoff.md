# Handoff Report: Area 1 — Rencana Eksekusi Uji Server Institusi Mati (TC-15, F1–F3)

**Author:** teamwork_explorer (Area 1)  
**Date:** 2026-11-15T11:05:00Z  
**Target Audience:** Orchestrator (`5360fff4-b625-4255-94e4-c4d3a7c9a278`) & Lead Reviewer  
**Status:** COMPLETE (Read-Only Investigation)  
**Branch:** `feat/bab4-experiments` (commit `3fe64f0` baseline + batch commits `852b7a0`, `4005522`)

---

## 1. Observation

Berdasarkan penelaahan mendalam terhadap file panduan `Brief-Bab4-untuk-Gemini-2026-11-15.md`, dokumen pelacak `BAB4_PROGRESS.md`, `experiments/CHECKPOINT.json`, artefak tim di `.agents/teamwork/`, serta seluruh file implementasi rute verifikasi di repositori, berikut adalah fakta konkret berbasis kode (`file_path:line`):

### 1.1 Spesifikasi TC-15 dan Tahapan F1–F3 dalam Brief
1. **Definisi TC-15**: `Brief-Bab4-untuk-Gemini-2026-11-15.md:65–129` mendefinisikan kasus uji baru TC-15 ("Tier 1 tidak tersedia — eksekusi tanpa portal/DB") untuk membuktikan bahwa ketika server/database institusi mati, keabsahan token blockchain dan metadata IPFS (Tingkat 1) tetap dapat diverifikasi secara independen oleh pihak ketiga, meskipun ikatan identitas nominatif (Tingkat 2) tidak dapat dipastikan tanpa `dataSalt` institusi.
2. **Status Pelaksanaan TC-15**: `Brief-Bab4-untuk-Gemini-2026-11-15.md:153` menyatakan:
   > "TC-15 'Tier 1 tidak tersedia' sebagai spesifikasi + celah diketahui (BELUM DIEKSEKUSI — endpoint /api/verify saat ini DB-first, Tier 1 mati = 500/404; jangan klaim PASS)."
3. **Struktur Eksekusi F1, F2, F3**:
   - **F1 (Mandiri tanpa laptop/DB)**: Eksekusi Langkah 1 (DAS `getAsset`), Langkah 2 (DAS `getAssetsByOwner`), Langkah 3 (Fetch IPFS Data Hash), dan Langkah 4 (Stateless challenge Ed25519) via RPC publik dan IPFS gateway (`Brief-Bab4-untuk-Gemini-2026-11-15.md:126`).
   - **F2 (Simulasi DB Mati di Localhost)**: Menjalankan portal, mematikan database sementara (e.g., Docker Postgres), memverifikasi respons fail-closed (HTTP 500/404), lalu menghidupkan kembali DB (`Brief-Bab4-untuk-Gemini-2026-11-15.md:127`).
   - **F3 (Checklist Bukti)**: Kumpulan 7 bukti verifikasi untuk Bab 4 (`Brief-Bab4-untuk-Gemini-2026-11-15.md:129`).
4. **Pasangan Aset Rekomendasi**: Pasangan 2 — Trace P2.6 (`FDQKnrLVQdZqP4efoNarLb87gmZj529kebFPz8SVMQCc`, owner `FGpNtVV1bewy5p8YcHAifvEsEZ9ScKeSbjVcF7uE1V5D`, IPFS `QmPuymRiKnzd6pPqVS5jdDbCtHpZGyXz5bXLaaJRdLmn2j`, hash `sha256:56a51c98cce45b2675301c1727964c3dd90b58bcac6d120ebed97eebaf600244`) per `Brief-Bab4-untuk-Gemini-2026-11-15.md:60–62`.

---

### 1.2 Alur Verifikasi di Codebase & Ketergantungan Database (DB-First)
1. **Kegagalan saat Database Mati (`app/api/verify/route.ts`)**:
   - `app/api/verify/route.ts:50`: `await prisma.wallet.findUnique({ where: { walletAddress: query }, ... })`
   - `app/api/verify/route.ts:72`: `await prisma.user.findUnique({ where: { nim: query }, ... })`
   - `app/api/verify/route.ts:103`: `await prisma.certificate.findFirst({ where: { userId: userWithWallet.userId }, ... })`
   - `app/api/verify/route.ts:333–338`: Jika database PostgreSQL mati/unreachable, Prisma melempar error koneksi yang ditangkap blok `catch (error)`, menghasilkan:
     ```json
     { "error": "Terjadi kesalahan server" } // HTTP 500
     ```
   - **Tidak ada fallback**: Endpoint tidak memiliki cabang fallback ke Solana RPC maupun IPFS jika query Prisma gagal. Tidak ada field `verified`, `verifiedOnChain`, maupun `verifiedNominative` yang dikembalikan.
2. **Keterbatasan Query Parameter `/api/verify`**:
   - `app/api/verify/route.ts:36`: `const isSolanaAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(query);`
   - `app/api/verify/route.ts:49–70`: Jika alamat Solana diinput, rute HANYA mencari ke tabel `prisma.wallet`. Jika mint address (`FDQKnrLV...`) diinput, query mengembalikan `null`, lalu `app/api/verify/route.ts:91` mengembalikan:
     ```json
     { "error": "Wallet tidak ditemukan" } // HTTP 404
     ```
   - Rute `/api/verify` saat ini **tidak menerima mint address / asset ID**, dan tidak melakukan lookup langsung ke Solana RPC jika wallet tidak terdaftar di database.
3. **Ketergantungan Halaman Sertifikat (`app/ijazah/[id]/page.tsx`)**:
   - `app/ijazah/[id]/page.tsx:442`: Halaman memanggil `fetch('/api/certificate/${resolvedParams.id}')`.
   - `app/api/certificate/[id]/route.ts:21`:
     ```typescript
     const certificate = await prisma.certificate.findUnique({
       where: { id },
       include: { user: { include: { wallet: true } } },
     });
     ```
   - Parameter `id` di URL `app/ijazah/[id]` adalah CUID database (`Certificate.id`, e.g., `cmw7pykyz0009ijxgm0zy8cg0`), **BUKAN mint address Solana** (`FDQKnrLV...`).
   - Jika server/database mati: fetch gagal (`app/ijazah/[id]/page.tsx:451`), memicu state error (`app/ijazah/[id]/page.tsx:478–500`) yang menampilkan "Ijazah Tidak Ditemukan" / "Gagal memuat data ijazah". Komponen sertifikat `<CertificateUI />` sama sekali tidak dirender.
   - Halaman `app/ijazah/[id]/page.tsx` **tidak memiliki kode interaksi RPC Solana maupun IPFS**; seluruh data tampilan bergantung 100% pada API database.
4. **Ketergantungan Challenge Verifikasi (`lib/challenge.ts`)**:
   - `lib/challenge.ts:53`: `await prisma.verificationNonce.create(...)`
   - `lib/challenge.ts:114`: `await prisma.verificationNonce.findUnique({ where: { nonce } })`
   - `lib/challenge.ts:212`: `await prisma.verificationNonce.update({ where: { id: storedNonce.id }, data: { usedAt: new Date() } })`
   - Alur challenge di portal (`app/ijazah/[id]/page.tsx:338, 404`) bergantung pada API `POST /api/verify/challenge`. Jika DB mati, permintaan nonce gagal (HTTP 500), sehingga verifikasi tanda tangan dompet via portal lumpuh total.
   - Mode challenge mandiri (*stateless*) **belum ada di kode portal**; yang ada saat ini hanya logika verifikasi Ed25519 offline di `lib/challenge.ts:194` (`nacl.sign.detached.verify`).
5. **Inspeksi On-Chain (`lib/onchain.ts`)**:
   - `lib/onchain.ts:155–238`: Fungsi `inspectCertificate(mintAddress, customRpcUrl)` membaca aset langsung dari Solana via Metaplex Core `fetchAsset` (`lib/onchain.ts:167`) dan metadata JSON via Pinata IPFS gateway (`lib/onchain.ts:210`).
   - `lib/onchain.ts:105–141`: Fungsi `isFrozen(asset)` membaca plugin `PermanentFreezeDelegate` (bukan field tingkat atas `asset.ownership.frozen`).
   - Modul `lib/verification.ts` **tidak ada di repositori**; fungsi inspeksi rantai berada di `lib/onchain.ts`.
6. **Perilaku Rendering Visual (Satori & React)**:
   - Komponen `<CertificateUI />` (`components/certificate-ui.tsx`) adalah komponen React DOM murni dengan *inline styling* untuk rendering di browser dan Satori.
   - Satori (`ImageResponse` dari `next/og`) pada `lib/certificate-image.tsx:15` dan `lib/pinata.ts:149` **hanya dijalankan di backend server pada saat penerbitan (mint) atau pencabutan (revoke)** untuk menghasilkan *image buffer* PNG yang diunggah ke IPFS.
   - Satori route `app/api/og/ijazah/[id]/route.tsx:34` membutuhkan Prisma DB (`app/api/og/ijazah/[id]/route.tsx:17`). Jika server mati, rute OG ini mati.
   - Satu-satunya representasi visual sertifikat yang bertahan saat server mati adalah file PNG statis yang telah tersimpan di IPFS (`image` pada metadata JSON IPFS), yang dapat diakses via gateway IPFS publik independen.

---

### 1.3 Jejak Kerja Prior Agent di `.agents/teamwork/` Terkait Offline & TC
1. **Cakupan Pengujian Sebelumnya**:
   - `scripts/benchmark/test-tc.ts:66` dan `scripts/benchmark/README.md:106` mengonfirmasi bahwa harness pengujian awal **hanya mencakup 14 test cases (TC-01 s.d. TC-14)**. TC-15 belum pernah dimasukkan ke dalam harness pengujian otomatis.
2. **Pengujian TC-12 (RPC / IPFS Outage)**:
   - `scripts/benchmark/test-tc.ts:730–757` menjalankan TC-12 dengan dead RPC (`http://127.0.0.1:19999`) dan blocked IPFS (`11111111111111111111111111111111`), memastikan sistem mengembalikan status `UNAVAILABLE` dan tidak pernah menyatakan ijazah valid saat infrastruktur rantai terganggu.
   - Hasil dicatat di `BAB4_PROGRESS.md:140` dan `Brief-Bab4-untuk-Gemini-2026-11-15.md:167`.
3. **Uji Langsung terhadap Direct Mint Address**:
   - Laporan auditor terdahulu di `.agents/teamwork/teamwork_challenger_p2_6_2/handoff.md:147, 159` mendokumentasikan stress test pemanggilan langsung mint address ke endpoint verifikasi:
     - `GET /api/verify?query=FDQKnrLV...` -> menghasilkan `HTTP 404 Not Found, {"error":"Wallet tidak ditemukan"}`.
     - Ini membuktikan secara empiris bahwa endpoint `/api/verify` memang DB-first dan tidak mengenali mint address.

---

## 2. Logic Chain

Dari fakta observasi di atas, disusun rantai logika sistematis untuk mengevaluasi rencana TC-15 dan tahapan F1–F3:

```
[Observasi 1.2.1, 1.2.4]
Query Prisma langsung di awal rute /api/verify, /api/certificate/[id], /api/verify/challenge
        │
        ▼ (Rantai Logika 1: Karakter Fail-Closed Sempurna)
Jika database PostgreSQL institusi mati, semua rute langsung melempar exception 
dan mengembalikan HTTP 500 / 404 tanpa mengeksekusi inspectCertificate()
        │
        ▼
Mendukung penuh Langkah 0 Brief §5: Portal terbukti Fail-Closed secara deterministik di kode.
Sistem tidak pernah mengembalikan "verified: true" saat Tier 1 mati.
```

```
[Observasi 1.1.4, 1.2.5]
Aset Pasangan 2 (FDQKnrLV...) tercatat on-chain di Metaplex Core dan metadata IPFS (QmPuym...)
        │
        ▼ (Rantai Logika 2: Kelayakan F1)
Pihak ketiga dapat menjalankan curl getAsset dan fetch IPFS dari sembarang terminal publik
        │
        ▼
F1 DAPAT DILAKSANAKAN SEPENUHNYA tanpa bergantung pada portal, database, maupun laptop lokal.
Hasil pembacaan: Token ada, authority = Bat5VTbj..., frozen = true, hash = sha256:56a51c...,
dan matematika Ed25519 offline (tweetnacl) terbukti memverifikasi penguasaan dompet.
```

```
[Observasi 1.2.1, 1.2.2, 1.2.3, 1.2.4]
Database SIJAGA menggunakan Neon Serverless Postgres (Remote Cloud, bukan Docker lokal)
        │
        ▼ (Rantai Logika 3: Risiko Operasional F2)
Instruksi F2 menyarankan "docker stop <db-container>". Karena SIJAGA menggunakan Neon cloud,
tidak ada container Docker lokal yang bisa dimatikan.
        │
        ▼
Mematikan DB remote atau merusak DATABASE_URL di .env.local berisiko merusak environment
dan melanggar batasan sistem. Sesuai klausul dispensasi Brief §5:127 dan Keputusan 13,
F2 WAJIB DILEWATI (SKIP F2) — keabsahan fail-closed cukup dibuktikan via Langkah 0 & audit kode A2.
```

```
[Observasi 1.1.1, 1.2.1, 1.2.5]
Metadata IPFS memuat Data Hash (SHA-256), tetapi salt (dataSalt) dan PII hanya ada di Tier 1
        │
        ▼ (Rantai Logika 4: Batas Tingkat 1 vs Tingkat 2)
Pemeriksa independen dapat memastikan hash on-chain utuh, namun tidak dapat mengomputasi ulang
hash dari nama/NIM tanpa dataSalt yang dipegang institusi.
        │
        ▼
Vonis TC-15 wajib berbunyi:
Tingkat 1: "DAPAT DIPERIKSA" (LULUS)
Tingkat 2: "TIDAK DAPAT DIPASTIKAN" (BUKAN "tidak valid").
```

---

## 3. Celah, Risiko, dan Kontradiksi yang Ditemukan

Berikut adalah inventarisasi lengkap mengenai celah (*gaps*), ambiguitas, risiko operasional, dan kontradiksi antara rencana di brief dengan implementasi aktual di codebase:

| No | Kategori | Temuan / Kontradiksi | Lokasi Bukti (`file_path:line`) | Dampak & Rekomendasi Aksi |
|---|---|---|---|---|
| **C-01** | **Ambiguitas Route Parameter** | Brief §6:211, 244 (B30) dan §9 Decision 12 menyebut "pakai ID P2.6 (FDQKnrLV...)" untuk screenshot halaman ijazah `app/ijazah/[id]`. Namun, parameter `[id]` pada `app/ijazah/[id]/page.tsx` adalah CUID database (`Certificate.id` = `cmw7pykyz0009ijxgm0zy8cg0`), **bukan mint address**. | `app/ijazah/[id]/page.tsx:442`<br>`app/api/certificate/[id]/route.ts:21`<br>`BAB4_PROGRESS.md:96, 98` | **RISIKO TINGGI (GAGAL PREVIEW)**: Membuka URL `/ijazah/FDQKnrLV...` akan menghasilkan 404 "Ijazah Tidak Ditemukan". Untuk screenshot, WAJIB menggunakan CUID record: `/ijazah/cmw7pykyz0009ijxgm0zy8cg0`. |
| **C-02** | **Celah Input `/api/verify`** | Rute `/api/verify` hanya menerima NIM atau wallet address. Jika mint address dimasukkan (`query=FDQKnrLV...`), rute menganggapnya sebagai wallet Solana, gagal menemukannya di `prisma.wallet`, dan mengembalikan 404 "Wallet tidak ditemukan". | `app/api/verify/route.ts:36, 50, 91`<br>`.agents/teamwork/teamwork_challenger_p2_6_2/handoff.md:147` | **KETERBATASAN ARSITEKTUR**: Portal tidak dapat memverifikasi ijazah hanya dari token mint address tanpa registrasi awal wallet mahasiswa di Tier 1. Ini memperkuat justifikasi bahwa rute `/api/verify` memang DB-first. |
| **C-03** | **Ketergantungan DB pada Challenge Portal** | Challenge UI di `app/ijazah/[id]/page.tsx` memanggil `/api/verify/challenge` yang membaca/menulis tabel `VerificationNonce` di PostgreSQL. Mode challenge *stateless* (offline tanpa DB) belum diimplementasikan di portal. | `app/ijazah/[id]/page.tsx:338, 404`<br>`lib/challenge.ts:53, 114, 212` | **BATASAN EKSEKUSI**: Pembuktian challenge tanpa DB saat ini HANYA dapat dilakukan via skrip mandiri Node.js (`/tmp/verify-stateless.mjs`), belum bisa melalui antarmuka web portal. |
| **C-04** | **Risiko Operasional Simulasi F2** | Instruksi F2 menyarankan menghentikan container Docker database (`docker stop`). Padahal arsitektur database SIJAGA adalah **Neon Serverless Postgres** (remote cloud). | `prisma/schema.prisma:9`<br>`.env.example:5`<br>`.agents/AGENTS.md:§4` | **REKOMENDASI KEPUTUSAN 13**: LEWATI F2 (SKIP). Jangan mematikan remote database atau merusak `.env.local`. Karakter fail-closed cukup dibuktikan dari Langkah 0 dan audit kode baris `app/api/verify/route.ts:50, 333`. |
| **C-05** | **Hardcoded Path pada Skrip Verifier** | Contoh skrip verifikasi offline `/tmp/verify-stateless.mjs` di brief memuat hardcoded path lingkungan audit lama: `/home/hatch/workspace/sijaga-bab4-check6/node_modules/...`. | `Brief-Bab4-untuk-Gemini-2026-11-15.md:98–99` | **ERROR PATH EKSEKUSI**: Jika dijalankan langsung di mesin saat ini (`/home/junnnnnnnn/Code/sijaga`), skrip akan crash dengan `ERR_MODULE_NOT_FOUND`. Harus disesuaikan menjadi import paket langsung `import nacl from "tweetnacl"` atau path lokal aktif. |
| **C-06** | **Ketergantungan DAS Indexer pada RPC** | Perintah `curl` Langkah 1 & 2 di brief memanggil `getAsset` dan `getAssetsByOwner` ke `https://api.devnet.solana.com`. Metode ini adalah standar DAS (*Digital Asset Standard*) yang membutuhkan RPC ber-indexer (seperti Helius). | `Brief-Bab4-untuk-Gemini-2026-11-15.md:73, 80`<br>`experiments/CHECKPOINT.json:48` | **OPERATIONAL CAVEAT**: Node publik standar Solana Devnet terkadang melempar `Method not found` (-32601) atau rate limit 429 untuk metode DAS. Bila terjadi, penguji harus mengarahkan endpoint ke RPC Helius Devnet (`https://devnet.helius-rpc.com`). |
| **C-07** | **Nuansa DAS: `ownership.frozen` vs Plugin** | Pada respons `getAsset`, field `ownership.frozen` bernilai `false`, sedangkan status beku aktual berada di `plugins.permanent_freeze_delegate.data.frozen: true`. | `Brief-Bab4-untuk-Gemini-2026-11-15.md:64, 77`<br>`lib/onchain.ts:111–115` | **VERIFIKASI LOGIKA**: Kode `lib/onchain.ts` sudah benar membaca plugin. Penguji manual tidak boleh terkecoh menyimpulkan aset "tidak beku" hanya karena melihat `ownership.frozen: false`. |
| **C-08** | **Ketiadaan Modul `lib/verification.ts`** | Pertanyaan panduan menanyakan implementasi `lib/verification.ts`. File tersebut tidak ada di repositori SIJAGA. | `lib/` directory listing | **KLARIFIKASI KODE**: Logika inspeksi on-chain berlokasi di `lib/onchain.ts` (`inspectCertificate`), hashing di `lib/crypto.ts`, dan endpoint verifikasi di `app/api/verify/route.ts`. |
| **C-09** | **Survival Rendering Visual saat Server Mati** | Komponen UI sertifikat `<CertificateUI />` tidak dapat dirender di browser saat server mati karena ketiadaan data JSON dari endpoint `/api/certificate/[id]`. | `app/ijazah/[id]/page.tsx:478–500`<br>`lib/certificate-image.tsx:15` | **DESAIN SISTEM**: Pihak ketiga yang memverifikasi saat server mati HANYA dapat melihat bukti visual dengan mengunduh file PNG pra-cetak dari IPFS (`content.json_uri` -> `image`). Portal SIJAGA tidak memiliki mekanisme rendering offline (seperti PWA service worker/cache). |

---

## 4. Caveats

1. **Investigasi Bersifat Read-Only**: Sesuai mandat *guardrails*, tidak ada panggilan jaringan (curl/RPC), dev server, background process, atau eksekusi perintah shell yang mengubah state sistem.
2. **Ketergantungan Data Lapangan n=30**: Angka benchmark n=30 (mint 28/30 sukses, verify median 7,489 dtk, revoke median 10,530 dtk) diterima sebagai data sakral yang tidak boleh diubah atau diuji ulang.
3. **Data Uji P2.6 adalah Data Fiktif**: Seluruh pengujian menggunakan identitas dummy ("Trace Test", NIM `TRACE414503`, wallet `FGpNtVV1...`, mint `FDQKnrLV...`) yang aman dari pelanggaran privasi data UU PDP.

---

## 5. Conclusion

1. **Kelayakan Eksekusi TC-15 (F1–F3)**:
   - **F1 (Eksekusi Mandiri Tanpa Laptop/DB)**: **100% FEASIBLE (SANGAT LAYAK)**. Pembuktian kriptografis on-chain (DAS `getAsset`, `getAssetsByOwner`), pembacaan IPFS hash, dan verifikasi tanda tangan offline Ed25519 dapat dieksekusi secara instan dari terminal mana pun tanpa memerlukan kredensial, `.env.local`, maupun akses database.
   - **F2 (Simulasi DB Mati di Localhost)**: **REKOMENDASI DILEWATI (SKIP F2)**. Karena SIJAGA menggunakan remote Neon Serverless Postgres, simulasi `docker stop` tidak dapat diterapkan. Ekspektasi fail-closed portal sudah terbukti tuntas secara deterministik melalui pembacaan kode rute `/api/verify` (baris 50 & 333) dan temuan audit TC-12 terdahulu.
   - **F3 (Checklist Bukti)**: Siap disusun ke dalam draf Bab 4 menggunakan data trace P2.6 terverifikasi.
2. **Vonis Akhir TC-15 untuk Bab 4**:
   - **Tingkat 1 (On-Chain & IPFS)**: **LULUS / DAPAT DIPERIKSA**. Token sah, diterbitkan institusi (authority `Bat5VTbj...`), beku non-transferable (plugin `PermanentFreezeDelegate`), dikuasai dompet yang sah (tanda tangan Ed25519 valid), dan memuat Data Hash otentik di IPFS.
   - **Tingkat 2 (Nominatif Identitas)**: **TIDAK DAPAT DIPASTIKAN** (bukan "tidak valid"). Rekonstruksi hash tidak dapat dilakukan pihak ketiga tanpa `dataSalt` yang tersimpan eksklusif di Tier 1 institusi.
3. **Rekomendasi Keputusan Terkait (§9)**:
   - **Keputusan 12 (Gambar Halaman Ijazah)**: Gunakan CUID record P2.6 (`cmw7pykyz0009ijxgm0zy8cg0`) pada URL `/ijazah/[id]`, **JANGAN gunakan mint address `FDQKnrLV...`** karena akan menghasilkan error 404.
   - **Keputusan 13 (Setup Database Lokal untuk F2)**: Konfirmasi bahwa database adalah Neon Serverless Postgres (remote cloud), sehingga pengujian F2 resmi **dilewati** sesuai ketentuan pengecualian di Brief §5:127.

---

## 6. Verification Method

Untuk memverifikasi secara independen setiap klaim dan temuan pada laporan ini:

1. **Verifikasi Fail-Closed pada Kode Rute `/api/verify`**:
   - Buka `app/api/verify/route.ts` baris 49–70 dan 333–338.
   - Perhatikan bahwa jika koneksi database gagal, eksekusi langsung lompat ke blok `catch` dan mengembalikan status 500 `{ error: "Terjadi kesalahan server" }` tanpa ada jalur yang memanggil `inspectCertificate`.
2. **Verifikasi Penolakan Mint Address pada `/api/verify`**:
   - Buka `app/api/verify/route.ts` baris 36–51.
   - Perhatikan bahwa query yang lolos regex Solana base58 hanya dicari di tabel `prisma.wallet`. Mint address tidak pernah disimpan di `prisma.wallet`, sehingga mengembalikan 404 `Wallet tidak ditemukan`.
   - Konfirmasi silang dengan catatan empiris pada `.agents/teamwork/teamwork_challenger_p2_6_2/handoff.md:147, 159`.
3. **Verifikasi CUID Parameter pada `/ijazah/[id]`**:
   - Buka `app/ijazah/[id]/page.tsx` baris 442 dan `app/api/certificate/[id]/route.ts` baris 21.
   - Perhatikan klausa `where: { id }` yang merujuk pada primary key CUID `Certificate.id` di `prisma/schema.prisma:90`, membuktikan bahwa mint address tidak akan cocok.
4. **Verifikasi Plugin Beku pada `lib/onchain.ts`**:
   - Buka `lib/onchain.ts` baris 105–141.
   - Perhatikan bahwa fungsi `isFrozen` memeriksa array `plugins` bertipe `PermanentFreezeDelegate`, selaras dengan spesifikasi respons DAS.
