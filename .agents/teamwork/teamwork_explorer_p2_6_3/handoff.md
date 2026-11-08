# Handoff Report — Investigation for TRACE P2.6 Requirements R4 & R5

- **Agent:** `teamwork_explorer_p2_6_3`
- **Working Directory:** `/home/junnnnnnnn/Code/sijaga/.agents/teamwork/teamwork_explorer_p2_6_3/`
- **Target Task:** TRACE P2.6 (Requirements R4 & R5: On-Chain Hash Retrieval, Assertion, Application Verification Route, `BAB4_PROGRESS.md` Documentation, Version Control Boundaries)
- **Status:** Complete (Read-Only Investigation)

---

## 1. Observation

### 1.1 On-Chain Asset Data Hash Retrieval & Storage Architecture
- **Location:** `lib/onchain.ts:13-238` & `lib/metaplex.ts:1-250` & `lib/pinata.ts:75-104`.
- **Function:** `inspectCertificate(mintAddress: string, customRpcUrl?: string): Promise<OnChainInspect>` in `lib/onchain.ts:155`.
- **Code Quote (`lib/onchain.ts:167-229`):**
  ```typescript
  // 1. Fetch asset dari Solana
  asset = await fetchAsset(umi, publicKey(mintAddress));
  ...
  // 2. Extract basic fields
  const owner = asset.owner.toString();
  const name = asset.name;
  const uri = asset.uri;
  const frozen = isFrozen(asset);
  ...
  // 3. Fetch metadata JSON dari URI
  const metadata = await fetchMetadataJson(uri);
  ...
  // 4. Extract Data Hash dari attributes
  const dataHash = extractDataHash(metadata);
  return { ok: true, owner, name, uri, frozen, dataHash, updateAuthority, timings };
  ```
- **Attribute Extraction (`lib/onchain.ts:81-101`):**
  ```typescript
  function extractDataHash(metadata: Record<string, unknown>): string | null {
    const attributes = metadata.attributes;
    if (!Array.isArray(attributes)) return null;
    for (const attr of attributes) {
      if (
        typeof attr === "object" && attr !== null &&
        "trait_type" in attr && "value" in attr &&
        (attr as { trait_type: string }).trait_type === "Data Hash"
      ) {
        const value = (attr as { value: string }).value;
        return typeof value === "string" ? value : null;
      }
    }
    return null;
  }
  ```
- **Metadata Packaging (`lib/pinata.ts:75-93`):**
  ```typescript
  export function generateCertificateMetadata(data: { prodi: string; tahunLulus: string; dataHash: string; imageUri?: string; }) {
    return {
      name: "Ijazah S1 - Universitas Tadulako",
      symbol: "SIJAGA",
      description: "...",
      image: data.imageUri || "",
      attributes: [
        { trait_type: "Institusi", value: "Universitas Tadulako" },
        { trait_type: "Program Studi", value: data.prodi },
        { trait_type: "Tahun Lulus", value: data.tahunLulus },
        { trait_type: "Jenjang", value: "Sarjana (S1)" },
        { trait_type: "Tipe", value: "Soulbound" },
        { trait_type: "Data Hash", value: data.dataHash },
      ],
      ...
    };
  }
  ```
- **Metaplex Core Storage Observation:**
  The Metaplex Core program (`CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d`) stores on-chain accounts containing `owner`, `updateAuthority`, `name`, `uri`, and plugins (`PermanentFreezeDelegate`). The `dataHash` is **not** stored as raw Solana account bytes; it is stored inside the immutable JSON metadata referenced by `asset.uri` on IPFS, indexed under `attributes` where `trait_type === "Data Hash"`.

---

### 1.2 Application Verification Route (`GET /api/verify`)
- **Location:** `app/api/verify/route.ts:1-340`.
- **Query Parameter Extraction (`app/api/verify/route.ts:22-26`):**
  ```typescript
  const { searchParams } = new URL(request.url);
  const queryParam = searchParams.get("query") || searchParams.get("wallet");

  // Validasi input
  const result = verifySchema.safeParse({ query: queryParam });
  if (!result.success) {
    const errorMessage = result.error.issues[0]?.message || "Validasi gagal";
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
  ```
- **Query Resolution (`app/api/verify/route.ts:36-87`):**
  ```typescript
  const { query } = result.data;
  const isSolanaAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(query);

  if (isSolanaAddress) {
    const walletData = await prisma.wallet.findUnique({
      where: { walletAddress: query },
      include: { user: { select: { nama: true, nim: true, prodi: true, tahunLulus: true, dataDeletedAt: true } } },
    });
    ...
  } else {
    const user = await prisma.user.findUnique({
      where: { nim: query },
      include: { wallet: true },
    });
    ...
  }
  ```
- **Verification Layers (`app/api/verify/route.ts:111-288`):**
  - **Lapisan A (DB):** Verifies certificate exists, status is not `NOT_ISSUED` or `ISSUING`.
  - **Lapisan B (Local Hash):** `verifyDataHash(userWithWallet.nama, userWithWallet.nim, userWithWallet.prodi, certificate.dataSalt, certificate.dataHash)`.
  - **Lapisan C (On-Chain):** `const inspection = await inspectCertificate(certificate.nftAddress)`.
    - Check 3b (ISSUER): `inspection.updateAuthority === expectedAdminAddress` (from `getAdminWalletAddress()`).
    - Check 4 (HASH): `inspection.dataHash === certificate.dataHash`.
    - Check 5 (OWNER): `inspection.owner === userWithWallet.walletAddress`.
    - Check 6 (FROZEN): `inspection.frozen === true`.
    - Check 7 (STATUS): `!inspection.name.includes("[DIBATALKAN]")`.
- **Response Structure on Success (`app/api/verify/route.ts:308-332`):**
  ```json
  {
    "verified": true,
    "verifiedOnChain": true,
    "verifiedNominative": true,
    "hashVerified": true,
    "mismatch": null,
    "data": {
      "nama": "...",
      "nim": "...",
      "prodi": "...",
      "tahunLulus": "...",
      "status": "MINTED",
      "nftAddress": "...",
      "issuedAt": "...",
      "penerbit": "Universitas Tadulako"
    },
    "onChain": {
      "status": "VALID",
      "frozen": true,
      "owner": "..."
    },
    "piiDeleted": false,
    "explorerUrl": "https://explorer.solana.com/address/<nftAddress>?cluster=devnet"
  }
  ```

---

### 1.3 Assertion Mechanics (Tier 1 Hash vs On-Chain Hash)
- **Hash Generation (`lib/crypto.ts:10-22`):**
  ```typescript
  export function generateDataHash(nama: string, nim: string, prodi: string): { hash: string; salt: string } {
    const salt = crypto.randomBytes(16).toString('hex');
    const raw = `${nama.trim()}|${nim.toUpperCase()}|${prodi}|${salt}`;
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    return { hash: `sha256:${hash}`, salt };
  }
  ```
- **Database Schema (`prisma/schema.prisma:70-73`):**
  `Certificate.dataHash String?` (stores `sha256:<64 hex chars>`).
  `Certificate.dataSalt String?` (stores 32 hex chars random salt).
- **Comparison & Assertion:**
  Both Tier 1 hash and on-chain hash follow the format `sha256:<64-hex-characters>`.
  Direct comparison: `assert.strictEqual(tier1Hash, onChainHash)`.

---

### 1.4 `BAB4_PROGRESS.md` Structure & Location
- **Location:** `/home/junnnnnnnn/Code/sijaga/BAB4_PROGRESS.md:83`.
- **Existing Entry:**
  ```markdown
  - [ ] **P2.6: End-to-end Demonstration Trace (TC-01)**
  ```
- **Log Entry:** Section 3 (`## 3. Log Perubahan Terverifikasi`) lists chronological verified events.
- **Checkpoint File:** `experiments/CHECKPOINT.json` has `currentTask: "P2.1_COMPLETED"`, `taskQueue` contains `"P2.6_DEMONSTRATION_TRACE"`.

---

### 1.5 Version Control & Boundary Constraints
- **Current Git Branch:** `feat/bab4-experiments` (`git branch` output verified).
- **Remote Origin:** `https://github.com/juanKuganda/SIJAGA.git` (`git remote -v` verified).
- **Protected Directories (MUST NOT BE TOUCHED):**
  - `experiments/2026-11-07/` (`run-metadata.json`, `run-mint.jsonl`, `run-verify.jsonl`, `summary-mint.csv`, `summary-verify.csv`).
  - `experiments/2026-11-08/` (`run-metadata.json`, `run-mint.jsonl`, `run-revoke.jsonl`, `run-verify.jsonl`, `summary-mint.csv`, `summary-revoke.csv`, `summary-verify.csv`, `K0-EVIDENCE.md`, `test-tc-output.log`, `test-challenge-output.log`).
- **Benchmark Scripts (`scripts/benchmark/`):** Must NOT be modified or re-run for benchmarking; must NOT be used to bypass HTTP endpoints.
- **Phase 3 Scope:** Phase 3 tasks (`P3.1` through `P3.6`, `bab4-results.md`) must NOT be started.

---

## 2. Logic Chain

1. **On-chain Data Hash Extraction:**
   - From Observation 1.1, Metaplex Core assets on Solana store on-chain properties via `fetchAsset()`, but attributes such as `"Data Hash"` reside in the JSON metadata URI hosted on IPFS.
   - `inspectCertificate(mintAddress)` in `lib/onchain.ts` already implements the complete retrieval pipeline: RPC account fetch + IPFS JSON fetch (with 15s timeout) + attribute parser.
   - Therefore, the worker must use `inspectCertificate(mintAddress)` to retrieve the on-chain hash safely, failing closed if either RPC or IPFS fails.

2. **Query Parameter Discrepancy & Verification Route Mechanics:**
   - In `PROJECT.md` line 44, the interface was casually described as `GET /api/verify?asset=<mintAddress>`.
   - However, Observation 1.2 demonstrates that `app/api/verify/route.ts` line 23 specifically extracts `searchParams.get("query") || searchParams.get("wallet")`. It **ignores** `?asset=...`.
   - Moreover, when a Solana address is provided as `query`, line 50 executes `prisma.wallet.findUnique({ where: { walletAddress: query } })`. The mint address (`nftAddress`) is NOT the student's `walletAddress`. Passing the mint address as `query` returns 404 (`Wallet tidak ditemukan`).
   - Therefore, to verify through `GET /api/verify`, the worker must pass the student's NIM (`GET /api/verify?query=<nim>`) or the student's wallet address (`GET /api/verify?query=<studentWallet>` or `GET /api/verify?wallet=<studentWallet>`).

3. **Assertion Mechanics:**
   - From Observation 1.3, when the certificate is issued via `POST /api/nft/mint`, `dataHash` is generated via `generateDataHash` and stored in `prisma.certificate.dataHash`.
   - The worker must query the database to extract `certificate.dataHash` (Tier 1 hash) and call `inspectCertificate(mintAddress)` to extract `inspection.dataHash` (on-chain hash).
   - The worker then executes `assert.strictEqual(tier1Hash, onChainHash)`, asserting exact string identity including the `sha256:` prefix.

4. **Documentation Structure in `BAB4_PROGRESS.md`:**
   - From Observation 1.4, line 83 currently has the checkbox for P2.6.
   - The worker should mark this item complete: `- [x] **P2.6: End-to-end Demonstration Trace (TC-01)** — [SELESAI 100%]`.
   - Directly underneath, the worker should append a structured trace table and step-by-step audit log detailing: User ID, Mint Address, Transaction Signature, Tier 1 Hash, On-chain Hash, Assertion Result, and Verification Result (`GET /api/verify`).
   - Any non-HTTP steps (e.g. running the inspection script or inspecting DB rows) must be explicitly designated as non-HTTP steps.
   - Update `experiments/CHECKPOINT.json` to reflect `P2.6_COMPLETED`.

5. **Version Control & Stopping Rule:**
   - From Observation 1.5, work must remain on `feat/bab4-experiments`.
   - Only `BAB4_PROGRESS.md`, `experiments/CHECKPOINT.json`, and any trace artifact files needed should be modified/committed.
   - All completed $n=30$ runs in `experiments/2026-11-07/` and `experiments/2026-11-08/` are strictly protected.
   - After pushing the commit to `origin feat/bab4-experiments`, execution must stop immediately without starting Phase 3.

---

## 3. Caveats

1. **Solana Devnet RPC Rate Limiting:**
   - Although `inspectCertificate` has retry mechanisms, Solana Devnet public endpoints can occasionally encounter transient 429 rate limits or DNS hiccups. A 2–3 second delay after mint confirmation before invoking `inspectCertificate` ensures the transaction has finalized and indexed on RPC nodes.
2. **IPFS Pinata Gateway Latency:**
   - Newly uploaded metadata on Pinata takes 1–5 seconds to become globally accessible via IPFS gateways. If `inspectCertificate` runs too quickly, it might receive an initial gateway timeout.
3. **Admin Key and Local Environment:**
   - The verification endpoint relies on `getAdminWalletAddress()` (from `ADMIN_WALLET_PRIVATE_KEY` or `ADMIN_WALLET_ADDRESS` in `.env.local`) to verify the issuer. This is already verified as `Bat5VTbjGqsThS5oERuXVi7d2JY2TBNomJD2ZciaztaQ`.

---

## 4. Conclusion & Actionable Instructions for the Worker

### For Requirement R4 (On-Chain Hash Assertion & Application Verification):
1. **On-Chain Hash Extraction:**
   Run an evaluation script (or inline helper) calling `inspectCertificate(mintAddress)`:
   - Extract `inspection.dataHash`.
   - Confirm `inspection.ok === true`, `inspection.frozen === true`, and `inspection.owner === studentWalletAddress`.
2. **Tier 1 Hash Extraction:**
   Query `prisma.certificate.findFirst({ where: { nftAddress: mintAddress } })`:
   - Extract `certificate.dataHash`.
3. **Assertion:**
   - Assert `inspection.dataHash === certificate.dataHash`.
   - Record both hash strings verbatim.
4. **Application Verification Route:**
   - Send HTTP request:
     `GET http://localhost:3000/api/verify?query=<fictitious_nim>`
   - Assert HTTP 200 OK.
   - Assert response body contains:
     `verified: true`, `verifiedOnChain: true`, `verifiedNominative: true`, `mismatch: null`, `onChain.status: "VALID"`.
   - Record the full JSON response.

### For Requirement R5 (Documentation & Version Control):
1. **Document in `BAB4_PROGRESS.md`:**
   - Mark line 83 as `- [x] **P2.6: End-to-end Demonstration Trace (TC-01)** — [SELESAI 100%]`.
   - Include the complete summary table:
     - User ID
     - Mint Address
     - Transaction Signature
     - Tier 1 Hash (`sha256:...`)
     - On-chain Hash (`sha256:...`)
     - Assertion Result (`IDENTICAL / MATCH`)
     - Verification Result (`verified: true`, `onChain: VALID`)
     - Explicit list of non-HTTP steps (DB query and direct on-chain script).
   - Add entry in Section 3 ("Log Perubahan Terverifikasi").
   - Update `experiments/CHECKPOINT.json` (`completedTasks` and `currentTask`).
2. **Git Commit & Push:**
   - `git add BAB4_PROGRESS.md experiments/CHECKPOINT.json ...`
   - `git commit -m "feat(bab4): complete TRACE P2.6 end-to-end issuance and verification trace"`
   - `git push origin feat/bab4-experiments`
3. **Hard Boundary:**
   - Do NOT touch `experiments/2026-11-07/` or `experiments/2026-11-08/`.
   - Do NOT re-run benchmarks or benchmark scripts.
   - Do NOT begin Phase 3. STOP.

---

## 5. Verification Method

To independently verify these findings:
1. **Inspect `lib/onchain.ts`:**
   ```bash
   git grep -n "extractDataHash" lib/onchain.ts
   ```
   Confirms that `inspectCertificate` extracts the data hash from IPFS metadata attributes under trait type `"Data Hash"`.
2. **Inspect `app/api/verify/route.ts`:**
   ```bash
   head -n 40 app/api/verify/route.ts
   ```
   Confirms line 23 extracts `query` and `wallet` (not `asset`), and line 50 looks up `walletAddress`.
3. **Verify Git Branch & Untouched Status:**
   ```bash
   git branch
   git status experiments/2026-11-07/ experiments/2026-11-08/
   ```
   Confirms branch is `feat/bab4-experiments` and existing experiment runs are untouched.
