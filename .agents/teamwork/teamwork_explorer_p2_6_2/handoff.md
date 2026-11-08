# Handoff Report: Investigation of Certificate Issuance Endpoint and Next.js Dev Server Setup (TRACE P2.6 / R1 & R3)

**Author**: `teamwork_explorer_p2_6_2`  
**Date**: 2026-11-08  
**Scope**: TRACE P2.6 Requirements R1 (Next.js dev server lifecycle & admin session) & R3 (Certificate issuance application endpoint).

---

## 1. Observation

### 1.1 Application Issuance Endpoint & UI Component
- **Admin UI File**: `app/(admin)/terbitkan/page.tsx`
  - In `fetchMahasiswa()` (lines 49–65), only students with `wallet?.status === "VERIFIED"` and `(!certificate || certificate.status === "NOT_ISSUED")` are listed for issuance.
  - In `handleMint(userId: string)` (lines 88–118), the page issues the certificate via:
    ```typescript
    // app/(admin)/terbitkan/page.tsx:92-96
    const response = await fetch("/api/nft/mint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    ```
- **API Route Handler**: `app/api/nft/mint/route.ts`
  - Method: `POST`
  - Route: `/api/nft/mint`
  - Line 11: `export async function POST(request: NextRequest)`
  - Line 13: `const payload = await getAuthUser();` (called **without** the `request` argument)
  - Lines 14–19: Requires `payload.role === "ADMIN"`, returning HTTP `401 Unauthorized` if null or non-admin.
  - Line 24: Validates payload with `mintNftSchema.safeParse(body)` from `lib/validation.ts`:
    ```typescript
    // lib/validation.ts:38-40
    export const mintNftSchema = z.object({
      userId: z.string().min(1, "User ID wajib diisi"),
    });
    ```

### 1.2 Issuance Response Contract
From `app/api/nft/mint/route.ts`:
- **Success Response (HTTP 200)** (lines 237–244):
  ```json
  {
    "certificate": {
      "id": "<prisma_certificate_id>",
      "nftAddress": "<solana_metaplex_core_asset_address>",
      "txSignature": "<solana_tx_signature_base58>",
      "status": "MINTED"
    }
  }
  ```
- **Reconciled Response (HTTP 200)** (lines 96–104) if certificate was previously in `ISSUING` and confirmed on-chain:
  ```json
  {
    "certificate": {
      "id": "<id>",
      "nftAddress": "<nftAddress>",
      "txSignature": "<txSignature>",
      "status": "MINTED"
    },
    "reconciled": true
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: `{ "error": "Unauthorized" }`
  - `400 Bad Request`: `{ "error": "<validation_message>" }`
  - `404 Not Found`: `{ "error": "User tidak ditemukan" }`
  - `403 Forbidden`: `{ "error": "CONSENT_REQUIRED", "message": "Mahasiswa belum memberikan persetujuan publikasi data. Minting tidak dapat dilakukan." }`
  - `400 Bad Request`: `{ "error": "Wallet belum terverifikasi" }`
  - `400 Bad Request`: `{ "error": "Data Program Studi tidak lengkap" }`
  - `400 Bad Request`: `{ "error": "Ijazah sudah diterbitkan dan menunggu klaim" }` (or CLAIMED / REVOKED)
  - `500 Internal Server Error`: `{ "error": "<mint_error> || Gagal mint NFT. Status ISSUING — silakan retry." }`
  - `502 Bad Gateway`: `{ "error": "Tidak bisa verifikasi status NFT sebelumnya (...). Coba lagi nanti." }`

### 1.3 Preconditions Enforced by `/api/nft/mint`
Tracing `app/api/nft/mint/route.ts`:
1. **Admin Authorization**: `getAuthUser()` must resolve to an active admin user (`payload.role === "ADMIN"`).
2. **User Record Existence**: User with `userId` must exist in PostgreSQL `User` table.
3. **Data Consent Gate (UU PDP)** (lines 52–57):
   ```typescript
   if (!user.dataConsent) {
     return NextResponse.json({
       error: "CONSENT_REQUIRED",
       message: "Mahasiswa belum memberikan persetujuan publikasi data. Minting tidak dapat dilakukan."
     }, { status: 403 });
   }
   ```
4. **Wallet Status Gate** (lines 59–64):
   ```typescript
   if (!user.wallet || user.wallet.status !== "VERIFIED") {
     return NextResponse.json(
       { error: "Wallet belum terverifikasi" },
       { status: 400 }
     );
   }
   ```
5. **Certificate Status Gate** (lines 68–127):
   - Certificate must not already be in status `MINTED`, `CLAIMED`, or `REVOKED`.
   - If in `ISSUING`, it runs `inspectCertificate(user.certificate.nftAddress)`.
6. **Required Academic Fields**:
   - `user.prodi` must be defined (line 131).
   - `user.nama`, `user.nim`, `user.prodi` are hashed via `generateDataHash(user.nama, user.nim, user.prodi)` in `lib/crypto.ts:10-22` producing `dataHash` (format: `sha256:<64-hex>`) and `salt` (32-hex).
   - `user.tahunLulus` defaults to `"2026"` if null.
7. **IPFS Storage Upload**:
   - Calls `generateAndUploadCertificateImage(...)` and `uploadMetadataToPinata(...)` via `lib/pinata.ts`. Requires valid `PINATA_JWT` in `.env.local`.
8. **On-chain Metaplex Core Mint**:
   - Calls `prepareMintSigner()` generating a new Solana keypair for the Core Asset.
   - Updates Certificate record to `status: "ISSUING"` before broadcast.
   - Calls `mintSoulboundNFT(...)` in `lib/metaplex.ts` using admin wallet (`Bat5VTbjGqsThS5oERuXVi7d2JY2TBNomJD2ZciaztaQ`) on Solana Devnet.
   - Adds plugin `PermanentFreezeDelegate` with `frozen: true` and `authority: { type: 'UpdateAuthority' }`.
   - Finalizes transaction and updates Certificate record to `status: "MINTED"`.

### 1.4 Admin Authorization & Session Handling
- **Mechanism in `lib/auth.ts`**:
  ```typescript
  // lib/auth.ts:17-48
  export async function getAuthUser(request?: Request): Promise<JWTPayload | null> {
    try {
      // 1. Check for programmatic admin key header (benchmark & test automation)
      if (request && request.headers) {
        const adminKeyHeader =
          request.headers.get("x-admin-key") ||
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

        const expectedAdminKey =
          process.env.ADMIN_WALLET_PRIVATE_KEY || process.env.ADMIN_API_SECRET;
        ...
      }

      // 2. Neon Auth session
      let session = null;
      try {
        const res = await auth.getSession();
        session = res.data;
      } catch {
        session = null;
      }
      ...
  ```
- **Crucial Route Observation**:
  - In `app/api/nft/mint/route.ts:13`, `getAuthUser()` is called **without** `request`:
    `const payload = await getAuthUser();`
  - In `app/api/wallet/verify/route.ts:8`, `getAuthUser()` is also called **without** `request`:
    `const payload = await getAuthUser();`
  - Consequently, step 1 (`x-admin-key` header) is **NOT evaluated** on `/api/nft/mint` or `/api/wallet/verify`. Only step 2 (`auth.getSession()`) is executed.
  - Step 2 requires an active **Neon Auth session cookie** (`__Secure-neon-auth.session_token` and `__Secure-neon-auth.local.session_data`).
- **Seed Admin Credentials (`prisma/seed.ts:84-99`)**:
  - `Email`: `admin@sijaga.ac.id`
  - `Password`: `@admin123`
  - `Role`: `ADMIN`
  - `NIM`: `ADMIN001`
  - Database record verified: `id: '8120a0a0-40a3-41d6-8813-1e7e19b43a40'`.
- **Admin HTTP Login Verification**:
  - Executed HTTP login against the dev server:
    ```bash
    curl -s -c cookies.txt -X POST http://127.0.0.1:3000/api/auth/sign-in/email \
      -H "Content-Type: application/json" \
      -H "Origin: http://localhost:3000" \
      -d '{"email":"admin@sijaga.ac.id","password":"@admin123"}'
    ```
  - Response: `HTTP 200 OK` with JSON:
    ```json
    {
      "redirect": false,
      "token": "PanjQK58W6xZlvKQXAP1ZZH3Xf96Lokc",
      "user": {
        "name": "Admin SIJAGA",
        "email": "admin@sijaga.ac.id",
        "id": "8120a0a0-40a3-41d6-8813-1e7e19b43a40"
      }
    }
    ```
  - And cookies:
    - `__Secure-neon-auth.session_token=<token>; Path=/; Max-Age=604800; HttpOnly; Secure; SameSite=Lax`
    - `__Secure-neon-auth.local.session_data=<signed_jwt>; Path=/; Max-Age=86399; HttpOnly; Secure; SameSite=Lax`
  - Verified authenticated endpoint access with the stored cookies:
    - `GET http://127.0.0.1:3000/api/auth/me` -> returned Admin user data (`role: "ADMIN"`).
    - `GET http://127.0.0.1:3000/api/admin/mahasiswa` -> returned student list.
    - `POST http://127.0.0.1:3000/api/nft/mint` with invalid user ID -> returned `HTTP 404 Not Found {"error":"User tidak ditemukan"}` (proving authentication succeeded and authorization passed).

### 1.5 Dev Server Execution & Health Checks
- **Command**:
  ```bash
  NODE_OPTIONS="--dns-result-order=ipv4first" ./node_modules/.bin/next dev -p 3000
  ```
- **Port**: `3000` (configurable via `-p <port>` or `PORT=<port>`).
- **Turbopack Execution**:
  Next.js 16 uses Turbopack (`next dev`). Initial compilation of `/api/auth/[...path]` took ~12-15 seconds; subsequent requests responded in ~100-300ms.
- **DNS IPv6 / IPv4 Quirk Discovered**:
  On this host, AWS Neon Auth (`ep-purple-voice-az7hu0wk.neonauth.c-3.ap-southeast-1.aws.neon.tech`) resets IPv6 connections (`ECONNRESET`). Setting `NODE_OPTIONS="--dns-result-order=ipv4first"` forces Node.js to use IPv4 first, resolving the upstream proxy connection immediately without failures.
- **Health / Readiness Endpoint**:
  - `GET http://127.0.0.1:3000/api/auth/ok`
  - Returns `HTTP 200` with body `{"ok":true}` when the dev server is fully up and the auth proxy is reachable.
- **Execution Environment Requirement**:
  Antigravity sandbox blocks HTTP connection to port 3000 without `BypassSandbox: true`. All commands querying or running the local server (`curl http://127.0.0.1:3000/...`) must set `BypassSandbox: true`.

---

## 2. Logic Chain

1. **Identifying the Issuance Endpoint**:
   - The user requested to issue certificates "using the application's actual issuance endpoint (as used by the admin `/terbitkan` page)".
   - Inspection of `app/(admin)/terbitkan/page.tsx:92` directly showed `fetch("/api/nft/mint", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) })`.
   - Inspection of `app/api/nft/mint/route.ts` confirmed this is the Next.js Route Handler responsible for minting Soulbound Metaplex Core assets on Solana Devnet.

2. **Determining Response Structure**:
   - In `app/api/nft/mint/route.ts:214-244`, upon successful execution of `mintSoulboundNFT()`, the handler records the result in the `Certificate` table and returns:
     `{ certificate: { id, nftAddress, txSignature, status: "MINTED" } }`.
   - The mint address is `certificate.nftAddress` and the transaction signature is `certificate.txSignature`.

3. **Tracing Prerequisite Enforcement**:
   - Step 1: Admin authorization check (`getAuthUser()`).
   - Step 2: Body validation via Zod (`mintNftSchema` requires `userId`).
   - Step 3: Database query fetches User including `wallet` and `certificate`.
   - Step 4: `if (!user.dataConsent)` rejects with 403 `CONSENT_REQUIRED`. Therefore, student must submit `POST /api/consent` beforehand.
   - Step 5: `if (!user.wallet || user.wallet.status !== "VERIFIED")` rejects with 400. Therefore, student must register wallet (`POST /api/wallet/register`), and Admin must approve it (`POST /api/wallet/verify`).
   - Step 6: `user.certificate` must not be in `MINTED`, `CLAIMED`, or `REVOKED`.
   - Step 7: `user.prodi` must be non-empty.

4. **Discovering Authorization Requirement Difference**:
   - While `lib/auth.ts` provides support for header `x-admin-key: <ADMIN_WALLET_PRIVATE_KEY>`, this only activates if `request` is passed into `getAuthUser(request)`.
   - In `app/api/nft/mint/route.ts:13` and `app/api/wallet/verify/route.ts:8`, `getAuthUser()` is called with zero arguments.
   - Therefore, sending `x-admin-key` header to `/api/nft/mint` or `/api/wallet/verify` does not authenticate the user; it falls through to `auth.getSession()`.
   - Neon Auth session cookies (`__Secure-neon-auth.session_token` and `__Secure-neon-auth.local.session_data`) are strictly required.
   - We verified that calling `POST /api/auth/sign-in/email` with seed admin credentials (`admin@sijaga.ac.id` / `@admin123`) and header `Origin: http://localhost:3000` issues these exact cookies and allows subsequent admin operations.

5. **Establishing Dev Server Lifecycle**:
   - Server runs Next.js 16 with Turbopack.
   - Spawning via `run_command` with `IsDaemon: true`, `BypassSandbox: true`, and `NODE_OPTIONS="--dns-result-order=ipv4first" ./node_modules/.bin/next dev -p 3000` brings up the server in under 3 seconds.
   - Polling `http://127.0.0.1:3000/api/auth/ok` until it returns 200 confirms readiness.
   - Cleanup is performed using `manage_task(Action='kill', TaskId=...)`.

---

## 3. Caveats

1. **Solana Devnet RPC Rate Limits**:
   Public Solana Devnet RPC (`devnet.helius-rpc.com` / `api.devnet.solana.com`) occasionally experiences latency or 429s. `lib/metaplex.ts` has built-in retry handling (up to 3 attempts with exponential backoff). The worker should account for transaction confirmation time (typically 3–10 seconds).
2. **Admin Wallet Devnet SOL**:
   Minting requires Devnet SOL in the institution admin wallet (`Bat5VTbjGqsThS5oERuXVi7d2JY2TBNomJD2ZciaztaQ`). Current wallet balance was confirmed funded during Phase 2.1 experiments.
3. **Pinata IPFS Gateway**:
   Minting performs two real IPFS uploads (image and metadata JSON). Valid `PINATA_JWT` in `.env.local` is present and functional.
4. **Origin Header Requirement**:
   When invoking `/api/auth/sign-in/email` over HTTP via `curl`, the `Origin: http://localhost:3000` header is strictly required by Better Auth / Neon Auth, otherwise it returns `HTTP 403 Forbidden: Missing or null Origin`.

---

## 4. Conclusion

### 4.1 Specification Summary Table

| Requirement | Value / Method | Exact Reference |
|---|---|---|
| **Issuance HTTP Endpoint** | `POST http://127.0.0.1:3000/api/nft/mint` | `app/api/nft/mint/route.ts:11` |
| **Request Headers** | `Content-Type: application/json`<br>`Cookie: <Neon Auth Cookies>` | `app/(admin)/terbitkan/page.tsx:92-96` |
| **Request Body** | `{"userId": "<user_uuid>"}` | `lib/validation.ts:38-40` |
| **HTTP Response** | `200 OK`<br>`{"certificate": {"id": "...", "nftAddress": "...", "txSignature": "...", "status": "MINTED"}}` | `app/api/nft/mint/route.ts:237-244` |
| **Mint Address Field** | `response.certificate.nftAddress` (Metaplex Core Asset) | `app/api/nft/mint/route.ts:240` |
| **Tx Signature Field** | `response.certificate.txSignature` (Solana Base58 Tx) | `app/api/nft/mint/route.ts:241` |
| **Preconditions** | 1. Admin authenticated<br>2. `dataConsent: true`<br>3. `wallet.status: "VERIFIED"`<br>4. Certificate `NOT_ISSUED`<br>5. `prodi` present | `app/api/nft/mint/route.ts:51-133` |
| **Admin Credentials** | `Email`: `admin@sijaga.ac.id`<br>`Password`: `@admin123` | `prisma/seed.ts:84-99` |
| **Admin Login Endpoint** | `POST http://127.0.0.1:3000/api/auth/sign-in/email`<br>Headers: `Origin: http://localhost:3000`, `Content-Type: application/json` | `node_modules/@neondatabase/auth` |
| **Dev Server Command** | `NODE_OPTIONS="--dns-result-order=ipv4first" ./node_modules/.bin/next dev -p 3000` | `package.json:6` |
| **Readiness Check** | `GET http://127.0.0.1:3000/api/auth/ok` (returns 200 `{"ok":true}`) | `app/api/auth/[...path]/route.ts` |
| **Sandbox Rule** | Must specify `BypassSandbox: true` for all local HTTP calls | Runtime security rule |

---

## 5. Verification Method

To independently verify all findings and execute the full issuance flow, run the following steps:

### Step 1: Start Next.js Dev Server
```bash
# In background task with BypassSandbox: true and IsDaemon: true:
NODE_OPTIONS="--dns-result-order=ipv4first" ./node_modules/.bin/next dev -p 3000
```

### Step 2: Health Check
```bash
# Poll until HTTP 200 is returned:
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/api/auth/ok
```

### Step 3: Admin Login & Session Cookie Retrieval
```bash
curl -s -i -c admin_cookies.txt -X POST http://127.0.0.1:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{"email":"admin@sijaga.ac.id","password":"@admin123"}'
```
Assert that response is HTTP 200 and `admin_cookies.txt` contains `__Secure-neon-auth.session_token`.

### Step 4: Verify Admin Session
```bash
curl -s -b admin_cookies.txt http://127.0.0.1:3000/api/auth/me
```
Assert that `user.role === "ADMIN"`.

### Step 5: Issue Certificate (when user prerequisites R2 are met)
```bash
curl -s -i -b admin_cookies.txt -X POST http://127.0.0.1:3000/api/nft/mint \
  -H "Content-Type: application/json" \
  -d '{"userId":"<TARGET_USER_ID>"}'
```
Assert that response is HTTP 200, parse `data.certificate.nftAddress` (mint address) and `data.certificate.txSignature` (transaction signature).

### Step 6: Shutdown Dev Server
Terminate the daemon task via `manage_task(Action='kill', TaskId=...)`.
