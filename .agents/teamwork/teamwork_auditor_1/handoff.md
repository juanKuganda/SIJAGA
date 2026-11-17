# FORENSIC AUDIT REPORT: TC-12 OUTAGE HANDLING & REVOKED CERTIFICATE CHALLENGE DEFENSE

**Auditor:** `teamwork_auditor_1` (Forensic Integrity Auditor)  
**Parent / Caller:** `b129e651-00c4-4cf6-b087-5c8baeee3744`  
**Branch:** `feat/bab4-experiments` (HEAD `f7bae08`, baseline `27cffac`)  
**Date:** 2026-11-17T16:39:00Z  
**Profile:** General Project (Integrity Forensics)  
**Verdict:** **CLEAN** (No integrity violations, facades, hardcoding, or security circumventions detected)

---

## 1. OBSERVATION

Independent static and empirical runtime verification was performed on all 5 files modified in branch `feat/bab4-experiments`:
1. `app/api/verify/tingkat-1/route.ts`
2. `app/verify-onchain/page.tsx`
3. `lib/challenge.ts`
4. `app/api/verify/challenge/route.ts`
5. `app/ijazah/[id]/page.tsx`

### 1.1 Git Status & Scope Discipline
- Tool Command: `git status --porcelain`
  Output:
  ```
   M .agents/teamwork/ORIGINAL_REQUEST.md
   M .agents/teamwork/sentinel/BRIEFING.md
   M app/api/verify/challenge/route.ts
   M app/api/verify/tingkat-1/route.ts
   M app/ijazah/[id]/page.tsx
   M app/verify-onchain/page.tsx
   M lib/challenge.ts
  ```
  All other files in the working tree are metadata within `.agents/teamwork/`. No unauthorized source, config, schema, or test files were touched.
- Tool Command: `git diff package.json`
  Output: Clean / empty diff. Zero new dependencies were introduced.

### 1.2 Hardcoding and Facade Analysis
- Tool Command: `grep -rnE "(FDQKnr|GqM5cb|Bat5VT|115L61|DtUVh|cmwjeiu)" app/api/verify/tingkat-1/route.ts app/verify-onchain/page.tsx lib/challenge.ts app/api/verify/challenge/route.ts app/ijazah/[id]/page.tsx`
  Output:
  ```
  app/verify-onchain/page.tsx:101:const SAMPLE_ASSET_P26 = "FDQKnrLVQdZqP4efoNarLb87gmZj529kebFPz8SVMQCc";
  app/verify-onchain/page.tsx:544:                placeholder="Contoh: FDQKnrLVQdZqP4efoNarLb87gmZj529kebFPz8SVMQCc"
  app/verify-onchain/page.tsx:581:              FDQKnrLV... (Trace P2.6)
  ```
  Verification: `SAMPLE_ASSET_P26` was committed in `9510fd6` (pre-existing) as a quick-fill UI button for manual user testing ("Coba Sampel"). It is not used in conditional branches or to bypass verification.
- Search for fake branches: `grep -n "===" app/api/verify/tingkat-1/route.ts`
  Output: Lines 94, 107, 121, 122, 219. All checks evaluate enum status strings (`result.reason === "NOT_FOUND"`, `"NOT_ASSET"`, `"RPC"`, `"METADATA"`) or dynamic `result.updateAuthority === adminAddress`. No address-based shortcuts exist.

### 1.3 Cryptographic Integrity and Security Controls
- `lib/challenge.ts`:
  - Ed25519 signature verification: `nacl.sign.detached.verify(msgBytes, sigBytes, pubkeyBytes)` on lines 213–221. Intact.
  - Nonce expiry: `now > storedNonce.expiresAt` (lines 155–162). Intact.
  - Anti-replay / Single-use: `storedNonce.usedAt !== null` (lines 146–152) and atomic update `usedAt: new Date()` (lines 232–235). Intact.
  - Anti-tampering: `storedNonce.message !== message` (lines 183–189). Intact.
  - Rate limiting: `app/api/verify/challenge/route.ts` maintains 20 req/minute per IP (lines 8–26). Intact.

### 1.4 Privacy (UU PDP) Compliance
- `app/api/verify/tingkat-1/route.ts`: Contains zero database queries (100% database-free, compliant with TC-15). Returns no PII (no student name, no NIM).
- `lib/challenge.ts`: Queries `prisma.certificate.findUnique({ where: { id: certificateId }, select: { status: true } })`. Only status is fetched.
- `app/api/verify/challenge/route.ts`: Queries `prisma.certificate.findUnique({ select: { status: true, revokeReason: true } })`. No PII is included in the challenge API response.

### 1.5 Authentic Error Handling & Empirical Simulation
- **TC-12 RPC Outage Simulation:**
  Simulated dead RPC node (`SOLANA_RPC_URL="http://127.0.0.1:19999"`) against `GET` and `POST` on `/api/verify/tingkat-1`:
  ```
  [Metaplex] Fetch attempt 1/3 failed: fetch failed
  [Metaplex] Fetch attempt 2/3 failed: fetch failed
  [Metaplex] Fetch attempt 3/3 failed: fetch failed
  [OnChain] RPC error fetching asset: failed to get info about account FDQKnrLVQdZqP4efoNarLb87gmZj529kebFPz8SVMQCc: Error: Fetch failed after 3 retries. Last error: fetch failed
  === GET RPC DOWN ===
  HTTP Status: 503
  Verdict: TIDAK DAPAT DIPASTIKAN
  Reason: RPC
  Success: false
  Level: TINGKAT 1
  tokenExists status: TIDAK DAPAT DIPASTIKAN

  === POST RPC DOWN ===
  HTTP Status: 503
  Verdict: TIDAK DAPAT DIPASTIKAN
  Reason: RPC
  ```
  Empirical confirmation: HTTP 503 is returned with structured JSON payload, `verdict: "TIDAK DAPAT DIPASTIKAN"`, `reason: "RPC"`, and complete 7-item `checks` evaluation.
- **Revocation Defense Simulation:**
  Tested `lib/challenge.ts` and `POST /api/verify/challenge` (Mode A, Mode B, and fallback):
  ```
  === Testing Challenge Revocation Logic ===
  1. verifyVerificationChallenge with REVOKED: {
    success: false,
    error: 'CERT_REVOKED',
    message: 'Ijazah ini telah dicabut oleh Universitas Tadulako. Kepemilikan tidak dapat diverifikasi untuk ijazah yang telah dicabut.'
  }
  2. Route Mode B with REVOKED: 400 {
    success: false,
    error: 'CERT_REVOKED',
    message: 'Ijazah ini telah dicabut oleh Universitas Tadulako. Tantangan verifikasi tidak dapat diterbitkan untuk ijazah yang telah dicabut.',
    revokeReason: 'Pemalsuan nilai'
  }
  3. Route Mode A with REVOKED: 400 {
    verified: false,
    error: 'CERT_REVOKED',
    message: 'Ijazah ini telah dicabut oleh Universitas Tadulako. Kepemilikan tidak dapat diverifikasi untuk ijazah yang telah dicabut.'
  }
  4. Route Mode A Fallback with REVOKED owner: 400 {
    verified: false,
    error: 'CERT_REVOKED',
    message: 'Ijazah ini telah dicabut oleh Universitas Tadulako. Kepemilikan tidak dapat diverifikasi untuk ijazah yang telah dicabut.'
  }
  ```
  Empirical confirmation: An ijazah with `status === "REVOKED"` is unconditionally rejected across all entry points with HTTP 400 and `error: "CERT_REVOKED"`.

### 1.6 Production Build, Typecheck, and Linter Results
- `npm run build`: Exit code 0 (Turbopack, compiled in 11.9s, Finished TypeScript in 15.3s, 44/44 static pages generated).
- `npx tsc --noEmit`: Exit code 0 (zero compilation errors).
- `npx eslint app/api/verify/tingkat-1/route.ts app/verify-onchain/page.tsx lib/challenge.ts app/api/verify/challenge/route.ts app/ijazah/[id]/page.tsx`: Exit code 0 (0 warnings, 0 errors).
- `scripts/test-challenge.ts` (TC-05 & TC-06 suite):
  ```
  [TC-05] Testing valid signature...
  ✓ TC-05 PASSED: Valid signature verified successfully.
  [TC-06a] Testing replayed nonce (single-use enforcement)...
  ✓ TC-06a PASSED: Replayed nonce rejected (NONCE_ALREADY_USED).
  [TC-06b] Testing foreign wallet signature...
  ✓ TC-06b PASSED: Foreign wallet rejected (3a: INVALID_SIGNATURE, 3b: WALLET_MISMATCH).
  [TC-06c] Testing expired nonce...
  ✓ TC-06c PASSED: Expired nonce rejected (NONCE_EXPIRED).
  [TC-06d] Testing tampered message (even one byte)...
  ✓ TC-06d PASSED: Tampered message rejected (MESSAGE_MISMATCH).
  === ALL TC-05 & TC-06 CHALLENGE TESTS PASSED! ===
  ```

---

## 2. LOGIC CHAIN

1. **Premise 1 (Authentic Implementation):** A work product violates integrity if it uses hardcoded outputs, fake branches, or facade functions to satisfy test cases.
   - Observation 1.2 proves that no hardcoding of addresses or fake verdicts exists. All responses are derived dynamically from Metaplex RPC calls or Prisma queries.
2. **Premise 2 (Cryptographic & Security Fidelity):** The user's original request explicitly forbids modifying or weakening Ed25519 challenge logic, replay protection, or rate limiting.
   - Observation 1.3 and 1.6 prove that tweetnacl Ed25519 verification, 128-bit random nonces, single-use `usedAt` atomic updates, 5-minute expirations, and 20 req/min rate limiting remain completely intact and pass all regression tests (TC-05, TC-06a–d).
3. **Premise 3 (Design Compliance for TC-12):** The brief required returning structured "TIDAK DAPAT DIPASTIKAN" instead of raw errors when RPC/IPFS fails.
   - Observation 1.5 proves that when RPC fails, the system triggers Metaplex retries and returns HTTP 503 with `verdict: "TIDAK DAPAT DIPASTIKAN"` and an evaluation matrix of 7 checks. The frontend renders an amber Bento card without crashing.
4. **Premise 4 (Revocation Defense Compliance):** The brief required preventing "Kepemilikan Terverifikasi" on REVOKED certificates.
   - Observation 1.5 proves that revoked certificates are rejected at the core library, API Mode B (nonce issue), API Mode A (signature verification), and fallback query. The UI disables the action button, renders red "Ijazah Dicabut", and guards against rendering green verified badges (`!isRevoked && challengeStatus === "sukses"`).
5. **Premise 5 (Layout, Dependency, and Boundary Discipline):** No new packages, no unauthorized files modified.
   - Observation 1.1 proves that strictly 5 authorized files were modified. `package.json` diff is clean.
6. **Conclusion of Logic Chain:** All empirical checks align with project specifications and ground-truth constraints without shortcuts or integrity violations.

---

## 3. CAVEATS

1. **IPFS Network Variability:** In live environments, Pinata IPFS gateway latency may fluctuate. The logic treats gateway timeouts symmetrically with `reason: "METADATA"` &rarr; HTTP 502 with `tokenExists.status: "DAPAT DIPERIKSA"`, which was verified statically and logically.
2. **Solana Devnet Rate Limits:** While local simulations used dead RPC endpoints to verify failure handling, live Devnet testing requires observing RPC call rates to avoid transient 429 throttling.

---

## 4. CONCLUSION

**FINAL VERDICT: CLEAN**

The implementation in branch `feat/bab4-experiments` across all 5 target files is authentic, robust, mathematically sound, and fully compliant with:
- The user's original constraints in `ORIGINAL_REQUEST.md`.
- UU PDP privacy constraints (zero PII in on-chain metadata or public endpoints).
- Cryptographic security standards (Ed25519 tweetnacl, replay protection, rate limiting).
- Architectural and interface contracts defined in `PROJECT.md`.

No integrity violations, facades, hardcoding, or regressions were detected. The work product is approved.

---

## 5. VERIFICATION METHOD

To independently verify this forensic audit, run the following commands from the repository root:

1. **Scope and Dependency Check:**
   ```bash
   git status --porcelain
   git diff package.json
   ```
   *Expected:* Only 5 target code files modified; clean `package.json`.

2. **Static Quality Verification:**
   ```bash
   npx eslint app/api/verify/tingkat-1/route.ts \
              app/verify-onchain/page.tsx \
              lib/challenge.ts \
              app/api/verify/challenge/route.ts \
              app/ijazah/[id]/page.tsx
   npx tsc --noEmit
   npm run build
   ```
   *Expected:* All commands exit with code 0 (zero errors/warnings).

3. **TC-12 RPC Outage Empirical Simulation:**
   ```bash
   SOLANA_RPC_URL="http://127.0.0.1:19999" npx tsx -e '
   import { NextRequest } from "next/server";
   import { GET } from "./app/api/verify/tingkat-1/route";
   async function run() {
     const res = await GET(new NextRequest("http://localhost:3000/api/verify/tingkat-1?asset=FDQKnrLVQdZqP4efoNarLb87gmZj529kebFPz8SVMQCc"));
     console.log("Status:", res.status, (await res.json()).verdict);
   }
   run();
   '
   ```
   *Expected:* Status: 503 TIDAK DAPAT DIPASTIKAN.

4. **Cryptographic Suite (TC-05 & TC-06):**
   ```bash
   node --env-file=.env.local ./node_modules/tsx/dist/cli.mjs scripts/test-challenge.ts
   ```
   *Expected:* All TC-05 and TC-06 tests output `✓ PASSED`.

**Invalidation Conditions:**
- Any hardcoded address check bypassing genuine RPC or database logic.
- An affirmative "Kepemilikan Terverifikasi" verdict or green UI state rendered on a REVOKED certificate.
- Any regression in `npm run build` or `npx tsc --noEmit`.
