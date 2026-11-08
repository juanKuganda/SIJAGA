# Technical Investigation Report: Application HTTP Endpoints and Authentication for TRACE P2.6 R2

## 1. Observation

Direct code observations from the SIJAGA codebase:

### 1.1 Authentication & Session Architecture
- `lib/auth/server.ts` (lines 1–9):
  ```typescript
  import { createNeonAuth } from '@neondatabase/auth/next/server';

  export const auth = createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL!,
    cookies: {
      secret: process.env.NEON_AUTH_COOKIE_SECRET!,
      sessionDataTtl: 86400, // 1 hari — cache session data, bukan session lifetime
    },
  });
  ```
- `app/api/auth/[...path]/route.ts` (lines 1–3):
  ```typescript
  import { auth } from '@/lib/auth/server';

  export const { GET, POST } = auth.handler();
  ```
  Proxies all requests under `/api/auth/*` to the Neon Auth backend service (which is based on Better Auth).
  Standard Neon Auth endpoints mounted include:
  - `POST /api/auth/sign-in/email` with body `{"email": "...", "password": "..."}`
  - `POST /api/auth/sign-up/email` with body `{"email": "...", "password": "...", "name": "..."}`
  - `POST /api/auth/sign-out`
  - `GET /api/auth/get-session`
- Cookies set by Neon Auth on sign-in/sign-up:
  - `__Secure-neon-auth.session_token`
  - `__Secure-neon-auth.local.session_data`
- `lib/auth.ts` (lines 17–93):
  ```typescript
  export async function getAuthUser(request?: Request): Promise<JWTPayload | null> {
    try {
      // 1. Check for programmatic admin key header (benchmark & test automation)
      if (request && request.headers) {
        const adminKeyHeader =
          request.headers.get("x-admin-key") ||
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

        const expectedAdminKey =
          process.env.ADMIN_WALLET_PRIVATE_KEY || process.env.ADMIN_API_SECRET;

        if (expectedAdminKey && adminKeyHeader === expectedAdminKey) {
          const adminUser = await prisma.user.findFirst({
            where: { role: "ADMIN" },
            select: { id: true, role: true, nim: true, email: true },
          });
          if (adminUser) {
            return {
              userId: adminUser.id,
              role: adminUser.role,
              nim: adminUser.nim,
              email: adminUser.email,
            };
          }
        }
      }

      // 2. Neon Auth session
      let session = null;
      try {
        const res = await auth.getSession();
        session = res.data;
      } catch {
        session = null;
      }

      if (!session?.user) {
        return null;
      }

      // Fetch the detailed Prisma user to get NIM and Role
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: session.user.email },
            { id: session.user.id },
          ],
        },
        select: { id: true, role: true, nim: true, email: true },
      });
      ...
  ```
- **Crucial observation on `getAuthUser` call sites**:
  - `app/api/wallet/verify/route.ts` line 8: `const payload = await getAuthUser();` (called with **NO arguments**).
  - `app/api/wallet/register/route.ts` line 9: `const payload = await getAuthUser();` (called with **NO arguments**).
  - `app/api/consent/route.ts` line 50: `const payload = await getAuthUser();` (called with **NO arguments**).
  - `app/api/nft/mint/route.ts` line 13: `const payload = await getAuthUser();` (called with **NO arguments**).
  - `app/api/admin/mahasiswa/route.ts` lines 8 & 80: `const payload = await getAuthUser();` (called with **NO arguments**).
  - ONLY `app/api/verify/route.ts:97`, `app/api/admin/delete-pii/route.ts:17`, and `app/api/admin/reissue/route.ts:21` pass `request` as `getAuthUser(request)`.

### 1.2 Student Registration Flow & Handlers
- `app/(auth)/register/actions.ts` (lines 8–94):
  `registerWithEmail` is a Next.js Server Action (`"use server"`):
  - Validates `FormData` against `registerSchema` (`lib/validation.ts`):
    - `nama`: string (1-100 chars)
    - `nim`: string (1-20 chars)
    - `email`: string (valid email format)
    - `prodi`: string (non-empty)
    - `tahunLulus`: string (matches `/^(20[0-9]{2})$/`, e.g. "2026")
    - `password`: string (min 6 chars)
    - `confirmPassword`: string (must match `password`)
  - Calls `auth.signUp.email({ email, name, password })` on Neon Auth server SDK. If the user already exists in Neon Auth, falls back to `auth.signIn.email({ email, password })` to retrieve `authUserId`.
  - Creates the database user in Prisma:
    ```typescript
    user = await prisma.user.create({
      data: {
        id: authUserId,
        nama: name,
        email,
        nim,
        prodi,
        tahunLulus,
        password: "",
        role: "MAHASISWA",
      },
    });
    ```
  - Auto-creates an initial `CertificateBackup` record.
  - Redirects to `/login?registered=true`.
- Next.js Server Action compilation manifest:
  In `.next/server/app/(auth)/register/page/server-reference-manifest.json`:
  Action ID for `registerWithEmail`: `"60a930caf285a41dfd82142dce050dd158dcd58e1a"`.
- Existing admin credentials from `prisma/seed.ts` (lines 84–98):
  - Email: `admin@sijaga.ac.id`
  - Password: `@admin123`
  - Role: `ADMIN`
  - NIM: `ADMIN001`

### 1.3 Student Consent Flow
- `app/api/consent/route.ts`:
  - `POST /api/consent`
  - Authentication: `const payload = await getAuthUser();` (requires student session cookie).
  - Request body: None / empty JSON `{}`.
  - Headers:
    `Cookie: __Secure-neon-auth.session_token=...; __Secure-neon-auth.local.session_data=...`
    `Content-Type: application/json`
  - Database mutations:
    ```typescript
    await prisma.user.update({
      where: { id: payload.userId },
      data: {
        dataConsent: true,
        consentGivenAt: new Date(),
        consentIpAddress: ipAddress,
        consentVersion: "v1.0",
      },
    });
    ```
    Creates `AuditLog` entry with action `"DATA_CONSENT_GIVEN"`.
  - Response: `{"success": true, "message": "Persetujuan berhasil diberikan"}` with status 200.

### 1.4 Student Wallet Registration Flow
- `app/api/wallet/register/route.ts`:
  - `POST /api/wallet/register`
  - Authentication: `getAuthUser()` must return authenticated user with `role === "MAHASISWA"`.
  - Request body:
    ```json
    {
      "walletAddress": "<Valid-Solana-Public-Key>"
    }
    ```
  - Headers:
    `Cookie: <student_session_cookie>`
    `Content-Type: application/json`
  - Validation:
    - `walletRegisterSchema` (`lib/validation.ts`): regex `/^[1-9A-HJ-NP-Za-km-z]{32,44}$/`.
    - `isValidSolanaAddress` (`lib/solana.ts`): verifies `new PublicKey(walletAddress)` succeeds.
  - Database mutations:
    ```typescript
    const wallet = await prisma.wallet.create({
      data: {
        userId: payload.userId,
        walletAddress,
        status: "PENDING",
      },
    });
    ```
    Creates `AuditLog` entry with action `"WALLET_REGISTER"`.
  - Response:
    ```json
    {
      "wallet": {
        "id": "cm...",
        "walletAddress": "...",
        "status": "PENDING"
      }
    }
    ```

### 1.5 Admin Wallet Approval Endpoint
- `app/api/wallet/verify/route.ts`:
  - `POST /api/wallet/verify`
  - Authentication: `getAuthUser()` must return authenticated user with `role === "ADMIN"`.
  - Request body:
    ```json
    {
      "walletId": "<wallet_id>",
      "status": "VERIFIED"
    }
    ```
  - Headers:
    `Cookie: <admin_session_cookie>`
    `Content-Type: application/json`
  - Validation (`walletVerifySchema`):
    `walletId`: string (non-empty)
    `status`: `"VERIFIED"` | `"REJECTED"`
  - Guard: Existing wallet must be in `PENDING` status.
  - Database mutations:
    ```typescript
    const wallet = await prisma.wallet.update({
      where: { id: walletId },
      data: {
        status,
        verifiedAt: status === "VERIFIED" ? new Date() : null,
        verifiedBy: status === "VERIFIED" ? payload.userId : null,
      },
      include: { user: true },
    });
    ```
    Creates `AuditLog` entry with action `"WALLET_VERIFIED"`.
  - Response:
    ```json
    {
      "wallet": {
        "id": "cm...",
        "userId": "...",
        "walletAddress": "...",
        "status": "VERIFIED",
        "verifiedAt": "...",
        "verifiedBy": "..."
      }
    }
    ```

### 1.6 Certificate Issuance & Tier 1 Hash Calculation & Storage
- `lib/crypto.ts` (lines 10–22):
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
- `prisma/schema.prisma` (lines 12–90):
  - In `model User`: Contains demographic data (`nama`, `nim`, `email`, `prodi`, `tahunLulus`), consent flags, but **NO `dataHash` or `dataSalt` column**.
  - In `model Certificate`:
    - `id String @id @default(cuid())`
    - `userId String`
    - `nftAddress String? @unique`
    - `metadataUri String?`
    - `txSignature String?`
    - `status CertStatus @default(NOT_ISSUED)`
    - `dataHash String?` (Stores `sha256:<64_hex_digits>`)
    - `dataSalt String?` (Stores 32-character random hex string)
- When is `dataHash` calculated?
  - In `app/api/nft/mint/route.ts` lines 135–184:
    During `POST /api/nft/mint`:
    1. Computes `const { hash: dataHash, salt: dataSalt } = generateDataHash(user.nama, user.nim, user.prodi)`.
    2. Inserts `dataHash` into IPFS metadata attributes (`{ trait_type: "Data Hash", value: dataHash }`).
    3. Persists `dataHash` and `dataSalt` into the `Certificate` database table.
    4. Mints Metaplex Core Soulbound NFT on Solana Devnet.
- How to extract/read the Tier 1 hash:
  - Via Admin HTTP endpoint `GET /api/admin/mahasiswa` (returns all students with their `certificate.dataHash`).
  - Via HTTP endpoint `GET /api/certificate/:certificateId` (when authenticated as Admin or Owner, returns `certificate.dataHash`).
  - Via direct Prisma query: `prisma.certificate.findFirst({ where: { userId } })`.

---

## 2. Logic Chain

1. **Authentication Mechanism for Route Handlers**:
   - `getAuthUser` in `lib/auth.ts` has two branches:
     Branch 1: Checks headers for `x-admin-key` or `Authorization: Bearer <key>`.
     Branch 2: Calls `auth.getSession()` which reads cookies from Next.js server headers (`extractNeonAuthCookies`).
   - Observations show that `app/api/wallet/verify/route.ts`, `app/api/wallet/register/route.ts`, `app/api/consent/route.ts`, and `app/api/nft/mint/route.ts` all call `getAuthUser()` without passing `request`.
   - Therefore, Branch 1 (`x-admin-key`) is **inaccessible** for these endpoints. All caller agents/scripts must obtain session cookies via `POST /api/auth/sign-in/email` and pass the cookie in the `Cookie` header.

2. **Student Registration Mechanics**:
   - Direct call to `POST /api/auth/sign-up/email` only registers the user in the Neon Auth identity pool; it does not write to the local/remote PostgreSQL `User` table.
   - The official application registration flow is encapsulated in `registerWithEmail` (`app/(auth)/register/actions.ts`), which performs the Neon Auth sign-up AND creates the `User` and `CertificateBackup` in Prisma.
   - Over HTTP, Next.js App Router executes Server Actions via `POST /register` with either `Next-Action: 60a930caf285a41dfd82142dce050dd158dcd58e1a` and multipart/form-data or standard form submission.
   - If invoking the Server Action directly via Node / runner script (as authorized by R1: *"if an administrative action cannot be performed via public HTTP, execute and document the direct admin endpoint/handler as-is"*), `registerWithEmail` or `prisma.user.create` can be executed cleanly.

3. **Status Transitions for R2**:
   - Fresh registration creates a `User` with `dataConsent = false` and no `Wallet`.
   - `POST /api/consent` sets `User.dataConsent = true` and `User.consentVersion = "v1.0"`.
   - `POST /api/wallet/register` creates `Wallet` with `status = "PENDING"`.
   - `POST /api/wallet/verify` transitions `Wallet.status` from `PENDING` to `VERIFIED`.
   - This completes the requirement: `register → consent → register wallet → admin approval to VERIFIED status`.

4. **Tier 1 Hash Generation Timing**:
   - The user prompt states: *"Record the hash stored in the Tier 1 user row (sha256 of name|NIM|prodi|salt) exactly as-is."*
   - In Prisma, the schema does not store `dataHash` on `User` directly, but on the linked `Certificate` table (`User.certificateId` / `Certificate.userId`).
   - `generateDataHash` produces a non-deterministic hash because `salt` is generated via `crypto.randomBytes(16)`.
   - `generateDataHash` is called inside `app/api/nft/mint/route.ts:135` during minting (R3). Prior to minting, no `Certificate` record or hash exists for a new user.
   - Therefore, to record the exact stored Tier 1 hash, it is captured when the certificate is created/minted during R3, and can be read back via `GET /api/admin/mahasiswa`, `GET /api/certificate/:id`, or Prisma.

---

## 3. Caveats

1. **`x-admin-key` Header Is Not Supported by `/api/wallet/verify` or `/api/nft/mint`**:
   Because `app/api/wallet/verify/route.ts` and `app/api/nft/mint/route.ts` call `getAuthUser()` without passing the `request` object, sending `x-admin-key: <ADMIN_WALLET_PRIVATE_KEY>` will return `401 Unauthorized`. You **must** authenticate by logging in with `admin@sijaga.ac.id` to get session cookies.
2. **Server Action HTTP Header in Dev Server**:
   In Next.js App Router, the `Next-Action` header hash in development mode may be dynamically generated or differ from production builds. If `POST /register` with `Next-Action` returns `404` or action mismatch, either parse the action ID from `GET /register` HTML, or run a small runner script importing `registerWithEmail` / `seedUser` directly.
3. **Solana Devnet RPC Flakiness**:
   When transitioning to R3 (minting), devnet RPC calls can occasionally hit rate limits. `lib/metaplex.ts` has retry mechanisms, but ensuring proper RPC URLs from `.env.local` is advised.
4. **Verification Route Query Parameter (`/api/verify`)**:
   In `app/api/verify/route.ts:23-50`, the endpoint accepts `?query=<nim>` or `?query=<walletAddress>`. It does **not** accept `?query=<mintAddress>` because if the query is a Solana address, it searches `prisma.wallet.findUnique({ where: { walletAddress: query } })`. Therefore, to verify the certificate via HTTP in R4, pass `?query=<nim>` or `?query=<walletAddress>`.

---

## 4. Conclusion & Actionable Implementation Guide

### Summary Table of Endpoints

| Step | Action | Route / Endpoint | Method | Required Headers | Payload / Parameters |
|---|---|---|---|---|---|
| 0 | Admin Login | `/api/auth/sign-in/email` | `POST` | `Content-Type: application/json` | `{"email": "admin@sijaga.ac.id", "password": "@admin123"}` |
| 1 | Student Registration | `/register` (Server Action) or `registerWithEmail` handler | `POST` | `multipart/form-data` (+ `Next-Action`) | Form fields: `nama`, `nim`, `email`, `prodi`, `tahunLulus`, `password`, `confirmPassword` |
| 2 | Student Login | `/api/auth/sign-in/email` | `POST` | `Content-Type: application/json` | `{"email": "<student_email>", "password": "<student_password>"}` |
| 3 | Student Consent | `/api/consent` | `POST` | `Cookie: <student_cookie>`, `Content-Type: application/json` | `{}` |
| 4 | Register Wallet | `/api/wallet/register` | `POST` | `Cookie: <student_cookie>`, `Content-Type: application/json` | `{"walletAddress": "<solana_pubkey>"}` |
| 5 | Admin Approval | `/api/wallet/verify` | `POST` | `Cookie: <admin_cookie>`, `Content-Type: application/json` | `{"walletId": "<wallet_id>", "status": "VERIFIED"}` |
| 6 | Mint Certificate (R3) | `/api/nft/mint` | `POST` | `Cookie: <admin_cookie>`, `Content-Type: application/json` | `{"userId": "<user_id>"}` |
| 7 | Read Tier 1 Hash | `/api/admin/mahasiswa` or Prisma | `GET` | `Cookie: <admin_cookie>` | Returns `certificate.dataHash` (`sha256:...`) |
| 8 | Verify Certificate (R4) | `/api/verify` | `GET` | None (Public) | `?query=<student_nim>` or `?query=<solana_pubkey>` |

---

### Step-by-Step Execution Protocol for Worker

#### Step 1: Admin Authentication
```bash
curl -s -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -c admin_cookies.txt \
  -d '{"email":"admin@sijaga.ac.id","password":"@admin123"}'
```

#### Step 2: Fictitious User Registration
Generate fictitious student data:
- Name: `"Trace Test"`
- NIM: `"H071211999"` (or unique timestamp-based NIM)
- Email: `"trace.test@sijaga.ac.id"`
- Prodi: `"Informatika"`
- Tahun Lulus: `"2026"`
- Password: `"TraceTest123!"`

**HTTP Submission (Next.js Server Action)**:
Submit multipart form to `http://localhost:3000/register`:
```bash
curl -s -X POST http://localhost:3000/register \
  -H "Next-Action: 60a930caf285a41dfd82142dce050dd158dcd58e1a" \
  -F "nama=Trace Test" \
  -F "nim=H071211999" \
  -F "email=trace.test@sijaga.ac.id" \
  -F "prodi=Informatika" \
  -F "tahunLulus=2026" \
  -F "password=TraceTest123!" \
  -F "confirmPassword=TraceTest123!"
```
*(If calling direct handler per R1): execute a direct Node invocation of `registerWithEmail` or use the seed pattern in `prisma/seed.ts`.*

#### Step 3: Student Login
```bash
curl -s -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -c student_cookies.txt \
  -d '{"email":"trace.test@sijaga.ac.id","password":"TraceTest123!"}'
```

#### Step 4: Student Consent
```bash
curl -s -X POST http://localhost:3000/api/consent \
  -b student_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{}'
```
Expected response: `{"success": true, "message": "Persetujuan berhasil diberikan"}`.

#### Step 5: Student Wallet Registration
Generate a valid Solana public key using `@solana/web3.js` (e.g. `Keypair.generate().publicKey.toBase58()`):
```bash
curl -s -X POST http://localhost:3000/api/wallet/register \
  -b student_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"<generated_solana_pubkey>"}'
```
Expected response:
```json
{
  "wallet": {
    "id": "<wallet_id>",
    "walletAddress": "<generated_solana_pubkey>",
    "status": "PENDING"
  }
}
```

#### Step 6: Admin Approval to VERIFIED Status
```bash
curl -s -X POST http://localhost:3000/api/wallet/verify \
  -b admin_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"walletId":"<wallet_id>","status":"VERIFIED"}'
```
Expected response:
```json
{
  "wallet": {
    "id": "<wallet_id>",
    "status": "VERIFIED",
    "verifiedAt": "2026-11-08T...",
    "verifiedBy": "..."
  }
}
```

#### Step 7: Tier 1 Hash Extraction (Post-Mint in R3)
When `POST /api/nft/mint` is executed with `{"userId":"<student_user_id>"}`, `dataHash` and `dataSalt` are written to `Certificate`.
Query via:
```bash
curl -s -X GET http://localhost:3000/api/admin/mahasiswa \
  -b admin_cookies.txt
```
Filter for user ID, extracting:
`certificate.dataHash` -> `sha256:<64_hex_digits>`.

---

## 5. Verification Method

To independently verify the investigation findings:
1. **Verify Route Availability & Handlers**:
   - Inspect `app/api/auth/[...path]/route.ts` and `node_modules/@neondatabase/auth/dist/server-b0OzGjXl.mjs:51-70` to verify `sign-in/email` and `sign-up/email`.
   - Inspect `app/api/consent/route.ts:48-82` to verify `POST` handler, `dataConsent` update, and `getAuthUser()` auth check.
   - Inspect `app/api/wallet/register/route.ts:7-98` to verify `POST` handler, `walletRegisterSchema`, and `PENDING` initial status.
   - Inspect `app/api/wallet/verify/route.ts:6-73` to verify `POST` handler, `walletVerifySchema`, `ADMIN` role check, and `VERIFIED` transition.
   - Inspect `app/api/nft/mint/route.ts:135-184` to verify `generateDataHash` call and `Certificate.dataHash` persistence.
   - Inspect `app/api/verify/route.ts:23-50` to verify query parameter logic (`searchParams.get("query")` accepting NIM or wallet address).
2. **Verify Server Action Manifest**:
   - Inspect `.next/server/app/(auth)/register/page/server-reference-manifest.json` line 3: confirmed action ID `60a930caf285a41dfd82142dce050dd158dcd58e1a` for `registerWithEmail`.
3. **Invalidation Conditions**:
   - If `app/api/wallet/verify/route.ts` is refactored in the future to pass `request` into `getAuthUser(request)`, `x-admin-key` header would become supported. As currently written, cookie authentication is strictly required.
