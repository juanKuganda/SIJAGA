# SIJAGA — Rencana Implementasi Perbaikan

**Sistem Jaminan Autentikasi Gelar Akademik**  
Universitas Tadulako · Tugas Akhir S1 Informatika

Dokumen ini adalah rencana kerja berurutan untuk memperbaiki codebase SIJAGA agar klaim sistem (“terverifikasi di Solana”) dapat dibela. Bukan daftar fitur baru, bukan gold-plating.

Repo acuan: [juanKuganda/SIJAGA](https://github.com/juanKuganda/SIJAGA)

---

## Prinsip perbaikan

1. **Fail-closed** — gagal rantai = gagal verifikasi / gagal ganti status. Jangan loloskan sebagai sah.
2. **Rantai = bukti, bukan hiasan** — keputusan `verified` wajib membaca aset Metaplex + metadata IPFS, bukan hanya kolom Postgres.
3. **Satu status, satu kebenaran** — portal tidak boleh `REVOKED` / `MINTED` / `CLAIMED` jika transaksi on-chain yang relevan gagal.
4. **Tidak ada NFT yatim / dobel** — mint, revoke, reset wallet, dan recovery harus idempoten dan dapat direkonsiliasi.

---

## Yang sengaja tidak dikerjakan dulu

Tahan ini — besar, tidak membuat thesis/demo lebih siap:

- Program Anchor / PDA custom
- Multisig / hardware wallet untuk admin
- Migrasi jaringan ke mainnet
- Enkripsi cadangan PII tingkat enterprise
- Indexer / The Graph

Kerjakan setelah empat fase di bawah jika masih ada waktu.

---

## Fase 0 — Kontrak status (fondasi)

Tanpa ini, perbaikan mint/revoke akan bertabrakan. Satu sesi kerja.

### Status machine baru

Di `prisma/schema.prisma`, enum `CertStatus`:

```text
NOT_ISSUED → ISSUING → MINTED → CLAIMED
                    ↘ REVOKED
         REVOKED → (recovery) → MINTED
```

Treat `ISSUING` = jangan mint lagi, jangan klaim, jangan tampilkan verified.

### Field baru di model `Certificate`

| Field | Tipe | Kegunaan |
|---|---|---|
| `onChainOwner` | `String?` | owner terakhir dari `fetchAsset` |
| `onChainFrozen` | `Boolean?` | plugin freeze masih `true` |
| `onChainHash` | `String?` | hash yang terbaca dari metadata URI |
| `onChainCheckedAt` | `DateTime?` | kapan terakhir dicek |
| `onChainError` | `String?` | alasan gagal sync (revoke gagal, RPC down) |

Setelah ubah schema:

```bash
npx prisma db push
```

### File yang wajib di-grep

Semua pemakaian `CertStatus`, `"MINTED"`, `"NOT_ISSUED"`:

- `app/api/nft/mint/route.ts`
- `app/api/nft/revoke/route.ts`
- `app/api/verify/route.ts`
- `app/api/actions/claim/route.ts`
- `app/api/admin/stats/route.ts`
- `app/api/admin/recovery/route.ts`
- `app/api/admin/wallet/reset/route.ts`
- Halaman admin Terbitkan / Revoke / Dashboard

Stats admin **tidak** menghitung `ISSUING` sebagai ijazah terbit.

### Definisi selesai

- UI tidak crash
- Dashboard tidak menghitung `ISSUING` sebagai terbit
- Mahasiswa tidak bisa klaim certificate berstatus `ISSUING`

---

## Fase 1 — Verifikasi benar-benar baca rantai

**Paling penting.** Ini gap yang merusak narasi skripsi.

Portal saat ini (`GET /api/verify`) hanya membandingkan hash di Postgres. Komentar di route itu eksplisit: tidak memanggil `fetchAsset()`, tidak menarik metadata IPFS.

### 1.1 Satu helper, jangan fetch tersebar

File baru: `lib/onchain.ts` (atau perluas `lib/metaplex.ts`).

Fungsi `inspectCertificate(mintAddress)`:

1. `fetchAsset(umi, mint)`
2. Baca `owner`, `name`, `uri`, freeze plugin (`PermanentFreezeDelegate`), `updateAuthority`
3. `fetch(uri)` metadata JSON
4. Ambil attribute `Data Hash`
5. Return union tegas:

```ts
type OnChainInspect =
  | {
      ok: true;
      owner: string;
      name: string;
      uri: string;
      frozen: boolean;
      dataHash: string | null;
      updateAuthority: string;
    }
  | {
      ok: false;
      reason: "NOT_FOUND" | "RPC" | "METADATA" | "NO_HASH";
    };
```

Timeout 30s + retry yang sudah ada di `lib/metaplex.ts` tetap dipakai.

### 1.2 `/api/verify` menjadi 3 lapisan

Ubah `app/api/verify/route.ts`.

| Lapisan | Apa | Hasil |
|---|---|---|
| A. DB | certificate ada, bukan `NOT_ISSUED` / `ISSUING` | `recordFound` |
| B. Hash lokal | `verifyDataHash(nama, nim, prodi, salt, dataHash)` | `hashVerified` (`null` jika PII dihapus) |
| C. On-chain | `inspectCertificate` | `onChain` |

Aturan keputusan (ini yang dibela di sidang):

`verified: true` **hanya jika** semua ini benar:

1. Lapisan A lolos
2. Lapisan B `true`, **atau** PII sudah dihapus (`dataDeletedAt` terisi) sehingga hash lokal tidak bisa dihitung
3. `inspectCertificate` `ok: true`
4. `onChain.dataHash === certificate.dataHash`
5. Owner on-chain = `wallet.walletAddress` terdaftar
6. `frozen === true`
7. Nama on-chain tidak mengandung `[DIBATALKAN]`, kecuali status DB memang `REVOKED`

Cabang gagal:

| Kondisi | Response |
|---|---|
| RPC down / timeout | `verified: false`, `onChain.status: "UNAVAILABLE"` — **jangan** loloskan sebagai sah |
| Hash DB ≠ hash IPFS | `verified: false`, `mismatch: "HASH"` |
| Owner ≠ wallet terdaftar | `verified: false`, `mismatch: "OWNER"` |
| DB `REVOKED` tapi nama on-chain masih biasa | `mismatch: "REVOKE_NOT_PROPAGATED"` — jangan bilang valid |
| Nama on-chain `[DIBATALKAN]` tapi DB belum `REVOKED` | `verified: false`, `mismatch: "STATUS"` |

Response publik tetap mask PII. Tambah field non-PII:

- `onChain.frozen`
- `onChain.owner`
- `onChain.status` (`VALID` | `UNAVAILABLE` | `NOT_FOUND` | `MISMATCH`)
- `mismatch`
- `explorerUrl` (cluster dari env, bukan hardcoded `devnet`)

Jangan kirim `dataHash` / `dataSalt` ke klien publik.

### 1.3 Blink verify

`app/api/actions/verify/route.ts` sekarang hanya `getAccountInfo !== null` (akun kosong pun dianggap “ada”). Ganti ke `inspectCertificate`.

Label Blink:

- Valid dan frozen
- Dicabut
- Tidak bisa konfirmasi rantai (`UNAVAILABLE`)

### Definisi selesai

Skenario manual ini lolos:

1. Ijazah minted → portal `verified: true` + explorer match
2. RPC salah / dimatikan → portal **tidak** bilang sah
3. `dataHash` di DB diubah manual → `mismatch: "HASH"`, tidak verified
4. Ijazah revoked on-chain → portal dan Blink sama-sama invalid

---

## Fase 2 — Mint / revoke / reset tidak boleh yatim

### 2.1 Mint: simpan alamat dulu, baru kirim transaksi

Hari ini di `app/api/nft/mint/route.ts`: IPFS → mint → baru tulis DB. Crash di tengah = NFT di wallet tanpa baris certificate.

Ubah `mint` + `lib/metaplex.ts`:

1. Gate tetap: admin, `dataConsent`, wallet `VERIFIED`, cert `NOT_ISSUED` **atau** `ISSUING` stale
2. `generateSigner` **sebelum** RPC mint
3. Upsert certificate: `status: ISSUING`, `nftAddress: mintSigner.publicKey`, hash + salt, metadata URI
4. Baru `create().sendAndConfirm`
5. Sukses → `MINTED` + `txSignature` + snapshot on-chain (`onChainOwner`, `onChainFrozen`, `onChainHash`, `onChainCheckedAt`)
6. Gagal → **jangan** hapus `nftAddress`. Set `onChainError`. Admin bisa retry

Idempoten:

- Request mint kedua untuk user `ISSUING` = lanjutkan, bukan error “sudah terbit”
- Retry: jika `fetchAsset` = not found, kirim ulang `create` dengan signer yang sama
- Jika asset sudah ada di rantai, **promote** ke `MINTED` (rekonsiliasi) — jangan mint NFT kedua

IPFS gagal sebelum mint = tetap `NOT_ISSUED`. Pin yatim di Pinata boleh diabaikan (murah).

Pisahkan helper di `lib/metaplex.ts`:

- `prepareMintSigner()` — generate + return pubkey / secret (secret hanya di memori request, atau disimpan terenkripsi jika retry lintas request diperlukan)
- `mintSoulboundNFT({ mintSigner, metadataUri, walletTujuan })` — tidak lagi menerima `nama` / `nim`

> Catatan: jika retry harus lintas request HTTP (serverless), `mintSigner` secret perlu disimpan. Untuk thesis, cukup retry dalam request yang sama + rekonsiliasi `fetchAsset` pada request berikutnya. Jangan persist secret key mahasiswa/admin tambahan jika bisa dihindari.

### 2.2 Revoke: fail-closed

Di `lib/metaplex.ts` fungsi `revokeSoulboundNFT`:

- **Hapus** cabang `success: true` + `signature: null` untuk immutable / error `0x3b`
- Return `success: false` jika on-chain gagal

Di `app/api/nft/revoke/route.ts`:

- Backup JSON ke `CertificateBackup` **tetap dibuat dulu** (aman)
- **Jangan** `certificate.update(REVOKED)` jika `revokeSoulboundNFT` gagal
- Response `502` + `onChainError` supaya admin tahu harus retry

Mint saat ini tidak set `updateAuthority: None`, jadi revoke *harusnya* selalu bisa. Fallback lama justru menutupi bug.

Recovery di `app/api/admin/recovery/route.ts`: sama — gagal `restoreSoulboundNFT` = jangan set `MINTED`.

### 2.3 Wallet reset: larang jika NFT masih hidup

`app/api/admin/wallet/reset/route.ts` hari ini menghapus wallet + set `NOT_ISSUED` tanpa sentuh rantai → double mint.

Aturan baru:

| Kondisi certificate | Reset wallet |
|---|---|
| `MINTED` / `CLAIMED` / `ISSUING` + ada `nftAddress` | **400** — “revoke dulu” |
| `REVOKED` | Boleh reset wallet; **jangan** null-kan `nftAddress` (jejak) |
| `NOT_ISSUED` tanpa `nftAddress` | Boleh |

Remint hanya jika tidak ada asset frozen aktif, atau status sudah `REVOKED`.

### Definisi selesai

Tidak ada jalur UI yang menghasilkan dua NFT Metaplex Core untuk satu NIM.

---

## Fase 3 — Claim Blink yang bisa dipercaya

NFT sudah di wallet mahasiswa saat mint. Claim = transaksi Memo. Pola itu boleh, tetapi callback sekarang naif: cukup `getTransaction(signature)` sukses + NIM di query string.

### 3.1 POST `/api/actions/claim`

Tetap: cek `body.account === user.wallet.walletAddress`.

Ubah isi memo. Jangan taruh `dataHash` penuh di plaintext. Cukup:

```json
{
  "type": "SIJAGA_CLAIM",
  "certId": "<cuid>",
  "mint": "<nftAddress>"
}
```

NIM di query tetap untuk UX Blink, **bukan** sumber otorisasi.

### 3.2 POST `/api/actions/claim-callback`

Setelah `getTransaction`:

1. `meta.err` harus `null` (sudah ada)
2. Fee payer / signer = wallet terdaftar user itu
3. Ada instruction program Memo (`MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`)
4. Payload memo: `type === "SIJAGA_CLAIM"` dan `mint === certificate.nftAddress`
5. Baru set `status: CLAIMED`

Salah satu gagal → `400`, DB tidak berubah. Idempoten jika sudah `CLAIMED`.

### 3.3 `public/actions.json`

Saat ini memetakan `/ijazah/**` (CUID certificate) ke `/api/actions/claim?nim=`. Itu salah.

Usulan:

```json
{
  "rules": [
    {
      "pathPattern": "/claim/**",
      "apiPath": "/api/actions/claim?nim=*"
    },
    {
      "pathPattern": "/api/actions/claim**",
      "apiPath": "/api/actions/claim**"
    },
    {
      "pathPattern": "/api/actions/verify**",
      "apiPath": "/api/actions/verify**"
    }
  ]
}
```

### Definisi selesai

Klaim dari wallet orang lain, signature sembarang, atau memo kosong **tidak** mengubah status certificate.

---

## Fase 4 — Rapikan supaya sidang tidak bocor

Cepat, dampak besar. Kerjakan setelah Fase 1–3 hijau, atau sisipkan jika ada celah waktu.

| # | Masalah | Perbaikan | File |
|---|---|---|---|
| 1 | Password seed vs README tidak sama (`@admin123` vs `admin123`) | Samakan, satu sumber | `prisma/seed.ts`, `README.md` |
| 2 | Explorer hardcoded `?cluster=devnet` | Cluster dari `NEXT_PUBLIC_SOLANA_NETWORK` | `app/api/verify/route.ts`, `lib/gemini.ts`, Blink pages |
| 3 | `getTokenAccounts` query SPL Token; NFT ini Metaplex Core | Hapus, atau ganti `inspectCertificate` | `lib/solana.ts` |
| 4 | `mintSoulboundNFT` masih terima `nama` / `nim` lalu di-log | Hapus dari argumen; cegah PII ke log production | `lib/metaplex.ts`, `app/api/nft/mint/route.ts` |
| 5 | `GET /api/admin/backup` dump nama/NIM/email + salt ikut JSON | Jangan kirim `dataSalt` ke klien; audit log pakai userId/CUID, bukan nama+NIM | `app/api/admin/backup/route.ts`, `lib/audit.ts` |
| 6 | `proxy.ts` lolos jika ada cookie bernama mengandung `auth` | Cek nama cookie Neon/Better Auth yang pasti | `proxy.ts` |
| 7 | `/api/verify` publik, rawan enumerasi NIM | Rate limit ketat, pola sama `/api/ask` | `proxy.ts` |

---

## Urutan implementasi

Jangan dikerjakan acak.

```text
Fase 0    schema + compile UI
Fase 1    inspectCertificate + /api/verify + Blink verify     ← nilai skripsi
Fase 2.2  revoke fail-closed                                  ← cepat, aman
Fase 2.1  mint ISSUING                                        ← hati-hati, pecah sendiri
Fase 2.3  wallet reset guard
Fase 3    claim callback + actions.json
Fase 4    hygiene
```

**Fase 2.1 paling berisiko merusak demo.** Kerjakan setelah Fase 1 dan 2.2 hijau.

Kalau waktu hanya cukup untuk satu potong: **Fase 0 + Fase 1**. Itu yang mengubah kalimat sidang.

---

## Tes minimum

Tidak perlu framework tes baru. Checklist manual atau script `scripts/verify-invariants.ts`.

| # | Aksi | Harus |
|---|---|---|
| 1 | Mint happy path | DB `MINTED`, asset frozen, owner = wallet mahasiswa, URI punya Data Hash |
| 2 | Mint dipanggil 2× | Rekonsiliasi atau 400, **bukan** NFT kedua |
| 3 | Putus proses setelah `ISSUING` sebelum confirm | Retry promote atau lanjut, tidak dobel |
| 4 | Verify publik | `verified` hanya jika inspect on-chain lolos |
| 5 | RPC palsu | `UNAVAILABLE`, bukan sah |
| 6 | Revoke | On-chain nama `[DIBATALKAN]` **lalu** DB `REVOKED` |
| 7 | Revoke dengan RPC down | DB tetap `MINTED` / `CLAIMED` |
| 8 | Reset wallet saat masih minted | 400 |
| 9 | Claim wallet salah | 403, status tetap `MINTED` |
| 10 | Callback signature random | 400 |
| 11 | Hapus PII | `hashVerified: null`, on-chain tetap frozen, PII di-mask |

Jika **1, 4, 6, 9** hijau, sistem sudah siap dibela.

---

## Definisi “lebih siap”

Bukan: lebih banyak fitur admin.

Ya, jika di sidang bisa dikatakan:

> Ijazah sah iff (1) record kampus ada, (2) SHA-256(`nama|NIM|prodi|salt`) sama dengan hash di metadata IPFS yang diacu NFT, (3) NFT Metaplex Core di Solana dalam keadaan frozen dan owner-nya wallet terdaftar. Gagal rantai = gagal verifikasi. Gagal revoke on-chain = status portal tidak berubah.

Itu gap yang sekarang belum benar.

---

## Peta file

| Area | File utama |
|---|---|
| Schema | `prisma/schema.prisma` |
| On-chain inspect | `lib/onchain.ts` **(baru)** / `lib/metaplex.ts` |
| Hash | `lib/crypto.ts` |
| IPFS | `lib/pinata.ts` |
| Mint | `app/api/nft/mint/route.ts` |
| Revoke | `app/api/nft/revoke/route.ts` |
| Verify portal | `app/api/verify/route.ts` |
| Verify Blink | `app/api/actions/verify/route.ts` |
| Claim Blink | `app/api/actions/claim/route.ts`, `app/api/actions/claim-callback/route.ts` |
| Blink mapping | `public/actions.json` |
| Recovery | `app/api/admin/recovery/route.ts` |
| Wallet reset | `app/api/admin/wallet/reset/route.ts` |
| Proxy / rate limit | `proxy.ts` |
| Seed / docs | `prisma/seed.ts`, `README.md` |

---

## Referensi temuan awal (ringkas)

Temuan yang mendorong rencana ini, dari audit codebase:

1. Verifikasi portal **off-chain only** — hash DB vs DB, explorer hanya tautan.
2. Dual source of truth — revoke/restore bisa sukses di DB meski on-chain gagal.
3. Mint tidak atomic + wallet reset tidak burn → risiko NFT yatim / dobel.
4. Admin key di env server = single point of failure (ditahan, tidak dikerjakan di fase ini).
5. Claim callback tidak mem-parse memo / signer.
6. Hash hanya attribute JSON di URI, bisa diganti update authority (itu juga fitur revoke — maka Fase 1 wajib membandingkan hash on-chain vs DB).
7. Soulbound = `PermanentFreezeDelegate` dengan authority admin, bukan soulbound kriptografis abadi.
8. Detail: password seed ≠ README, `getTokenAccounts` SPL vs Core, `actions.json` mapping CUID vs NIM.

---

*Dokumen rencana. Bukan changelog. Implementasi mengikuti urutan fase di atas.*
