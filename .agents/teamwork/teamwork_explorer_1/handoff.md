# LAPORAN INVESTIGASI KONTEKS & RANCANGAN PERBAIKAN TC-12 & REVOKED CHALLENGE

**Nomor Dokumen:** `.agents/teamwork/teamwork_explorer_1/handoff.md`  
**Peran:** Brief and Context Explorer (`teamwork_explorer_1`)  
**Target:** Branch `feat/bab4-experiments` (Commit `f7bae08`, baseline `27cffac`)  
**Metodologi:** Read-Only Code, Configuration, Experiment Artifact & Threat Model Forensic Analysis  

---

## 1. OBSERVATION

Berdasarkan inspeksi statis kode sumber, berkas brief, riwayat commit, serta artefak eksperimen sebelumnya di repositori SIJAGA:

### 1.1 Status Repositori dan Git Branch
- **Branch Aktif:** `feat/bab4-experiments` (`git branch --show-current` mengembalikan `feat/bab4-experiments`).
- **Head Commit:** `f7bae08` ("docs: brief Antigravity untuk perbaikan TC-12 + challenge pada ijazah REVOKED"), dengan commit fungsional terakhir `27cffac` ("feat(verify): tingkat-1 issuer + revocation checks, clearer errors, nav + layout fixes").
- **Kondisi Kompilasi Statis:**
  - `npx tsc --noEmit` &rarr; Exit code 0 (0 error).
  - `npx eslint app/api/verify/tingkat-1/route.ts app/verify-onchain/page.tsx app/api/verify/challenge/route.ts lib/challenge.ts app/ijazah/[id]/page.tsx` &rarr; Exit code 0 (0 warning, 0 error).

### 1.2 Observasi Kode Tugas 1 (TC-12: RPC/IPFS Failure Handling)
1. **Endpoint `app/api/verify/tingkat-1/route.ts` (Baris 91–121):**
   ```typescript
   const result = await inspectCertificate(asset);

   if (!result.ok) {
     let statusCode = 502;
     let errorMessage = "Gagal memverifikasi aset di blockchain";

     if (result.reason === "NOT_FOUND") {
       statusCode = 404;
       errorMessage = "Aset tidak ditemukan di blockchain Solana";
     } else if (result.reason === "NOT_ASSET") {
       statusCode = 400;
       errorMessage =
         "Alamat ini bukan aset NFT (kemungkinan alamat dompet, bukan alamat mint). Masukkan alamat mint aset Solana.";
     } else if (result.reason === "METADATA") {
       statusCode = 502;
       errorMessage = "Aset ditemukan, namun metadata IPFS tidak dapat diakses";
     } else if (result.reason === "RPC") {
       statusCode = 503;
       errorMessage = "Koneksi ke Solana RPC mengalami kegagalan / rate limit";
     }

     return NextResponse.json(
       {
         success: false,
         error: errorMessage,
         reason: result.reason,
         asset,
         timings: result.timings,
       },
       { status: statusCode }
     );
   }
   ```
   - Saat `result.reason === "RPC"` atau `result.reason === "METADATA"`, respons yang dihasilkan memiliki struktur kegagalan generik (`success: false`, `reason`, `error`, `asset`, `timings`). Field `verdict` tidak disertakan, dan objek evaluasi rincian `checks` (`tokenExists`, `issuerAuthority`, dsb.) tidak di-generate.
2. **Penanganan Frontend `app/verify-onchain/page.tsx` (Baris 180–195 & 557–566):**
   ```typescript
   const res = await fetch(
     `/api/verify/tingkat-1?asset=${encodeURIComponent(assetToInspect)}`
   );
   const data = await res.json();

   if (!res.ok || !data.success) {
     setError(data.error || "Gagal memverifikasi aset on-chain");
   } else {
     setResult(data);
   }
   ```
   - Jika `!res.ok` (HTTP 502/503), state `result` dibiarkan `null`, dan pesan string disimpan ke state `error`.
   - Akibatnya, pada baris 557–566, UI hanya merender kotak merah error generik (`Verifikasi Gagal: Koneksi ke Solana RPC mengalami kegagalan / rate limit`), sementara kartu bento hasil inspeksi dan vonis formal `"TIDAK DAPAT DIPASTIKAN"` (sesuai klaim draf skripsi Bab 3 Tabel 3.3) sama sekali tidak ditampilkan.
3. **Klaim Draf Skripsi & Uji TC-12 Terdahulu:**
   - Pada `scripts/benchmark/test-tc.ts:749-756`, pengujian TC-12 menguji dead RPC (`http://127.0.0.1:19999`) dan blocked IPFS (`11111111111111111111111111111111`) dengan ekspektasi:  
     `expectedResult: "System does NOT declare diploma valid (status: cannot be determined / UNAVAILABLE / NOT_FOUND)"`.
   - Tabel 3.3 draf skripsi secara eksplisit menetapkan label hasil uji TC-12 sebagai: **"tidak dapat dipastikan"** (bukan error HTTP mentah).

### 1.3 Observasi Kode Tugas 2 (Challenge pada Ijazah REVOKED)
1. **Status Pencabutan di Halaman `app/ijazah/[id]/page.tsx` (Baris 527, 575–589):**
   - Halaman membaca status ijazah melalui `cert = data.certificate` dari `GET /api/certificate/[id]`.
   - Baris 527 mendefinisikan: `const isRevoked = cert.status === "REVOKED";`.
   - Banner peringatan merah dirender di baris 575–589 ("IJAZAH INI TELAH DIREVOKE / DICABUT").
   - Pratinjau sertifikat `<CertificateUI isRevoked={isRevoked} />` merender stempel DIBATALKAN.
2. **Ketiadaan Pengecekan pada Seksi Challenge `app/ijazah/[id]/page.tsx` (Baris 415–440 & 665–720):**
   - Alur fungsi `handleVerifyOwnership` tetap dapat dipanggil tanpa memeriksa `isRevoked` atau `cert.status`.
   - Tombol verifikasi tidak dinonaktifkan saat `isRevoked === true`.
   - Parameter yang dikirim ke backend pada baris 423–430 adalah:
     ```json
     {
       "action": "verify",
       "walletAddress": "...",
       "nonce": "...",
       "signature": "...",
       "message": "...",
       "expectedOwner": cert.walletAddress
     }
     ```
     Parameter `cert.id` atau `cert.status` tidak dikirim ke endpoint `/api/verify/challenge`.
   - Ketika backend merespons `{ verified: true }`, baris 436 mengeksekusi `setChallengeStatus("sukses")`, yang pada baris 709 merender badge hijau:
     `<span className="... bg-emerald-100 text-emerald-800"><CheckCircle2 /> Kepemilikan Terverifikasi</span>`.
3. **Ketiadaan Pengecekan Status di Endpoint `app/api/verify/challenge/route.ts` & `lib/challenge.ts`:**
   - `POST /api/verify/challenge` (baris 44–62) hanya menerima `{ walletAddress, nonce, signature, message, expectedOwner }` dan meneruskannya ke `verifyVerificationChallenge`.
   - `verifyVerificationChallenge` (`lib/challenge.ts:96-223`) murni melakukan verifikasi kriptografis Ed25519 dan pengecekan nonce di tabel `VerificationNonce`. Modul ini sama sekali tidak memeriksa tabel `Certificate` maupun status `REVOKED`.

### 1.4 Inventarisasi Data Uji dan Kunci Devnet
Berdasarkan berkas brief dan artefak `experiments/2026-11-17/tc16-2026-11-17.jsonl`:
- **Admin Institusi (Update Authority):** `Bat5VTbjGqsThS5oERuXVi7d2JY2TBNomJD2ZciaztaQ`
- **Aset Mahasiswa Alifa (NIM F55124011):**
  - Mint Address: `GqM5cbrY3QpPV6cHhaFdYzPcgDjzm9M6TchsxBTkUv1q`
  - Owner Wallet: `DtUVhcmkVnj6nfn8DJWnRiU3RqfSz2APBbGXzFdgxkpx`
  - Metadata IPFS: `QmZeEGn1fnkYztMqrfDRoTC1mMNMusBPDbEqrBFiUTq8kj`
  - Status Terkini: MINTED (sudah di-restore setelah uji pencabutan sebelumnya).
- **Aset Trace P2.6:**
  - Mint Address: `FDQKnrLVQdZqP4efoNarLb87gmZj529kebFPz8SVMQCc`
  - Owner Wallet: `FGpNtVV1bewy5p8YcHAifvEsEZ9ScKeSbjVcF7uE1V5D`
  - CUID Database: `cmw7pykyz0009ijxgm0zy8cg0`
- **Aset Kontrol Non-Admin (Uji Otoritas Penerbit / Issuer Test):**
  - Mint Address: `115L61TA4BnrtxVZzVhZhdRw6VeuKfBWQEKVbATsb6d` ("Robot Buddy #3111", Update Authority: `6kh8YpdfB1xcpSsNtyrKoAPRwfRmGBGA9FSPV2sac7iX`)

---

## 2. LOGIC CHAIN

### 2.1 Rantai Penalaran Tugas 1 (TC-12)
1. **Premis Draf Skripsi:** Tabel 3.3 skripsi mengklaim bahwa dalam skenario kegagalan infrastruktur eksternal (Solana RPC down atau IPFS gateway unreachable), portal SIJAGA memberikan kesimpulan: *"tidak dapat dipastikan"*.
2. **Kondisi Eksisting:** Rute `POST /api/verify/tingkat-1` menangkap kegagalan `inspectCertificate` dan langsung mengembalikan HTTP 502/503 tanpa body terstruktur yang memuat field `verdict`. Di frontend, `fetch` menangkap `!res.ok` lalu langsung menampilkan pesan error jaringan generik.
3. **Analisis Opsi Desain:**
   - **Opsi (a) — HTTP Error (502/503) dengan Body Terstruktur:**
     - *Semantik REST:* Status 502 (Bad Gateway) untuk kegagalan IPFS Gateway dan 503 (Service Unavailable) untuk RPC Solana adalah kode status HTTP standar yang paling akurat untuk merefleksikan kegagalan upstream dependency.
     - *Caching & Proxy:* Mencegah reverse proxy (Cloudflare, Vercel Edge Cache) atau browser menyimpan status kegagalan sementara sebagai respons verifikasi sukses (`200 OK`). Jika dikembalikan HTTP 200 dengan status gagal, cache perantara dapat menyajikan data "tidak dapat dipastikan" secara keliru saat RPC sebenarnya telah pulih.
     - *Monitoring & Observabilitas:* Error rate 5xx tetap terdeteksi oleh sistem telemetri (Sentry, Datadog, log server).
     - *Mekanisme Klien:* `app/verify-onchain/page.tsx` memeriksa apakah respons JSON memuat `verdict === "TIDAK DAPAT DIPASTIKAN"`. Jika ada, data diproses ke state `result` untuk menampilkan tampilan bento status "TIDAK DAPAT DIPASTIKAN" dengan warna amber/kuning, bukan kotak merah error mentah.
   - **Opsi (b) — HTTP 200 dengan Body `verdict: "TIDAK DAPAT DIPASTIKAN"`:**
     - Lebih mudah bagi klien sederhana yang hanya memeriksa `res.ok`, namun mengaburkan kegagalan infrastruktur jaringan dari level protokol HTTP dan berisiko ter-cache di CDN.
4. **Kesimpulan Desain Tugas 1:** Opsi (a) merupakan pilihan superior secara arsitektural. Endpoint tetap mengembalikan HTTP 502/503 (untuk integritas semantik protokol & cache safety), namun menyertakan body JSON lengkap dengan `verdict: "TIDAK DAPAT DIPASTIKAN"` dan rincian `checks` yang menandai komponen yang gagal sebagai "TIDAK DAPAT DIPASTIKAN". Frontend `/verify-onchain` memperlakukan body ini sebagai hasil verifikasi sah bertipe peringatan/tidak pasti.

### 2.2 Rantai Penalaran Tugas 2 (Challenge pada Ijazah REVOKED)
1. **Premis Masalah:** Pencabutan ijazah di SIJAGA menggunakan metode *Visual Revocation* (memperbarui URI metadata on-chain menjadi bertanda `[DIBATALKAN]` dan `Status = "Dibatalkan"`, serta mengubah status DB lokal menjadi `REVOKED`). Dalam Metaplex Core, operasi ini tidak mentransfer aset dari pemiliknya (`ownership.owner` tetap tidak berubah).
2. **Celah Logika:** Karena pemilik aset secara teknis masih memegang private key dari dompet tersebut, penandatanganan kriptografis Ed25519 terhadap pesan tantangan akan selalu valid secara matematika. Namun, dalam konteks verifikasi kredensial akademik, menyatakan "Kepemilikan Terverifikasi" dengan badge hijau pada ijazah yang telah dicabut merupakan kontradiksi fatal dan menyesatkan publik.
3. **Prinsip *Defense-in-Depth* (Dua Lapis Pengamanan):**
   - **Lapis Backend (`/api/verify/challenge`):**
     - Endpoint tidak boleh hanya mengandalkan pengecekan client-side.
     - Parameter verifikasi harus menerima identifier ijazah (misal: `certificateId` atau lookup via `expectedOwner`/`walletAddress`).
     - Jika status sertifikat terkait adalah `REVOKED`, endpoint menolak validasi dengan mengembalikan status gagal: `{ verified: false, error: "CERT_REVOKED", message: "Ijazah ini telah dicabut (REVOKED). Verifikasi kepemilikan tidak dapat disahkan." }` (HTTP 400).
   - **Lapis Frontend (`app/ijazah/[id]/page.tsx`):**
     - Halaman telah memiliki variabel boolean `isRevoked = cert.status === "REVOKED"`.
     - Seksi "Buktikan Kepemilikan" harus secara proaktif mendeteksi `isRevoked`:
       - Tombol "Mulai Verifikasi Kepemilikan" dinonaktifkan atau digantikan dengan banner status pencabutan berwarna merah/amber: *"Verifikasi kepemilikan dinonaktifkan karena dokumen ini telah dicabut."*
       - Jika fungsi penandatanganan dijalankan secara manual atau dipaksa, handler langsung menghentikan proses sebelum memanggil dompet.
       - Jika backend mengembalikan error `CERT_REVOKED`, UI merender badge status khusus: *"Verifikasi Ditolak (Ijazah Dicabut)"*, bukan status sukses hijau.

---

## 3. CAVEATS

1. **Integritas Lingkungan Database Cloud Remote:**
   - SIJAGA menggunakan Neon Serverless Postgres di cloud (`ep-still-flower-az5db3kt-pooler...`). Tidak ada kontainer database lokal (`docker stop` tidak berlaku).
   - Segala pengujian mutasi status pencabutan (seperti me-revoke aset Alifa) wajib dikembalikan (*restore*) ke status semula setelah pengujian selesai agar tidak merusak data uji regresi tim lain.
2. **Independensi Kriptografis Challenge:**
   - Logika kriptografis dasar di `lib/challenge.ts` (membangkitkan nonce 128-bit, batas kedaluwarsa 5 menit, *single-use consumption*, rate limit 20 req/menit, dan verifikasi detached Ed25519) telah terbukti aman dan memenuhi seluruh uji TC-05 & TC-06. Modifikasi HANYA boleh menambahkan evaluasi status `REVOKED`, tanpa mengubah struktur pesan dan verifikasi tanda tangan itu sendiri.
3. **Perilaku Khusus Endpoint Tingkat-1 Mandiri:**
   - Endpoint `/api/verify/tingkat-1` sengaja dibuat 100% bebas Prisma/database untuk skenario TC-15. Oleh karena itu, Tugas 1 pada endpoint tingkat-1 tidak boleh menambahkan impor `@/lib/prisma`. Penanganan kegagalan RPC/IPFS di tingkat-1 murni didasarkan pada respons `inspectCertificate`.
4. **Pencegahan Error RPC Devnet:**
   - RPC Solana Devnet publik (`api.devnet.solana.com`) memiliki pembatasan laju (*rate limiting*). Pengujian tidak boleh melakukan spam kueri on-chain berulang dalam waktu singkat.

---

## 4. CONCLUSION

1. **Penyebab Akar TC-12:** Endpoint `POST /api/verify/tingkat-1` melempar HTTP 502/503 tanpa atribut `verdict` terstruktur, dan frontend menangani non-200 secara biner sebagai error koneksi mentah. Solusi terbaik adalah mengadopsi **Pendekatan (a)**: endpoint mempertahankan status HTTP 502/503 namun mengembalikan payload JSON lengkap dengan `verdict: "TIDAK DAPAT DIPASTIKAN"`, rincian `checks` yang informatif, dan halaman `/verify-onchain` diperbarui untuk merender kartu bento amber "TIDAK DAPAT DIPASTIKAN".
2. **Penyebab Akar Revoked Challenge:** Komponen UI `app/ijazah/[id]/page.tsx` dan endpoint `POST /api/verify/challenge` terpisah dari status model `Certificate`. Challenge hanya mencocokkan kepemilikan kunci privat Ed25519 dompet tanpa memvalidasi keabsahan yuridis sertifikat. Solusi wajib menerapkan **Defense-in-Depth**: Lapis API menolak verifikasi bila status sertifikat `REVOKED` (`CERT_REVOKED`), dan Lapis UI menonaktifkan tombol serta menampilkan status penolakan pencabutan.
3. **Kepatuhan Guardrails:**
   - Kasus sukses (`DAPAT DIPERIKSA`), 404 (`NOT_FOUND`), 400 (`NOT_ASSET`), dan `DICABUT` pada tingkat-1 tetap utuh tanpa perubahan.
   - Kasus challenge normal (positif kepemilikan dan negatif `OWNER_MISMATCH`) pada ijazah aktif tetap utuh.
   - Baseline fakta skripsi (28/30 mint, biaya 0,0032626 SOL, biaya revoke 0,00015 SOL, formula hash 3 atribut + salt) terlindungi sepenuhnya.

---

## 5. VERIFICATION METHOD

Untuk memverifikasi rekomendasi ini secara independen oleh implementer dan auditor:

### 5.1 Perintah Pemeriksaan Integritas & Tipe Data
```bash
# 1. Pastikan branch aktif adalah feat/bab4-experiments
git branch --show-current

# 2. Jalankan TypeCheck (harus 0 error)
npx tsc --noEmit

# 3. Jalankan Linter pada berkas terkait
npx eslint app/api/verify/tingkat-1/route.ts \
           app/verify-onchain/page.tsx \
           app/api/verify/challenge/route.ts \
           lib/challenge.ts \
           app/ijazah/[id]/page.tsx
```

### 5.2 Strategi Uji Simulasi Tugas 1 (TC-12)
1. **Simulasi RPC Mati:**
   - Panggil `inspectCertificate` atau rute tingkat-1 dengan mengarahkan RPC ke port mati: `http://127.0.0.1:19999`.
   - Periksa respons HTTP: Status 503 Service Unavailable.
   - Periksa payload respons: Memuat `verdict: "TIDAK DAPAT DIPASTIKAN"` dan status cek `tokenExists: { status: "TIDAK DAPAT DIPASTIKAN" }`.
   - Buka halaman `/verify-onchain` di peramban, verifikasi bahwa UI menampilkan kartu bento dengan vonis "TIDAK DAPAT DIPASTIKAN" (warna amber/kuning), bukan error generik.
2. **Uji Regresi Tingkat-1 (Tidak Boleh Berubah):**
   - Aset Valid Trace P2.6 (`FDQKnrLVQdZqP4efoNarLb87gmZj529kebFPz8SVMQCc`): HTTP 200, `verdict: "DAPAT DIPERIKSA"`.
   - Alamat Dompet (`DtUVhcmkVnj6nfn8DJWnRiU3RqfSz2APBbGXzFdgxkpx`): HTTP 400, `NOT_ASSET`.
   - Alamat Acak Tidak Terdaftar: HTTP 404, `NOT_FOUND`.

### 5.3 Strategi Uji Tugas 2 (Challenge pada Ijazah REVOKED)
1. **Uji Ijazah Dicabut:**
   - Siapkan data ijazah berstatus `REVOKED` (atau lakukan revoke sementara pada aset uji Alifa via UI admin).
   - Akses `/ijazah/[id]`:
     - Verifikasi tombol verifikasi kepemilikan dinonaktifkan atau memuat peringatan bahwa ijazah dicabut.
     - Lakukan pengujian pemanggilan langsung `POST /api/verify/challenge` dengan `action: "verify"` dan `certificateId`:
       Verifikasi bahwa endpoint mengembalikan HTTP 400 dengan error `CERT_REVOKED` dan `verified: false`.
     - Pastikan UI TIDAK PERNAH menampilkan badge hijau "Kepemilikan Terverifikasi".
   - *PENTING:* Jika menggunakan aset Alifa, kembalikan statusnya (*restore*) ke `MINTED` segera setelah pengujian selesai melalui modul recovery admin.
2. **Uji Regresi Ijazah Aktif (Tidak Boleh Berubah):**
   - Ijazah berstatus `MINTED` / `CLAIMED`: Challenge dengan dompet pemilik tetap mengembalikan `verified: true` dan menampilkan "Kepemilikan Terverifikasi".
   - Challenge dengan dompet pihak ketiga tetap mengembalikan HTTP 400 dengan error `OWNER_MISMATCH`.

### 5.4 Kondisi Pembatalan (*Invalidation Conditions*)
Temuan dan rekomendasi laporan ini dinyatakan gugur apabila:
- Terjadi modifikasi pada formula hash identitas (`nama`, `nim`, `prodi`, `salt`) di `lib/crypto.ts`.
- Terjadi penambahan query database Prisma pada endpoint mandiri `app/api/verify/tingkat-1/route.ts` (melanggar prinsip kemandirian TC-15 & TC-16).
- Logika kriptografis nonce Ed25519 diubah sehingga melanggar pengujian keamanan TC-05 atau TC-06.
