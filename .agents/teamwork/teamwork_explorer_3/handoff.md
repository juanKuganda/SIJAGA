# Handoff Report: Investigasi & Rancangan Tugas 2 — Challenge pada Ijazah REVOKED

**ID Agen:** `teamwork_explorer_3`  
**Peran:** Revoked Challenge Explorer  
**Fokus Tugas:** Tugas 2 — Challenge pada ijazah REVOKED tidak boleh "Kepemilikan Terverifikasi"  
**Tanggal:** 17 November 2026  
**Branch:** `feat/bab4-experiments`  

---

## 1. Observation (Fakta & Pengamatan Langsung)

### 1.1 Alur Challenge Saat Ini di Halaman Ijazah (`app/ijazah/[id]/page.tsx`)
- **Pengambilan Data Ijazah & Flag `isRevoked`:**
  - Baris 466–478 memanggil endpoint `GET /api/certificate/${resolvedParams.id}` saat komponen dimuat.
  - Baris 527 mendefinisikan flag:
    ```typescript
    const isRevoked = cert.status === "REVOKED";
    ```
  - Flag `isRevoked` hanya digunakan pada dua titik:
    1. Baris 575–589: Menampilkan banner merah `"IJAZAH INI TELAH DIREVOKE / DICABUT"`.
    2. Baris 600: Diteruskan ke prop `<CertificateUI isRevoked={isRevoked} ... />` untuk merender stempel visual pembatalan.
- **Pengabaian `isRevoked` pada Seksi Tantangan ("Buktikan Kepemilikan"):**
  - Baris 665–1018: Seluruh blok `"Seksi Buktikan Kepemilikan"` tidak pernah mengecek `isRevoked`.
  - Baris 678–684: Status badge merender `"Siap Memverifikasi"` meskipun ijazah berstatus `REVOKED`.
  - Baris 976–1000: Tombol `"Hubungkan Dompet & Tanda Tangani"`:
    ```typescript
    <button
      onClick={handleVerifyOwnership}
      disabled={
        challengeStatus === "connecting" ||
        challengeStatus === "challenge diminta" ||
        challengeStatus === "menunggu tanda tangan" ||
        challengeStatus === "memverifikasi"
      }
      className="..."
    >
      <KeyRound className="w-4 h-4 text-red-500" />
      {challengeStatus === "idle"
        ? "Hubungkan Dompet & Tanda Tangani"
        : ...}
    </button>
    ```
    Tombol ini **tetap aktif dan dapat diklik** pada ijazah `REVOKED`.
  - Baris 301–463 (`handleVerifyOwnership`): Fungsi verifikasi tidak memiliki penjaga (`guard clause`) untuk `isRevoked`.
  - Baris 351–355: Permintaan challenge (Mode B) dikirim hanya dengan `{ walletAddress }`:
    ```typescript
    const challengeRes = await fetch("/api/verify/challenge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress }),
    });
    ```
  - Baris 420–431: Verifikasi tanda tangan (Mode A) dikirim dengan:
    ```typescript
    const verifyRes = await fetch("/api/verify/challenge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "verify",
        walletAddress,
        nonce: freshChallenge.nonce,
        signature,
        message: freshChallenge.message,
        expectedOwner,
      }),
    });
    ```
    Tidak ada `certificateId` maupun `status` yang dikirimkan.
  - Baris 435–439 & Baris 708–713 & Baris 868–915:
    Jika dompet yang menandatangani cocok dengan `expectedOwner` (`cert.walletAddress`), endpoint mengembalikan `verified: true`.
    Akibatnya, antarmuka beralih ke state `challengeStatus === "sukses"` dan merender:
    - Badge: `"Kepemilikan Terverifikasi"` (warna hijau).
    - Banner: `"Kepemilikan Terverifikasi — Dompet ini pemilik sah ijazah. Tanda tangan digital kriptografis Ed25519 berhasil diverifikasi dan sesuai dengan alamat pemilik yang terdaftar pada sistem."`
    Kondisi ini tampil tepat di bawah banner merah pencabutan, menghasilkan kontradiksi status yang membingungkan penguji dan publik.

### 1.2 Alur Endpoint di API (`app/api/verify/challenge/route.ts`)
- Baris 43–81 (Mode A: Verifikasi):
  - Request body yang diekstrak: `{ walletAddress, nonce, signature, message, expectedOwner }`.
  - Route tidak menerima maupun mencari informasi status ijazah (`cert.status`).
  - Baris 56–62 memanggil `verifyVerificationChallenge(...)` di `lib/challenge.ts`.
  - Jika tanda tangan Ed25519 valid dan `expectedOwner === walletAddress`, route mengembalikan:
    ```typescript
    return NextResponse.json({
      verified: true,
      walletAddress: result.walletAddress,
      nonce: result.nonce,
      message: "Tanda tangan tantangan berhasil diverifikasi secara kriptografis.",
    });
    ```
- Baris 83–109 (Mode B: Penerbitan Nonce):
  - Request body yang diekstrak: `{ walletAddress }`.
  - Nonce 128-bit dibangkitkan dan disimpan ke tabel `VerificationNonce` tanpa memeriksa apakah wallet tersebut diasosiasikan dengan ijazah yang dicabut.

### 1.3 Inti Kriptografi (`lib/challenge.ts`)
- Baris 39–69 (`createVerificationChallenge`): Menghasilkan nonce 128-bit (16 bytes random hex) dengan masa berlaku 5 menit (`CHALLENGE_EXPIRY_MS = 5 * 60 * 1000`).
- Baris 96–223 (`verifyVerificationChallenge`):
  Menegakkan 8 tahap validasi:
  1. Keberadaan nonce di DB (`NONCE_NOT_FOUND`).
  2. Nonce belum pernah terpakai / anti-replay (`NONCE_ALREADY_USED`).
  3. Nonce belum kedaluwarsa (`NONCE_EXPIRED`).
  4. Kecocokan wallet peminta (`WALLET_MISMATCH`).
  5. Kecocokan pemilik aset (`OWNER_MISMATCH`).
  6. Integritas pesan UTF-8 byte-exact (`MESSAGE_MISMATCH`).
  7. Tanda tangan Ed25519 via `tweetnacl` (`INVALID_SIGNATURE`).
  8. Pembaharuan atomik `usedAt = new Date()` (single-use enforcement).
- Skrip pengujian eksisting:
  `scripts/test-challenge.ts` (baris 31) dan `scripts/benchmark/test-tc.ts` (baris 303, 326, 340, 357, 372) memanggil `verifyVerificationChallenge` langsung tanpa parameter `certificateId`.

### 1.4 Skema Database (`prisma/schema.prisma`)
- Model `Certificate` (baris 55–90):
  - Kolom `id`: string CUID (`@id @default(cuid())`).
  - Kolom `status`: enum `CertStatus` (`NOT_ISSUED`, `ISSUING`, `MINTED`, `CLAIMED`, `REVOKED`).
  - Kolom `nftAddress`: string unik Solana mint address.
  - Kolom `revokeReason`: string alasan pencabutan.
  - Relasi ke `User` via `userId`.
- Tidak ada perubahan skema Prisma / migrasi database yang diperlukan; seluruh kolom dan enum sudah tersedia.

---

## 2. Logic Chain (Rantai Penalaran)

1. **Masalah Fundamental:**
   - Kriptografi Ed25519 memverifikasi kepemilikan *kunci privat* (private key) dari suatu alamat dompet Solana. Pencabutan ijazah (*revocation*) tidak dan tidak boleh menghapus kunci privat dari dompet mahasiswa.
   - Oleh karena itu, tanda tangan kriptografis dari pemilik ijazah yang dicabut akan *selalu sah secara matematis*.
   - Namun, dalam konteks sistem verifikasi kredensial akademik (SIJAGA), vonis `"Kepemilikan Terverifikasi"` bukan sekadar verifikasi kriptografi kosong, melainkan pengakuan bahwa pemegang dompet adalah *pemilik sah atas kredensial akademik yang berlaku*.
   - Ketika ijazah berstatus `REVOKED`, klaim hak akademik tersebut telah dibatalkan institusi. Menyatakan `"Kepemilikan Terverifikasi"` pada ijazah yang telah dicabut merupakan cacat logika bisnis dan bertentangan dengan draf Bab 3 (Tabel 3.3).

2. **Pemilihan Lokasi Validasi Status Pencabutan:**
   - *On-Chain vs Database:*
     - Pengecekan on-chain via Solana RPC (`inspectCertificate`) memakan waktu 500–2.000 ms, rentan terkena *rate limit* devnet (sebagaimana ditegaskan pada aturan proyek: *"Hemat panggilan RPC devnet (jangan spam)"*), dan menambah titik kegagalan pada operasi penandatanganan interaktif.
     - Pengecekan lokal via Prisma (`prisma.certificate.findUnique`) memakan waktu <5 ms, 100% andal, dan konsisten dengan arsitektur Tingkat 2 SIJAGA (DB-first Tier 1).
     - Di SIJAGA (`app/api/nft/revoke/route.ts`), status di database diupdate ke `REVOKED` tepat setelah on-chain revoke berhasil. Jadi database adalah representasi otoritatif institusi untuk status ijazah di Tingkat 2.
   - *Kesimpulan Lokasi Validasi:* Pengecekan status pencabutan harus dilakukan pada database melalui Prisma.

3. **Strategi Pertahanan Berlapis (Defense in Depth):**
   - **Lapis 1 — UI (`app/ijazah/[id]/page.tsx`):**
     - Mencegah kebingungan pengguna sebelum tanda tangan diminta.
     - Jika `isRevoked === true`:
       - Tampilkan badge `"Ijazah Dicabut"` (merah), bukan `"Siap Memverifikasi"`.
       - Tampilkan banner peringatan di seksi challenge bahwa kredensial dicabut sehingga pembuktian kepemilikan dinonaktifkan.
       - Nonaktifkan tombol challenge (`disabled={isRevoked || ...}`) dengan label `"Ijazah Telah Dicabut"`.
       - Tambahkan *client guard* di `handleVerifyOwnership`: jika ijazah `REVOKED`, langsung set status `"gagal"` dengan `errorCode = "CERT_REVOKED"` tanpa membuka dompet.
       - Tambahkan *guard* pada handler respon sukses: jangan pernah izinkan transisi ke `challengeStatus === "sukses"` jika `isRevoked === true`.
   - **Lapis 2 — API (`app/api/verify/challenge/route.ts`):**
     - Mencegah manipulasi klien (misal jika tombol diaktifkan lewat DevTools atau dipanggil langsung via `curl`/skrip).
     - Klien mengirim `certificateId: resolvedParams.id` baik pada Mode B (minta challenge) maupun Mode A (verifikasi tanda tangan).
     - Di Mode B: Jika `certificateId` berstatus `REVOKED`, tolak penerbitan nonce dengan HTTP 400:
       `{ success: false, error: "CERT_REVOKED", message: "Ijazah ini telah dicabut oleh Universitas Tadulako. Tantangan verifikasi tidak dapat diterbitkan untuk ijazah yang telah dicabut." }`.
     - Di Mode A: Jika `certificateId` berstatus `REVOKED`, tolak verifikasi dengan HTTP 400:
       `{ verified: false, error: "CERT_REVOKED", message: "Ijazah ini telah dicabut oleh Universitas Tadulako. Kepemilikan tidak dapat diverifikasi untuk ijazah yang telah dicabut." }`.
   - **Lapis 3 — Core Lib (`lib/challenge.ts`):**
     - Fungsi `verifyVerificationChallenge` menerima parameter opsional `certificateId?: string`.
     - Jika `certificateId` disertakan dan record di DB berstatus `REVOKED`, kembalikan `{ success: false, error: "CERT_REVOKED", ... }`.
     - Karena parameter ini bersifat *opsional*, skrip pengujian eksisting (TC-05 dan TC-06 pada `scripts/test-challenge.ts` dan `scripts/benchmark/test-tc.ts`) tetap berjalan lancar tanpa mengalami regresi.

4. **Kepatuhan Kriptografi:**
   - Logika kriptografi tweetnacl, format pesan byte-exact, expiry 5 menit, single-use anti-replay, dan rate limiter tetap 100% utuh tanpa modifikasi apa pun.

---

## 3. Caveats (Batasan & Asumsi)

1. **Lingkungan Sandbox & Neon Database:**
   - Perintah terminal lokal yang memerlukan koneksi jaringan ke Neon PostgreSQL (`ep-still-flower-...aws.neon.tech`) tidak dapat dieksekusi secara unsandboxed tanpa persetujuan eksplisit pengguna. Namun, struktur skema Prisma (`prisma/schema.prisma`) dan seluruh kode pemanggil telah diverifikasi secara statis.
2. **Aset Uji Devnet Alifa:**
   - Aset Alifa (`GqM5cbrY3QpPV6cHhaFdYzPcgDjzm9M6TchsxBTkUv1q`) saat ini berstatus `MINTED` (telah di-restore). Pengujian langsung dengan me-revoke aset Alifa harus dilakukan dengan hati-hati dan di-restore kembali sesudah pengujian agar tidak merusak data uji lingkungan bersama.
3. **Pemberian `certificateId`:**
   - Desain mengasumsikan halaman ijazah (`app/ijazah/[id]/page.tsx`) selalu memiliki `resolvedParams.id` (CUID sertifikat) yang valid, yang selalu benar karena halaman ijazah diakses via rute `/ijazah/[id]`.

---

## 4. Conclusion & Rekomendasi Solusi

Tugas 2 dapat diselesaikan secara tuntas dan elegan melalui perbaikan pada 3 file kunci tanpa menambah dependensi baru dan tanpa mengubah logika inti kriptografi:

### Rincian Perubahan yang Direkomendasikan:

#### Berkas 1: `lib/challenge.ts`
1. Tambahkan `"CERT_REVOKED"` ke tipe union error `ChallengeVerificationResult`:
   ```typescript
   export type ChallengeVerificationResult =
     | { success: true; walletAddress: string; nonce: string }
     | {
         success: false;
         error:
           | "NONCE_NOT_FOUND"
           | "NONCE_EXPIRED"
           | "NONCE_ALREADY_USED"
           | "MESSAGE_MISMATCH"
           | "WALLET_MISMATCH"
           | "OWNER_MISMATCH"
           | "INVALID_SIGNATURE"
           | "MALFORMED_INPUT"
           | "CERT_REVOKED";
         message: string;
       };
   ```
2. Tambahkan `certificateId?: string` pada parameter `verifyVerificationChallenge`:
   ```typescript
   export async function verifyVerificationChallenge(params: {
     walletAddress: string;
     nonce: string;
     signature: string;
     message: string;
     expectedOwner?: string;
     certificateId?: string;
   }): Promise<ChallengeVerificationResult> {
     const { walletAddress, nonce, signature, message, expectedOwner, certificateId } = params;
     ...
     // Pengecekan status pencabutan ijazah (jika certificateId disediakan)
     if (certificateId) {
       const cert = await prisma.certificate.findUnique({
         where: { id: certificateId },
         select: { status: true },
       });
       if (cert && cert.status === "REVOKED") {
         return {
           success: false,
           error: "CERT_REVOKED",
           message: "Ijazah ini telah dicabut oleh Universitas Tadulako. Kepemilikan tidak dapat diverifikasi untuk ijazah yang telah dicabut.",
         };
       }
     }
     ...
   ```

#### Berkas 2: `app/api/verify/challenge/route.ts`
1. Pada **Mode B** (Permintaan Nonce Baru):
   Ekstrak `certificateId` opsional dari body request. Jika ijazah terkait berstatus `REVOKED`, tolak penerbitan nonce:
   ```typescript
   const { walletAddress, certificateId } = body;
   ...
   if (certificateId && typeof certificateId === "string") {
     const cert = await prisma.certificate.findUnique({
       where: { id: certificateId },
       select: { status: true, revokeReason: true },
     });
     if (cert && cert.status === "REVOKED") {
       return NextResponse.json(
         {
           success: false,
           error: "CERT_REVOKED",
           message: "Ijazah ini telah dicabut oleh Universitas Tadulako. Tantangan verifikasi tidak dapat diterbitkan untuk ijazah yang telah dicabut.",
           revokeReason: cert.revokeReason,
         },
         { status: 400 }
       );
     }
   }
   ```
2. Pada **Mode A** (Verifikasi Tanda Tangan):
   Ekstrak `certificateId` dan teruskan ke `verifyVerificationChallenge`:
   ```typescript
   const { walletAddress, nonce, signature, message, expectedOwner, certificateId } = body;
   ...
   // Jika certificateId tidak dikirim namun expectedOwner tersedia, lakukan fallback query ke active certificate pemilik
   let targetCertId = certificateId;
   if (!targetCertId && expectedOwner) {
     const ownerUser = await prisma.user.findFirst({
       where: { wallet: { walletAddress: expectedOwner } },
       include: { certificate: true },
     });
     if (ownerUser?.certificate?.status === "REVOKED") {
       return NextResponse.json(
         {
           verified: false,
           error: "CERT_REVOKED",
           message: "Ijazah ini telah dicabut oleh Universitas Tadulako. Kepemilikan tidak dapat diverifikasi untuk ijazah yang telah dicabut.",
         },
         { status: 400 }
       );
     }
   }

   const result = await verifyVerificationChallenge({
     walletAddress,
     nonce,
     signature,
     message,
     expectedOwner,
     certificateId: targetCertId,
   });

   if (!result.success) {
     return NextResponse.json(
       {
         verified: false,
         error: result.error,
         message: result.message,
       },
       { status: 400 }
     );
   }
   ```

#### Berkas 3: `app/ijazah/[id]/page.tsx`
1. Sertakan `certificateId: resolvedParams.id` pada kedua panggilan `fetch("/api/verify/challenge")`:
   - Pada baris 354:
     ```typescript
     body: JSON.stringify({ walletAddress, certificateId: resolvedParams.id }),
     ```
   - Pada baris 423:
     ```typescript
     body: JSON.stringify({
       action: "verify",
       walletAddress,
       nonce: freshChallenge.nonce,
       signature,
       message: freshChallenge.message,
       expectedOwner,
       certificateId: resolvedParams.id,
     }),
     ```
2. Tambahkan penjaga awal pada `handleVerifyOwnership`:
   ```typescript
   if (isRevoked) {
     setChallengeStatus("gagal");
     setErrorCode("CERT_REVOKED");
     setErrorMessage("Ijazah ini telah dicabut oleh universitas. Verifikasi kepemilikan tidak dapat dilakukan.");
     return;
   }
   ```
3. Tambahkan penjaga pada penentuan status sukses:
   ```typescript
   if (verifyRes.ok && verifyJson.verified && !isRevoked) {
     setChallengeStatus("sukses");
     setErrorCode(null);
     setErrorMessage(null);
   } else {
     setChallengeStatus("gagal");
     setErrorCode(verifyJson.error || (isRevoked ? "CERT_REVOKED" : "VERIFICATION_FAILED"));
     setErrorMessage(pesanRamah(verifyJson, "Verifikasi tidak dapat dilakukan."));
   }
   ```
4. Perbarui Status Badge di Seksi Buktikan Kepemilikan:
   Jika `isRevoked`, tampilkan:
   ```tsx
   {isRevoked ? (
     <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
       <XCircle className="w-3.5 h-3.5 text-red-600" />
       Ijazah Dicabut
     </span>
   ) : (
     /* status badge yang lama */
   )}
   ```
5. Tambahkan Banner Informasi Pencabutan di dalam Seksi Buktikan Kepemilikan:
   ```tsx
   {isRevoked && (
     <div className="mb-6 p-4 bg-red-50/80 border border-red-200 rounded-xl flex items-start gap-3">
       <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
       <div className="text-xs text-red-800">
         <p className="font-bold text-red-900">
           Pembuktian Kepemilikan Dinonaktifkan
         </p>
         <p className="mt-0.5">
           Ijazah ini berstatus <strong>REVOKED</strong> (telah dicabut oleh Universitas Tadulako). Kredensial akademik yang sudah dibatalkan tidak dapat diverifikasi kepemilikannya.
         </p>
         {cert.revokeReason && (
           <p className="mt-1 text-red-700 font-medium">
             Alasan: {cert.revokeReason}
           </p>
         )}
       </div>
     </div>
   )}
   ```
6. Perbarui State Tombol Verifikasi:
   - Tombol utama diberi `disabled={isRevoked || challengeStatus === "connecting" || ...}`.
   - Teks tombol saat `isRevoked`: `"Ijazah Telah Dicabut"`.
7. Tambahkan penanganan pesan error `errorCode === "CERT_REVOKED"` pada kotak pesan gagal (baris 925–950):
   - Judul: `"Ijazah Telah Dicabut"`
   - Deskripsi: `"Ijazah ini telah dicabut oleh Universitas Tadulako. Pembuktian kepemilikan tidak dapat memverifikasi kredensial yang sudah tidak berlaku."`

---

## 5. Verification Method (Metode Verifikasi Independen)

Implementer dan Victory Auditor dapat memverifikasi perbaikan ini secara independen melalui langkah-langkah berikut:

### 5.1 Pengujian Regresi Otomatis (Tanpa Merusak Kriptografi)
Jalankan typecheck TypeScript untuk memastikan tipe discriminated union dan parameter aman:
```bash
npx tsc --noEmit
```
*Kondisi Keberhasilan:* Exit code 0, tidak ada error tipe baru.

### 5.2 Pengujian API Langsung (cURL / HTTP Client)
1. **Uji Kasus Negatif (Ijazah REVOKED):**
   Panggil endpoint challenge dengan `certificateId` ijazah REVOKED:
   ```bash
   curl -s -X POST http://localhost:3000/api/verify/challenge \
     -H "Content-Type: application/json" \
     -d '{"walletAddress":"DtUVhcmkVnj6nfn8DJWnRiU3RqfSz2APBbGXzFdgxkpx","certificateId":"<ID_REVOKED>"}'
   ```
   *Kondisi Keberhasilan:*
   - HTTP Status: `400 Bad Request`
   - Response body:
     ```json
     {
       "success": false,
       "error": "CERT_REVOKED",
       "message": "Ijazah ini telah dicabut oleh Universitas Tadulako. Tantangan verifikasi tidak dapat diterbitkan untuk ijazah yang telah dicabut."
     }
     ```
2. **Uji Kasus Regresi Positif (Ijazah MINTED / Normal):**
   Panggil endpoint challenge dengan `certificateId` ijazah valid:
   ```bash
   curl -s -X POST http://localhost:3000/api/verify/challenge \
     -H "Content-Type: application/json" \
     -d '{"walletAddress":"DtUVhcmkVnj6nfn8DJWnRiU3RqfSz2APBbGXzFdgxkpx","certificateId":"<ID_MINTED>"}'
   ```
   *Kondisi Keberhasilan:*
   - HTTP Status: `200 OK`
   - Response body memuat `nonce` 128-bit unik dan `message`.
3. **Uji Kasus Regresi TC-06b (OWNER_MISMATCH):**
   Verifikasi tanda tangan menggunakan dompet yang berbeda dengan pemilik ijazah.
   *Kondisi Keberhasilan:*
   - Mengembalikan `verified: false`, `error: "OWNER_MISMATCH"`.

### 5.3 Pengujian Antarmuka UI (`app/ijazah/[id]`)
1. Buka halaman ijazah berstatus `REVOKED` di browser:
   - Verifikasi badge status di seksi Buktikan Kepemilikan bertuliskan `"Ijazah Dicabut"` dengan warna merah.
   - Verifikasi adanya kotak peringatan `"Pembuktian Kepemilikan Dinonaktifkan"`.
   - Verifikasi tombol verifikasi bertuliskan `"Ijazah Telah Dicabut"` dan dalam kondisi *disabled*.
   - Verifikasi sama sekali **TIDAK ADA** teks atau badge `"Kepemilikan Terverifikasi"` (warna hijau).
2. Buka halaman ijazah normal (`MINTED` / `CLAIMED`):
   - Verifikasi tombol tetap aktif, dapat melakukan alur challenge secara normal, dan menampilkan `"Kepemilikan Terverifikasi"` saat tanda tangan valid diberikan oleh dompet yang sesuai.

### 5.4 Kondisi Pembatalan / Invalidation Conditions
- Jika perbaikan menyebabkan skrip pengujian kriptografi TC-05/TC-06 (`scripts/test-challenge.ts` atau `scripts/benchmark/test-tc.ts`) gagal karena parameter `certificateId` diwajibkan (harus tetap opsional pada library core).
- Jika ijazah yang dicabut masih dapat memicu kemunculan badge atau teks `"Kepemilikan Terverifikasi"` pada kondisi jaringan apa pun.
