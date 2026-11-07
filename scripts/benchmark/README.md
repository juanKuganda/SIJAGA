# SIJAGA Benchmark & Measurement Harness Suite

Measurement harness terstandar untuk pengujian Bab IV skripsi SIJAGA pada Solana Devnet (`devnet.helius-rpc.com`, core 4.4.1).

---

## 1. Rencana Pengukuran (P1.4 Measurement Plan: $n=30$ & Time Spread)

Untuk menghasilkan dataset empiris yang representatif terhadap dinamika jaringan blockchain publik, setiap operasi utama diukur sebanyak **$n=30$ percobaan**. Percobaan tidak dijalankan sekaligus pada satu jam sepi (*quiet hour*), melainkan disebar ke dalam **4 kelompok waktu (time batches)** yang mencerminkan berbagai zona waktu dan fluktuasi beban Solana Devnet:

### Matriks Jadwal Pengukuran ($n=30$ Spread)

| Batch | Jendela Waktu (WITA / UTC+8) | Jendela Waktu (UTC) | Alokasi Trial (Mint / Revoke / Verify) | Karakteristik Beban Jaringan |
|:---:|:---:|:---:|:---:|:---|
| **Batch 1** | 08:30 – 09:30 WITA | 00:30 – 01:30 UTC | 8 trial | Pembukaan jam kerja Asia, latensi RPC stabil |
| **Batch 2** | 13:00 – 14:00 WITA | 05:00 – 06:00 UTC | 8 trial | Pagi hari Eropa, lalu lintas Devnet moderat |
| **Batch 3** | 17:30 – 18:30 WITA | 09:30 – 10:30 UTC | 7 trial | Sore Asia / Siang Eropa, peningkatan transaksi |
| **Batch 4** | 22:00 – 23:00 WITA | 14:00 – 15:00 UTC | 7 trial | Pagi hari Amerika Serikat, puncak aktivitas Devnet global |
| **Total** | **4 Sesi Berjarak** | — | **30 trial per operasi** | **Distribusi representatif (p50 & p95 realistis)** |

### Perintah Eksekusi per Batch
Setiap runner mendukung opsi flag `--n <jumlah_trial>`:
- **Batch 1:** `npm run bench:mint -- --n 8 && npm run bench:revoke -- --n 8 && npm run bench:verify -- --n 8`
- **Batch 2:** `npm run bench:mint -- --n 8 && npm run bench:revoke -- --n 8 && npm run bench:verify -- --n 8`
- **Batch 3:** `npm run bench:mint -- --n 7 && npm run bench:revoke -- --n 7 && npm run bench:verify -- --n 7`
- **Batch 4:** `npm run bench:mint -- --n 7 && npm run bench:revoke -- --n 7 && npm run bench:verify -- --n 7`

---

## 2. Struktur Data Receipt (P1.2 Dual Logging JSONL & CSV)

Seluruh eksekusi transaksi on-chain dicatat secara komprehensif ke direktori harian `experiments/<YYYY-MM-DD>/`:
- `run-<operation>.jsonl`: *Append-only raw stream*. Setiap attempt (termasuk attempt 1 yang gagal karena network error) dicatat sebagai 1 baris JSON utuh.
- `summary-<operation>.csv`: Tabel ringkasan baris demi baris per transaksi untuk analisis spreadsheet.
- `run-metadata.json`: Snapshot metadata lingkungan harian yang mencakup versi klaster, RPC host, admin wallet, dan versi software.

### 19 Field Mandat P1.2 yang Dicatat dalam Setiap Receipt:
1. `operation`: Nama operasi (`MINT`, `REVOKE`, `VERIFY`, `NEGATIVE_TRANSFER_OWNER`, dsb).
2. `trialIndex`: Nomor indeks trial (1..30).
3. `attempt`: Nomor attempt (1 atau 2).
4. `sendTimestamp`: Timestamp pengiriman transaksi (ISO 8601 UTC).
5. `finalizedTimestamp`: Timestamp konfirmasi finalitas transaksi (ISO 8601 UTC).
6. `elapsedSeconds`: Total latensi end-to-end dalam detik.
7. `onchainElapsedSeconds`: Latensi konsensus on-chain Solana saja (terpisah dari IPFS).
8. `ipfsElapsedSeconds`: Latensi pembuatan aset dan upload metadata ke IPFS Pinata.
9. `slot`: Slot Solana tempat transaksi dimasukkan ke dalam blok.
10. `txSignature`: Tanda tangan transaksi Base58 yang dapat diverifikasi publik di Solana Explorer.
11. `feeLamports`: Biaya transaksi yang dipotong jaringan dalam lamports (1 SOL = $10^9$ lamports).
12. `rentDepositLamports`: Saldo deposit pembebasan sewa (*rent-exempt reserve*) akun aset Solana.
13. `status`: Hasil status akhir (`"SUCCESS"` atau `"FAILED"`).
14. `errorCode`: Kode error jika transaksi gagal (misal: `ProgramError`, `AssetFrozen`).
15. `errorMessage`: Pesan detail pengecualian/rejection jika gagal.
16. `rpcProvider`: Penyedia RPC terkonfigurasi (misal: `"Helius"`).
17. `rpcEndpoint`: Hostname endpoint RPC (misal: `"devnet.helius-rpc.com"`).
18. `softwareVersions`: Objek versi lingkungan runtime (`node`, `@solana/web3.js`, `@metaplex-foundation/mpl-core`, `@metaplex-foundation/umi`, `pinata`, `next`).
19. `cluster`: Klaster blockchain (`"devnet"`) dan string versi klaster (`clusterVersion`).
20. `wallClockTime` & `date`: Jam lokal pengujian dan tanggal `YYYY-MM-DD`.

---

## 3. Kebijakan Retry Proposal (P1.3 Send-Level Retry Policy)

Sesuai spesifikasi Proposal Bab III (Bagian 3.2):
- **Batas Maksimal:** Maksimal 2 kali percobaan (1 kali percobaan awal + 1 kali retry).
- **Syarat Retry:** Retry **HANYA** diperbolehkan untuk kegagalan sementara jaringan (*transient network/RPC errors*), seperti: `fetch failed`, `timeout`, `blockhash not found`, `socket hangup`, `ECONNRESET`, dan HTTP `429 Too Many Requests`.
- **Rejection Logis/Kontrak:** Kesalahan deterministik logika smart contract (misal: `frozen: true`, pelanggaran otoritas, atau ketidakcocokan tanda tangan) **DILARANG** di-retry dan langsung dilempar sebagai kegagalan permanen.
- **Pencatatan Ganda:**
  - Jika attempt 1 gagal karena error jaringan, receipt attempt 1 dicatat dengan `status: "FAILED"`, `attempt: 1`.
  - Sistem melakukan *backoff delay* selama 2 detik sebelum mengirimkan attempt 2.
  - Attempt 2 dicatat sebagai receipt terpisah dengan `attempt: 2`.
  - Metrik keberhasilan percobaan pertama ($R_1 = S_1/N$) dan keberhasilan 2 percobaan ($R_2 = (S_1+S_2)/N$) dilaporkan berdampingan dalam rekapitulasi Bab IV.

---

## 4. Rangkaian Skrip Pengujian

### 1. `npm run bench:mint`
Mengukur penerbitan ijazah Soulbound NFT ($n=30$) end-to-end:
- Generate hash ter-salt (SHA-256) data mahasiswa fiktif.
- Upload aset gambar preview dan JSON metadata ke IPFS Pinata.
- Mint Metaplex Core Soulbound asset dengan plugin `PermanentFreezeDelegate` (`frozen: true`).
- Menghitung latensi terpisah (IPFS vs On-Chain), fee transaksi, dan rent deposit.

### 2. `npm run bench:revoke`
Mengukur pencabutan visual ijazah on-chain ($n=30$):
- Upload metadata dan image berstatus `[DIBATALKAN]` ke IPFS.
- Update URI dan penamaan aset di Solana Core menjadi `[DIBATALKAN] Ijazah S1`.
- Mencatat latensi update dan fee transaksi konsensus.

### 3. `npm run bench:verify`
Mengukur verifikasi keabsahan ijazah ($n=30$):
- Inspeksi akun aset on-chain dan fetch metadata IPFS terkini (timeout 15 detik).
- Penerbitan tantangan kriptografis 128-bit nonce dari PostgreSQL.
- Penandatanganan tantangan secara detached Ed25519 menggunakan kunci privat lulusan.
- Validasi tanda tangan dan pencocokan kepemilikan aset dengan ambang batas $\le 5{,}0$ detik.

### 4. `npm run bench:negative`
Menguji invarian non-transferabilitas dan immutability dengan instruksi langsung `@metaplex-foundation/mpl-core`:
- **TC-02:** Pemilik mencoba mentransfer aset via `transferV1` -> Ditolak (`frozen: true`).
- **TC-03:** Penyerang non-pemilik mencoba mentransfer aset via `transferV1` -> Ditolak.
- **TC-04:** Pemilik mencoba membakar aset via `burnV1` -> Ditolak (`frozen: true`).
- **TC-13:** Penyerang mencoba mencairkan pembekuan (*thaw*) via `updatePlugin` -> Ditolak (otoritas institusi).
- Masing-masing skenario diulang minimal 3 kali untuk membuktikan penolakan konsensus bersifat deterministik dan sistematis.

### 5. `npm run test:tc`
Eksekusi otomatis menyeluruh terhadap seluruh 14 *Black-Box Test Cases* (TC-01 s.d. TC-14) sesuai Tabel 3.3 proposal skripsi, menghasilkan tabel bukti matrik komprehensif untuk Lampiran Bab IV.
