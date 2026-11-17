# Project: SIJAGA TC-12 & Revoked Challenge Fix

## Architecture
Perbaikan dua celah fungsional dan integritas vonis pada SIJAGA (Sistem Jaminan Autentikasi Gelar Akademik) di branch `feat/bab4-experiments`:
1. **TC-12 (RPC/IPFS Outage Handling)**:
   - Endpoint `POST /api/verify/tingkat-1` mengembalikan HTTP 502 (IPFS Bad Gateway) atau 503 (RPC Service Unavailable) dengan respons JSON terstruktur lengkap yang memuat `verdict: "TIDAK DAPAT DIPASTIKAN"`, `level: "TINGKAT 1"`, dan rincian evaluasi `checks`.
   - UI `app/verify-onchain/page.tsx` menangani respons tersebut dengan merender kartu Bento gradien amber/orange (`AlertTriangle`, status token `"TIDAK DIKETAHUI"`, dan fallback data aman) alih-alih melempar error mentah.
2. **Challenge on REVOKED Certificate**:
   - Mencegah vonis keliru "Kepemilikan Terverifikasi" pada ijazah yang telah dicabut (`status === "REVOKED"`).
   - Pendekatan Defense-in-Depth:
     - Lapis 1 (API & Core Lib): `POST /api/verify/challenge` dan `verifyVerificationChallenge` menerima `certificateId?: string`. Jika status `REVOKED`, tolak permintaan nonce dan verifikasi dengan HTTP 400 `{ verified: false, error: "CERT_REVOKED", message: "..." }`.
     - Lapis 2 (UI `app/ijazah/[id]/page.tsx`): Deteksi `isRevoked`, ganti status badge menjadi "Ijazah Dicabut" (merah), tampilkan banner peringatan, nonaktifkan tombol verifikasi (`disabled`), dan guard agar UI tidak pernah menampilkan badge/teks hijau "Kepemilikan Terverifikasi".
     - Kriptografi Ed25519 (tweetnacl, nonce 128-bit, 5-min expiry, anti-replay, rate limit) tetap 100% utuh.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | TC-12 Backend Structured Error | Return HTTP 502/503 with structured payload `{ success: false, level: "TINGKAT 1", verdict: "TIDAK DAPAT DIPASTIKAN", checks, warning }` when RPC/IPFS fails | M1 | Brief §Tugas 1 & Tabel 3.3 |
| 2 | TC-12 Frontend Bento Rendering | Render amber/orange Bento card with `AlertTriangle` and fallback on `/verify-onchain` without raw error crash | M1 | Brief §Tugas 1 & Tabel 3.3 |
| 3 | Revoked Challenge Core & API Defense | Add `certificateId?: string` and `"CERT_REVOKED"` check to `lib/challenge.ts` and `app/api/verify/challenge/route.ts` | M2 | Brief §Tugas 2 |
| 4 | Revoked Challenge UI Guard & Warning | Disable challenge button on revoked cert, show red warning banner, prevent affirmative verified badge on `/ijazah/[id]` | M2 | Brief §Tugas 2 |
| 5 | Non-Regression on Valid, Revoked, 404, 400 | Ensure valid assets, existing revoked certs, foreign issuers, wallet addresses, and random hashes maintain 100% intact behavior | M3 | System Constraints |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | TC-12 RPC/IPFS Failure Handling | `app/api/verify/tingkat-1/route.ts`, `app/verify-onchain/page.tsx` | none | DONE |
| M2 | Revoked Certificate Challenge Defense | `lib/challenge.ts`, `app/api/verify/challenge/route.ts`, `app/ijazah/[id]/page.tsx` | none | DONE |
| M3 | Verification, Regression Testing & Audit | Challengers, Reviewers, and Forensic Auditor verification | M1, M2 | DONE |

## Interface Contracts
### `app/api/verify/tingkat-1/route.ts` (RPC/IPFS Outage)
- Method: `GET / POST`
- Input: `asset` (Base58 string)
- Output on RPC Failure (HTTP 503):
  ```json
  {
    "success": false,
    "level": "TINGKAT 1",
    "verdict": "TIDAK DAPAT DIPASTIKAN",
    "asset": "<mintAddress>",
    "reason": "RPC",
    "error": "Koneksi ke Solana RPC mengalami kegagalan / tidak dapat dijangkau",
    "timings": { "rpcMs": 0, "ipfsMs": 0 },
    "checks": {
      "tokenExists": { "status": "TIDAK DAPAT DIPASTIKAN", "detail": "..." },
      "issuerAuthority": { "status": "TIDAK DAPAT DIPASTIKAN", "detail": "..." },
      "statusPencabutan": { "status": "TIDAK DAPAT DIPASTIKAN", "detail": "..." },
      "tokenFrozen": { "status": "TIDAK DAPAT DIPASTIKAN", "detail": "..." },
      "dataHashOnChain": { "status": "TIDAK DAPAT DIPASTIKAN", "detail": "..." },
      "nominatifMatch": { "status": "TIDAK DAPAT DIPASTIKAN", "detail": "..." },
      "identityBinding": { "status": "TIDAK DAPAT DIPASTIKAN", "detail": "..." }
    },
    "warning": "Koneksi ke infrastruktur desentralisasi terganggu..."
  }
  ```
- Output on Metadata Failure (HTTP 502): Same structure with `reason: "METADATA"` and `tokenExists.status: "DAPAT DIPERIKSA"`.

### `app/api/verify/challenge/route.ts` & `lib/challenge.ts`
- Mode B (Nonce Request):
  - Request: `{ walletAddress: string, certificateId?: string }`
  - If `certificateId` has `status === "REVOKED"`:
    - HTTP 400: `{ success: false, error: "CERT_REVOKED", message: "..." }`
- Mode A (Verify Signature):
  - Request: `{ action: "verify", walletAddress: string, nonce: string, signature: string, message: string, expectedOwner?: string, certificateId?: string }`
  - If `certificateId` has `status === "REVOKED"`:
    - HTTP 400: `{ verified: false, error: "CERT_REVOKED", message: "..." }`

## Code Layout
Exclusive Write Ownership for Worker:
- `app/api/verify/tingkat-1/route.ts` (M1)
- `app/verify-onchain/page.tsx` (M1)
- `lib/challenge.ts` (M2)
- `app/api/verify/challenge/route.ts` (M2)
- `app/ijazah/[id]/page.tsx` (M2)
