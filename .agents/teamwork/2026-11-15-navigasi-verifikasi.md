# LAPORAN EKSEKUSI TUGAS NAVIGASI DUA JALUR VERIFIKASI SIJAGA

**Nomor Dokumen:** `.agents/teamwork/2026-11-15-navigasi-verifikasi.md`  
**Tanggal Eksekusi:** 15 November 2026  
**Branch:** `feat/bab4-experiments` (Baseline commit: `941cb5b`)  
**Status Eksekusi:** SELESAI 100% (Verifikasi Kompilasi & Pengujian HTTP Lokal: PASS)

---

## 1. RINGKASAN TUGAS & KONSEP ARSITEKTUR

Telah diselesaikan penambahan navigasi dua arah antara dua jalur verifikasi ijazah SIJAGA tanpa mengubah logika bisnis, query database, atau alur verifikasi yang sudah ada:
1. **Jalur 1 — Portal Lengkap (Database-First):** Melakukan pencarian via NIM / Alamat Dompet Solana di Homepage (`/`) &rarr; memanggil `/api/verify` (memeriksa identitas nominatif nama/NIM via server institusi Tier 1).
2. **Jalur 2 — Verifikasi Mandiri On-Chain (Blockchain & IPFS):** Halaman mandiri `/verify-onchain` yang menerima alamat mint aset &rarr; memanggil `/api/verify/tingkat-1` (memeriksa keabsahan token, pembekuan soulbound, otoritas penerbit, dan hash metadata tanpa database institusi).

---

## 2. BERKAS YANG DIUBAH & RINCIAN BARISNYA

### 1. `app/page.tsx` (Homepage)
- **Baris 555–559:** Penambahan label penjelas di atas form pencarian utama:
  ```tsx
  {/* Keterangan Jalur Utama */}
  <div className="hero-anim -mb-4 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
    <Shield className="w-3.5 h-3.5 text-zinc-400" />
    <span>Verifikasi lengkap — memeriksa nama/NIM via server institusi</span>
  </div>
  ```
- **Baris 590–600:** Penambahan tautan sekunder tepat di bawah tombol pencarian utama menuju `/verify-onchain`:
  ```tsx
  {/* Tautan Verifikasi Mandiri On-Chain */}
  <div className="hero-anim -mt-2 mb-1 w-full max-w-md px-1 flex items-center justify-between">
    <Link
      href="/verify-onchain"
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 underline underline-offset-4 transition-colors"
    >
      <span>Verifikasi mandiri on-chain — tanpa server institusi</span>
      <ArrowRight className="w-3.5 h-3.5" />
    </Link>
  </div>
  ```
- *Catatan:* Fungsi pencarian utama, state input `wallet`, dan logika `handleVerify` dipertahankan 100% tanpa perubahan.

### 2. `app/ijazah/[id]/page.tsx` (Halaman Ijazah Publik)
- **Baris 519–528:** Penambahan tombol tautan pada Header Actions (berdampingan dengan tombol Solana Explorer & Cetak Dokumen):
  ```tsx
  {cert.nftAddress && (
    <Link
      href={`/verify-onchain?asset=${encodeURIComponent(cert.nftAddress)}`}
      className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 hover:text-red-800 hover:bg-red-100 font-semibold text-sm px-4 py-2.5 rounded-xl border border-red-200 shadow-sm transition-colors"
    >
      <span>Verifikasi mandiri tanpa server &rarr;</span>
    </Link>
  )}
  ```
- **Baris 587–598:** Penambahan tautan inline tepat di samping label kartu `NFT Address (Soulbound)`:
  ```tsx
  <div className="flex items-center justify-between mb-1.5">
    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">NFT Address (Soulbound)</span>
    <Link
      href={`/verify-onchain?asset=${encodeURIComponent(cert.nftAddress)}`}
      className="text-[11px] font-bold text-red-600 hover:text-red-700 underline underline-offset-2 transition-colors"
    >
      Verifikasi mandiri tanpa server &rarr;
    </Link>
  </div>
  ```
- *Catatan:* Alamat aset diambil langsung dari properti `cert.nftAddress` yang sudah dimuat oleh halaman; tidak ada penambahan kueri database.

### 3. `app/verify-onchain/page.tsx` (Halaman Mandiri On-Chain)
- **Baris 295–301 (Header Nav):** Penambahan tautan kembali ke homepage dengan label resmi:
  ```tsx
  <Link
    href="/"
    className="text-xs font-bold text-red-600 hover:text-red-700 transition-colors inline-flex items-center gap-1 underline underline-offset-4"
  >
    Verifikasi lengkap (dengan data institusi) &rarr;
  </Link>
  ```
- **Baris 321–329 (Header Deskripsi):** Tautan sekunder tepat di bawah deskripsi judul halaman:
  ```tsx
  <div className="mt-4">
    <Link
      href="/"
      className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 underline underline-offset-4 transition-colors"
    >
      Verifikasi lengkap (dengan data institusi) &rarr;
    </Link>
  </div>
  ```
- **Baris 452–461 (UU PDP Callout Banner):** Tautan kembali pada banner peringatan batasan privasi saat hasil inspeksi on-chain ditampilkan:
  ```tsx
  <div className="mt-3 pt-2 border-t border-amber-200/60">
    <Link
      href="/"
      className="inline-flex items-center gap-1 font-bold text-amber-950 hover:text-red-700 underline underline-offset-2 transition-colors"
    >
      Verifikasi lengkap (dengan data institusi) &rarr;
    </Link>
  </div>
  ```

---

## 3. HASIL PENGUJIAN TAUTAN & VALIDASI SISTEM

Pengujian dieksekusi terhadap dev server lokal yang sedang aktif (`http://localhost:3000`):

1. **Uji Navigasi Homepage (`/`):**
   - URL: `http://localhost:3000/`
   - Keterangan terdeteksi: `"Verifikasi lengkap — memeriksa nama/NIM via server institusi"`
   - Tautan terdeteksi: `href="/verify-onchain"` dengan label teks `"Verifikasi mandiri on-chain — tanpa server institusi"`.
   - Status respons: **HTTP 200 OK**.
2. **Uji Navigasi On-Chain (`/verify-onchain`):**
   - URL: `http://localhost:3000/verify-onchain`
   - Tautan terdeteksi: `href="/"` dengan label teks `"Verifikasi lengkap (dengan data institusi) →"`.
   - Status respons: **HTTP 200 OK**.
3. **Uji Endpoint Tingkat-1 dengan Aset Trace P2.6:**
   - URL: `http://localhost:3000/api/verify/tingkat-1?asset=FDQKnrLVQdZqP4efoNarLb87gmZj529kebFPz8SVMQCc`
   - Status respons: **HTTP 200 OK**.
   - Integritas data: Terbaca token beku `frozen: true`, otoritas institusi `Bat5VTbj...`, dataHash `sha256:56a51c...`, prodi `Informatika`, tahun `2026`.
4. **Uji Jalur Verifikasi Lama (`/api/verify`):**
   - URL: `http://localhost:3000/api/verify?query=F55124011`
   - Status respons: **HTTP 200 OK** (logika pencarian NIM/dompet lama tetap utuh dan berfungsi normal).

---

## 4. STATUS KEPATUHAN GUARDRAILS

- **ESLint:** `npx eslint app/page.tsx app/ijazah/[id]/page.tsx app/verify-onchain/page.tsx` &rarr; **0 error, 0 warning**.
- **TypeScript:** `npx tsc --noEmit` &rarr; **0 error (exit code 0)**.
- **Logika & Endpoint Lama:** Tidak ada perubahan pada `/api/verify`, `/api/verify/challenge`, `/api/verify/tingkat-1`, `lib/onchain.ts`, atau `lib/crypto.ts`.
- **Branch & Git:** Tidak ada commit atau push ke `main`. Seluruh perubahan tersimpan di branch `feat/bab4-experiments`.

Tugas penambahan navigasi dua arah dinyatakan **SELESAI 100%**, dan agen **BERHENTI**.
