# Laporan Penilaian Area 2: Rencana Implementasi Jalur Verifikasi Tingkat-1 di Portal (Prompt iii)

**File Target Analisis:** `Brief-Bab4-untuk-Gemini-2026-11-15.md` (khususnya §4, §5, §8, §9, dan Lampiran B Prompt iii: baris 348–386)  
**Konteks Codebase:** Branch `feat/bab4-experiments` di repositori `/home/junnnnnnnn/Code/sijaga`  
**Penilai:** Teamwork Explorer (Area 2)  
**Tanggal:** 15 November 2026  
**Status Evaluasi:** READ-ONLY INVESTIGATION (Tanpa perubahan kode, tanpa request jaringan/curl, tanpa dev server)

---

## 1. Observation (Hasil Observasi Langsung Berbasis Bukti)

Berikut adalah temuan faktual berbasis kode sumber, berkas konfigurasi, dan artefak eksperimen aktual di repositori:

### O.1 Status Berkas dan Eksistensi Modul Verifikasi
- **Berkas `lib/verification.ts` TIDAK ADA di repositori:**  
  Pencarian berkas melalui `find lib app/api` dan eksekusi pembacaan membuktikan bahwa berkas `lib/verification.ts` tidak pernah dibuat (`wc: lib/verification.ts: No such file or directory`).  
  Logika verifikasi on-chain dan kriptografis sebenarnya terbagi ke dalam:
  - `lib/onchain.ts` (238 baris) — fungsi `inspectCertificate` dan parser plugin Metaplex Core.
  - `lib/crypto.ts` (46 baris) — fungsi `generateDataHash` dan `verifyDataHash`.
  - `lib/challenge.ts` (223 baris) — fungsi `buildChallengeMessage`, `createVerificationChallenge`, dan `verifyVerificationChallenge`.
  - `lib/metaplex.ts` (385 baris) — fungsi `createUmiInstance`, `getAdminWalletAddress`, dan `mintSoulboundNFT`.
  - `app/api/verify/route.ts` (340 baris) — endpoint verifikasi publik 3-lapisan (DB-first).
  - `app/api/verify/challenge/route.ts` (118 baris) — endpoint request & verify challenge berbasis DB nonce.

### O.2 Rumusan Hash On-Chain: 3 Atribut + Salt (Bukan Nomor Ijazah)
- Di `lib/crypto.ts:10-22`:
  ```typescript
  export function generateDataHash(
    nama: string,
    nim: string,
    prodi: string
  ): { hash: string; salt: string } {
    const salt = crypto.randomBytes(16).toString('hex');
    const raw = `${nama.trim()}|${nim.toUpperCase()}|${prodi}|${salt}`;
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    return {
      hash: `sha256:${hash}`,
      salt,
    };
  }
  ```
- **3 Atribut Aktual:** `nama.trim()`, `nim.toUpperCase()`, dan `prodi` (Program Studi).  
  *Catatan:* Atribut "Nomor Ijazah" dan "Tahun Lulus" TIDAK dimasukkan ke dalam formula hash.
- **Ukuran Salt:** 16 byte random hex (32 karakter heksadesimal / 128-bit entropy).
- **Format Prefix:** Selalu diawali dengan prefix `sha256:`.
- **Lokasi Penyimpanan Salt:** Salt HANYA disimpan di basis data Tier 1 pada kolom `Certificate.dataSalt` (`prisma/schema.prisma:72`). Metadata IPFS publik sama sekali TIDAK memuat salt (terbukti dari TC-10).

### O.3 Alur Verifikasi Portal Saat Ini (`app/api/verify/route.ts` & `app/page.tsx`)
- `app/api/verify/route.ts` dirancang dengan arsitektur **DB-first / Fail-Closed**:
  - Baris 50 & 72: Query awal dilakukan ke Prisma DB (`prisma.wallet.findUnique` atau `prisma.user.findUnique`).
  - Baris 89–94: Jika query DB tidak menemukan user/wallet, endpoint mengembalikan HTTP 404 (`Wallet tidak ditemukan` / `NIM tidak ditemukan`).
  - Baris 333–338: Jika koneksi DB PostgreSQL/Neon mati, Prisma melempar error dan ditangkap oleh blok `catch`, mengembalikan HTTP 500 (`Terjadi kesalahan server`).
  - Baris 103–109: Query kedua mengambil sertifikat via `prisma.certificate.findFirst({ where: { userId } })`.
  - Baris 137–153 (**Lapisan B**): Verifikasi hash lokal dilakukan melalui `verifyDataHash(user.nama, user.nim, user.prodi, certificate.dataSalt, certificate.dataHash)`.
  - Baris 209 (**Lapisan C**): Verifikasi on-chain memanggil `inspectCertificate(certificate.nftAddress)`.
  - Baris 286–291: Menetapkan:
    ```typescript
    const onChainValid = issuerMatch && hashMatch && ownerMatch && frozenCheck && nameConsistent;
    const verifiedOnChain = !!onChainValid;
    const verifiedNominative = !piiDeleted && hashVerified === true;
    ```
  - Baris 323: `// SECURITY: dataHash / dataSalt TIDAK dikirim ke klien publik`.
- Di antarmuka beranda `app/page.tsx:373-394`: Form pencarian publik memanggil `GET /api/verify?query=${wallet}`.
- Di `app/page.tsx:57-93`: Komponen `VerificationChecklist` membedakan "Blockchain Checklist" (`onChain.status`, `frozen: true`, `mismatch !== "OWNER"`, `mismatch !== "HASH"`) dan "Nominative Checklist" (`verifiedNominative === true`).
- **Kesimpulan Verifikasi Portal Saat Ini:** TIDAK ADA jalur verifikasi on-chain murni yang dapat berjalan mandiri tanpa basis data Tier 1. Jika database mati, portal gagal total (HTTP 500/404).

### O.4 Alur dan Struktur Halaman `app/ijazah/[id]/page.tsx`
- Halaman `app/ijazah/[id]/page.tsx` adalah halaman **Preview Sertifikat**, BUKAN halaman verifikasi pencarian:
  - Baris 175–180: Mengambil parameter URL `params.id`.
  - Baris 441–453: Memuat data sertifikat via `fetch('/api/certificate/' + resolvedParams.id)`.
  - Di `app/api/certificate/[id]/route.ts:21`: Endpoint ini menjalankan `prisma.certificate.findUnique({ where: { id } })`, di mana parameter `id` WAJIB berupa CUID sertifikat di Prisma DB (contoh: `cmw7pykyz0009ijxgm0zy8cg0`), BUKAN alamat mint Solana NFT (base58).
  - Baris 478–500: Jika terjadi error atau data `cert` kosong (`error || !cert`), halaman menampilkan antarmuka error:
    ```tsx
    <h1 className="text-2xl font-bold text-foreground mb-2">Ijazah Tidak Ditemukan</h1>
    <p className="text-muted-foreground mb-8">{error || "Data ijazah tidak tersedia atau belum diterbitkan."}</p>
    ```
    Seluruh komponen di bawahnya (sertifikat, detail kriptografis, dan challenge kepemilikan) TIDAK AKAN DIRENDER SAMA SEKALI.
  - Baris 562–568: Menampilkan `<CertificateUI>` menggunakan data `cert.prodi`, `cert.tahunLulus`, dan `cert.dataHash`.
  - Baris 572–628: Menampilkan kartu "Verifikasi Kriptografis" berisi data statis dari DB: `cert.nftAddress`, `cert.txSignature`, `cert.walletAddress`, `cert.issuedAt`. Halaman ini TIDAK memanggil `inspectCertificate()`.

### O.5 Fitur "Buktikan Kepemilikan" yang Baru Saja Diimplementasikan di `feat/bab4-experiments`
- Pada 8 November 2026 (commit `362b728`, `c9353fb`, `d72f323`, `5d3ee5c`), telah ditambahkan seksi "Buktikan Kepemilikan" di `app/ijazah/[id]/page.tsx:630-997`:
  - Baris 288–439 (`handleVerifyOwnership`): Alur stateful:
    1. Mengambil provider via `getWalletProvider()` (`Phantom`/`Solflare`/`Backpack`).
    2. Menghubungkan dompet (`provider.connect()`).
    3. Mengirim `POST /api/verify/challenge` dengan `{ walletAddress }` untuk menerbitkan nonce 128-bit di database (`prisma.verificationNonce`).
    4. Meminta tanda tangan dompet secara byte-exact UTF-8 (`provider.signMessage(msgBytes)`).
    5. Mengirim `POST /api/verify/challenge` dengan `{ action: "verify", walletAddress, nonce, signature, message, expectedOwner: cert.walletAddress }`.
    6. Menampilkan "Kepemilikan Terverifikasi" jika sukses, atau menampilkan kode error (`OWNER_MISMATCH`, `NONCE_EXPIRED`, dll.) jika gagal.
- Seluruh alur ini bergantung pada tabel database `VerificationNonce` untuk mencegah *replay attack* (`lib/challenge.ts:53, 114, 212`).

### O.6 Hak Privasi (UU PDP No. 27 Tahun 2022) & Dampak Penghapusan Data
- Di `app/api/admin/delete-pii/route.ts:110-128`:
  Saat mahasiswa menarik persetujuan data (Right to Erasure / Right to be Forgotten):
  - Nama diubah menjadi `"[DATA ANONIM]"`.
  - NIM diubah menjadi `ANON-${Date.now()}`.
  - `user.dataDeletedAt` diisi `new Date()`.
  - Baris 122: `prisma.certificate.updateMany({ where: { userId }, data: { dataSalt: null } })`.
- Jika `dataSalt = null`, fungsi `verifyDataHash` tidak dapat dijalankan.
- Di metadata IPFS publik (TC-10), field yang tercantum hanyalah: `Institusi`, `Program Studi`, `Tahun Lulus`, `Jenjang`, `Tipe`, dan `Data Hash`. Nama, NIM, email, dan salt TIDAK ADA di metadata IPFS.
- Akibatnya: Bila server DB mati atau PII dihapus, rekonstruksi/hitung-ulang hash dari Nama/NIM/Prodi SECARA MATEMATIS TIDAK BISA DILAKUKAN karena salt 128-bit tidak dapat ditebak.

### O.7 Kapabilitas dan Batasan `inspectCertificate` (`lib/onchain.ts`)
- Fungsi `inspectCertificate(mintAddress, customRpcUrl)` membaca state Metaplex Core langsung dari Solana RPC dan IPFS JSON via HTTP gateway.
- Fungsi ini sepenuhnya bebas dari ketergantungan Prisma / PostgreSQL (bisa berjalan offline dari DB).
- Deteksi status beku (frozen) di `lib/onchain.ts:105-141` membaca plugin `PermanentFreezeDelegate`, mengabaikan `ownership.frozen` (cocok dengan Nuansa DAS pada Brief §4 baris 64).
- **Batasan Output Saat Ini (`lib/onchain.ts:19-32`):**
  Hanya mengembalikan: `owner`, `name`, `uri`, `frozen`, `dataHash`, `updateAuthority`, dan `timings`.
  TIDAK mengembalikan atribut lain dari IPFS seperti `Program Studi`, `Tahun Lulus`, `Jenjang`, atau `Tipe`.

---

## 2. Logic Chain (Rantai Penalaran dari Observasi ke Kesimpulan)

1. **Rencana Prompt iii Mengasumsikan `app/ijazah/[id]/page.tsx` Sebagai Titik Integrasi Verifikasi Tingkat-1:**
   - *Observasi:* Prompt iii (baris 349 & 373–378) mengarahkan pembuatan mode stateless challenge dan jalur verifikasi mandiri pada `app/ijazah/[id]/page.tsx:630-750`.
   - *Penalaran:* Halaman `app/ijazah/[id]/page.tsx` memiliki prasyarat mutlak pada baris 442 (`fetch('/api/certificate/' + resolvedParams.id)`). Rute API `/api/certificate/[id]` (baris 21) melakukan query ke tabel Prisma `Certificate` menggunakan CUID (`where: { id }`).
   - *Konsekuensi:*
     a. Jika pengguna memasukkan alamat mint Solana (contoh: `FDQKnrLVQdZqP4efoNarLb87gmZj529kebFPz8SVMQCc`), query Prisma gagal mencari CUID tersebut dan mengembalikan HTTP 404.
     b. Jika server database Tier 1 mati (skenario TC-15), query Prisma melempar exception dan mengembalikan HTTP 500.
     c. Pada kedua kondisi tersebut, baris 478–500 mencegat eksekusi dan merender layar error "Ijazah Tidak Ditemukan", sehingga kode baris 630–750 tidak pernah dimuat atau dieksekusi.
   - *Kesimpulan:* Menempatkan verifikasi Tingkat-1 di dalam `app/ijazah/[id]/page.tsx` tanpa merombak alur pemuatan awal adalah cacat logika arsitektural fatal.

2. **Kontradiksi Langsung dengan Fitur Challenge Stateful yang Baru Selesai:**
   - *Observasi:* Seksi `app/ijazah/[id]/page.tsx:630-997` baru saja diselesaikan, diaudit, dan dinyatakan *PASS* pada commit `362b728` untuk memenuhi instruksi user 8 Nov 2026 (`ORIGINAL_REQUEST.md`). Fitur ini menggunakan endpoint stateful `/api/verify/challenge` dengan pencatatan nonce di DB.
   - *Penalaran:* Prompt iii menginstruksikan: "Mode stateless-challenge di seksi 'Buktikan Kepemilikan' (app/ijazah/[id]/page.tsx:630-750): nonce dipilih verifier secara lokal ... verifikasi Ed25519 dilakukan lokal". Namun di baris 383, Prompt iii juga menegaskan: "YANG TIDAK BOLEH DIUBAH: perilaku /api/verify dan /api/verify/challenge yang sekarang".
   - *Konsekuensi:* Mengubah seksi "Buktikan Kepemilikan" menjadi stateless di halaman tersebut akan menimpa atau merusak implementasi yang telah diaudit. Selain itu, pada mode stateless murni di browser pengguna, tidak ada pihak ketiga (verifier) independen yang mencatat pembukuan anti-replay. Jika dompet memverifikasi dirinya sendiri di antarmuka lokal, jaminan anti-replay global hilang.

3. **Ketiadaan Data `expectedOwner` pada Kondisi DB Mati:**
   - *Observasi:* Pada implementasi challenge saat ini (`app/ijazah/[id]/page.tsx:402`), nilai `expectedOwner` diambil dari `cert?.walletAddress` yang didapat dari tabel `User`/`Wallet` di Prisma DB.
   - *Penalaran:* Jika verifikasi dilakukan dalam kondisi DB mati (Tingkat-1 mandiri), objek `cert` tidak tersedia. Satu-satunya sumber alamat pemilik sah adalah field `owner` dari hasil pembacaan on-chain Metaplex Core (`inspectCertificate`).
   - *Konsekuensi:* Halaman `app/ijazah/[id]/page.tsx` saat ini sama sekali tidak memanggil `inspectCertificate`. Jika mode stateless dipaksakan tanpa memanggil inspeksi on-chain, kode tidak memiliki referensi siapa pemilik sah ijazah tersebut.

4. **Batasan Hukum UU PDP dan Kemustahilan Rekonstruksi Hash Tanpa Salt:**
   - *Observasi:* Di `lib/crypto.ts:16`, hash dihasilkan dari `nama.trim()|nim.toUpperCase()|prodi|salt`. Di `app/api/admin/delete-pii/route.ts:122`, salt dihapus permanen (`dataSalt: null`) saat hak privasi diterapkan. Salt juga tidak pernah diunggah ke IPFS.
   - *Penalaran:* Algoritma SHA-256 dengan salt 128-bit adalah fungsi satu arah (*cryptographic one-way trapdoor*). Tanpa salt dari DB Tier 1, pencocokan hash dari data identitas mahasiswa secara komputasi mustahil dilakukan.
   - *Konsekuensi:* Jalur verifikasi Tingkat-1 di portal HANYA DAPAT membuktikan: (1) Token NFT ada dan valid di Solana, (2) Diterbitkan oleh authority institusi, (3) Dibekukan permanen (*soulbound*), (4) Memiliki hash integritas tertentu di IPFS, dan (5) Penguasaan kunci privat dompet pemilik melalui tanda tangan Ed25519. Jalur ini TIDAK BISA dan DILARANG mengklaim memverifikasi nama/NIM mahasiswa. Klaim pada Brief-Bab4 baris 370–372 ("Tingkat 2 TIDAK DAPAT DIPASTIKAN tanpa Tier 1 — ini BUKAN vonis tidak valid") adalah benar secara hukum dan kriptografi, dan wajib dijadikan banner peringatan eksplisit di UI.

5. **Kekurangan Field pada `inspectCertificate` untuk Rendering Sertifikat:**
   - *Observasi:* Komponen pratinjau sertifikat `<CertificateUI>` (`components/certificate-ui.tsx:3-9`) membutuhkan properti `prodi` dan `tahunLulus`.
   - *Penalaran:* Fungsi `inspectCertificate` (`lib/onchain.ts:188-230`) saat ini hanya mem-parsing atribut `Data Hash` dari IPFS metadata JSON dan mengabaikan atribut `Program Studi` serta `Tahun Lulus`.
   - *Konsekuensi:* Jika endpoint baru `/api/verify/tingkat-1` hanya mengandalkan `inspectCertificate` yang ada saat ini, antarmuka tidak dapat menampilkan nama Program Studi dan Tahun Kelulusan pada visual sertifikat.

6. **Ambiguitas Definisi "Server Mati" (Next.js Server vs Database Postgres):**
   - *Observasi:* Brief-Bab4 merancang Prompt iii sebagai endpoint Next.js `/api/verify/tingkat-1` (server-side route).
   - *Penalaran:* Jika yang terjadi adalah pemadaman total server institusi (Next.js down, domain down, hosting mati), endpoint `/api/verify/tingkat-1` juga akan mati (HTTP connection refused).
   - *Konsekuensi:* Endpoint `/api/verify/tingkat-1` hanya menyelesaikan skenario "Database PostgreSQL/Prisma mati, tapi Next.js server tetap hidup" (Skenario Parsial). Untuk skenario "Server institusi mati total" (TC-15 sejati), verifikasi Tingkat-1 hanya bisa dilakukan melalui terminal (curl ke RPC publik Solana + IPFS Pinata publik sesuai Langkah 1–4 di §5) atau melalui aplikasi verifikator statis sisi-klien (*pure client-side static verifier*) yang berjalan tanpa backend institusi.

---

## 3. Caveats (Batasan dan Asumsi Analisis)

1. **Investigasi Read-Only:** Analisis ini dilakukan murni melalui inspeksi kode sumber, riwayat git, dan berkas brief tanpa menjalankan server development (`npm run dev`), request jaringan (`curl`, RPC Devnet), maupun mutasi berkas.
2. **Kondisi Kompilasi:** Pada commit terakhir `362b728`, build Next.js dan linting dilaporkan lulus 100% oleh auditor sebelumnya (`auditor_1/handoff.md`). Evaluasi ini tidak menguji ulang build secara aktif untuk mematuhi guardrail R1.
3. **Kepatuhan Guardrails:** Laporan ini tidak merekomendasikan penulisan kode sebelum Juan dan pembimbing memutuskan arah implementasi arsitektur verifikasi tingkat-1.

---

## 4. Conclusion (Kesimpulan Evaluasi Rancangan Area 2)

Rancangan implementasi Prompt iii pada `Brief-Bab4-untuk-Gemini-2026-11-15.md` memiliki **3 kontradiksi arsitektur utama** dan **2 celah implementasi** terhadap kondisi codebase aktual:

### Ringkasan Kontradiksi & Celah Utama
1. **Salah Lokasi & Terblokir DB-First (`app/ijazah/[id]/page.tsx`):**  
   Prompt iii mengarahkan integrasi ke `app/ijazah/[id]/page.tsx:630-750`. Padahal halaman tersebut bergantung mutlak pada endpoint `GET /api/certificate/[id]` yang melakukan lookup CUID ke Prisma DB. Jika DB mati (kondisi TC-15) atau jika pengguna memasukkan alamat mint Solana, halaman langsung menampilkan "Ijazah Tidak Ditemukan" dan kode challenge di baris 630–750 tidak pernah dieksekusi.
2. **Benturan dengan Fitur Challenge yang Sudah Diaudit:**  
   Seksi "Buktikan Kepemilikan" di `app/ijazah/[id]/page.tsx` baru saja selesai dibangun sebagai mekanisme stateful anti-replay via `POST /api/verify/challenge`. Mengubah seksi tersebut menjadi stateless lokal berbenturan dengan guardrail tidak boleh mengubah perilaku yang ada, menghilangkan pembukuan replay attack global, dan kehilangan referensi `expectedOwner` jika DB mati.
3. **Ketidaklengkapan Parser Metadata On-Chain:**  
   Fungsi `inspectCertificate` (`lib/onchain.ts:188-230`) belum mengekstrak atribut `Program Studi` dan `Tahun Lulus` dari JSON IPFS, sehingga antarmuka visual ijazah (`CertificateUI`) tidak memiliki data untuk dirender.
4. **Batas Verifikasi Hukum & Kriptografi Terkonfirmasi:**  
   Konfirmasi bahwa hash on-chain dibentuk dari `nama|nim|prodi|salt` (128-bit salt di DB saja). Tanpa DB Tier 1, hitung-ulang hash secara matematis mustahil. Sikap Brief Bab 4 yang mewajibkan penegasan bahwa Tingkat-1 tidak membuktikan data nominatif adalah 100% tepat dan wajib dipertahankan.
5. **Ambiguitas TC-15 vs Endpoint Server:**  
   Membuat `/api/verify/tingkat-1` di Next.js hanya menguji ketahanan jika DB mati namun server web aktif. Pembuktian TC-15 ketika server institusi mati total tetap paling valid menggunakan pembuktian independen via RPC & IPFS publik (Langkah 1–4 di §5).

### Rekomendasi Tindakan Konkret Sebelum Mengeksekusi Prompt iii
Bila Juan memutuskan untuk mengeksekusi Prompt iii pasca review ini, terapkan arsitektur berikut:
1. **Jangan Ubah `app/ijazah/[id]/page.tsx` Secara Destruktif:**  
   Biarkan seksi "Buktikan Kepemilikan" yang ada tetap berfungsi sebagai challenge stateful resmi saat DB terhubung.
2. **Buat Halaman atau Mode Khusus Pencarian On-Chain:**  
   Sediakan jalur terpisah, misalnya:
   - Menambahkan tab/opsi "Verifikasi On-Chain Mandiri (Alamat Mint NFT)" pada `app/page.tsx`, ATAU
   - Membuat rute mandiri `app/verify-onchain/page.tsx` yang menerima input alamat aset Solana (mint address), memanggil `/api/verify/tingkat-1?asset=<mint>`, dan menampilkan hasil audit on-chain + metadata IPFS.
   - Jika ingin didukung di `app/ijazah/[id]/page.tsx`, buat mekanisme deteksi di mana jika `params.id` adalah base58 alamat mint Solana (panjang 32–44 karakter) atau jika `/api/certificate/[id]` gagal (DB offline), halaman beralih (*fallback*) ke pemanggilan jalur Tingkat-1.
3. **Perkaya `inspectCertificate` di `lib/onchain.ts`:**  
   Tambahkan ekstraksi atribut metadata IPFS untuk `prodi` dan `tahunLulus` agar antarmuka dapat merender pratinjau sertifikat secara utuh tanpa DB.
4. **Gunakan `inspection.owner` Sebagai `expectedOwner` pada Challenge Stateless:**  
   Dalam mode tanpa DB, alamat pemilik yang menjadi acuan pencocokan tanda tangan Ed25519 harus diambil langsung dari `asset.owner` Solana, bukan dari database lokal.

---

## 5. Verification Method (Metode Verifikasi Mandiri)

Untuk memverifikasi secara independen setiap temuan dalam laporan ini tanpa menjalankan dev server atau mutasi kode, gunakan langkah-langkah berikut:

1. **Konfirmasi Ketiadaan `lib/verification.ts`:**
   ```bash
   ls -la lib/verification.ts
   # Hasil yang diharapkan: No such file or directory
   ```

2. **Konfirmasi Rumusan Hash 3 Atribut + Salt:**
   ```bash
   sed -n '10,23p' lib/crypto.ts
   # Hasil yang diharapkan: raw = `${nama.trim()}|${nim.toUpperCase()}|${prodi}|${salt}`;
   ```

3. **Konfirmasi Ketergantungan Prisma DB di `app/api/certificate/[id]/route.ts`:**
   ```bash
   sed -n '19,37p' app/api/certificate/\[id\]/route.ts
   # Hasil yang diharapkan: prisma.certificate.findUnique({ where: { id } }) -> lookup CUID
   ```

4. **Konfirmasi Fail-Closed di `app/ijazah/[id]/page.tsx` Saat Data Gagal Dimuat:**
   ```bash
   sed -n '441,501p' app/ijazah/\[id\]/page.tsx
   # Hasil yang diharapkan: if (error || !cert) return "Ijazah Tidak Ditemukan"
   ```

5. **Konfirmasi Atribut yang Dikembalikan oleh `inspectCertificate`:**
   ```bash
   sed -n '19,32p' lib/onchain.ts
   # Hasil yang diharapkan: owner, name, uri, frozen, dataHash, updateAuthority (tanpa prodi / tahunLulus)
   ```

6. **Konfirmasi Penghapusan Salt pada `delete-pii`:**
   ```bash
   grep -n -C 5 "dataSalt: null" app/api/admin/delete-pii/route.ts
   # Hasil yang diharapkan: data: { dataSalt: null } di baris 122
   ```

---
*Laporan ini disusun dengan integritas bukti kode penuh (`file_path:line`) untuk mendukung keputusan Bab 4 SIJAGA.*
