# LAPORAN INVESTIGASI DAN PENILAIAN AREA 3: RENCANA PENULISAN BAB 4 DARI ANGKA FINAL n=30

**Dokumen Sasaran:** `Brief-Bab4-untuk-Gemini-2026-11-15.md`  
**Area Kajian:** Area 3 — Rencana Penulisan Bab 4 dari Angka Final $n=30$, Integritas Data, Analisis Biaya, Evaluasi Keputusan §9, dan Validasi Threat Model  
**Investigator:** `teamwork_explorer` (Area 3)  
**Workspace:** `/home/junnnnnnnn/Code/sijaga/.agents/teamwork/explorer_area3/`  
**Status Evaluasi:** Selesai (Read-Only Code & Data Assessment)

---

## 1. OBSERVATION (Temuan Faktual Langsung Berbasis Kode & Data)

Semua observasi di bawah ini dikutip langsung dari file repositori, log eksperimen, dan data empiris dengan rujukan file dan nomor baris yang diverifikasi secara mandiri.

### 1.1 Struktur dan Proposal Penulisan Bab 4 dalam Brief
- **Struktur Bab 4 yang Diajukan (P3.6):**
  - Metadata run software/hardware klaster (`Brief-Bab4-untuk-Gemini-2026-11-15.md:201`).
  - Empat tabel statistik kunci: Tabel P3.1 (Statistik Operasi), Tabel P3.2 (Evaluasi Ambang Batas & Vonis), Tabel P3.3 (14 Black-Box Test Cases), dan Tabel P3.4 (Proyeksi Biaya) (`Brief-Bab4-untuk-Gemini-2026-11-15.md:132-179`).
  - Vonis akhir "LAYAK BERSYARAT" dengan mitigasi deployment tertulis jujur sebagai rekomendasi, bukan hasil ukur baru (`Brief-Bab4-untuk-Gemini-2026-11-15.md:150`).
  - Rekaman jejak end-to-end Demonstration Trace P2.6 (`Brief-Bab4-untuk-Gemini-2026-11-15.md:204`).
  - Analisis privasi (TC-10/TC-11) dan 15 butir keterbatasan (limitations) (`Brief-Bab4-untuk-Gemini-2026-11-15.md:182-199`).
  - Discrepancy Log D1–D16 (`Brief-Bab4-untuk-Gemini-2026-11-15.md:252-271`).
  - Definisi formal dua tingkat verifikasi (Tingkat 1 vs Tingkat 2) dan spesifikasi TC-15 (`Brief-Bab4-untuk-Gemini-2026-11-15.md:207`).
  - Pemetaan Masalah $\rightarrow$ Rumusan Masalah (RM) $\rightarrow$ Tujuan $\rightarrow$ Batasan $\rightarrow$ Pengujian (`Brief-Bab4-untuk-Gemini-2026-11-15.md:208`).
  - Materi arsitektural deskriptif pindahan Bab 3 (§4.10: alur hashing, ERD 6 tabel, alur verifikasi, alur revoke/reissue) (`Brief-Bab4-untuk-Gemini-2026-11-15.md:209`).
  - Tangkapan layar: Homepage SIJAGA (dengan peringatan cropping/anotasi klaim 400ms) dan halaman ijazah DB-backed (`Brief-Bab4-untuk-Gemini-2026-11-15.md:210-211`).

### 1.2 Data Raw `experiments/CHECKPOINT.json` vs Realita Empiris
- **String Menyesatkan pada CHECKPOINT:**
  `experiments/CHECKPOINT.json:78` menyatakan:
  `"experimentStatus": "ALL_30_TRIALS_COMPLETED_SUCCESSFULLY across 4 time-spread batches (Batch 4, Batch 1, Batch 2, Batch 3)."`
  Selain itu, baris 72 menyatakan:
  `"batch3_17_30_WITA": "COMPLETED 100% (8 Nov 2026). Mint: 7/7 (Trials 24..30)..."`
- **Fakta Empiris dari Receipt JSONL & CSV:**
  Jumlah percobaan minting yang direncanakan adalah 30 trial unik, tetapi yang **BERHASIL HANYA 28 TRIAL (93,33%)**, sedangkan **2 TRIAL GAGAL TOTAL**:
  1. **Trial Gagal #1 (Batch 4, Malam 7 Nov 2026):**
     - Ditemukan pada `experiments/2026-11-07/summary-mint.csv:6-7` dan `run-mint.jsonl` record 4-5.
     - *Attempt 1* (23:30:59 UTC, elapsed 6,481 s): `status: FAILED`, `errorCode: TypeError`, `errorMessage: "fetch failed"`.
     - *Attempt 2* (23:31:06 UTC, elapsed 5,045 s): `status: FAILED`, `errorCode: TypeError`, `errorMessage: "fetch failed"`.
     - Kedua attempt gagal akibat network drop/RPC transient fetch failure.
  2. **Trial Gagal #2 (Batch 3, Sore 8 Nov 2026):**
     - Ditemukan pada `experiments/2026-11-08/summary-mint.csv:22` dan `run-mint.jsonl` record 22.
     - *Attempt 1* (17:34:45 UTC, elapsed 43,328 s): `status: FAILED`, `errorCode: Error`, `errorMessage: "Signature 5SaQR4eETNCMhkRaNkcNcYh8zLMoALd6HsnWr4hnuN7Zp2BRfLFFbQmKH2Amc8Uzm9R7zYXtgaTNnjJfcKjdsw1f has expired: block height exceeded."`.
     - *Attempt 2*: **TIDAK ADA**. Tidak dijalankan retry karena fungsi `isNetworkError()` pada `scripts/benchmark/common.ts:281-304` belum mendaftarkan string `"block height exceeded"` atau `"signature has expired"` sebagai transient error.

### 1.3 Perhitungan Statistik Metrik Latensi Lengkap (Mean, Median, Stdev, Min, Max, p95)
Berdasarkan pembacaan langsung terhadap seluruh entri `experiments/2026-11-07/` dan `experiments/2026-11-08/` (dihitung menggunakan script analisis Python independen `calculate_stats.py`), diperoleh angka metrik eksak sebagai berikut:

#### A. Operasi Minting ($n=28$ Sukses, 2 Gagal)
- **Total Duration (detik):**
  - Minimum: `9,586 s`
  - Maksimum: `40,630 s` (Trial 26 pada 8 Nov 17:33:57 UTC)
  - Mean: `15,887 s`
  - Standar Deviasi ($s$ sampel): `7,748 s`
  - Median Standar (rata-rata 2 nilai tengah index 14 & 15): `(13,569 + 13,578) / 2 = 13,5735 s` (sesuai Brief: `13,573 dtk`, `Brief-Bab4-untuk-Gemini-2026-11-15.md:135`)
  - Median Upper (nilai index ke-14 0-based dari 28): `13,578 s`
  - p95 Nearest Rank (rank $\lceil 0,95 \times 28 \rceil = 27$, nilai tertinggi ke-2): `33,542 s` (Trial 8 pada 8 Nov 11:15:35 UTC; nilai tertinggi pertama `40,630 s`)
- **On-Chain Hop ($n=28$):**
  - Mean: `6,011 s` | Stdev: `3,247 s` | Min: `3,543 s` | Max: `16,669 s` | Median Standar: `4,611 s`
- **IPFS Hop ($n=28$):**
  - Mean: `8,641 s` | Stdev: `5,383 s` | Min: `5,366 s` | Max: `27,580 s` | Median Standar: `6,462 s`

#### B. Operasi Verifikasi ($n=30$ Sukses, 0 Gagal)
- **Total Duration (detik):**
  - Minimum: `4,898 s` (Trial 2 pada 8 Nov 11:16:32 UTC)
  - Maksimum: `19,161 s` (Trial 19 pada 8 Nov 17:35:46 UTC)
  - Mean: `8,327 s`
  - Standar Deviasi ($s$ sampel): `3,189 s`
  - Median Standar (rata-rata nilai tengah index 15 & 16): `(7,414 + 7,565) / 2 = 7,4895 s` (sesuai Brief: `7,489 dtk`, `Brief-Bab4-untuk-Gemini-2026-11-15.md:136`)
  - Median Upper: `7,565 s`
  - p95 Nearest Rank (rank $\lceil 0,95 \times 30 \rceil = 29$, nilai tertinggi ke-2): `16,293 s` (Trial 1 pada 7 Nov 22:23:44 UTC; nilai tertinggi pertama `19,161 s`)
  - Jumlah trial yang memenuhi ambang K4 ($\le 5,0\text{ s}$): **Hanya 2 dari 30 trial (6,67%)**, yaitu Trial 2 (`4,898 s`) dan Trial 23 (`4,984 s`).
- **Dekomposisi Per-Hop ($n=21$, Trial 10–30):**
  - *Catatan Asimetri Pencatatan:* Hanya tersimpan di `summary-verify.csv`, tidak ada di `run-verify.jsonl` (`Brief-Bab4-untuk-Gemini-2026-11-15.md:262`).
  - RPC On-chain: Mean `1,713 s` | Median `0,981 s` | Min `0,373 s` | Max `13,017 s` (Trial 19 outlier RPC)
  - IPFS Metadata Fetch: Mean `5,721 s` | Median `5,796 s` | Min `3,603 s` | Max `7,204 s`
  - Challenge Ed25519: Mean `0,853 s` | Median `0,446 s` | Min `0,307 s` | Max `3,881 s`

#### C. Operasi Pencabutan / Revoke ($n=30$ Sukses, 0 Gagal)
- **Total Duration (detik):**
  - Minimum: `9,376 s`
  - Maksimum: `75,161 s` (Trial 27 pada 8 Nov 17:41:40 UTC — outlier ekstrem IPFS Pinata `70,632 s`)
  - Mean: `13,174 s`
  - Standar Deviasi ($s$ sampel): `11,864 s`
  - Median Standar (rata-rata nilai tengah index 15 & 16): `(10,448 + 10,613) / 2 = 10,5305 s` (sesuai Brief: `10,530 dtk`, `Brief-Bab4-untuk-Gemini-2026-11-15.md:137`)
  - Median Upper: `10,613 s`
  - p95 Nearest Rank (rank $\lceil 0,95 \times 30 \rceil = 29$, nilai tertinggi ke-2): `17,987 s` (nilai tertinggi pertama `75,161 s`)
- **On-Chain Hop ($n=30$):** Mean `4,599 s` | Median `4,114 s` | Min `3,567 s` | Max `7,799 s`
- **IPFS Hop ($n=30$):** Mean `7,717 s` | Median `5,3605 s` (dibulatkan `5,361 s`) | Min `4,763 s` | Max `70,632 s`

---

## 2. LOGIC CHAIN & ANALISIS KRITIS

### 2.1 Penemuan Fatal: Kesalahan Perhitungan Total Biaya Revoke (Faktor 1.000x)
- **Kutipan Brief:**  
  `Brief-Bab4-untuk-Gemini-2026-11-15.md:180` menuliskan:  
  `"(3) biaya revoke TIDAK termasuk proyeksi penerbitan (revoke = 5.000 lamport/trial × 30 = 0,15 SOL total — catat terpisah bila disebut);"`
- **Verifikasi Matematis On-Chain & Data:**  
  - 1 SOL = $1.000.000.000$ lamport ($10^9$ lamport).  
  - Biaya transaksi revoke per trial terukur di `summary-revoke.csv:2-31` adalah $5.000$ lamport ($0,000005\text{ SOL}$).  
  - Total untuk 30 trial: $5.000 \times 30 = 150.000\text{ lamport}$.  
  - Konversi ke SOL: $\frac{150.000}{1.000.000.000} = \mathbf{0,00015\text{ SOL}}$.
- **Analisis Dampak Akademik:**  
  Klaim teks bahwa $5.000 \times 30 = 0,15\text{ SOL}$ adalah **kesalahan aritmatika fatal sebesar 1.000 kali lipat** ($0,15\text{ SOL} = 150.000.000\text{ lamport}$). Jika angka $0,15\text{ SOL}$ ini lolos ke naskah Bab 4 atau artikel SYNTIA, penguji atau reviewer akan langsung mempertanyakan kompetensi komputasi blockchain penulis.

### 2.2 Dekomposisi Biaya Minting $0,0032626\text{ SOL}$ dan Sifat Rent Sunk Cost
- **Struktur Transaksi Minting di Solana:**  
  Berdasarkan implementasi kode di `lib/metaplex.ts:203-218` dan pembacaan receipt di `scripts/benchmark/bench-mint.ts:120-134`:
  1. **Transaction Base Fee:** $10.000\text{ lamport}$ ($0,0000100\text{ SOL}$).  
     Transaksi melibatkan dua penandatangan (*signers*): *Admin Authority* (`umiKeypair`) dan *Mint Signer* (`mintSigner`). Pada Solana, base signature fee adalah $5.000\text{ lamport}$ per signature ($2 \times 5.000 = 10.000\text{ lamport}$).
  2. **Rent Exemption State Account:** $3.252.600\text{ lamport}$ ($0,0032526\text{ SOL}$).  
     Akun aset Metaplex Core yang dialokasikan di on-chain state memerlukan saldo deposit minimum agar bebas sewa (*rent-exempt*), termasuk plugin `PermanentFreezeDelegate`.
  3. **Total Biaya Penerbitan:**  
     $$10.000 + 3.252.600 = 3.262.600\text{ lamport} = \mathbf{0,0032626\text{ SOL}}$$
- **Anatomi Biaya Transaksi Gagal:**  
  Pada 3 entri kegagalan di `experiments/2026-11-07/summary-mint.csv:6-7` dan `experiments/2026-11-08/summary-mint.csv:22`, kolom `feeLamports` tercatat *null/kosong*.  
  - Pada Trial 1 (*fetch failed*), request HTTP RPC terputus sebelum transaksi diserahkan ke RPC validator, sehingga tidak ada instruksi yang diproses di klaster (fee = 0).
  - Pada Trial 28 (*Signature expired: block height exceeded*), proposal transaksi tidak berhasil dimasukkan ke dalam blok valid oleh validator sebelum blockhash kedaluwarsa. Dalam arsitektur Solana, transaksi yang kedaluwarsa tanpa pernah masuk blok (*uncommitted*) tidak memotong saldo fee-payer.  
  - Oleh karena itu, klaim draf lama SYNTIA para 74 bahwa *"failed transactions still cost money"* bertentangan dengan bukti empiris dan mekanisme Solana. Draf Bab 4 dan artikel wajib mengadopsi posisi para 81 bahwa receipt mencatat biaya transaksi gagal sebesar null/0 lamport (`Brief-Bab4-untuk-Gemini-2026-11-15.md:277`).
- **Analisis Sunk Cost vs Collateral:**  
  Deposit *rent exemption* ($3.252.600\text{ lamport}$) pada Solana secara teoritis dapat ditarik kembali (*reclaimable*) jika akun ditutup (*burn*). Namun, karena SIJAGA menggunakan pendekatan **Visual Revocation** tanpa pembakaran token (`lib/metaplex.ts:275-315`, `isMutable: true`, `burn: false`), akun token ijazah tetap eksis di ledger selamanya dengan label `[DIBATALKAN]`. Dengan demikian, bagi universitas, deposit sewa ini merupakan **sunk cost permanen**, bukan jaminan likuid. Hal ini wajib diperjelas dalam Bab 4 agar reviewer tidak mempertanyakan apakah biaya tersebut dapat dikembalikan.

### 2.3 Evaluasi Representasi 28/30 Minting & Risiko Ketidakjujuran Akademik
- **Sikap Terpuji Brief:**  
  `Brief-Bab4-untuk-Gemini-2026-11-15.md:147,150,263` secara tegas menolak manipulasi data. Penulis brief menginstruksikan untuk tidak mengutip klaim usang `CHECKPOINT.json:78` (`ALL_30_TRIALS_COMPLETED_SUCCESSFULLY`), secara terbuka mengakui tingkat keberhasilan 28/30 (93,3%), menyatakan kriteria K3 **TIDAK LOLOS**, dan menerima vonis **LAYAK BERSYARAT**.
- **Risiko Naratif & Batasan yang Wajib Dijaga di Bab 4:**  
  1. *Risiko Pengandaian Spekulatif (Speculative Framing):*  
     Brief menjelaskan bahwa Trial 28 gagal karena classifier `isNetworkError` tidak menangkap error "block height exceeded", dan berspekulasi bahwa jika di-retry, keberhasilan bisa menjadi 29/30 (96,7% > 95%).  
     *Peringatan:* Di Bab 4, narasi ini HANYA boleh ditulis sebagai analisis penyebab teknis dan rencana mitigasi deployment di masa depan. Penulis **DILARANG KERAS** menyimpulkan atau menuliskan angka "96,7%" sebagai hasil pengukuran sistem SIJAGA saat ini. Angka performa resmi sistem adalah 93,3% (28/30).
  2. *Atribusi RPC:*  
     Brief mencatat koreksi penting bahwa RPC yang digunakan pada eksperimen sudah merupakan RPC privat Helius Devnet (`experiments/2026-11-07/run-metadata.json:9`), bukan RPC publik bersama. Penulis tidak boleh menyalahkan "RPC publik Solana yang padat" sebagai kambing hitam kegagalan tanpa menyebutkan bahwa Helius Devnet pun mengalami kegagalan transient pada jendela sore.

### 2.4 Evaluasi 7 Keputusan Tersisa di §9
Sesuai kondisi aktual di mana laptop Windows penguji telah selesai diperbaiki (`Brief-Bab4-untuk-Gemini-2026-11-15.md:14`), keputusan No. 14 telah terselesaikan (*resolved*). Tujuh keputusan yang tersisa dianalisis secara objektif:

| No | Butir Keputusan | Rekomendasi Brief | Temuan Bukti & Analisis Risiko Akademik/Teknis | Keputusan / Tindakan Pasti untuk Bab 4 |
|---|---|---|---|---|
| **9** | Sumber kurs SOL \$87,76 & Rp18.094 per 9 Nov pagi | Diisi bursa/situs + jam | **Risiko:** Mengutip angka \$0,2863 / Rp5.180,78 tanpa rujukan sumber indeks harga melanggar kaidah penulisan ilmiah. Kurs kripto sangat volatil. | Wajib cantumkan sumber resmi (misal: CoinGecko API atau Binance Spot UTC) beserta stempel waktu pastinya, atau tempatkan nilai USD/IDR sebagai estimasi indikatif sekunder dengan angka primer tetap 0,0032626 SOL. |
| **12** | Gambar halaman ijazah Bab 4: aset P2.6 vs TC-09 | P2.6 (`FDQKnrLV…`, `TRACE414503`) | **Konsistensi Data:** P2.6 adalah jejak demonstrasi end-to-end lengkap (`BAB4_PROGRESS.md:86-107`) yang memiliki keterikatan data Tier 1 riil di database lokal dan terbukti berstatus VALID pada `/api/verify`. | **Setujui P2.6**. Hindari TC-09 karena TC-09 adalah aset hasil pengujian reissue yang memiliki status revoked pada aset induknya. |
| **13** | Setup DB lokal untuk F2: Docker vs Service vs Remote Neon | Sesuaikan setup | **Temuan Kode:** `prisma/schema.prisma:8-9` dan `.agents/AGENTS.md:4` mengonfirmasi database adalah Neon PostgreSQL remote. | **Wajib LEWATI F2** atau simulasikan pemutusan koneksi secara aman di localhost dengan mengganti sementara port koneksi `DATABASE_URL` ke port lokal mati (`localhost:54329`). DILARANG mematikan atau mengganggu branch database remote Neon. |
| **16** | Perbandingan Ethereum di Bab 4: Uji Sepolia vs Literatur | Tanya Pak Rizka, siapkan opsi literatur | **Risiko:** Membangun smart contract Solidity ERC-721/5192 di Sepolia merupakan *scope creep* masif yang bertentangan dengan jalur hemat dan menambah risiko kegagalan submit. | **Rekomendasi Tegas: Tetap gunakan perbandingan literatur** (Alizadeh & Khabbazian, 2025). Jelaskan ketiadaan implementasi Ethereum sebagai limitasi penelitian (P3.5 butir 9). |
| **17** | Fee on-chain Trial 28 ("block height exceeded") | Catat fee null per receipt + catatan kaki | **Mekanisme On-Chain:** Transaksi kedaluwarsa sebelum commit tidak memotong fee di Solana. | **Laporkan fee null/0 lamport**. Tuliskan penjelasan mekanisme kedaluwarsa blockhash Solana dan selaraskan dengan artikel SYNTIA para 81 (hapus kontradiksi di para 74). |
| **18** | Klaim "build 42 rute" | Hapus bila tidak ada artefak | **Temuan Artefak:** Disebutkan di `BAB4_PROGRESS.md:56,144` sebagai laporan agen lama, tetapi tidak ada file log build tersimpan di `experiments/`. | **Hapus klaim "42 rute"**. Ganti dengan pernyataan faktual: "Build produksi Next.js berhasil dikompilasi tanpa error (exit code 0)". |
| **19** | Versi Phantom Wallet saat eksperimen 7–8 Nov | Diisi dari laptop penguji | **Temuan Harness:** Eksperimen performa n=30 dijalankan secara *headless* via Node.js/UMI tanpa ekstensi browser Phantom (`experiments/2026-11-08/run-metadata.json`). | Cantumkan bahwa pengujian benchmark dijalankan secara *programmatic* (tanpa ekstensi). Versi Phantom Wallet hanya relevan untuk pengujian interaksi pengguna di laptop penguji. |

### 2.5 Validasi Threat Model, Fail-Closed, dan Privasi Data (UU PDP)
- **Karakteristik Fail-Closed Portal (`app/api/verify/route.ts`):**  
  Pemeriksaan kode baris 50, 72, dan 103 menunjukkan bahwa endpoint verifikasi portal bersifat DB-first. Jika basis data Tier 1 mati atau tidak merespons, alur kode akan mengembalikan HTTP 404 (baris 91) atau HTTP 500 (global catch block). Tidak ada percabangan kode yang dapat mengembalikan `verified: true` jika basis data tidak dapat diakses. Hal ini membuktikan bahwa portal beroperasi secara aman (*fail-closed*), bukan *fail-open*.
- **Kesesuaian Hash 3 Atribut + Salt (`lib/crypto.ts:16`):**  
  Fungsi `generateDataHash` menggunakan format:
  $$\text{raw} = \text{nama.trim()} \parallel \text{nim.toUpperCase()} \parallel \text{prodi} \parallel \text{salt}$$
  Tahun kelulusan terbukti **TIDAK** disertakan dalam string hash. Penulisan di Bab 4 wajib secara konsisten menyebutkan "3 atribut identitas nominatif (Nama, NIM, Program Studi) ditambah 128-bit random salt", selaras dengan kode di repositori.
- **Validasi Kriptografi 14 Test Cases (TC-01..TC-14):**  
  Berdasarkan log artefak `experiments/2026-11-08/test-tc-output.log`, seluruh 14 skenario ancaman lulus 100%:
  - TC-02, TC-03, TC-04 ditolak on-chain dengan pesan error `Invalid Authority`.
  - TC-13 (usaha *thaw* oleh pihak non-institusi) ditolak on-chain dengan pesan error spesifik `Neither the asset or any plugins have approved this operation` (koreksi penting terhadap kesalahan klaim draf terdahulu).
  - TC-10 dan TC-11 membuktikan kepatuhan terhadap UU PDP (Right to Erasure): metadata on-chain dan IPFS bersih dari PII, dan penghapusan salt di database lokal memutuskan kemampuan rekonstruksi hash secara permanen.

---

## 3. CAVEATS (Keterbatasan & Asumsi Penyelidikan)

1. **Lingkungan Pengukuran Devnet vs Mainnet:** Seluruh angka latensi dan keandalan diperoleh dari Solana Devnet dan Pinata IPFS Gateway publik. Kondisi kemacetan jaringan (*congestion*), fluktuasi gas/priority fee, dan *liveliness* validator di Devnet dapat berbeda secara signifikan dengan Solana Mainnet-Beta.
2. **Asimetri Logging Dekomposisi Verify:** Data rincian 3-hop latensi verifikasi hanya tersedia untuk 21 trial terakhir (Trial 10–30) di `summary-verify.csv`, sedangkan Trial 1–9 hanya mencatat total waktu. Penulisan Bab 4 harus transparan mengenai ukuran sampel $n=21$ untuk dekomposisi verifikasi.
3. **Receipt Tanpa Nilai Biaya pada Trial 1 (Malam 7 Nov):** Satu transaksi minting yang sukses pada Batch 4 (tx: `325u4Afs...`) mencatat `feeLamports: null` dan `slot: null` akibat keterbatasan RPC fetching sebelum penambahan `getTransactionWithRetry`. Nilai biaya 0,0032626 SOL disimpulkan dari 27 receipt sukses lainnya yang identik dan deterministik.
4. **Ketiadaan Implementasi Jaringan Pembanding:** Tidak ada implementasi smart contract Ethereum/EVM yang dibangun atau diuji secara empiris dalam repositori ini. Setiap komparasi dengan Ethereum bersumber murni dari literatur eksternal.

---

## 4. CONCLUSION (Kesimpulan Penilaian Area 3)

1. **Kesiapan Penulisan Bab 4 Berbasis Data n=30:**  
   Rancangan penulisan Bab 4 dalam `Brief-Bab4-untuk-Gemini-2026-11-15.md` secara umum telah **sangat matang, komprehensif, dan memiliki integritas akademik yang tinggi**. Keputusan untuk melaporkan 28/30 minting secara jujur, mengakui kegagalan K3 dan K4, serta menerima vonis "LAYAK BERSYARAT" adalah langkah yang tepat secara metodologis penelitian (DSRM).
2. **Koreksi Kritis yang Wajib Diterapkan:**
   - **Koreksi Fatal Biaya Revoke:** Ubah klaim total biaya revoke pada baris 180 dari `0,15 SOL` menjadi `0,00015 SOL` ($150.000\text{ lamport}$).
   - **Koreksi String CHECKPOINT:** Pastikan narasi Bab 4 mengabaikan string usang `"ALL_30_TRIALS_COMPLETED_SUCCESSFULLY"` pada `CHECKPOINT.json:78` dan hanya merujuk pada angka terverifikasi 28/30 sukses.
   - **Penyelarasan Artikel SYNTIA:** Hapus kontradiksi pada draf artikel SYNTIA antara para 74 (klaim transaksi gagal berbayar) dan para 81 (biaya gagal bernilai null/0).
   - **Penyelesaian 7 Keputusan §9:** Terapkan resolusi tegas sesuai tabel rekomendasi di atas (gunakan aset P2.6 untuk gambar, lewati simulasi F2 berisiko pada DB remote Neon, pertahankan perbandingan literatur untuk Ethereum, hapus frasa "42 rute", dan jelaskan bahwa pengujian benchmark berjalan secara *headless* tanpa ekstensi Phantom).

---

## 5. VERIFICATION METHOD (Metode Verifikasi Independen)

Untuk memverifikasi secara independen seluruh temuan dalam laporan ini tanpa bergantung pada klaim verbal:

1. **Verifikasi Angka Latensi, Kesuksesan, dan Biaya:**  
   Jalankan script verifikasi mandiri berbasis Python di lingkungan lokal (read-only):
   ```bash
   python3 /home/junnnnnnnn/Code/sijaga/.agents/teamwork/explorer_area3/calculate_stats.py
   ```
   *Expected Outcome:* Menampilkan 28 sukses mint, 2 gagal (Trial 1 & 28), median mint $13,5735\text{ s}$, median verify $7,4895\text{ s}$ (hanya 2 trial $\le 5\text{ s}$), median revoke $10,5305\text{ s}$, outlier revoke Trial 27 ($75,161\text{ s}$), dan distribusi fee revoke tepat $5.000\text{ lamport}$ per trial.

2. **Verifikasi String Error TC-13 vs TC-02/03/04:**  
   Periksa log eksekusi black-box test cases:
   ```bash
   grep -A 5 -B 2 "TC-13" /home/junnnnnnnn/Code/sijaga/experiments/2026-11-08/test-tc-output.log
   ```
   *Expected Outcome:* Memuat pesan error `Neither the asset or any plugins have approved this operation`, membuktikan bahwa penolakan *thaw* memiliki string berbeda dengan `Invalid Authority` pada TC-02..TC-04.

3. **Verifikasi Hash 3 Atribut + Salt:**  
   Periksa implementasi fungsi kriptografi:
   ```bash
   sed -n '15,25p' /home/junnnnnnnn/Code/sijaga/lib/crypto.ts
   ```
   *Expected Outcome:* Menampilkan template string `${nama.trim()}|${nim.toUpperCase()}|${prodi}|${salt}`, membuktikan ketiadaan atribut tahun kelulusan dalam pembentukan hash.

4. **Verifikasi Fail-Closed DB-First pada Portal:**  
   Periksa alur routing verifikasi portal:
   ```bash
   sed -n '50,95p' /home/junnnnnnnn/Code/sijaga/app/api/verify/route.ts
   ```
   *Expected Outcome:* Menunjukkan pengecekan Prisma terlebih dahulu (`prisma.wallet.findUnique` / `prisma.user.findUnique`) sebelum melakukan inspeksi on-chain, mengonfirmasi HTTP 404/500 jika database tidak tersedia.
