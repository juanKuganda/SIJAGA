# Original User Request

## Initial Request — 2026-11-17T15:43:50Z

@Brief-Antigravity-TC12-Challenge-REVOKED-2026-11-17.md — Perbaikan TC-12 + Challenge pada Ijazah REVOKED (SIJAGA)

Baca file brief: `/home/junnnnnnnn/Code/sijaga/Brief-Antigravity-TC12-Challenge-REVOKED-2026-11-17.md`

Ini adalah tugas EKSEKUSI KODE — dua perbaikan bug di branch `feat/bab4-experiments` (HEAD commit `f7bae08`, sebelumnya `27cffac`). JANGAN sentuh `main`. JANGAN commit/push tanpa persetujuan Juan.

**PENTING — Tracking Agent:**
- Simpan laporan progress dan handoff di folder `.agents/teamwork/` (buat subfolder baru kalau perlu, misal `.agents/teamwork/tc12-challenge-fix/`).
- Baca dulu laporan agent sebelumnya di `.agents/teamwork/` untuk konteks (terutama `2026-11-15-penilaian-rancangan-bab4.md`, `2026-11-15-eksekusi-bab4-tingkat1-tc15.md`) supaya tidak mengulangi pekerjaan atau merusak yang sudah selesai.

**Skill yang harus dipakai:**
- `/blockchain-developer` skill di `/home/junnnnnnnn/Code/sijaga/.agents/skills/blockchain-developer/SKILL.md` — untuk memahami arsitektur Solana/Metaplex Core, NFT soulbound, dan pattern inspectCertificate.
- `/database-architect` skill di `/home/junnnnnnnn/Code/sijaga/.agents/skills/database-architect/SKILL.md` — untuk memahami Prisma/Neon schema (terutama tabel `VerificationNonce` dan `Certificate` status enum `REVOKED`).

**DUA TUGAS (dari brief):**

**Tugas 1 — TC-12: RPC/IPFS mati → "TIDAK DAPAT DIPASTIKAN" (bukan HTTP error mentah)**
- Saat RPC Solana atau IPFS gateway tidak terjangkau, endpoint `POST /api/verify/tingkat-1` saat ini mengembalikan HTTP error mentah (502/503).
- Draf skripsi (Tabel 3.3, TC-12) sudah mengklaim hasil = "tidak dapat dipastikan". 
- Perbaiki agar endpoint mengembalikan respons terstruktur dengan `verdict: "TIDAK DAPAT DIPASTIKAN"` dan halaman `/verify-onchain` menampilkannya dengan UI yang proper (bukan error generik).
- Pilih pendekatan (a) tetap HTTP error tapi body terstruktur, atau (b) HTTP 200 dengan verdict. Tulis alasan pilihan di laporan.
- JANGAN ubah perilaku kasus sukses, 404, 400, atau DICABUT — semua itu sudah benar.
- File kunci: `app/api/verify/tingkat-1/route.ts`, `lib/onchain.ts`, `app/verify-onchain/page.tsx`

**Tugas 2 — Challenge pada ijazah REVOKED tidak boleh "Kepemilikan Terverifikasi"**
- Alur challenge di `app/ijazah/[id]/page.tsx` dan `POST /api/verify/challenge` (`app/api/verify/challenge/route.ts`) tidak memeriksa `cert.status`.
- Ijazah yang di-revoke masih bisa melewati challenge dan menampilkan "Kepemilikan Terverifikasi" — ini menyesatkan.
- Perbaiki: challenge harus menghormati status pencabutan. Minimal endpoint harus mencegah vonis "Terverifikasi" untuk REVOKED.
- Halaman sudah punya flag `isRevoked` (sekitar baris 502) untuk banner merah — tapi alur challenge tidak memakainya.
- JANGAN ubah logika kriptografi challenge (nonce, Ed25519, expiry 5 menit, sekali pakai, rate limit).
- File kunci: `app/api/verify/challenge/route.ts`, `lib/challenge.ts`, `app/ijazah/[id]/page.tsx`

**Data uji Devnet:**
- Admin (update authority): `Bat5VTbjGqsThS5oERuXVi7d2JY2TBNomJD2ZciaztaQ`
- Aset Alifa: mint `GqM5cbrY3QpPV6cHhaFdYzPcgDjzm9M6TchsxBTkUv1q`, owner `DtUVhcmkVnj6nfn8DJWnRiU3RqfSz2APBbGXzFdgxkpx`
- Aset Trace P2.6: mint `FDQKnrLVQdZqP4efoNarLb87gmZj529kebFPz8SVMQCc`
- Aset non-admin (issuer test): `115L61TA4BnrtxVZzVhZhdRw6VeuKfBWQEKVbATsb6d`

**Aturan:**
- Branch `feat/bab4-experiments` saja, JANGAN commit/push tanpa izin Juan.
- JANGAN tambah dependensi baru.
- BACA file yang relevan dulu sebelum menulis kode.
- Jalankan typecheck/lint pada file yang diubah.
- Tulis laporan akhir ke `.agents/teamwork/2026-11-17-tc12-challenge-revoked.md` berisi: file yang diubah, alasan desain, bukti verifikasi, hal yang tidak diubah, daftar file untuk commit.
- Hemat panggilan RPC devnet (jangan spam).

**Cara menguji:**
- Tugas 1: simulasikan RPC mati (arahkan ke `http://127.0.0.1:19999`) lalu panggil endpoint; uji regresi aset Trace + alamat dompet + alamat acak.
- Tugas 2: revoke aset Alifa via admin lalu coba challenge (atau buat data uji REVOKED); uji regresi challenge positif/negatif pada ijazah non-revoked.

---
**Coordination instructions:**
- Your working directory: `/home/junnnnnnnn/Code/sijaga/.agents/teamwork/orchestrator_1/`
- Authoritative user request: `/home/junnnnnnnn/Code/sijaga/.agents/teamwork/ORIGINAL_REQUEST.md`
- Maintain `progress.md` and `BRIEFING.md` in your working directory.
- Dispatch specialists/workers according to Teamwork conventions.
- Report back when the task is complete with full details so victory audit can be initiated.
