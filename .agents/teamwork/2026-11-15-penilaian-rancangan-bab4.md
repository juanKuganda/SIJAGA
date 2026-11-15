# LAPORAN PENILAIAN KOMPREHENSIF RANCANGAN PENGUJIAN DAN PENULISAN BAB 4 SKRIPSI SIJAGA

**Nomor Dokumen:** `.agents/teamwork/2026-11-15-penilaian-rancangan-bab4.md`  
**Tanggal Evaluasi:** 15 November 2026  
**Dokumen Sasaran:** `Brief-Bab4-untuk-Gemini-2026-11-15.md`  
**Branch Baseline:** `feat/bab4-experiments` (commit `3fe64f0` baseline + batch audit `362b728`, `c9353fb`)  
**Penilai:** Orchestrator Tim Bab 4 (Konsolidasi Temuan Tim Explorer Area 1, Area 2, dan Area 3)  
**Metode Evaluasi:** Read-Only Code & Data Forensic Review (Murni inspeksi statis kode, log, dan artefak data tanpa menjalankan dev server, curl, RPC, atau mutasi berkas)

---

## 1. RINGKASAN EKSEKUTIF

Telah dilakukan penilaian komprehensif terhadap dokumen perancangan pengujian dan penulisan Bab 4 (`Brief-Bab4-untuk-Gemini-2026-11-15.md`) dengan mengonfrontasikannya secara langsung terhadap kode sumber branch `feat/bab4-experiments`, jejak audit di `.agents/teamwork/`, berkas pelacak `BAB4_PROGRESS.md`, serta data empiris mentah pada `experiments/CHECKPOINT.json` dan folder `experiments/`.

### 1.1 Status Integrasi Fakta Koreksi Baseline
Seluruh penilaian dalam laporan ini secara ketat mengintegrasikan fakta koreksi yang telah dikonfirmasi:
1. **Data Minting Riil 28/30 Berhasil (93,33%):** Ditemukan 2 trial gagal total (Trial 1 akibat *transient network fetch error* pada 2 attempt; Trial 28 akibat *block height exceeded* tanpa retry). String `"ALL_30_TRIALS_COMPLETED_SUCCESSFULLY"` pada `experiments/CHECKPOINT.json:78` terkonfirmasi misleading dan wajib diabaikan.
2. **Kondisi Perangkat Penguji:** Laptop Windows penguji telah selesai diperbaiki (*resolved*), sehingga Keputusan No. 14 pada §9 dinyatakan tuntas.
3. **Keputusan §9 Tersisa 7 Butir:** Hanya butir No. 9, 12, 13, 16, 17, 18, dan 19 yang memerlukan penetapan akhir.
4. **Biaya Minting On-Chain Riil 0,0032626 SOL:** Terdiri dari 10.000 lamport base signature fee (2 signer) + 3.252.600 lamport deposit sewa (*rent-exemption*) Metaplex Core + plugin PermanentFreezeDelegate.
5. **Formula Kriptografi Hash:** Terbukti menggunakan 3 atribut identitas nominatif (`nama.trim()`, `nim.toUpperCase()`, `prodi`) ditambah 128-bit random salt (`lib/crypto.ts:16`). Atribut "Nomor Ijazah" dan "Tahun Lulus" tidak disertakan dalam formula hash.

### 1.2 Vonis Umum Rancangan Brief
Secara garis besar, perancangan Bab 4 pada `Brief-Bab4-untuk-Gemini-2026-11-15.md` memiliki **kematangan konseptual dan integritas metodologis yang sangat tinggi** (khususnya penolakan manipulasi data, pelaporan 28/30 secara transparan, penerimaan kegagalan K3/K4, dan vonis "LAYAK BERSYARAT"). Namun demikian, telaah kode dan data forensik menemukan **1 kesalahan komputasi matematis fatal (faktor 1.000x)**, **2 kontradiksi arsitektur kritis pada rute verifikasi**, serta **sejumlah celah eksekusi** yang wajib disesuaikan sebelum pengujian akhir atau penulisan naskah skripsi dilakukan.

---

## 2. TELAAH JEJAK KERJA & KONTEKS EKSPERIMEN (R1)

Pemeriksaan terhadap jejak kerja terdahulu di `.agents/teamwork/`, `BAB4_PROGRESS.md`, dan riwayat commit git menghasilkan temuan kontekstual berikut:

1. **Jejak Implementasi Terakhir (`feat/bab4-experiments`):**
   - Pada 8 November 2026, telah diselesaikan implementasi fitur UI "Buktikan Kepemilikan" di `app/ijazah/[id]/page.tsx:630-997` (commit `362b728`, `c9353fb`, `d72f323`, `5d3ee5c`).
   - Fitur ini diaudit secara independen oleh `auditor_1`, `reviewer_r1`, `reviewer_r2`, dan `reviewer_r3`, yang menyatakan seluruh guardrail dan verifikasi kompilasi (`npm run build`, `npm run lint`) **PASS 100%**.
   - Fitur tersebut mengimplementasikan challenge kepemilikan *stateful* via endpoint `POST /api/verify/challenge` dengan pencatatan nonce di tabel database PostgreSQL `VerificationNonce` (`lib/challenge.ts:53, 114, 212`).
2. **Karakteristik Black-Box Test Cases (TC-01 s.d. TC-14):**
   - Skrip harness `scripts/benchmark/test-tc.ts:66` dirancang untuk menguji 14 skenario ancaman keamanan dan privasi.
   - Hasil eksekusi pada `experiments/2026-11-08/test-tc-output.log` menunjukkan ke-14 skenario lulus 100%:
     - TC-02, TC-03, TC-04 ditolak on-chain dengan error `Invalid Authority`.
     - TC-13 (uji unauthorized thaw) ditolak on-chain dengan error spesifik: `Neither the asset or any plugins have approved this operation` (koreksi terhadap klaim draf lama yang menyamakan dengan `Invalid Authority`).
     - TC-10 dan TC-11 membuktikan kepatuhan UU PDP: metadata IPFS bersih dari PII, dan penghapusan data nominatif di database lokal (`app/api/admin/delete-pii/route.ts:122`) mengosongkan `dataSalt` menjadi `null`, sehingga pemulihan hash mustahil dilakukan.
   - Kasus uji **TC-15 belum pernah dimasukkan ke dalam harness pengujian otomatis** dan berstatus "BELUM DIEKSEKUSI" (`Brief-Bab4-untuk-Gemini-2026-11-15.md:153`).
3. **Kondisi Basis Data:**
   - Konfigurasi `prisma/schema.prisma:9` dan file lingkungan `.env.example:5` membuktikan bahwa SIJAGA menggunakan **Neon Serverless Postgres** (remote database di cloud), bukan instance PostgreSQL lokal atau kontainer Docker.

---

## 3. PENILAIAN TIGA AREA KUNCI RANCANGAN BAB 4 (R2)

### 3.1 AREA 1: Rencana Eksekusi Uji Server Institusi Mati (TC-15, F1–F3)

#### A. Analisis Spesifikasi & Kesesuaian Alur Kode
Kasus uji TC-15 dirancang untuk membuktikan ketahanan sistem ketika server institusi lumpuh: apakah pihak ketiga tetap dapat memverifikasi keabsahan ijazah secara independen langsung ke Solana RPC dan IPFS?

Inspeksi kode sumber terhadap alur verifikasi saat ini mengungkapkan:
1. **Endpoint Verifikasi Publik 100% DB-First (`app/api/verify/route.ts`):**
   - Pada baris 50 & 72, rute langsung mengeksekusi query Prisma: `prisma.wallet.findUnique` atau `prisma.user.findUnique`.
   - Pada baris 333–338, jika database PostgreSQL tidak dapat dihubungi, Prisma melempar error koneksi yang ditangkap blok `catch`, mengembalikan HTTP 500 `{ "error": "Terjadi kesalahan server" }`.
   - **Tidak ada mekanisme fallback:** Rute ini tidak memiliki alur percabangan (*fallback branch*) ke Solana RPC maupun IPFS jika basis data gagal.
   - Kode ini mengonfirmasi temuan Langkah 0 pada Brief: portal beroperasi secara **fail-closed** (aman dari celah fail-open, namun lumpuh total saat DB mati).
2. **Ketiadaan Modul `lib/verification.ts`:**
   - Dokumen perancangan beberapa kali merujuk pada `lib/verification.ts`. Modul ini **tidak ada di repositori**.
   - Seluruh logika inspeksi rantai berada di `lib/onchain.ts:155` (`inspectCertificate`), kalkulasi hash di `lib/crypto.ts`, dan mekanisme challenge di `lib/challenge.ts`.
3. **Perilaku Rendering Visual (Satori & React DOM):**
   - Komponen `<CertificateUI />` (`components/certificate-ui.tsx`) adalah komponen React murni.
   - Halaman pratinjau `app/ijazah/[id]/page.tsx:442` memanggil `GET /api/certificate/[id]`. Jika server/DB mati, fetch gagal (`app/ijazah/[id]/page.tsx:478-500`) dan halaman menampilkan "Ijazah Tidak Ditemukan", tanpa pernah merender visual sertifikat.
   - Generator Satori (`ImageResponse` di `lib/certificate-image.tsx:15` dan `app/api/og/ijazah/[id]/route.tsx:34`) juga membutuhkan Prisma DB.
   - **Kesimpulan Visual:** Satu-satunya representasi visual sertifikat yang bertahan saat server institusi mati adalah **file PNG pra-cetak di IPFS** (`image` pada metadata JSON IPFS yang diunggah saat minting).

#### B. Evaluasi Kelayakan Tahapan F1, F2, dan F3
1. **F1 (Eksekusi Mandiri Tanpa Laptop/DB): 100% LAYAK & VALID.**
   - Perintah pembuktian mandiri Langkah 1 (DAS `getAsset`), Langkah 2 (DAS `getAssetsByOwner`), Langkah 3 (Fetch IPFS Data Hash), dan Langkah 4 (Stateless challenge Ed25519 via tweetnacl) dapat dieksekusi secara instan dari terminal mana pun di dunia menggunakan RPC publik Solana dan Gateway IPFS publik Pinata/Cloudflare.
   - Memenuhi pembuktian Tingkat 1 secara independen.
2. **F2 (Simulasi DB Mati di Localhost): REKOMENDASI DILEWATI (SKIP F2).**
   - Instruksi F2 di Brief menyarankan penghentian kontainer Docker database (`docker stop <container>`).
   - Karena SIJAGA menggunakan **Neon Serverless Postgres** di cloud (`prisma/schema.prisma:9`), tidak ada kontainer database lokal yang dapat dimatikan.
   - Mematikan atau merusak konfigurasi database cloud remote berisiko merusak integritas lingkungan pengembangan.
   - Perilaku *fail-closed* portal (mengembalikan HTTP 500/404) telah terbukti tuntas 100% secara deterministik dari audit kode statis (`app/api/verify/route.ts:50, 333-338`) dan data pengujian TC-12 terdahulu. Sesuai klausul dispensasi Brief §5:127 dan Keputusan 13, tahap F2 wajib dilewati.
3. **F3 (Checklist Bukti): SIAP DITERAPKAN.**
   - Siap dipetakan ke Bab 4 dengan vonis:
     - **Tingkat 1 (On-Chain & IPFS):** "DAPAT DIPERIKSA" (LULUS).
     - **Tingkat 2 (Nominatif Identitas):** "TIDAK DAPAT DIPASTIKAN" (BUKAN "tidak valid").

#### C. Inventarisasi Celah dan Risiko Area 1
- **[C-01] Ambiguitas Parameter Rute `/ijazah/[id]` (Risiko Tinggi - Gagal Pratinjau):**
  Brief §6:211, 244 dan Keputusan No. 12 menyebut "pakai ID P2.6 (`FDQKnrLV...`)" untuk tangkapan layar `app/ijazah/[id]`. Namun, parameter `[id]` pada `app/ijazah/[id]/page.tsx:442` diteruskan ke `app/api/certificate/[id]/route.ts:21` yang melakukan query CUID database `prisma.certificate.findUnique({ where: { id } })`, **bukan alamat mint Solana**. Membuka `/ijazah/FDQKnrLV...` akan menghasilkan HTTP 404! Untuk tangkapan layar, wajib menggunakan CUID record P2.6: `/ijazah/cmw7pykyz0009ijxgm0zy8cg0`.
- **[C-02] Endpoint `/api/verify` Menolak Mint Address:**
  Pada `app/api/verify/route.ts:36-51`, parameter query base58 Solana hanya dicari ke tabel `prisma.wallet`. Jika mint address dimasukkan, query mengembalikan `null` dan endpoint merespons HTTP 404 `{ "error": "Wallet tidak ditemukan" }` (`teamwork_challenger_p2_6_2/handoff.md:147`).
- **[C-03] Challenge Portal Ketergantungan DB:**
  Tombol "Buktikan Kepemilikan" di portal bergantung pada API `/api/verify/challenge` dan tabel `VerificationNonce`. Mode stateless challenge belum ada di kode portal web; pembuktian challenge tanpa DB saat ini hanya ada di skrip terminal Node.js.
- **[C-04] Hardcoded Path Lingkungan Audit Lama di Brief:**
  Contoh skrip `/tmp/verify-stateless.mjs` pada `Brief-Bab4-untuk-Gemini-2026-11-15.md:98-99` memuat path hardcoded lingkungan lama: `/home/hatch/workspace/sijaga-bab4-check6/node_modules/...`. Jika dijalankan di mesin aktif saat ini (`/home/junnnnnnnn/Code/sijaga`), skrip akan mengalami crash `ERR_MODULE_NOT_FOUND`.
- **[C-05] Ketergantungan Metode DAS pada Indeks RPC:**
  Metode `getAsset` dan `getAssetsByOwner` pada Langkah 1 & 2 memerlukan RPC Solana ber-indexer DAS (seperti Helius). Node publik standar `api.devnet.solana.com` terkadang mengembalikan error `-32601 Method not found` atau rate limit 429. Pengujian manual wajib menggunakan RPC Helius Devnet (`https://devnet.helius-rpc.com`).

---

### 3.2 AREA 2: Rencana Implementasi Jalur Verifikasi Tingkat-1 di Portal (Prompt iii)

#### A. Evaluasi Rencana Prompt iii terhadap Arsitektur Codebase
Prompt iii (Lampiran B baris 348–386) mengusulkan pembangunan jalur verifikasi Tingkat-1 pada portal web dengan membuat mode *stateless challenge* pada seksi "Buktikan Kepemilikan" di `app/ijazah/[id]/page.tsx:630-750` serta endpoint baru `/api/verify/tingkat-1`.

Evaluasi kode forensik mendeteksi **3 kontradiksi arsitektur dan hambatan implementasi yang serius**:

1. **Kontradiksi Lokasi: Terblokir Pengecekan Awal di `app/ijazah/[id]/page.tsx`:**
   - Halaman `app/ijazah/[id]/page.tsx` dirancang sebagai halaman pratinjau CUID internal institusi.
   - Pada baris 442, halaman memanggil `GET /api/certificate/[id]`.
   - Pada baris 478–500, jika query DB melempar error (DB mati) atau sertifikat tidak ditemukan (pengguna memasukkan mint address Solana alih-alih CUID), halaman langsung mencegat eksekusi dan merender layar error:
     ```tsx
     <h1 className="text-2xl font-bold text-foreground mb-2">Ijazah Tidak Ditemukan</h1>
     <p className="text-muted-foreground mb-8">{error || "Data ijazah tidak tersedia atau belum diterbitkan."}</p>
     ```
   - Akibatnya, seluruh seksi di bawahnya (termasuk baris 630–750 tempat rencana integrasi Tingkat-1) **TIDAK PERNAH DIRENDER SAMA SEKALI**. Menempatkan logika verifikasi mandiri di dalam komponen yang di-guard oleh query DB-first adalah kesalahan struktural.
2. **Benturan dengan Fitur Challenge Stateful yang Baru Selesai Diaudit:**
   - Seksi `app/ijazah/[id]/page.tsx:630-997` baru saja diselesaikan pada commit `362b728` sebagai challenge *stateful* resmi yang terikat ke basis data untuk mencegah *replay attack* (`prisma.verificationNonce`).
   - Prompt iii menyatakan di baris 383: *"YANG TIDAK BOLEH DIUBAH: perilaku /api/verify dan /api/verify/challenge yang sekarang"*. Namun, memodifikasi baris 630–750 menjadi stateless secara in-place akan merusak atau menimpa alur verifikasi stateful yang telah diaudit.
   - Selain itu, pada baris 402, verifikasi stateful membutuhkan referensi `expectedOwner: cert.walletAddress`. Jika database mati, objek `cert` tidak ada, sehingga kode tidak mengetahui alamat dompet yang berhak menandatangani pesan kecuali memanggil `inspectCertificate` on-chain.
3. **Ketidaklengkapan Parser Metadata On-Chain (`lib/onchain.ts`):**
   - Fungsi `inspectCertificate` (`lib/onchain.ts:188-230`) saat ini hanya mengembalikan: `owner`, `name`, `uri`, `frozen`, `dataHash`, `updateAuthority`, dan `timings`.
   - Fungsi tersebut belum mengekstrak atribut IPFS seperti `Program Studi` dan `Tahun Lulus`.
   - Jika endpoint `/api/verify/tingkat-1` hanya mengandalkan `inspectCertificate` yang ada, antarmuka sertifikat `<CertificateUI>` (`components/certificate-ui.tsx:3-9`) tidak memiliki data untuk merender Program Studi dan Tahun Lulus dalam mode tanpa DB.

#### B. Analisis Kriptografi, Privasi, dan Batasan UU PDP
1. **Formula Hash 3 Atribut + Salt Terverifikasi (`lib/crypto.ts:16`):**
   ```typescript
   const raw = `${nama.trim()}|${nim.toUpperCase()}|${prodi}|${salt}`;
   const hash = crypto.createHash('sha256').update(raw).digest('hex');
   ```
   Atribut "Nomor Ijazah" dan "Tahun Lulus" terbukti **tidak masuk** ke dalam formula hash.
2. **Implikasi Hukum UU PDP (Right to Erasure):**
   - Saat hak penghapusan data diterapkan (`app/api/admin/delete-pii/route.ts:122`), sistem mengosongkan salt: `prisma.certificate.updateMany({ data: { dataSalt: null } })`.
   - Salt 128-bit berkarakter heksadesimal acak dan **hanya disimpan di basis data Tier 1**; salt tidak pernah diunggah ke IPFS publik (dibuktikan oleh TC-10).
   - Tanpa salt institusi, **hitung-ulang hash secara matematis mustahil dilakukan**.
   - Penegasan Brief baris 370–372 bahwa Tingkat-1 HANYA memverifikasi keabsahan aset on-chain dan **TIDAK DAPAT MEMASTIKAN identitas nominatif** (Tingkat-2 tidak dapat dipastikan, bukan tidak valid) adalah **100% tepat secara kriptografi dan hukum**.

#### C. Rekomendasi Arsitektur untuk Eksekusi Prompt iii
Bila pengembang akan mengeksekusi Prompt iii pasca penilaian ini, disarankan:
1. **Jangan Mengubah `app/ijazah/[id]/page.tsx` Secara Destruktif:** Pertahankan seksi yang ada sebagai jalur pratinjau resmi saat DB aktif.
2. **Sediakan Halaman/Jalur Pencarian Khusus On-Chain:**
   - Tambahkan tab "Verifikasi On-Chain Mandiri (Alamat Mint)" di `app/page.tsx`, ATAU
   - Buat rute baru `app/verify-onchain/page.tsx` yang menerima parameter alamat mint Solana, memanggil `/api/verify/tingkat-1?asset=<mint>`, dan mengambil `expectedOwner` langsung dari hasil `inspectCertificate(mintAddress).owner`.
3. **Perkaya Ekstraksi Metadata di `lib/onchain.ts`:** Tambahkan pembacaan atribut `prodi` dan `tahunLulus` dari JSON IPFS agar tampilan sertifikat visual tetap utuh saat mode offline DB.

---

### 3.3 AREA 3: Rencana Penulisan Bab 4 dari Angka Final n=30

#### A. Integritas Data Eksperimen n=30 vs Realita Empiris
Pemeriksaan silang terhadap `experiments/CHECKPOINT.json`, `experiments/2026-11-07/`, dan `experiments/2026-11-08/` menghasilkan kepastian angka berikut:
1. **Keberhasilan Minting Riil adalah 28/30 (93,33%):**
   - Klaim pada `experiments/CHECKPOINT.json:78` (`"experimentStatus": "ALL_30_TRIALS_COMPLETED_SUCCESSFULLY..."`) dan baris 72 (`"Mint: 7/7 (Trials 24..30)"`) adalah **misleading dan tidak valid**.
   - Terbukti terdapat **2 trial gagal total**:
     - **Trial Gagal #1 (Batch 4, 7 Nov 2026):** Tercatat di `summary-mint.csv:6-7` dan `run-mint.jsonl` baris 4–5. Gagal pada Attempt 1 dan Attempt 2 akibat `TypeError: fetch failed` (gangguan koneksi RPC).
     - **Trial Gagal #2 (Batch 3, 8 Nov 2026):** Tercatat di `summary-mint.csv:22` dan `run-mint.jsonl` baris 22. Gagal pada Attempt 1 dengan error `Signature ... has expired: block height exceeded` setelah elapsed 43,328 detik. Trial ini tidak di-retry karena classifier `isNetworkError` di `scripts/benchmark/common.ts:281` belum mengenali string error tersebut.
2. **Integritas Akademik Brief:**
   - Sikap Brief pada baris 147, 150, dan 263 yang menolak klaim sukses 30/30, secara jujur memaparkan kegagalan 2 trial, menyatakan K3 **TIDAK LOLOS**, dan mengadopsi vonis **"LAYAK BERSYARAT"** adalah keputusan metodologis yang **sangat tepat dan bermartabat secara akademik**.
   - *Peringatan:* Di Bab 4, narasi spekulatif bahwa *"keberhasilan bisa menjadi 29/30 jika di-retry"* HANYA boleh disajikan sebagai analisis penyebab teknis dan rekomendasi mitigasi deployment. Angka resmi performa sistem SIJAGA pada naskah skripsi **wajib tetap tertulis 93,3% (28/30)**.

#### B. TEMUAN FATAL: Kesalahan Perhitungan Total Biaya Revoke (Faktor 1.000x)
Pada baris 180 dokumen panduan (`Brief-Bab4-untuk-Gemini-2026-11-15.md:180`) tertulis:
> `"(3) biaya revoke TIDAK termasuk proyeksi penerbitan (revoke = 5.000 lamport/trial × 30 = 0,15 SOL total — catat terpisah bila disebut);"`

**Verifikasi Matematis dan Data Empiris On-Chain:**
- 1 SOL = $1.000.000.000$ lamport ($10^9$ lamport).
- Biaya transaksi revoke per trial terukur di `summary-revoke.csv:2-31` adalah tepat $5.000$ lamport ($0,000005\text{ SOL}$).
- Total komputasi untuk 30 trial:
  $$5.000\text{ lamport} \times 30 = 150.000\text{ lamport}$$
- Konversi ke satuan SOL:
  $$\frac{150.000}{1.000.000.000} = \mathbf{0,00015\text{ SOL}}$$
- **Dampak Temuan:** Teks di brief mengalami **kesalahan aritmatika fatal sebesar 1.000 kali lipat** ($0,15\text{ SOL} = 150.000.000\text{ lamport}$). Angka $0,15\text{ SOL}$ ini **WAJIB DIKOREKSI MENJADI $0,00015\text{ SOL}$** pada draf Bab 4 dan artikel SYNTIA agar tidak menjadi bahan guguran penguji skripsi.

#### C. Dekomposisi Biaya Minting 0,0032626 SOL & Sunk Cost Sewa State
Struktur biaya penerbitan ijazah di Solana (`lib/metaplex.ts:203-218`, `bench-mint.ts:120-134`) terdiri dari:
1. **Base Transaction Fee:** $10.000\text{ lamport}$ ($0,0000100\text{ SOL}$) untuk 2 signature (Admin Authority + Mint Signer, masing-masing $5.000\text{ lamport}$).
2. **Rent-Exemption State Account:** $3.252.600\text{ lamport}$ ($0,0032526\text{ SOL}$) untuk alokasi akun Metaplex Core dan plugin PermanentFreezeDelegate.
3. **Total Penerbitan:** $10.000 + 3.252.600 = 3.262.600\text{ lamport} = \mathbf{0,0032626\text{ SOL}}$.

**Sifat Rent Sunk Cost:**
Dalam Solana, deposit sewa akun dapat ditarik kembali jika akun dibakar (*burn*). Namun, karena SIJAGA mengadopsi mekanisme **Visual Revocation** tanpa membakar token (`lib/metaplex.ts:275-315`, `isMutable: true`, `burn: false`), akun token ijazah berstatus DIBATALKAN tetap menempati state ledger selamanya. Bagi institusi, deposit sewa ini merupakan **sunk cost permanen**, bukan agunan yang dapat ditarik kembali. Penjelasan ini wajib dicantumkan dalam Bab 4.

**Biaya Transaksi Gagal:**
Pada receipt transaksi gagal di `summary-mint.csv`, kolom `feeLamports` tercatat *null/0*. Pada Trial 1 (koneksi terputus sebelum validator) dan Trial 28 (transaksi kedaluwarsa sebelum dimasukkan ke dalam blok), tidak ada pemotongan saldo dari fee-payer. Draf artikel SYNTIA para 74 yang mengklaim transaksi gagal tetap berbayar wajib diselaraskan dengan para 81 (fee = 0).

#### D. Metrik Latensi Empiris Lengkap ($n=30$)
Hasil komputasi statistik langsung terhadap berkas log transaksi (menggunakan skrip verifikasi Python independen `calculate_stats.py`) disajikan pada tabel berikut:

| Operasi | Sampel | Min (s) | Mean (s) | Median Standar (s) | p95 (s) | Max (s) | Standar Deviasi (s) | Catatan Khusus |
|---|---|---|---|---|---|---|---|---|
| **Minting** | $n=28$ | 9,586 | 15,887 | **13,5735** | 33,542 | 40,630 | 7,748 | Sesuai Brief (`13,573 s`). On-chain mean 6,011 s, IPFS mean 8,641 s. |
| **Verifikasi** | $n=30$ | 4,898 | 8,327 | **7,4895** | 16,293 | 19,161 | 3,189 | Sesuai Brief (`7,489 s`). **Hanya 2 dari 30 trial (6,67%)** memenuhi ambang K4 ($\le 5,0\text{ s}$). |
| **Pencabutan** | $n=30$ | 9,376 | 13,174 | **10,5305** | 17,987 | 75,161 | 11,864 | Sesuai Brief (`10,530 s`). Outlier Trial 27 diakibatkan IPFS Pinata (70,632 s). |

*Catatan Asimetri Pencatatan Verify:* Rincian latensi per-hop verifikasi hanya tercatat untuk 21 trial terakhir (Trial 10–30) pada `summary-verify.csv`, tidak ada di `run-verify.jsonl`. Bab 4 harus transparan mencantumkan $n=21$ untuk analisis hop verifikasi.

#### E. Evaluasi dan Penetapan 7 Keputusan Tersisa di §9
Dengan selesainya perbaikan laptop penguji (Keputusan No. 14 tuntas), rekomendasi penetapan untuk 7 butir tersisa adalah:

1. **Keputusan No. 9 (Sumber Kurs SOL \$87,76 & Rp18.094 per 9 Nov pagi):**  
   Wajib mencantumkan bursa/situs rujukan resmi (contoh: CoinGecko API atau Binance Spot UTC) beserta stempel waktunya. Angka fiat USD/IDR ditempatkan sebagai estimasi indikatif, sedangkan angka 0,0032626 SOL tetap menjadi data primer.
2. **Keputusan No. 12 (Gambar Halaman Ijazah Bab 4: P2.6 vs TC-09):**  
   **PILIH ASET P2.6** (`FDQKnrLV...`, `TRACE414503`, CUID `cmw7pykyz0009ijxgm0zy8cg0`). P2.6 memiliki jejak demonstrasi end-to-end yang bersih dan terverifikasi penuh di DB. Jangan gunakan TC-09 karena TC-09 adalah aset reissue dengan induk yang telah dicabut.
3. **Keputusan No. 13 (Setup Database Lokal untuk F2):**  
   **TETAPKAN: LEWATI F2 (SKIP).** Database adalah Neon Postgres di cloud. Simulasi fail-closed sudah terbukti mutlak dari kode rute `/api/verify:50, 333` dan uji TC-12.
4. **Keputusan No. 16 (Perbandingan Ethereum di Bab 4: Uji Sepolia vs Literatur):**  
   **TETAPKAN: PERBANDINGAN LITERATUR** (mengutip Alizadeh & Khabbazian, 2025). Membangun smart contract Solidity di Sepolia merupakan *scope creep* masif di luar batas waktu penelitian skripsi.
5. **Keputusan No. 17 (Pencatatan Biaya On-Chain Trial 28):**  
   **TETAPKAN: CATAT FEE NULL/0 LAMPORT**. Selaras dengan receipt transaksi dan mekanisme kedaluwarsa blockhash Solana. Selaraskan artikel SYNTIA para 81 dan hapus klaim para 74.
6. **Keputusan No. 18 (Klaim "Build 42 Rute"):**  
   **TETAPKAN: HAPUS KLAIM "42 RUTE"**. Tidak ada file log artefak build 42 rute di repositori. Ganti dengan klaim faktual: "Build produksi Next.js terkompilasi bersih tanpa error (exit code 0)".
7. **Keputusan No. 19 (Versi Ekstensi Phantom Wallet saat Eksperimen 7–8 Nov):**  
   **TETAPKAN: TEGASKAN PENGUJIAN PROGRAMMATIC (HEADLESS).** Eksperimen n=30 dijalankan secara headless via UMI SDK tanpa ekstensi browser Phantom (`experiments/2026-11-08/run-metadata.json`). Versi ekstensi Phantom hanya relevan untuk pengujian manual interaksi pengguna di laptop penguji.

---

## 4. MATRIKS KONSOLIDASI CELAH, RISIKO, DAN REKOMENDASI TINDAKAN

Berikut adalah ringkasan inventarisasi seluruh temuan ketidaksesuaian antara rancangan pada Brief dengan implementasi kode/data di repositori:

| ID | Area Kajian | Lokasi Bukti (`file_path:line`) | Deskripsi Masalah / Kontradiksi | Dampak & Risiko | Rekomendasi Tindakan |
|---|---|---|---|---|---|
| **E-01** | Area 3 (Biaya) | `Brief-Bab4-untuk-Gemini-2026-11-15.md:180`<br>`experiments/2026-11-08/summary-revoke.csv:2-31` | Kesalahan perhitungan 1.000x: $5.000\text{ lamport} \times 30$ ditulis `0,15 SOL`. | **FATAL (Integritas Akademik):** Menjadi bahan guguran penguji jika lolos ke Bab 4. | Koreksi menjadi **0,00015 SOL** ($150.000\text{ lamport}$). |
| **E-02** | Area 1 & 2 (URL) | `Brief-Bab4-untuk-Gemini-2026-11-15.md:211, 244`<br>`app/ijazah/[id]/page.tsx:442`<br>`app/api/certificate/[id]/route.ts:21` | Brief menyarankan URL `/ijazah/FDQKnrLV...` (mint address), padahal rute hanya menerima CUID database. | **TINGGI:** Membuka URL mint address menghasilkan HTTP 404 "Ijazah Tidak Ditemukan". | Gunakan CUID record P2.6 untuk tangkapan layar: `/ijazah/cmw7pykyz0009ijxgm0zy8cg0`. |
| **E-03** | Area 2 (Integrasi) | `Brief-Bab4-untuk-Gemini-2026-11-15.md:373`<br>`app/ijazah/[id]/page.tsx:478-500` | Prompt iii merancang verifikasi mandiri di baris 630–750 `app/ijazah/[id]`, padahal halaman terblokir error screen di baris 478 jika DB mati / mint address dimasukkan. | **TINGGI:** Kode verifikasi mandiri tidak pernah dieksekusi saat skenario offline DB. | Sediakan rute/tab mandiri (misal: `app/verify-onchain/page.tsx` atau tab di `app/page.tsx`). |
| **E-04** | Area 1 (Database) | `Brief-Bab4-untuk-Gemini-2026-11-15.md:127`<br>`prisma/schema.prisma:9`<br>`.env.example:5` | F2 menyarankan `docker stop`, padahal basis data adalah Neon PostgreSQL di cloud remote. | **SEDANG:** Mematikan database cloud remote berisiko merusak environment aktif. | Tetapkan Keputusan No. 13: Lewati pengujian F2 (SKIP F2). |
| **E-05** | Area 1 (Path) | `Brief-Bab4-untuk-Gemini-2026-11-15.md:98-99` | Skrip `/tmp/verify-stateless.mjs` di brief memuat hardcoded path audit lama `/home/hatch/...`. | **SEDANG:** Crash `ERR_MODULE_NOT_FOUND` saat dieksekusi di mesin saat ini. | Ubah impor paket menjadi impor lokal dari repositori aktif. |
| **E-06** | Area 2 (Metadata) | `lib/onchain.ts:19-32, 188-230`<br>`components/certificate-ui.tsx:3-9` | `inspectCertificate` belum mengekstrak atribut `prodi` dan `tahunLulus` dari IPFS JSON. | **SEDANG:** Komponen visual sertifikat tidak dapat dirender utuh dalam mode on-chain mandiri. | Perkaya parser metadata IPFS di `lib/onchain.ts` jika Prompt iii dieksekusi. |
| **E-07** | Area 3 (CHECKPOINT) | `experiments/CHECKPOINT.json:78` | String `"ALL_30_TRIALS_COMPLETED_SUCCESSFULLY"` bertentangan dengan 2 trial gagal riil. | **SEDANG:** Risiko ketidakjujuran akademik jika dikutip mentah-mentah. | Abaikan string tersebut; laporkan 28/30 sukses (93,3%) secara transparan. |
| **E-08** | Area 3 (SYNTIA) | Draf artikel SYNTIA para 74 vs para 81 | Kontradiksi klaim: para 74 mengklaim tx gagal memotong saldo, para 81 mencatat fee null/0. | **SEDANG:** Inkonsistensi narasi artikel ilmiah. | Hapus klaim para 74; tegaskan aturan blockhash Solana bahwa tx uncommitted berbiaya 0. |
| **E-09** | Area 1 (Modul) | Permintaan panduan / dispatch prompt | Merujuk pada file `lib/verification.ts` yang tidak pernah ada di codebase. | **RENDAH (Klarifikasi):** Membingungkan agen/pengembang. | Pastikan rujukan kode diarahkan ke `lib/onchain.ts` dan `lib/crypto.ts`. |

---

## 5. REKOMENDASI ROADMAP UNTUK PENULIS (JUAN)

Berdasarkan seluruh hasil audit dan analisis di atas, berikut adalah langkah konkret yang disarankan untuk dilakukan oleh Juan:

### Langkah 1: Finalisasi 7 Keputusan §9 pada Dokumen Brief
Perbarui `Brief-Bab4-untuk-Gemini-2026-11-15.md` untuk mengunci 7 keputusan tersisa sesuai rekomendasi pada Subbab 3.3.E di atas:
- Kunci Keputusan 9 (cantumkan bursa rujukan kurs SOL).
- Kunci Keputusan 12 (gunakan ID record P2.6 `cmw7pykyz0009ijxgm0zy8cg0`).
- Kunci Keputusan 13 (resmikan lewati F2 karena DB remote Neon).
- Kunci Keputusan 16 (pertahankan komparasi literatur Ethereum).
- Kunci Keputusan 17 (laporkan fee null pada Trial 28).
- Kunci Keputusan 18 (hapus frasa "42 rute").
- Kunci Keputusan 19 (tegaskan benchmark n=30 bersifat headless UMI).

### Langkah 2: Koreksi Angka Fatal pada Draf Naskah
- Koreksi total biaya revoke pada baris 180 dari `0,15 SOL` menjadi **`0,00015 SOL`**.
- Pastikan tabel statistik di Bab 4 menggunakan angka latensi terverifikasi (Minting median 13,5735 s; Verifikasi median 7,4895 s; Pencabutan median 10,5305 s; keberhasilan minting 93,33%).

### Langkah 3: Eksekusi Kasus Uji TC-15 (F1 & F3)
- Jalankan pengujian mandiri F1 via terminal publik (DAS RPC Helius + IPFS Gateway) menggunakan data aset P2.6 (`FDQKnrLV...`).
- Ambil data luaran JSON dan verifikasi Ed25519 offline untuk melengkapi Checklist F3.
- Masukkan bukti F3 ke dalam Bab 4 sebagai justifikasi empiris keandalan Tingkat 1 saat server institusi mati total.

### Langkah 4: Penanganan Implementasi Portal (Prompt iii)
- **Jangan modifikasi `app/ijazah/[id]/page.tsx` secara terburu-buru.**
- Jika jalur portal tingkat-1 tetap ingin diwujudkan, buat rute terpisah yang bersih dari dependensi CUID database (misalnya `app/verify-onchain/page.tsx`), lalu perkaya `inspectCertificate` di `lib/onchain.ts` agar mengekstrak atribut Program Studi dan Tahun Lulus dari IPFS.

---

## 6. STATUS PENGHENTIAN TIM

Sesuai instruksi pada `ORIGINAL_REQUEST.md` (R3 dan R4):
- Dokumen penilaian ini disimpan di `.agents/teamwork/2026-11-15-penilaian-rancangan-bab4.md` tanpa menimpa laporan lama.
- Seluruh batasan guardrail dipatuhi 100%: tidak ada berkas kode yang dimodifikasi, tidak ada draf skripsi yang diubah, tidak ada perintah dev server / curl / RPC yang dijalankan, dan tidak ada pengulangan benchmark n=30.
- Dengan terbitnya laporan ini, **seluruh tugas penilaian perancangan Bab 4 dinyatakan SELESAI, dan tim BERHENTI menunggu arahan selanjutnya dari pengguna (Juan).**
