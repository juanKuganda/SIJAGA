# LAPORAN INVESTIGASI & REKOMENDASI DESAIN TC-12 (RPC/IPFS MATI → "TIDAK DAPAT DIPASTIKAN")

**Penyusun:** `teamwork_explorer_2` (TC-12 RPC/IPFS Explorer)  
**Tanggal:** 17 November 2026  
**Dokumen Referensi:**  
- `Brief-Antigravity-TC12-Challenge-REVOKED-2026-11-17.md` (Tugas 1)  
- `.agents/teamwork/ORIGINAL_REQUEST.md`  
- Draf Skripsi Bab 3 (Tabel 3.3, Kasus Uji TC-12)  
- Dokumen Eksekusi Terdahulu: `.agents/teamwork/2026-11-15-eksekusi-bab4-tingkat1-tc15.md`  
**Status Investigasi:** SELESAI (Read-Only Analysis)

---

## 1. OBSERVATION

Berdasarkan pemeriksaan mendalam terhadap berkas sumber:

### 1.1 Penanganan Error Saat Ini pada `app/api/verify/tingkat-1/route.ts`
Pada berkas `app/api/verify/tingkat-1/route.ts` baris 91–122:
```typescript
91:  const result = await inspectCertificate(asset);
92:
93:  if (!result.ok) {
94:    let statusCode = 502;
95:    let errorMessage = "Gagal memverifikasi aset di blockchain";
96:
97:    if (result.reason === "NOT_FOUND") {
98:      statusCode = 404;
99:      errorMessage = "Aset tidak ditemukan di blockchain Solana";
100:   } else if (result.reason === "NOT_ASSET") {
101:     statusCode = 400;
102:     errorMessage =
103:       "Alamat ini bukan aset NFT (kemungkinan alamat dompet, bukan alamat mint). Masukkan alamat mint aset Solana.";
104:   } else if (result.reason === "METADATA") {
105:     statusCode = 502;
106:     errorMessage = "Aset ditemukan, namun metadata IPFS tidak dapat diakses";
107:   } else if (result.reason === "RPC") {
108:     statusCode = 503;
109:     errorMessage = "Koneksi ke Solana RPC mengalami kegagalan / rate limit";
110:   }
111:
112:   return NextResponse.json(
113:     {
114:       success: false,
115:       error: errorMessage,
116:       reason: result.reason,
117:       asset,
118:       timings: result.timings,
119:     },
120:     { status: statusCode }
121:   );
122: }
```
- **Fakta Teramati:**
  1. Jika Solana RPC mati/timeout/unreachable, `result.reason === "RPC"`, endpoint mengembalikan HTTP 503 dengan payload mentah `{ success: false, error: "Koneksi ke Solana RPC...", reason: "RPC", asset, timings }`.
  2. Jika IPFS gateway mati/timeout, `result.reason === "METADATA"`, endpoint mengembalikan HTTP 502 dengan payload mentah `{ success: false, error: "Aset ditemukan, namun metadata IPFS...", reason: "METADATA", asset, timings }`.
  3. Pada kedua kondisi di atas, payload **TIDAK** memuat field `verdict: "TIDAK DAPAT DIPASTIKAN"`, **TIDAK** memuat `level: "TINGKAT 1"`, dan **TIDAK** memuat objek evaluasi `checks`.

### 1.2 Penanganan Pengecualian pada `lib/onchain.ts` & `lib/metaplex.ts`
1. **Solana RPC (`lib/onchain.ts:203–249`):**
   - Pemanggilan `fetchAsset(umi, publicKey(mintAddress))` dibungkus dalam blok `try/catch`.
   - `createUmiInstance` (`lib/metaplex.ts:86–100`) menggunakan wrapper `createFetchWithRetry` dengan `MAX_RETRIES = 3` dan timeout per percobaan 30 detik (`AbortController`).
   - Jika RPC tidak dapat dihubungi (misal endpoint lokal `http://127.0.0.1:19999` yang mati, DNS gagal, atau HTTP 5xx/429 terus-menerus), `createFetchWithRetry` melempar `Error: Fetch failed after 3 retries. Last error: ...`.
   - `inspectCertificate` menangkap error ini:
     - Error yang mengandung `AccountNotFoundError` atau `Account does not exist` diklasifikasikan sebagai `reason: "NOT_FOUND"`.
     - Error `UnexpectedAccountError` (misal akun ada tapi berupa dompet/bukan Metaplex Core) diklasifikasikan sebagai `reason: "NOT_ASSET"`.
     - Semua kegagalan jaringan, timeout, atau RPC unreachable lainnya dikembalikan sebagai:
       `{ ok: false, reason: "RPC", timings }`.
2. **IPFS Gateway (`lib/onchain.ts:50–82, 267–280`):**
   - Pemanggilan `fetchMetadataJson(uri, 15000)` memiliki timeout 15 detik melalui `AbortController`.
   - Jika IPFS gateway tidak merespons dalam 15 detik, merespons `!response.ok` (HTTP 502/504/404), atau melempar network exception, fungsi menangkap error dan mengembalikan `null`.
   - `inspectCertificate` baris 275–279:
     ```typescript
     if (!metadata) {
       return { ok: false, reason: "METADATA", timings };
     }
     ```
   - Semua kegagalan fetch metadata IPFS dikembalikan sebagai:
     `{ ok: false, reason: "METADATA", timings }`.

### 1.3 Pemrosesan dan Rendering UI pada `app/verify-onchain/page.tsx`
1. **Fungsi `handleVerify` (`app/verify-onchain/page.tsx:180–196`):**
   ```typescript
   180:    try {
   181:      const res = await fetch(
   182:        `/api/verify/tingkat-1?asset=${encodeURIComponent(assetToInspect)}`
   183:      );
   184:      const data = await res.json();
   185:
   186:      if (!res.ok || !data.success) {
   187:        setError(data.error || "Gagal memverifikasi aset on-chain");
   188:      } else {
   189:        setResult(data);
   190:      }
   191:    } catch (err) {
   192:      setError(toFriendlyVerifyError(err));
   193:    } finally {
   194:      setIsLoading(false);
   195:    }
   ```
   - Pada HTTP 502/503 atau ketika `!data.success`, fungsi **hanya** memanggil `setError(...)` dan mengabaikan rendering `setResult(data)`.
2. **Komponen Pesan Error (`app/verify-onchain/page.tsx:558–566`):**
   ```tsx
   558:    {error && (
   559:      <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
   560:        <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
   561:        <div>
   562:          <p className="font-semibold">Verifikasi Gagal</p>
   563:          <p className="mt-0.5">{error}</p>
   564:        </div>
   565:      </div>
   566:    )}
   ```
   - Pengguna disajikan kotak merah bertuliskan `"Verifikasi Gagal"` dengan teks error teknis (misal *"Koneksi ke Solana RPC mengalami kegagalan / rate limit"*). Seluruh Bento Grid dan matriks evaluasi hilang dari layar.
3. **Logika State Banner `verdictKind` (`app/verify-onchain/page.tsx:312–338`):**
   ```typescript
   312:  const isRevoked = result?.verdict === "DICABUT" || result?.revoked === true;
   313:  const isUnverifiable = !isRevoked && result?.verdict === "TIDAK DAPAT DIPERIKSA";
   314:  const verdictKind = isRevoked ? "revoked" : isUnverifiable ? "unverifiable" : "verified";
   ```
   - **Kritis:** Saat ini `verdictKind` hanya mendefinisikan cabang `revoked`, `unverifiable` (untuk issuer mismatch), dan default `verified` (warna hijau emerald `CheckCircle2`).
   - Jika suatu saat `result` dikirim dengan `verdict: "TIDAK DAPAT DIPASTIKAN"` tanpa penambahan cabang kondisi di `page.tsx`, ia akan **jatuh ke cabang default (`verified`)**, sehingga menampilkan banner hijau dengan ikon centang sukses! Ini adalah bug visual laten yang harus dicegah.

### 1.4 Komparasi dengan Verifikasi Tingkat-2 (`app/api/verify/route.ts`)
Pada `app/api/verify/route.ts:212–224` (jalur verifikasi nominatif Tier 1):
```typescript
212:    if (!inspection.ok) {
213:      return NextResponse.json({
214:        verified: false,
215:        message:
216:          "Status blockchain tidak dapat dikonfirmasi saat ini karena jaringan Solana tidak merespons. Silakan coba lagi beberapa saat lagi.",
217:        hashVerified,
218:        data: { ... },
219:        onChain: {
220:          status: inspection.reason === "NOT_FOUND" ? "NOT_FOUND" : "UNAVAILABLE",
221:        },
222:        ...
223:      });
224:    }
```
- Pada verifikasi Tingkat-2, kegagalan RPC **tidak** mengembalikan 503 mentah, melainkan HTTP 200 dengan payload bisnis `{ verified: false, onChain: { status: "UNAVAILABLE" }, message: "..." }`.

---

## 2. LOGIC CHAIN

Dari pengamatan langsung di atas, berikut alur penalaran inferensialnya:

### 2.1 Analisis Kebutuhan Skripsi (Tabel 3.3 TC-12)
1. **Premis 1 (Spesifikasi TC-12):** Tabel 3.3 draf Bab 3 secara eksplisit mencantumkan:  
   *Skenario: "Solana or IPFS unreachable during verification"*  
   *Expected Result: "System does NOT declare the diploma valid (status: cannot be determined)"* (dalam Bahasa Indonesia: *"tidak dapat dipastikan"*).
2. **Premis 2 (Kondisi Lapangan):** Saat ini `POST /api/verify/tingkat-1` mengembalikan HTTP 502/503 tanpa struktur checks, dan `app/verify-onchain/page.tsx` menampilkan kotak error HTTP generik merah *"Verifikasi Gagal"*.
3. **Inferensi:** Sistem saat ini belum memenuhi kontrak draf skripsi Bab 3 Tabel 3.3 karena kegagalan infrastruktur diperlakukan sebagai *unhandled HTTP failure* alih-alih status vonis evaluasi yang terstruktur (*cannot be determined / tidak dapat dipastikan*).

### 2.2 Komparasi Opsi Desain: Opsi (a) vs Opsi (b)

| Parameter Evaluasi | Opsi (a): HTTP 503/502 + Body Terstruktur | Opsi (b): HTTP 200 OK + Body Terstruktur |
| :--- | :--- | :--- |
| **HTTP Semantics (RFC 9110)** | **Unggul Mutlak.** Sesuai RFC 9110 §15.6.4 (503 Service Unavailable untuk RPC mati) dan §15.6.3 (502 Bad Gateway untuk IPFS gateway mati). | **Kurang Tepat.** HTTP 200 berarti *"Request has succeeded"*, padahal request gagal menghubungi ketergantungan on-chain. |
| **Proteksi Caching (CDN / Edge)** | **Sangat Aman.** Proxy CDN (Vercel Edge, Cloudflare) secara default tidak pernah meng-cache status 5xx. | **Beresiko.** Jika tidak disetel `Cache-Control: no-store` secara ketat, status 200 "TIDAK DAPAT DIPASTIKAN" dapat ter-cache di CDN, menyebabkan pengguna tetap melihat status mati meskipun RPC sudah pulih. |
| **Observabilitas & APM** | **Sangat Baik.** Metrik Prometheus / Datadog / Grafana langsung mendeteksi spike error rate 5xx ketika Solana Devnet mengalami degraded/rate-limit. | **Menutupi Masalah.** Metrik APM mencatat HTTP 200 (kesehatan sistem 100%), menyembunyikan fakta bahwa RPC sedang down. |
| **Kesesuaian dengan Draf Skripsi** | Memenuhi klaim Tabel 3.3: Payload eksplisit memuat `verdict: "TIDAK DAPAT DIPASTIKAN"` dan checks dievaluasi. | Memenuhi klaim Tabel 3.3: Payload eksplisit memuat `verdict: "TIDAK DAPAT DIPASTIKAN"` dan checks dievaluasi. |
| **Penanganan di Sisi Klien (`fetch`)** | Membutuhkan klien membaca body respons JSON meskipun `res.ok === false`. | Sederhana: klien otomatis masuk ke blok `res.ok === true`. |

### 2.3 Rekomendasi Arsitektur
**Rekomendasi Utama:** Terapkan **Opsi (a)** (HTTP 503 untuk RPC failure, HTTP 502 untuk IPFS failure) dengan body respons JSON yang terstruktur lengkap, DAN ubah `app/verify-onchain/page.tsx` agar mem-parse respons JSON terlepas dari status HTTP.

**Alasan Pemilihan Opsi (a):**
1. **Keamanan Lapisan Jaringan:** SIJAGA adalah sistem keamanan kredensial akademik berbasis desentralisasi. Memalsukan status jaringan yang mati menjadi HTTP 200 bertentangan dengan prinsip ketertelusuran integritas sistem.
2. **Kesesuaian Universal Sisi Klien:** Dengan menulis logika fetch di `page.tsx`:
   ```typescript
   const res = await fetch(`/api/verify/tingkat-1?asset=${encodeURIComponent(assetToInspect)}`);
   const data = await res.json().catch(() => null);

   if (data && data.verdict === "TIDAK DAPAT DIPASTIKAN") {
     setResult(data);
     setError(null);
   } else if (!res.ok || !data?.success) {
     setError(data?.error || "Gagal memverifikasi aset on-chain");
   } else {
     setResult(data);
   }
   ```
   Halaman antarmuka web menjadi **resilient** terhadap Opsi (a) maupun Opsi (b). Jika Juan/tim kemudian memutuskan beralih ke Opsi (b), kode UI tidak perlu diubah sama sekali.
3. **Mencegah Cache Poisoning di Vercel / Cloudflare:** Menghindari status "TIDAK DAPAT DIPASTIKAN" tersimpan di edge cache.

---

## 3. USULAN STRUKTUR RESPON & PERUBAHAN KODE

### 3.1 Skema Respons Terstruktur untuk RPC/IPFS Failure
Saat `result.reason === "RPC"` atau `result.reason === "METADATA"`, endpoint `app/api/verify/tingkat-1/route.ts` mengembalikan:

```json
{
  "success": false,
  "level": "TINGKAT 1",
  "verdict": "TIDAK DAPAT DIPASTIKAN",
  "asset": "FDQKnrLVQdZqP4efoNarLb87gmZj529kebFPz8SVMQCc",
  "reason": "RPC",
  "error": "Koneksi ke Solana RPC mengalami kegagalan atau tidak merespons",
  "timings": {
    "rpcMs": 1205,
    "ipfsMs": 0
  },
  "checks": {
    "tokenExists": {
      "status": "TIDAK DAPAT DIPASTIKAN",
      "detail": "Koneksi ke node Solana RPC terganggu / tidak dapat dijangkau"
    },
    "issuerAuthority": {
      "status": "TIDAK DAPAT DIPASTIKAN",
      "detail": "Pemeriksaan otoritas penerbit memerlukan pembacaan token on-chain"
    },
    "statusPencabutan": {
      "status": "TIDAK DAPAT DIPASTIKAN",
      "detail": "Pemeriksaan status pencabutan memerlukan pembacaan metadata dan state blockchain"
    },
    "tokenFrozen": {
      "status": "TIDAK DAPAT DIPASTIKAN",
      "detail": "Pemeriksaan pembekuan token memerlukan pembacaan plugin PermanentFreezeDelegate on-chain"
    },
    "dataHashOnChain": {
      "status": "TIDAK DAPAT DIPASTIKAN",
      "detail": "Pembacaan data hash on-chain memerlukan akses ke RPC dan metadata IPFS"
    },
    "nominatifMatch": {
      "status": "TIDAK DAPAT DIPASTIKAN",
      "detail": "Hitung-ulang dataHash membutuhkan salt institusi yang hanya tersimpan di database Tier 1"
    },
    "identityBinding": {
      "status": "TIDAK DAPAT DIPASTIKAN",
      "detail": "Pencocokan ikatan dompet dengan identitas nama/NIM mahasiswa memerlukan database Tier 1"
    }
  },
  "warning": "Koneksi ke infrastruktur desentralisasi (Solana RPC / IPFS Gateway) terganggu sehingga keabsahan aset TIDAK DAPAT DIPASTIKAN. Ini BUKAN vonis 'tidak valid' atau 'dicabut'."
}
```

*Catatan status HTTP:*
- Jika `reason === "RPC"`: HTTP 503 (Service Unavailable).
- Jika `reason === "METADATA"`: HTTP 502 (Bad Gateway).
*(Jika memilih Opsi (b), status di atas cukup diganti menjadi HTTP 200 dengan header `Cache-Control: no-store`).*

### 3.2 Perubahan pada `app/api/verify/tingkat-1/route.ts`
Pada fungsi `handleInspection(asset: string)`:
- Cabang `NOT_FOUND` (HTTP 404) dan `NOT_ASSET` (HTTP 400) **tetap 100% utuh** seperti sekarang.
- Cabang `RPC` dan `METADATA` digantikan dengan payload terstruktur di atas:

```typescript
// Sebelum:
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

// Sesudah (Rekomendasi Opsi a):
if (result.reason === "RPC" || result.reason === "METADATA") {
  const isRpc = result.reason === "RPC";
  const statusCode = isRpc ? 503 : 502;
  const errorMsg = isRpc
    ? "Koneksi ke Solana RPC mengalami kegagalan / tidak dapat dijangkau"
    : "Aset ditemukan di blockchain, namun metadata IPFS tidak dapat diakses";

  return NextResponse.json(
    {
      success: false,
      level: "TINGKAT 1",
      verdict: "TIDAK DAPAT DIPASTIKAN",
      asset,
      reason: result.reason,
      error: errorMsg,
      timings: result.timings,
      checks: {
        tokenExists: {
          status: isRpc ? "TIDAK DAPAT DIPASTIKAN" : "DAPAT DIPERIKSA",
          detail: isRpc
            ? "Koneksi ke node Solana RPC terganggu / tidak dapat dijangkau"
            : "Aset terdaftar di blockchain Solana (Metaplex Core)",
        },
        issuerAuthority: {
          status: "TIDAK DAPAT DIPASTIKAN",
          detail: isRpc
            ? "Pemeriksaan otoritas penerbit memerlukan pembacaan token on-chain"
            : "Metadata IPFS tidak dapat diakses untuk memeriksa identitas institusi penerbit",
        },
        statusPencabutan: {
          status: "TIDAK DAPAT DIPASTIKAN",
          detail: isRpc
            ? "Pemeriksaan status pencabutan memerlukan koneksi ke blockchain Solana"
            : "Gateway IPFS tidak dapat dijangkau untuk membaca metadata pembatalan",
        },
        tokenFrozen: {
          status: "TIDAK DAPAT DIPASTIKAN",
          detail: isRpc
            ? "Pemeriksaan status pembekuan token memerlukan pembacaan on-chain"
            : "Pemeriksaan pembekuan token memerlukan validasi metadata terpadu",
        },
        dataHashOnChain: {
          status: "TIDAK DAPAT DIPASTIKAN",
          detail: isRpc
            ? "Pembacaan data hash memerlukan pembacaan token on-chain"
            : "Gateway IPFS tidak dapat dijangkau untuk membaca atribut Data Hash",
        },
        nominatifMatch: {
          status: "TIDAK DAPAT DIPASTIKAN",
          detail:
            "Hitung-ulang dataHash membutuhkan salt institusi yang hanya tersimpan di database Tier 1",
        },
        identityBinding: {
          status: "TIDAK DAPAT DIPASTIKAN",
          detail:
            "Pencocokan ikatan dompet dengan identitas nama/NIM mahasiswa memerlukan database Tier 1",
        },
      },
      warning:
        "Koneksi ke infrastruktur desentralisasi (Solana RPC / IPFS Gateway) terganggu sehingga status keabsahan ijazah TIDAK DAPAT DIPASTIKAN. Ini BUKAN vonis 'tidak valid' atau 'dicabut'.",
    },
    { status: statusCode }
  );
}
```

### 3.3 Perubahan pada `app/verify-onchain/page.tsx`
1. **Pembaruan Interface `InspectionResult`:**
   Membuat field on-chain bersifat opsional/nullable karena saat RPC mati, data `owner`, `uri`, `updateAuthority`, `frozen` tidak dapat diisi:
   ```typescript
   interface InspectionResult {
     success: boolean;
     level: string;
     verdict: string;
     asset: string;
     owner?: string | null;
     name?: string | null;
     uri?: string | null;
     frozen?: boolean | null;
     revoked?: boolean | null;
     updateAuthority?: string | null;
     dataHash?: string | null;
     prodi?: string | null;
     tahunLulus?: string | null;
     image?: string | null;
     attributes?: Array<{ trait_type: string; value: string }>;
     timings?: {
       rpcMs?: number;
       ipfsMs?: number;
     };
     checks: {
       tokenExists: { status: string; detail: string };
       issuerAuthority: { status: string; detail: string };
       statusPencabutan: { status: string; detail: string };
       tokenFrozen: { status: string; detail: string };
       dataHashOnChain: { status: string; detail: string };
       nominatifMatch: { status: string; detail: string };
       identityBinding: { status: string; detail: string };
     };
     warning: string;
   }
   ```
2. **Penambahan Status `undetermined` pada `verdictKind`:**
   ```typescript
   const isRevoked = result?.verdict === "DICABUT" || result?.revoked === true;
   const isUnverifiable = !isRevoked && result?.verdict === "TIDAK DAPAT DIPERIKSA";
   const isUndetermined = !isRevoked && !isUnverifiable && result?.verdict === "TIDAK DAPAT DIPASTIKAN";
   const verdictKind = isRevoked
     ? "revoked"
     : isUnverifiable
       ? "unverifiable"
       : isUndetermined
         ? "undetermined"
         : "verified";
   ```
3. **Konfigurasi `verdictBanner` untuk `undetermined`:**
   Menggunakan palet warna amber/orange yang konsisten dengan tema desain Bento SIJAGA dan pembeda visual tegas dari warna hijau (valid) dan merah (dicabut):
   ```typescript
   : verdictKind === "undetermined"
     ? {
         container: "bg-gradient-to-r from-amber-600 to-orange-700",
         Icon: AlertTriangle,
         badge: "bg-white text-amber-900",
         label: "text-amber-100",
         note:
           result?.checks.tokenExists.detail ||
           "Koneksi ke infrastruktur desentralisasi terganggu. Status tidak dapat dipastikan saat ini.",
       }
   ```
4. **Pembaruan `bannerTitle`:**
   ```typescript
   const bannerTitle =
     result?.name ||
     (verdictKind === "revoked"
       ? "Ijazah Dicabut"
       : verdictKind === "unverifiable"
         ? "Ijazah Tidak Dapat Diperiksa"
         : verdictKind === "undetermined"
           ? "Status Ijazah Tidak Dapat Dipastikan"
           : "Ijazah Akademik Terverifikasi");
   ```
5. **Fallback pada Status Token Badge:**
   ```tsx
   <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white mt-0.5">
     <Lock className="w-3.5 h-3.5" />
     {result.frozen === true
       ? "SOULBOUND (BEKU)"
       : result.frozen === false
         ? "AKTIF"
         : "TIDAK DIKETAHUI"}
   </span>
   ```
6. **Fallback Elegan pada Kartu Rincian On-Chain & Stateless Challenge:**
   - Pemilik Aset: `{result.owner || "Tidak dapat diambil (RPC terganggu)"}`. Tombol salin hanya tampil bila `result.owner` ada.
   - Modul Stateless Challenge: Jika `verdictKind === "undetermined"` atau `!result.owner`, tombol challenge dinonaktifkan (`disabled`) dengan keterangan:
     *"Tantangan kepemilikan membutuhkan koneksi aktif ke RPC Solana untuk membaca pemilik aset."*

---

## 4. REGRESSION MATRIX & GUARANTEE

Untuk memastikan tidak ada regresi pada perilaku sistem yang sudah ada:

| Skenario Uji | Parameter Input | Status HTTP Diharapkan | Vonis / Alur Diharapkan | Status Regresi |
| :--- | :--- | :--- | :--- | :--- |
| **Aset Valid (Trace P2.6)** | `FDQKnrLVQdZqP4efoNarLb87gmZj529kebFPz8SVMQCc` | 200 OK | `verdict: "DAPAT DIPERIKSA"` | **TIDAK BERUBAH (100% Intact)** |
| **Aset Dicabut (Revoked)** | Aset berlabel `[DIBATALKAN]` | 200 OK | `verdict: "DICABUT"` | **TIDAK BERUBAH (100% Intact)** |
| **Penerbit Asing (TC-07a)** | `115L61TA4BnrtxVZzVhZhdRw6VeuKfBWQEKVbATsb6d` | 200 OK | `verdict: "TIDAK DAPAT DIPERIKSA"` | **TIDAK BERUBAH (100% Intact)** |
| **Bukan Aset (Alamat Dompet)** | `DtUVhcmkVnj6nfn8DJWnRiU3RqfSz2APBbGXzFdgxkpx` | 400 Bad Request | `reason: "NOT_ASSET"`, error ramah | **TIDAK BERUBAH (100% Intact)** |
| **Aset Tidak Ada (Random Base58)** | `11111111111111111111111111111111` | 404 Not Found | `reason: "NOT_FOUND"`, error ramah | **TIDAK BERUBAH (100% Intact)** |
| **Format Alamat Rusak** | `invalid-address!@#` | 400 Bad Request | `error: "Alamat aset Solana (Base58) tidak valid"` | **TIDAK BERUBAH (100% Intact)** |
| **RPC Mati / Gangguan (TC-12)** | `SOLANA_RPC_URL="http://127.0.0.1:19999"` | 503 (opsi a) / 200 (opsi b) | `verdict: "TIDAK DAPAT DIPASTIKAN"` + Bento Kuning | **DIPERBAIKI SESUAI SKRIPSI** |
| **IPFS Gateway Mati / Timeout** | Gateway Pinata unreachable | 502 (opsi a) / 200 (opsi b) | `verdict: "TIDAK DAPAT DIPASTIKAN"` + Bento Kuning | **DIPERBAIKI SESUAI SKRIPSI** |

---

## 5. METODE SIMULASI & VERIFIKASI MANDIRI

Pengujian mandiri untuk memverifikasi perbaikan ini dapat dilakukan sebagai berikut:

### 5.1 Simulasi RPC Solana Mati
1. Jalankan dev server lokal atau uji skrip dengan mengeset RPC ke alamat port yang tidak memiliki listener:
   ```bash
   SOLANA_RPC_URL="http://127.0.0.1:19999" npm run dev
   ```
2. Panggil endpoint verifikasi tingkat-1 via cURL:
   ```bash
   curl -i "http://localhost:3000/api/verify/tingkat-1?asset=FDQKnrLVQdZqP4efoNarLb87gmZj529kebFPz8SVMQCc"
   ```
3. **Kriteria Sukses Validasi:**
   - Status HTTP mengembalikan 503 (Opsi a) atau 200 (Opsi b).
   - Payload JSON memuat `"verdict": "TIDAK DAPAT DIPASTIKAN"`.
   - Objek `checks.tokenExists.status` bernilai `"TIDAK DAPAT DIPASTIKAN"`.
   - Pada peramban web di `http://localhost:3000/verify-onchain?asset=FDQKnrLVQdZqP4efoNarLb87gmZj529kebFPz8SVMQCc`:
     - Tampil kartu Bento gradien amber/oranye bertuliskan *"Vonis: TIDAK DAPAT DIPASTIKAN"*.
     - Judul banner menampilkan *"Status Ijazah Tidak Dapat Dipastikan"*.
     - Status token menampilkan *"TIDAK DIKETAHUI"*.
     - Matriks TC-15 menampilkan status oranye *"TIDAK DAPAT DIPASTIKAN"* dengan detail jaringan tidak merespons.
     - **TIDAK ADA** kotak merah mentah *"Verifikasi Gagal"*.

### 5.2 Uji Regresi Baseline (RPC Normal)
1. Kembalikan RPC ke Devnet normal.
2. Panggil:
   - Aset Trace: `FDQKnrLVQdZqP4efoNarLb87gmZj529kebFPz8SVMQCc` → Wajib HTTP 200, `verdict: "DAPAT DIPERIKSA"`.
   - Aset Alamat Dompet: `DtUVhcmkVnj6nfn8DJWnRiU3RqfSz2APBbGXzFdgxkpx` → Wajib HTTP 400, `NOT_ASSET`.
   - Aset Acak: `11111111111111111111111111111111` → Wajib HTTP 404, `NOT_FOUND`.
3. Jalankan suite benchmark/TC:
   ```bash
   npx ts-node scripts/benchmark/test-tc.ts
   ```
   Pastikan baris TC-12 pada `test-tc.ts` tetap menghasilkan status `PASS` (karena `inspectCertificate` tetap mengembalikan `reason: "RPC"` saat RPC mati).

---

## 6. CAVEATS

1. **Lingkungan Serverless (Neon & Vercel):** Karena database di remote Neon cloud dan Next.js berjalan di lingkungan serverless, timeout fetch metadata IPFS dibatasi 15 detik untuk menghindari eksekusi fungsi melebihi batas waktu default serverless Next.js.
2. **Ketiadaan Data On-Chain saat RPC Mati:** Saat RPC down total, data nama, pemilik, dan status pembekuan aset memang tidak dapat diperoleh sama sekali dari ledger Solana. Penampilan UI harus menganggap semua field ini opsional agar antarmuka tidak mengalami crash (*cannot read property of undefined*).
3. **Pemisahan Peran:** Analisis ini berstatus read-only; kode sumber belum diubah dan implementasi teknis diserahkan kepada worker/implementer.

---

## 7. CONCLUSION

1. Masalah inti TC-12 disebabkan oleh kegagalan RPC dan IPFS yang langsung dipetakan ke error mentah HTTP 502/503 tanpa struktur data bisnis, sehingga komponen antarmuka `app/verify-onchain/page.tsx` menanggapinya sebagai crash/kegagalan jaringan generik.
2. Kami merekomendasikan **Opsi (a)** (HTTP 503/502 dengan body terstruktur `verdict: "TIDAK DAPAT DIPASTIKAN"`) untuk kepatuhan semantik HTTP RFC 9110 dan perlindungan cache CDN, didukung oleh penanganan klien yang toleran terhadap Opsi (a) maupun Opsi (b).
3. Rancangan pembaruan pada `app/api/verify/tingkat-1/route.ts` dan `app/verify-onchain/page.tsx` telah disusun secara presisi, lengkap dengan pencegahan bug visual fallback, komponen Bento bertema amber/orange, dan jaminan 100% bebas regresi pada kasus VALID, REVOKED, 404, dan 400.
