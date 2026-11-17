# Brief Antigravity — Verifikasi Live TC-12 + Eksekusi TC-17 / TC-18a / TC-18b (SIJAGA, Data Bab 4)

**Tanggal:** 18 November 2026
**Repo:** `juanKuganda/SIJAGA`, branch `feat/bab4-experiments` (JANGAN sentuh `main`)
**Commit terakhir yang sudah di-push:** `affabbd051116a578770341fc81e64b5fe40cde7` — "feat(verify): perbaikan TC-12 (RPC/IPFS outage) + perlindungan challenge pada ijazah REVOKED"
**Pastikan dulu:** sebelum mulai, pastikan clone lokal ada di branch `feat/bab4-experiments` dan sudah `git pull` sampai commit `affabbd` di atas. Kalau belum, pull dulu.

## Status brief sebelumnya (17 Nov) — JANGAN kerjakan ulang

Brief sebelumnya (`Brief-Antigravity-TC12-Challenge-REVOKED-2026-11-17.md`) sudah selesai dan **terverifikasi live oleh Juan pada 18 Nov 01:23–01:37 WITA**:

- **TC-12 (kode):** SELESAI. Endpoint tingkat-1 kini mengembalikan body terstruktur dengan `verdict: "TIDAK DAPAT DIPASTIKAN"` pada HTTP 503 (RPC) / 502 (IPFS), dan halaman `/verify-onchain` merender keadaan amber. Pendekatan yang dipakai: (a). **Yang tersisa dari TC-12 hanya VERIFIKASI LIVE** (Tugas 1 di brief ini) — jangan ubah lagi kodenya kecuali verifikasi menemukan cacat.
- **Challenge pada ijazah REVOKED:** SELESAI dan terverifikasi live. Halaman ijazah memblokir challenge untuk status REVOKED (tombol dinonaktifkan, badge merah "Ijazah Dicabut", pesan "Pembuktian Kepemilikan Dinonaktifkan"). Jangan ubah lagi.
- **Siklus revoke → restore → klaim ulang Alifa:** SELESAI dan terverifikasi live. Alifa saat ini berstatus **CLAIMED**, data pribadi utuh (nama, NIM, email, salt), challenge positif lolos, profil 4/4 langkah lengkap.

Brief ini melanjutkan ke **pengumpulan data Bab 4**: verifikasi live TC-12 + eksekusi TC-17, TC-18a, TC-18b. JANGAN ubah draf skripsi. JANGAN ubah tesis/kode di luar tugas-tugas ini, kecuali perbaikan yang diwajibkan oleh temuan verifikasi (sebutkan alasannya di laporan).

## Konteks (baca ini dulu)

SIJAGA adalah sistem verifikasi kepemilikan ijazah berbasis token non-transferable di Solana (Metaplex Core + plugin `PermanentFreezeDelegate`, `frozen:true`). Ada dua tingkat verifikasi:

- **Tingkat 1 (mandiri, on-chain):** endpoint `POST /api/verify/tingkat-1` (`app/api/verify/tingkat-1/route.ts`) + halaman `app/verify-onchain/page.tsx`. Endpoint ini bebas database (hanya impor `inspectCertificate` dari `lib/onchain.ts`). Ia memeriksa aset langsung dari Solana + IPFS publik. "Hash cocok" pada tingkat 1 artinya hash tersedia dan dapat diperiksa pada metadata publik; hitung-ulang hash dari data pribadi + salt hanya dilakukan pada tingkat 2.
- **Tingkat 2 (lengkap, nominatif):** endpoint `POST /api/verify` (DB-first) + halaman ijazah `app/ijazah/[id]/page.tsx`. Tingkat 2 menghitung ulang hash dari data pribadi + salt di Tier 1 (database institusi) dan membandingkannya dengan hash di metadata publik.

Definisi kasus uji (kata-kata Pak Rizka dari dokumen `Synch_RM_Juan.docx`, sudah ditempel ke draf Bab 3 dan disubmit):

- **TC-12:** RPC/IPFS mati → hasil yang diharapkan: **"tidak dapat dipastikan"**.
- **TC-16:** SUDAH SELESAI (skrip `scripts/tc16-independence.ts`, lolos 2×, log `experiments/2026-11-17/tc16-2026-11-17.jsonl`). Jangan kerjakan ulang.
- **TC-17:** "Setelah penghapusan data pribadi dan salt (kelanjutan TC-11), verifikator menjalankan verifikasi penuh atas aset yang sama." Hasil yang diharapkan: **"Tingkat 1 tetap terverifikasi; tingkat 2 tidak dapat dipastikan; aset dan metadata publik tidak berubah."**
- **TC-18a:** "Lulusan menarik persetujuan sebelum ijazah terbit." Hasil yang diharapkan: **"Hanya persetujuan yang dibatalkan; tidak ada aset yang terbit."**
- **TC-18b:** "Lulusan menarik persetujuan setelah ijazah terbit." Hasil yang diharapkan: **"Nama, NIM, email, dan salt pada rekaman aktif terhapus; cadangan audit dibuat sebelum penghapusan; hasil sama dengan TC-17."** Catatan presisi: di kode, "terhapus" diwujudkan sebagai **anonimisasi** pada rekaman aktif (nama menjadi `"[DATA ANONIM]"`, NIM menjadi `ANON-<timestamp>`, email menjadi placeholder, salt dihapus) dan cadangan audit menyimpan data asli. Verifikasi harus memeriksa bentuk anonimisasi ini, bukan penghapusan literal.

Data uji yang sudah ada (Devnet):
- Admin (update authority): `Bat5VTbjGqsThS5oERuXVi7d2JY2TBNomJD2ZciaztaQ`
- Aset uji Alifa (mahasiswa alifa nursintia marsya, NIM F55124011, user ID `46bf8d52-efa5-4f39-991c-4e3f872f0c0d`): mint `GqM5cbrY3QpPV6cHhaFdYzPcgDjzm9M6TchsxBTkUv1q`, pemilik `DtUVhcmkVnj6nfn8DJWnRiU3RqfSz2APBbGXzFdgxkpx`. Status saat ini **CLAIMED** (sesudah restore + klaim ulang 18 Nov 01:37). Email `f55124011@untad.ac.id`, prodi Informatika.
- Aset uji Trace P2.6: mint `FDQKnrLVQdZqP4efoNarLb87gmZj529kebFPz8SVMQCc` (untuk regresi).
- Aset non-admin (untuk tes issuer, SUDAH terverifikasi): `115L61TA4BnrtxVZzVhZhdRw6VeuKfBWQEKVbATsb6d` ("Robot Buddy #3111").

File dan rute yang relevan (baca sebelum bekerja):
- `app/api/verify/tingkat-1/route.ts`, `app/verify-onchain/page.tsx`, `lib/onchain.ts` (TC-12)
- `app/api/admin/delete-pii/route.ts` (TC-17 — hapus PII + salt, admin only, buat `certificateBackup` dulu dalam satu transaksi)
- `app/api/consent/route.ts` (TC-18a/18b — `POST` beri consent, `DELETE` tarik consent; bila sertifikat sudah terbit, DELETE menganonimkan PII + menghapus salt + membuat `certificateBackup` dulu)
- `app/api/admin/recovery/route.ts` (restore — baca bagian PENTING di bawah)
- `app/api/verify/route.ts` (verifikasi lengkap tingkat 2 — baca bagaimana ia merespons saat salt `null`)
- `lib/auth.ts` (cara autentikasi admin vs mahasiswa), `lib/challenge.ts`, `lib/crypto.ts`
- `scripts/tc16-independence.ts` (pola skrip eksekusi + log JSONL yang harus diikuti)

---

## PENTING — Cara kerja restore (baca sebelum menyentuh data Alifa)

Rute recovery (`POST /api/admin/recovery`, file `app/api/admin/recovery/route.ts`) **HANYA mengembalikan sertifikat, BUKAN data pribadi mahasiswa**. Yang ia lakukan:

1. Membaca `certificateBackup` (JSON `backupData` berisi sertifikat + data user + wallet).
2. Menghitung ulang hash + salt BARU dari data user yang **saat ini ada di database** (`user.nama`, `user.nim`, `user.prodi`).
3. Men-generate ulang gambar + metadata, mengunggahnya ke Pinata, dan memanggil `restoreSoulboundNFT` untuk mengarahkan URI aset ke metadata baru (fail-closed bila gagal on-chain).
4. Mengembalikan sertifikat ke status **MINTED** (bukan CLAIMED — mahasiswa harus klaim ulang), dengan `claimedAt` di-null-kan, hash + salt baru, dan menandai backup sudah dipakai (`usedAt`).
5. **TIDAK menyentuh tabel user sama sekali.** Nama, NIM, email, `dataConsent`, dan `dataDeletedAt` TIDAK dikembalikan oleh rute ini.

Konsekuensinya untuk TC-17 dan TC-18b: sesudah PII Alifa dianonimkan, **recovery saja tidak cukup** — bila langsung menjalankan recovery, hash + salt baru akan dihitung dari nama `"[DATA ANONIM]"` dan NIM `"ANON-<timestamp>"`, dan Alifa tetap anonim. Untuk mengembalikan Alifa ke keadaan semula diperlukan **dua langkah** (lihat "Prosedur restore Alifa" di bawah): (1) kembalikan data user dari JSON backup, (2) baru jalankan recovery sertifikat. Prosedur ini wajib diikuti dan diverifikasi tiap kali selesai tugas destruktif.

---

## Urutan kerja (wajib diikuti)

Kerjakan dalam urutan ini. Tugas non-destruktif dulu, baru tugas destruktif, dengan restore + verifikasi restore di antara tugas destruktif:

1. **Tugas 1 — TC-12** (verifikasi live, tidak merusak data).
2. **Tugas 2 — TC-18a** (subjek uji baru, tidak menyentuh Alifa).
3. **Tugas 3 — TC-17** (Alifa, destruktif) → restore Alifa → verifikasi restore → **baru lanjut**.
4. **Tugas 4 — TC-18b** (Alifa, destruktif) → restore Alifa → verifikasi restore.

**Aturan berhenti:** bila verifikasi restore gagal pada langkah mana pun (data tidak kembali utuh), **BERHENTI dan laporkan** — jangan lanjut ke tugas destruktif berikutnya. Bila restore dengan prosedur di bawah terbukti tidak bisa mengembalikan Alifa utuh, laporkan itu sebagai temuan dan usulkan jalan lain (mis. memakai subjek uji baru yang disposable untuk sisa tes destruktif), jangan memaksakan.

---

## Tugas 1 — TC-12: verifikasi live bahwa RPC/IPFS mati menghasilkan "tidak dapat dipastikan"

### Status
Kode sudah diperbaiki pada commit `affabbd` (pendekatan (a): HTTP tetap 503 RPC / 502 IPFS, body terstruktur memuat `verdict: "TIDAK DAPAT DIPASTIKAN"` + status tiap pemeriksaan; halaman merender kartu amber). **Jangan ubah kodenya** kecuali verifikasi menemukan cacat — bila menemukan cacat, perbaiki seperlunya dan laporkan.

### Yang harus dilakukan
Buktikan dengan eksekusi nyata bahwa perilaku itu bekerja end-to-end:

1. Jalankan dev server dengan RPC diarahkan ke alamat mati (mis. `http://127.0.0.1:19999` — baca `lib/metaplex.ts` / `lib/onchain.ts` untuk menemukan variabel env RPC yang dipakai endpoint tingkat-1) lalu panggil endpoint tingkat-1 dengan aset valid (Trace `FDQKnrLV…` atau Alifa `GqM5cbrY…`). Catat HTTP status + body respons lengkap.
2. Simulasikan gateway IPFS mati (arahkan variabel env gateway ke alamat mati, atau pakai cara setara yang kamu temukan di kode) lalu panggil endpoint yang sama. Catat HTTP status + body respons lengkap.
3. Verifikasi halaman `/verify-onchain` menampilkan keadaan "tidak dapat dipastikan" (kartu amber) untuk kedua kondisi di atas — bukan pesan error mentah/HTTP. Simpan screenshot sebagai bukti.
4. Uji regresi (RPC normal): aset Trace tetap `DAPAT DIPERIKSA`; alamat dompet `DtUVhcmk…` tetap `400 NOT_ASSET`; alamat base58 acak tetap `404 NOT_FOUND`. Kasus DICABUT **sudah terverifikasi live oleh Juan** (18 Nov 01:23) — jangan revoke Alifa lagi hanya untuk regresi ini.

### Kriteria penerimaan Tugas 1
- [ ] RPC mati → HTTP 503 + body terstruktur memuat `verdict: "TIDAK DAPAT DIPASTIKAN"` + status tiap pemeriksaan.
- [ ] IPFS mati → HTTP 502 + body terstruktur memuat `verdict: "TIDAK DAPAT DIPASTIKAN"` + status tiap pemeriksaan.
- [ ] Halaman `/verify-onchain` menampilkan keadaan "tidak dapat dipastikan" (amber) untuk kedua kondisi, dibuktikan screenshot.
- [ ] Regresi lolos: Trace `DAPAT DIPERIKSA`, dompet `400 NOT_ASSET`, acak `404 NOT_FOUND`.
- [ ] Bukti tersimpan sebagai log (mis. `experiments/2026-11-18/tc12-2026-11-18.jsonl` atau file bukti setara) + screenshot.

---

## Tugas 2 — TC-18a: tarik persetujuan sebelum ijazah terbit

### Skenario (draf)
"Lulusan menarik persetujuan sebelum ijazah terbit." Hasil yang diharapkan: **"Hanya persetujuan yang dibatalkan; tidak ada aset yang terbit."**

### Yang harus dilakukan
Alifa TIDAK bisa dipakai untuk tugas ini (ijazahnya sudah terbit). Buat **subjek uji baru** yang jelas-jelas data tes:

1. Baca kode autentikasi/registrasi (`lib/auth.ts` dan rute pendaftaran/admin) untuk menemukan cara yang benar membuat akun mahasiswa baru lewat alur normal aplikasi (bukan tulis langsung ke DB). Buat satu mahasiswa tes dengan identitas yang jelas-jelas tes, mis. nama `"TC18A Test"`, NIM `"TC18A00001"`, email `"tc18a-test@sijaga.ac.id"`, prodi Informatika. Bila alur normal tidak memungkinkan pembuatan akun dari sisi agent, **berhenti dan laporkan** apa yang kamu temukan (jangan memalsukan sesi atau menulis langsung ke DB untuk aksi ini).
2. Sebagai mahasiswa tes itu (lewat UI sebagai mahasiswa tersebut, atau lewat sesi terautentikasi miliknya — baca `lib/auth.ts` untuk caranya), beri persetujuan lewat `POST /api/consent`. Verifikasi status consent menjadi `true` (`GET /api/consent`).
3. Masih sebagai mahasiswa tes itu, tarik persetujuan lewat `DELETE /api/consent`. Verifikasi hasilnya:
   - `dataConsent` menjadi `false`, `consentGivenAt` menjadi `null`.
   - **Tidak ada sertifikat yang terbit** untuk mahasiswa ini (tidak ada baris certificate, tidak ada `nftAddress`, tidak ada transaksi mint).
   - **PII TIDAK dianonimkan** (nama, NIM, email tetap utuh — karena sertifikat belum terbit, rute DELETE hanya membatalkan consent, sesuai kode).
   - Audit log `DATA_CONSENT_WITHDRAWN` tercatat.
4. Simpan bukti sebagai skrip + log JSONL (ikuti pola `scripts/tc16-independence.ts` dan konvensi `experiments/<YYYY-MM-DD>/`).

### Kriteria penerimaan Tugas 2
- [ ] Subjek tes baru dibuat lewat alur normal aplikasi, dengan identitas yang jelas-jelas tes.
- [ ] Sesudah tarik persetujuan: consent `false`, tidak ada sertifikat/aset yang terbit, PII tetap utuh, audit log `DATA_CONSENT_WITHDRAWN` ada.
- [ ] Skrip eksekusi + log JSONL tersimpan.

---

## Tugas 3 — TC-17: verifikasi penuh sesudah penghapusan data pribadi + salt

### Skenario (draf)
"Setelah penghapusan data pribadi dan salt (kelanjutan TC-11), verifikator menjalankan verifikasi penuh atas aset yang sama." Hasil yang diharapkan: **"Tingkat 1 tetap terverifikasi; tingkat 2 tidak dapat dipastikan; aset dan metadata publik tidak berubah."**

### Langkah 0 — Catat keadaan awal (wajib, sebelum merusak apa pun)
Sebelum menghapus apa pun, catat dan simpan keadaan awal Alifa:
- Data user: nama, NIM, email, `dataConsent`, `dataSalt` (ada/tidak), status sertifikat (harus CLAIMED), `nftAddress`, `metadataUri`, `dataHash` di DB.
- Data on-chain + IPFS: nama aset, pemilik, `updateAuthority`, status frozen, `dataHash` di metadata publik (ambil dari gateway IPFS publik).
- Hasil verifikasi penuh SEBELUM penghapusan (panggil `POST /api/verify` untuk Alifa): tingkat 1 dan tingkat 2 harus terverifikasi penuh. Simpan responsnya sebagai baseline.

### Langkah 1 — Hapus PII + salt (langkah TC-11)
Panggil `POST /api/admin/delete-pii` sebagai **admin** dengan `userId` Alifa (`46bf8d52-efa5-4f39-991c-4e3f872f0c0d`) dan alasan yang jelas, mis. `"TC-17 Bab 4 — uji pasca-penghapusan (data akan di-restore)"`. Sebelum memanggil, **verifikasi dulu bahwa backup akan dibuat**: rute ini membuat `certificateBackup` dalam transaksi yang sama — sesudah panggilan, periksa bahwa ada baris `certificateBackup` baru untuk Alifa yang berisi data asli (nama, NIM, email) di dalam `backupData`. **Bila tidak ada backup yang terbentuk, BERHENTI dan laporkan** — jangan lanjut ke verifikasi, karena restore tidak mungkin.

Verifikasi keadaan sesudah penghapusan:
- User: nama `"[DATA ANONIM]"`, NIM `ANON-<timestamp>`, email placeholder, `dataDeletedAt` terisi, `dataSalt` sertifikat `null`, `dataConsent` `false`.
- Audit log `PII_DELETED` tercatat.

### Langkah 2 — Verifikasi penuh atas aset yang sama
1. **Tingkat 1** (panggil `POST /api/verify/tingkat-1` dengan `GqM5cbrY…`, atau jalankan skrip TC-16 untuk aset itu): harus tetap **DAPAT DIPERIKSA**.
2. **Tingkat 2** (panggil `POST /api/verify` untuk Alifa): harus **"tidak dapat dipastikan"** — bukan "tidak valid"/"tidak sah". Baca dulu `app/api/verify/route.ts` untuk mengetahui bentuk respons saat salt `null`, lalu laporkan **apa tepatnya yang dikembalikan endpoint** (field dan kata-katanya). Bila endpoint mengembalikan kata yang berbeda dari "tidak dapat dipastikan" (mis. "tidak valid"), **jangan ubah diam-diam** — laporkan sebagai temuan dengan kutipan respons persisnya, karena kata-kata ini masuk ke naskah.
3. **Aset dan metadata publik tidak berubah**: bandingkan dengan catatan Langkah 0 — nama aset on-chain, pemilik, `updateAuthority`, status frozen, dan `dataHash` di metadata IPFS harus **sama persis** seperti sebelum penghapusan. (Yang berubah hanya Tier 1 / database, bukan artefak publik.)
4. Simpan semua respons + perbandingan sebagai skrip + log JSONL (ikuti pola TC-16).

### Langkah 3 — Restore Alifa (wajib, ikuti "Prosedur restore Alifa")
Sesudah verifikasi selesai, kembalikan Alifa ke keadaan semula mengikuti prosedur di bawah, lalu verifikasi restore-nya. **Jangan lanjut ke Tugas 4 sebelum restore terverifikasi penuh.**

### Kriteria penerimaan Tugas 3
- [ ] Baseline (Langkah 0) tercatat: verifikasi penuh sebelum penghapusan = tingkat 1 + tingkat 2 terverifikasi.
- [ ] Backup `certificateBackup` berisi data asli TERBENTUK sebelum/saat penghapusan (diperiksa eksplisit).
- [ ] Sesudah penghapusan: user teranonimkan, `dataSalt` `null`, audit log `PII_DELETED` ada.
- [ ] Tingkat 1 tetap **DAPAT DIPERIKSA** sesudah penghapusan.
- [ ] Tingkat 2 dinyatakan **"tidak dapat dipastikan"** (laporkan kata persis dari respons endpoint).
- [ ] Aset on-chain + metadata IPFS **tidak berubah** (dibuktikan perbandingan sebelum/sesudah).
- [ ] Restore Alifa selesai dan terverifikasi penuh (lihat prosedur restore).
- [ ] Skrip eksekusi + log JSONL tersimpan.

---

## Tugas 4 — TC-18b: tarik persetujuan sesudah ijazah terbit

### Skenario (draf)
"Lulusan menarik persetujuan setelah ijazah terbit." Hasil yang diharapkan: **"Nama, NIM, email, dan salt pada rekaman aktif terhapus; cadangan audit dibuat sebelum penghapusan; hasil sama dengan TC-17."**

### Prasyarat
Tugas 3 selesai DAN restore Alifa terverifikasi penuh (Alifa kembali CLAIMED dengan data utuh). Bila tidak, jangan mulai tugas ini.

### Langkah 0 — Catat keadaan awal (wajib)
Sama seperti Tugas 3 Langkah 0: data user, `dataSalt`, status sertifikat (harus CLAIMED), `nftAddress`, `metadataUri`, `dataHash` DB + IPFS, dan hasil verifikasi penuh sebelum penarikan (tingkat 1 + tingkat 2 terverifikasi).

### Langkah 1 — Tarik persetujuan sebagai Alifa
Lakukan penarikan **sebagai mahasiswa Alifa** (bukan sebagai admin): lewat UI halaman persetujuan sebagai Alifa, atau lewat sesi terautentikasi milik Alifa (baca `lib/auth.ts` untuk caranya). Panggil `DELETE /api/consent` sebagai Alifa. **Jangan** memalsukan sesi dan **jangan** menulis langsung ke DB untuk aksi ini — aksi harus lewat rute yang sebenarnya, supaya yang diuji adalah perilaku sistem.

Sebelum/sesudah panggilan, verifikasi bahwa **cadangan audit dibuat sebelum penghapusan**: rute DELETE membuat `certificateBackup` berisi data asli dalam transaksi yang sama. Periksa bahwa ada baris `certificateBackup` baru untuk Alifa. **Bila tidak ada backup yang terbentuk, BERHENTI dan laporkan.**

Verifikasi keadaan sesudah penarikan:
- User: nama `"[DATA ANONIM]"`, NIM `ANON-<timestamp>`, email placeholder, `dataDeletedAt` terisi, `dataConsent` `false`, salt sertifikat `null`.
- Audit log `DATA_CONSENT_WITHDRAWN` tercatat.
- Sertifikat on-chain **tidak berubah** (aset tetap ada, tetap frozen, metadata publik tetap sama) — penarikan consent hanya menyentuh Tier 1.

### Langkah 2 — Verifikasi hasil (sama dengan TC-17)
1. **Tingkat 1** atas `GqM5cbrY…`: harus tetap **DAPAT DIPERIKSA**.
2. **Tingkat 2** atas Alifa: harus **"tidak dapat dipastikan"** (laporkan kata persis dari respons endpoint, seperti di Tugas 3).
3. **Aset dan metadata publik tidak berubah** (bandingkan dengan Langkah 0).
4. Simpan sebagai skrip + log JSONL.

### Langkah 3 — Restore Alifa (wajib, ikuti "Prosedur restore Alifa")
Sesudah verifikasi selesai, kembalikan Alifa ke keadaan semula dan verifikasi restore-nya.

### Kriteria penerimaan Tugas 4
- [ ] Prasyarat terpenuhi: Alifa sudah di-restore penuh sesudah Tugas 3.
- [ ] Backup `certificateBackup` berisi data asli TERBENTUK (diperiksa eksplisit).
- [ ] Sesudah penarikan: user teranonimkan, salt `null`, audit log `DATA_CONSENT_WITHDRAWN` ada.
- [ ] Tingkat 1 tetap **DAPAT DIPERIKSA**; tingkat 2 **"tidak dapat dipastikan"** (kata persis dilaporkan).
- [ ] Aset on-chain + metadata IPFS **tidak berubah**.
- [ ] Restore Alifa selesai dan terverifikasi penuh.
- [ ] Skrip eksekusi + log JSONL tersimpan.

---

## Prosedur restore Alifa (wajib sesudah Tugas 3 dan Tugas 4)

Karena rute recovery **tidak mengembalikan data user** (lihat bagian PENTING di atas), restore dilakukan dalam dua langkah, dalam urutan ini:

### Langkah A — Kembalikan data user dari JSON backup
1. Ambil baris `certificateBackup` terbaru untuk Alifa yang dibuat oleh tugas destruktif tadi (catat `id`-nya). Parse `backupData` (JSON) dan pastikan ia berisi data asli: `user.nama` = "alifa nursintia marsya", `user.nim` = "F55124011", `user.email` = "f55124011@untad.ac.id".
2. Tulis skrip restore user yang terpisah dan bisa direview (mis. `scripts/restore-user-from-backup.ts`, memakai Prisma — jangan one-liner inline yang tidak terlacak). Skrip itu harus mengembalikan, dari JSON backup: `nama`, `nim`, `email`, `dataDeletedAt` → `null`, `dataDeleteNote` → `null`, `dataConsent` → `true`. (Catatan: JSON backup tidak menyimpan `consentGivenAt`; isi dengan waktu saat ini dan catat itu di laporan — ini restore data tes, bukan catatan consent hukum.)
3. Jalankan skrip itu, lalu verifikasi: user kembali bernama "alifa nursintia marsya", NIM "F55124011", email "f55124011@untad.ac.id", `dataConsent` `true`, `dataDeletedAt` `null`.

### Langkah B — Recovery sertifikat lewat rute yang sebenarnya
Panggil `POST /api/admin/recovery` sebagai admin dengan `backupId` yang sama. Rute ini menghitung ulang hash + salt BARU dari data user yang sudah dikembalikan (Langkah A), men-generate ulang metadata + gambar, mengunggahnya ke Pinata, dan mengarahkan URI aset ke metadata baru (fail-closed bila gagal on-chain). Status sertifikat kembali **MINTED** (bukan CLAIMED).

### Langkah C — Verifikasi restore (wajib, semua harus lolos)
- [ ] User: nama, NIM, email kembali utuh; `dataConsent` `true`; `dataDeletedAt` `null`.
- [ ] Sertifikat: status **MINTED**, `dataSalt` terisi (baru), `dataHash` terisi (baru — **akan berbeda** dari hash sebelum penghapusan karena salt di-generate ulang; ini perilaku restore yang sudah diketahui, bukan cacat).
- [ ] `dataHash` di DB **cocok** dengan `dataHash` di metadata IPFS yang baru (bandingkan langsung).
- [ ] Verifikasi penuh: tingkat 1 **DAPAT DIPERIKSA** dan tingkat 2 **terverifikasi** lagi (nominatif bekerja kembali).
- [ ] Audit log `CERT_RECOVERY` tercatat.
- [ ] Alifa klaim ulang lewat `/claim/F55124011` sehingga status kembali **CLAIMED** dan profil 4/4 langkah lengkap (seperti keadaan 18 Nov 01:37 sebelum tugas destruktif).
- [ ] Catat hash + salt BARU di laporan (hash lama sudah tidak berlaku sesudah restore — jangan kutip hash lama sebagai hash Alifa yang berlaku).

**Bila salah satu poin verifikasi restore gagal: BERHENTI, jangan lanjut ke tugas berikutnya, dan laporkan apa yang gagal + apa yang sudah dicoba.**

---

## Bukti yang harus dihasilkan (untuk Bab 4)

Untuk tiap tugas, hasilkan:

1. **Skrip eksekusi** di `scripts/` (mis. `scripts/tc12-outage-check.ts`, `scripts/tc17-post-deletion.ts`, `scripts/tc18a-consent-before-issuance.ts`, `scripts/tc18b-consent-after-issuance.ts`, `scripts/restore-user-from-backup.ts`). Ikuti pola `scripts/tc16-independence.ts`: komentar header yang menjelaskan tujuan + batasan, tanpa secret di dalam skrip, output yang bisa dibaca manusia + log terstruktur. Skrip verifikasi harus read-only terhadap blockchain (tidak mengirim transaksi) KECUALI langkah yang memang membutuhkan aksi (hapus PII, tarik consent, recovery, klaim ulang) — langkah aksi itu harus eksplisit di skrip/laporan, bukan tersembunyi.
2. **Log JSONL** di `experiments/2026-11-18/` (satu file per kasus uji, mis. `tc12-2026-11-18.jsonl`, `tc17-2026-11-18.jsonl`, `tc18a-2026-11-18.jsonl`, `tc18b-2026-11-18.jsonl`), berisi catatan run lengkap: waktu, input, respons mentah yang relevan, vonis, dan perbandingan sebelum/sesudah.
3. **Screenshot** untuk keadaan UI yang relevan (kartu amber TC-12; keadaan profil/ijazah sesudah anonimisasi dan sesudah restore).
4. **Laporan akhir** (lihat di bawah).

---

## Aturan kerja umum

- Kerja di branch `feat/bab4-experiments` saja. JANGAN buat branch baru tanpa diminta. JANGAN merge ke `main`.
- JANGAN `git add .` / `git commit` / `git push` tanpa persetujuan eksplisit Juan. Laporkan perubahan sebagai daftar file; Juan yang memutuskan commit/push.
- JANGAN tambah dependensi baru. JANGAN ubah konfigurasi build/lint. Pakai pola yang sudah ada di codebase.
- JANGAN ubah file di luar tugas-tugas ini, kecuali perubahan itu wajib agar tugas jalan (sebutkan alasannya di laporan).
- JANGAN ubah draf skripsi / file `.docx` / file di Google Drive.
- JANGAN menulis langsung ke database untuk **aksi yang sedang diuji** (hapus PII, tarik consent, recovery, klaim) — aksi harus lewat rute/UI yang sebenarnya. Pengecualian satu-satunya adalah **Langkah A prosedur restore** (mengembalikan data user dari JSON backup), karena tidak ada rute aplikasi untuk itu — dan langkah itu pun harus berupa skrip terpisah yang bisa direview, bukan perintah inline.
- JANGAN memalsukan sesi login. Untuk aksi sebagai mahasiswa, pakai UI sebagai mahasiswa itu atau sesi terautentikasi miliknya (baca `lib/auth.ts`).
- Sebelum menulis kode, baca file yang relevan (lihat daftar di atas). Perhatikan: repo ini memakai Next.js versi yang punya breaking changes — baca panduan di `node_modules/next/dist/docs/` sebelum menulis kode bila ragu.
- Jalankan typecheck/lint pada file yang diubah. Catat error lama yang sudah ada sebelumnya (jangan klaim sebagai error barumu).
- Hemat panggilan RPC eksternal saat menguji (jangan spam). Jangan pernah mengirim transaksi yang tidak diminta tugas (tidak ada mint/transfer/burn dalam brief ini, kecuali klaim ulang Alifa yang memang bagian dari restore).
- Simpan kredensial/secret di luar skrip dan log. Jangan menulis private key, token, atau isi `.env` ke file apa pun.

## Laporan akhir (wajib)

Kembalikan laporan singkat berisi, untuk tiap tugas:
1. File yang dibuat/diubah (path + fungsi/baris kunci) dan apa yang berubah.
2. Hasil eksekusi dengan angka/status konkret (HTTP status, vonis, nilai field sebelum/sesudah, hash lama vs hash baru sesudah restore).
3. Kutipan persis respons endpoint untuk tingkat 2 sesudah penghapusan (kata yang dipakai endpoint untuk "tidak dapat dipastikan").
4. Bukti restore (daftar periksa Langkah C + hasil klaim ulang).
5. Hal yang TIDAK diubah dan keterbatasan (apa yang belum teruji dan kenapa; bila ada langkah yang tidak bisa dilakukan lewat alur normal, jelaskan).
6. Daftar file untuk commit (jangan commit sendiri).

Akhiri dengan satu kalimat: apakah keempat tugas selesai dan siap direview Juan, atau ada yang masih menggantung.
