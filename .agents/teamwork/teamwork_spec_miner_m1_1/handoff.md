# Handoff Report: Phase 1 Specification Mining & Implementation Blueprints

**Agent:** `teamwork_spec_miner_m1_1`  
**Milestone:** Phase 1 (Measurement Harness & Type Fixes — P1.1 through P1.4)  
**Date:** 2026-11-07  
**Branch:** `feat/bab4-experiments`  
**Working Directory:** `/home/junnnnnnnn/Code/sijaga/.agents/teamwork/teamwork_spec_miner_m1_1/`  
**Caller ID:** `7e84c2e9-508f-4116-8923-dd085c2f6c79`  

---

## 1. Observation

### 1.1 Source Documents and Artifacts Inspected
The following authoritative sources were inspected in full:
1. `/home/junnnnnnnn/Code/sijaga/.agents/teamwork/ORIGINAL_REQUEST.md` (Requirements R1–R4, Acceptance Criteria)
2. `/home/junnnnnnnn/Code/sijaga/.agents/teamwork/orchestrator/PROJECT.md` (Architecture, Feature Inventory, Milestones M1–M3, Interfaces)
3. `/home/junnnnnnnn/Code/sijaga/SIJAGA-Bab4-Agent-Prompt.md` (§1–§13: Verified facts, thresholds, test case contract TC-01..TC-14, Phase 0–3 definitions)
4. `/home/junnnnnnnn/Code/sijaga/BAB4_PROGRESS.md` (Phase 0 complete 100%, Phase 1 P1.1–P1.4 pending)
5. `/home/junnnnnnnn/Code/sijaga/experiments/CHECKPOINT.json` (DG-1: `OPTION_A_OWNER_APPROVED`, DG-2: `AUTHOR_PROPOSAL`, Node: `v25.7.0`, Cluster: `devnet`, Core: `4.4.1`, Admin Wallet: `Bat5VTbjGqsThS5oERuXVi7d2JY2TBNomJD2ZciaztaQ`, Balance: `9.587 SOL`)
6. Codebase files:
   - `scripts/benchmark/common.ts`
   - `scripts/benchmark/bench-mint.ts`
   - `scripts/benchmark/bench-revoke.ts`
   - `scripts/benchmark/bench-verify.ts`
   - `scripts/benchmark/bench-negative.ts`
   - `scripts/benchmark/test-tc.ts`
   - `scripts/benchmark/README.md`
   - `package.json`
   - `lib/metaplex.ts`
   - `lib/challenge.ts`
   - `lib/onchain.ts`
   - `lib/pinata.ts`
   - `lib/crypto.ts`
   - Type definitions under `node_modules/@metaplex-foundation/mpl-core/dist/`

### 1.2 Static Analysis & Build Verification Findings
1. **TypeScript Type Check (`npx tsc --noEmit` & `npm run build`):**
   - Both commands failed with **14 TypeScript errors across 2 files** in `scripts/benchmark/`:
     - `scripts/benchmark/bench-negative.ts:110:11` — `error TS2322: Type 'AssetV1' is not assignable to type 'PublicKey | Pda'.`
     - `scripts/benchmark/bench-negative.ts:126:11` — `error TS2322: Type 'AssetV1' is not assignable to type 'PublicKey | Pda'.`
     - `scripts/benchmark/bench-negative.ts:142:11` — `error TS2322: Type 'AssetV1' is not assignable to type 'PublicKey | Pda'.`
     - `scripts/benchmark/bench-negative.ts:157:11` — `error TS2322: Type 'AssetV1' is not assignable to type 'PublicKey | Pda'.`
     - `scripts/benchmark/bench-negative.ts:159:13` — `error TS2353: Object literal may only specify known properties, and 'type' does not exist in type 'PluginArgs'.`
     - `scripts/benchmark/test-tc.ts:160:7` — `error TS2322: Type 'AssetV1' is not assignable to type 'PublicKey | Pda'.`
     - `scripts/benchmark/test-tc.ts:190:7` — `error TS2322: Type 'AssetV1' is not assignable to type 'PublicKey | Pda'.`
     - `scripts/benchmark/test-tc.ts:217:7` — `error TS2322: Type 'AssetV1' is not assignable to type 'PublicKey | Pda'.`
     - `scripts/benchmark/test-tc.ts:301:51` — `error TS2339: Property 'error' does not exist on type 'ChallengeVerificationResult'.`
     - `scripts/benchmark/test-tc.ts:301:90` — `error TS2339: Property 'error' does not exist on type 'ChallengeVerificationResult'.`
     - `scripts/benchmark/test-tc.ts:303:39` — `error TS2339: Property 'error' does not exist on type 'ChallengeVerificationResult'.`
     - `scripts/benchmark/test-tc.ts:303:72` — `error TS2339: Property 'error' does not exist on type 'ChallengeVerificationResult'.`
     - `scripts/benchmark/test-tc.ts:594:7` — `error TS2322: Type 'AssetV1' is not assignable to type 'PublicKey | Pda'.`
     - `scripts/benchmark/test-tc.ts:596:9` — `error TS2353: Object literal may only specify known properties, and 'type' does not exist in type 'PluginArgs'.`
2. **ESLint (`npm run lint`):**
   - In `scripts/benchmark/`:
     - `common.ts:210:12`: `prefer-const` on `let attempt` loop variable.
     - `common.ts:220:32, 248:31`: `Unexpected any` (`@typescript-eslint/no-explicit-any`).
     - `bench-mint.ts:4:3, 122:23`: unused imports/vars `createUmiInstance`, `pre`.
     - `bench-mint.ts:40:19`: `Unexpected any`.
     - `bench-negative.ts:17:3`: unused import `createSignerFromKeypair`.
     - `bench-negative.ts:212:21`: `Unexpected any`.
     - `bench-revoke.ts:35:19`: `Unexpected any`.
     - `bench-verify.ts:72:19`: `Unexpected any`.
     - `test-tc.ts:1:31, 25:28, 451:9, 572:9`: unused imports/vars `PublicKey`, `verifyDataHash`, `tc9RevokeRes`, `deadUmi`.
     - `test-tc.ts:164, 194, 220, 510, 601`: `Unexpected any`.
3. **Execution Harness & npm Scripts:**
   - `package.json` already contains:
     - `"bench:mint": "node --env-file=.env.local ./node_modules/tsx/dist/cli.mjs scripts/benchmark/bench-mint.ts"`
     - `"bench:revoke": "node --env-file=.env.local ./node_modules/tsx/dist/cli.mjs scripts/benchmark/bench-revoke.ts"`
     - `"bench:verify": "node --env-file=.env.local ./node_modules/tsx/dist/cli.mjs scripts/benchmark/bench-verify.ts"`
     - `"bench:negative": "node --env-file=.env.local ./node_modules/tsx/dist/cli.mjs scripts/benchmark/bench-negative.ts"`
     - `"test:tc": "node --env-file=.env.local ./node_modules/tsx/dist/cli.mjs scripts/benchmark/test-tc.ts"`

---

## 2. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | P1.1 Suite Setup | Benchmark Suite Structure | Dedicated benchmarking directory under `scripts/benchmark/` with modular runner architecture | CLI flags (`--n 30`) | Exit code 0, console summaries, JSONL/CSV logs | Exit code 1 on unhandled exception | `SIJAGA-Bab4-Agent-Prompt.md` §6, `PROJECT.md` |
| 2 | P1.2 Logging | Full Transaction Receipt Logger | Dual-format receipt logging (JSONL per trial + CSV summary per batch) preserving all 19 mandated fields | `TransactionReceipt` object | `run-<op>.jsonl`, `summary-<op>.csv` in `experiments/<YYYY-MM-DD>/` | Fails closed; directory auto-created if missing | `SIJAGA-Bab4-Agent-Prompt.md` §6 P1.2, `scripts/benchmark/common.ts` |
| 3 | P1.2 Logging | Run Metadata Snapshot | Daily environment metadata snapshot capturing RPC host, provider, Solana Core version, feature-set, and 6 software versions | `Connection` instance | `experiments/<YYYY-MM-DD>/run-metadata.json` | Graceful fallback to "unknown" on RPC version query failure | `scripts/benchmark/common.ts`, `SIJAGA-Bab4-Agent-Prompt.md` §6 P1.2 |
| 4 | P1.3 Retry Policy | Send-Level Network Retry | At most 2 attempts per transaction; retry only triggered on transient network/RPC errors | Async callback `fn(attempt: 1 \| 2)` | Result of type `T` on success | Throws after 2 failed attempts or immediately on non-network errors | `SIJAGA-Bab4-Agent-Prompt.md` §6 P1.3, §3.2 |
| 5 | P1.3 Retry Policy | Dual Success-Rate Tracking | Distinction and calculation of first-attempt success rate ($R_1 = S_1/N$) and two-attempt success rate ($R_2 = (S_1+S_2)/N$) | Receipt history | First-attempt vs 2-attempt success percentages | Both attempts logged as separate receipts if attempt 1 fails | `SIJAGA-Bab4-Agent-Prompt.md` §3.2, §6 P1.3 |
| 6 | P1.4 Planning | $n=30$ Time-Spread Scheduling | Protocol distributing 30 trials per operation across 4 distinct times of day to sample real Devnet congestion | Execution plan matrix | Distributed datasets across morning, midday, evening, night | Validates p50 & p95 robustness against quiet-hour bias | `SIJAGA-Bab4-Agent-Prompt.md` §6 P1.4 |
| 7 | Performance | Soulbound Minting Benchmark | End-to-end issuance measurement separating IPFS generation/pinning from Solana on-chain minting | Student profile, dummy wallet | `elapsedSeconds`, `onchainElapsedSeconds`, `ipfsElapsedSeconds`, `feeLamports`, `rentDepositLamports` | Logs failed attempt with error code and signature if generated | `scripts/benchmark/bench-mint.ts` |
| 8 | Performance | Visual Revocation Benchmark | Revocation measurement separating IPFS revoked metadata creation from on-chain URI update | Mint address, revoked metadata | `elapsedSeconds`, `onchainElapsedSeconds`, `ipfsElapsedSeconds`, `feeLamports`, `slot` | Throws on invalid mint address or update rejection | `scripts/benchmark/bench-revoke.ts` |
| 9 | Performance | Verification Benchmark | Read latency measurement combining on-chain account fetch, IPFS metadata retrieval, and Ed25519 signature challenge | Mint address, student wallet | Verification latency (`elapsedSeconds`), challenge validity | Rejects closed if IPFS times out (>15s) or signature invalid | `scripts/benchmark/bench-verify.ts` |
| 10 | Security / Negative | Invariant Violation Rejection | Systematic negative test suite exercising raw Metaplex Core instructions to prove non-transferability and immutability | Frozen asset, unauthorized signers | Transaction rejection signature and network fee | Validates network-level rejection while `frozen: true` | `scripts/benchmark/bench-negative.ts` |
| 11 | QA / Validation | 14 Test Case Automated Runner | Automated test suite verifying TC-01 through TC-14 per proposal Tabel 3.3 | Devnet environment, admin/student/attacker keys | Markdown & JSON test case evidence table | Reports explicit failure reason without masking | `scripts/benchmark/test-tc.ts` |
| 12 | Quality / Build | Type Check Cleanliness | Zero TypeScript type errors across `scripts/benchmark/` allowing `npm run build` to pass | Source code | Clean exit code 0 | Blocks production build on any type mismatch | User Rule & `PROJECT.md` |

---

## 3. Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Retry Policy | Network error on Attempt 1 (e.g. `blockhash not found` or `fetch failed`) | Attempt 1 logged as `status: "FAILED"`; 2-second sleep backoff; Attempt 2 dispatched; if success, Attempt 2 logged as `status: "SUCCESS"` |
| 2 | Retry Policy | Non-network error on Attempt 1 (e.g. instruction program error, invalid signature, freeze rejection) | Immediate rejection; NO retry performed; logged as `attempt: 1`, `status: "FAILED"` |
| 3 | Rent Deposit Calculation | Metaplex Core asset minting on Solana | Asset account creation requires rent deposit. Solved by diffing `preBalances` and `postBalances` of the asset account from `connection.getTransaction`. |
| 4 | Verification Challenge Discriminated Union | Inspecting `verifyVerificationChallenge` result | Return type is `{ success: true; walletAddress: string; nonce: string; } | { success: false; error: string; message: string; }`. Accessing `.error` without narrowing triggers TS2339. |
| 5 | Metaplex Core Low-Level Instructions | Calling `transferV1`, `burnV1`, `updatePluginV1` | Accounts type expects `asset: PublicKey | Pda`, whereas `fetchAsset` returns `AssetV1`. Passing `asset` directly causes TS2322; must pass `asset.publicKey`. |
| 6 | Metaplex Core Plugin Args Discriminator | Updating `PermanentFreezeDelegate` via `updatePluginV1` | `PluginArgs` requires kinematic data enum `{ __kind: 'PermanentFreezeDelegate', fields: [{ frozen: false }] }`. Passing `{ type: 'PermanentFreezeDelegate' }` causes TS2353. |
| 7 | IPFS Gateway Timeout | IPFS gateway unresponsive during verification | `inspectCertificate` times out after 15,000 ms and returns `{ ok: false, reason: "FETCH_TIMEOUT" }`, failing closed. |

---

## 4. Logic Chain

1. **Premise 1:** The user request R1 and Milestone M1 require all TypeScript errors in `scripts/benchmark/` to be resolved so that `npm run build` and `npm run lint` succeed with 0 errors.
2. **Observation 1:** Running `npx tsc --noEmit` and `npm run build` revealed 14 TypeScript errors in `scripts/benchmark/bench-negative.ts` (5 errors) and `scripts/benchmark/test-tc.ts` (9 errors).
3. **Observation 2:** The root causes for the 14 errors were traced to three patterns:
   - Passing `AssetV1` object instead of `PublicKey` to `@metaplex-foundation/mpl-core` instruction builders (`transferV1`, `burnV1`, `updatePluginV1`).
   - Passing high-level `{ type: 'PermanentFreezeDelegate' }` syntax into raw `updatePluginV1`, which requires Kinobi data enum `{ __kind: 'PermanentFreezeDelegate', fields: [...] }` or `updatePlugin` wrapper.
   - Accessing `.error` on `ChallengeVerificationResult` without discriminating the union on `success`.
4. **Premise 2:** The specification requires a standardized, complete receipt logger (`scripts/benchmark/common.ts`) recording 19 specific fields into both JSONL and CSV formats under `experiments/<YYYY-MM-DD>/`.
5. **Observation 3:** `scripts/benchmark/common.ts` is implemented with `TransactionReceipt` and `recordReceipt`, but has minor ESLint warnings/errors (prefer-const, `any` usage) and must strictly match the complete specification blueprint.
6. **Premise 3:** The proposal Section 3.2 defines a send-level retry policy of at most 2 attempts (1 retry) strictly for network errors, tracking first-attempt success rate and two-attempt success rate separately.
7. **Observation 4:** `executeWithProposalRetry` in `common.ts` implements this logic, but must ensure Attempt 1 is recorded into JSONL when a retry occurs, and `attempt: 2` is recorded for the second attempt, so that statistics for both rates can be derived from the raw dataset.
8. **Conclusion:** A concrete blueprint and exact code fix specification can now be provided for the builders to achieve zero TypeScript and ESLint errors, finalize the measurement harness, and prepare the scheduling plan for Phase 2.

---

## 5. Detailed Implementation Blueprints

### 5.1 Blueprint for `scripts/benchmark/common.ts`

#### Schema: `TransactionReceipt`
```typescript
export interface SoftwareVersions {
  node: string;
  solanaWeb3: string;
  mplCore: string;
  umi: string;
  pinata: string;
  next: string;
}

export interface TransactionReceipt {
  // P1.2 Core Identifiers
  operation: "MINT" | "REVOKE" | "VERIFY" | "NEGATIVE_TRANSFER_OWNER" | "NEGATIVE_TRANSFER_OTHER" | "NEGATIVE_BURN" | "NEGATIVE_THAW" | string;
  trialIndex: number;
  attempt: 1 | 2;
  
  // Timing & Latency
  sendTimestamp: string;        // ISO 8601 UTC
  finalizedTimestamp: string;   // ISO 8601 UTC
  elapsedSeconds: number;       // End-to-end latency in seconds
  onchainElapsedSeconds?: number; // Solana-only latency (mint & revoke)
  ipfsElapsedSeconds?: number;    // IPFS-only latency (mint & revoke)
  
  // Blockchain Data
  slot?: number | null;
  txSignature?: string | null;  // Base58 signature
  feeLamports?: number | null;  // Transaction fee paid
  rentDepositLamports?: number | null; // Rent-exempt deposit (mint)
  
  // Outcome & Diagnostics
  status: "SUCCESS" | "FAILED";
  errorCode?: string | null;
  errorMessage?: string | null;
  
  // Environment & Provenance
  rpcProvider: string;          // e.g. "Helius"
  rpcEndpoint: string;          // e.g. "devnet.helius-rpc.com"
  softwareVersions: SoftwareVersions;
  cluster: "devnet";
  clusterVersion: string;       // e.g. "solana-core: 4.4.1, feature-set: 123456789"
  wallClockTime: string;        // Local time string e.g. "14:30:15"
  date: string;                 // "YYYY-MM-DD"
}
```

#### Dual Logging Specification
- **JSONL (`run-<operation>.jsonl`):**
  - Append-only. Every single attempt (whether Attempt 1 that failed with network error, Attempt 2 retry, or immediate single attempt) produces exactly one JSON line.
  - Path: `experiments/<YYYY-MM-DD>/run-<operation>.jsonl`.
- **CSV Summary (`summary-<operation>.csv`):**
  - Header: `operation,trialIndex,attempt,status,elapsedSeconds,onchainElapsedSeconds,ipfsElapsedSeconds,feeLamports,rentDepositLamports,slot,txSignature,errorCode,wallClockTime,date`
  - Path: `experiments/<YYYY-MM-DD>/summary-<operation>.csv`.
- **Metadata (`run-metadata.json`):**
  - Stored once per day in `experiments/<YYYY-MM-DD>/run-metadata.json`.
  - Captures: `date`, `createdAt`, `cluster`, `clusterVersion`, `rpc` (`provider`, `endpointHost`), `softwareVersions`, `adminWallet`.

#### Retry Policy Design (`executeWithProposalRetry`)
- **Max Attempts:** 2.
- **Network Error Classifier (`isNetworkError`):**
  - Checks if message matches: `fetch failed`, `timeout`, `timed out`, `network`, `blockhash not found`, `socket`, `econnreset`, `econnrefused`, `429`, `too many requests`, `rate limit`.
- **Behavior:**
  - Loop `for (const attempt of [1, 2] as const)`.
  - If `attempt === 1` and `isNetworkError(err)`:
    - Log Attempt 1 receipt with `status: "FAILED"`, `attempt: 1`.
    - Wait 2000 ms backoff delay.
    - Continue to `attempt: 2`.
  - If `attempt === 1` and NOT network error:
    - Log Attempt 1 receipt with `status: "FAILED"`.
    - Re-throw error immediately (no retry).
  - If `attempt === 2` (success or fail):
    - Log Attempt 2 receipt.
    - Re-throw if failed.

---

### 5.2 Type Fix Specifications for `bench-negative.ts` and `test-tc.ts`

#### Fix 1: `scripts/benchmark/bench-negative.ts`
1. **Line 108–115 (TC-02 Transfer Owner):**
   ```typescript
   // BEFORE:
   const asset = await fetchAsset(umiInstance, assetPubkey);
   return await transferV1(umiInstance, {
     asset, // Type 'AssetV1' is not assignable to type 'PublicKey | Pda'
     newOwner: recipientPubkey,
   }).sendAndConfirm(umiInstance, ...);

   // FIX:
   const asset = await fetchAsset(umiInstance, assetPubkey);
   return await transferV1(umiInstance, {
     asset: asset.publicKey,
     newOwner: recipientPubkey,
   }).sendAndConfirm(umiInstance, ...);
   ```
2. **Line 124–131 (TC-03 Transfer Attacker):**
   ```typescript
   // FIX:
   const asset = await fetchAsset(umiInstance, assetPubkey);
   return await transferV1(umiInstance, {
     asset: asset.publicKey,
     newOwner: publicKey(attackerKeypair.publicKey.toBase58()),
   }).sendAndConfirm(umiInstance, ...);
   ```
3. **Line 140–146 (TC-04 Burn Owner):**
   ```typescript
   // FIX:
   const asset = await fetchAsset(umiInstance, assetPubkey);
   return await burnV1(umiInstance, {
     asset: asset.publicKey,
   }).sendAndConfirm(umiInstance, ...);
   ```
4. **Line 155–165 (TC-13 Thaw Attacker):**
   ```typescript
   // FIX:
   const asset = await fetchAsset(umiInstance, assetPubkey);
   return await updatePluginV1(umiInstance, {
     asset: asset.publicKey,
     plugin: {
       __kind: "PermanentFreezeDelegate",
       fields: [{ frozen: false }],
     },
   }).sendAndConfirm(umiInstance, ...);
   ```

#### Fix 2: `scripts/benchmark/test-tc.ts`
1. **Lines 158–162 (TC-02):** Pass `asset: asset.publicKey` to `transferV1`.
2. **Lines 188–192 (TC-03):** Pass `asset: asset.publicKey` to `transferV1`.
3. **Lines 215–218 (TC-04):** Pass `asset: asset.publicKey` to `burnV1`.
4. **Lines 290–304 (TC-06 Discriminated Union):**
   ```typescript
   // BEFORE:
   const tc6Passed =
     !tc6Replay.success &&
     tc6Replay.error === "NONCE_ALREADY_USED" &&
     !tc6Foreign.success &&
     tc6Foreign.error === "INVALID_SIGNATURE";
   recordTest({
     ...
     observedResult: `Replay rejected: ${tc6Replay.error}, Foreign rejected: ${tc6Foreign.error}`,
     ...
     evidence: `ReplayErr: ${tc6Replay.error}, ForeignErr: ${tc6Foreign.error}`,
   });

   // FIX:
   const tc6ReplayErr = !tc6Replay.success ? tc6Replay.error : "SUCCESS_UNEXPECTED";
   const tc6ForeignErr = !tc6Foreign.success ? tc6Foreign.error : "SUCCESS_UNEXPECTED";
   const tc6Passed =
     tc6ReplayErr === "NONCE_ALREADY_USED" &&
     tc6ForeignErr === "INVALID_SIGNATURE";

   recordTest({
     id: "TC-06",
     scenario: "Signature from another wallet, expired nonce, or replayed message",
     testClass: "Invalid",
     expectedResult: "Verification rejected for all invalid variants",
     observedResult: `Replay rejected: ${tc6ReplayErr}, Foreign rejected: ${tc6ForeignErr}`,
     status: tc6Passed ? "PASS" : "FAIL",
     evidence: `ReplayErr: ${tc6ReplayErr}, ForeignErr: ${tc6ForeignErr}`,
   });
   ```
5. **Lines 592–599 (TC-13):**
   ```typescript
   // FIX:
   const asset = await fetchAsset(attackerUmi, publicKey(tc9NewMint));
   await updatePluginV1(attackerUmi, {
     asset: asset.publicKey,
     plugin: {
       __kind: "PermanentFreezeDelegate",
       fields: [{ frozen: false }],
     },
   }).sendAndConfirm(attackerUmi);
   ```

#### Fix 3: ESLint Cleanup across `scripts/benchmark/`
1. `common.ts`: Replace `for (let attempt of [1, 2] as const)` with `for (const attempt of [1, 2] as const)`. Replace `as any` with proper typed accessors.
2. `bench-mint.ts`: Remove unused `createUmiInstance` import. Remove unused `pre` variable. Type error objects as `unknown` with `err instanceof Error ? err.message : String(err)`.
3. `bench-negative.ts`: Remove unused `createSignerFromKeypair` import.
4. `test-tc.ts`: Remove unused `PublicKey`, `verifyDataHash`, `tc9RevokeRes`, `deadUmi`. Replace `(err: any)` with `(err: unknown)`.

---

### 5.3 Blueprints for Benchmark Runners

#### 1. `bench-mint.ts`
- **CLI Options:** `--n <trials>` (default: 30).
- **Execution Lifecycle per Trial ($i = 1..n$):**
  1. Generate unique fictitious student credentials (`fakeNim = F55110001..`, `fakeNama`, `fakeProdi = "Teknik Informatika"`, `fakeTahunLulus = "2026"`).
  2. Generate fresh dummy student recipient wallet (`Keypair.generate().publicKey.toBase58()`).
  3. **IPFS Phase:**
     - Compute salted data hash: `generateDataHash(fakeNama, fakeNim, fakeProdi)`.
     - Generate and upload certificate preview image via `generateAndUploadCertificateImage(..., "MINTED")`.
     - Assemble metadata JSON via `generateCertificateMetadata`.
     - Upload metadata to Pinata via `uploadMetadataToPinata`.
     - Record `ipfsElapsedSeconds`.
  4. **Solana On-Chain Phase:**
     - Prepare mint signer: `prepareMintSigner()`.
     - Mint Metaplex Core Soulbound NFT via `mintSoulboundNFT({ metadataUri, walletTujuan, mintSigner })`.
     - Record `onchainElapsedSeconds`.
  5. **Transaction Enrichment:**
     - Query `connection.getTransaction(signature)` with `confirmed` commitment.
     - Extract `slot`, `feeLamports = txInfo.meta.fee`.
     - Extract `rentDepositLamports = txInfo.meta.postBalances[1]`.
  6. **Receipt Logging:**
     - Call `recordReceipt(receipt)` inside `executeWithProposalRetry`.
- **Statistical Summary Calculation:**
  - $N_{\text{total}}$, $N_{\text{success}}$, First-Attempt Success Rate ($S_1/N$), Two-Attempt Success Rate ($S_2/N$).
  - End-to-end latency: Median (p50), 95th Percentile (p95), Min, Max.
  - On-chain only latency: Median (p50), Max.
  - Average fee and rent deposit in lamports and SOL.

#### 2. `bench-revoke.ts`
- **CLI Options:** `--n <trials>` (default: 30).
- **Setup Phase per Trial:**
  - Fast-mint a base active diploma on Devnet to serve as the revocation target.
- **Revocation Operation:**
  1. **IPFS Phase:** Generate revoked status certificate image (`"REVOKED"`) and revoked metadata (`generateRevokedMetadata`), pin to Pinata (`uploadMetadataToPinata`).
  2. **Solana On-Chain Phase:** Call `revokeSoulboundNFT({ mintAddress, metadataUri: revokedMetadataUri })`. Updates asset name to `[DIBATALKAN] Ijazah S1` and points URI to revoked IPFS metadata.
  3. **Enrichment:** Fetch fee and slot from `getTransaction`.
- **Statistical Summary:**
  - Median (p50) latency, p95 latency, on-chain latency, transaction fee in lamports.

#### 3. `bench-verify.ts`
- **CLI Options:** `--n <trials>` (default: 30).
- **Setup Phase:**
  - Mint 1 valid certificate asset once to a known graduate keypair (`studentKeypair`).
- **Verification Operation per Trial:**
  1. **Solana + IPFS Inspection:** Call `inspectCertificate(mintAddress)`. Reads on-chain asset state from Metaplex Core and fetches IPFS metadata with 15s timeout.
  2. **Challenge Creation:** Call `createVerificationChallenge(studentWallet)` to issue a fresh 128-bit nonce in PostgreSQL `VerificationNonce`.
  3. **Cryptographic Signing:** Sign the challenge message with `studentKeypair.secretKey` using `nacl.sign.detached`.
  4. **Verification Call:** Call `verifyVerificationChallenge(...)`. Checks signature validity, nonce expiration, single-use flag, and confirms `signer === expectedOwner`.
- **Statistical Summary:**
  - Latency distribution (p50, p95, min, max) evaluated against the ≤ 5.0 second acceptance threshold.

#### 4. `bench-negative.ts`
- **Structure:** 4 scenarios executed 3 times each (total 12 negative trials).
- **Scenarios:**
  - `TC-02 (NEGATIVE_TRANSFER_OWNER)`: Graduate wallet tries to call `transferV1` to a recipient wallet.
  - `TC-03 (NEGATIVE_TRANSFER_OTHER)`: Attacker wallet tries to call `transferV1` to itself.
  - `TC-04 (NEGATIVE_BURN)`: Graduate wallet tries to call `burnV1`.
  - `TC-13 (NEGATIVE_THAW)`: Attacker wallet tries to call `updatePluginV1` with `frozen: false`.
- **Receipts:**
  - Every rejected attempt records transaction signature (if submitted), error message, and fee deducted by the network for the failed transaction.

#### 5. `test-tc.ts`
- Comprehensive runner for all 14 test cases in proposal Tabel 3.3.
- Sequentially executes:
  - TC-01 (Issuance trace), TC-02 (Owner transfer reject), TC-03 (Attacker transfer reject), TC-04 (Burn reject), TC-05 (Valid challenge verify), TC-06 (4 challenge failure variants), TC-07 (ISSUER and HASH mismatch checks), TC-08 (Visual revocation check), TC-09 (Re-issuance flow), TC-10 (PII absence on IPFS/on-chain), TC-11 (Post-deletion unbinding), TC-12 (RPC/IPFS outage handling), TC-13 (Non-institution thaw reject), TC-14 (Claim memo sponsorship).
- Exports structured test matrix for Chapter 4.

---

### 5.4 Measurement Plan Scheduling Blueprint (P1.4, $n=30$ Spread)

#### Scheduling Matrix
To ensure real-world validity and prevent "quiet hour" distortion, the 30 trials per operation must be partitioned into 4 batches across different times of day:

| Batch # | Time Window (WITA / UTC+8) | Equivalent UTC | Target Trials (Mint / Revoke / Verify) | Network Condition Target |
|:---:|:---:|:---:|:---:|:---|
| **Batch 1** | 08:30 – 09:30 WITA | 00:30 – 01:30 UTC | 8 trials | Asia morning opening, moderate RPC latency |
| **Batch 2** | 13:00 – 14:00 WITA | 05:00 – 06:00 UTC | 8 trials | European morning wake-up, average traffic |
| **Batch 3** | 17:30 – 18:30 WITA | 09:30 – 10:30 UTC | 7 trials | Asia evening / European afternoon |
| **Batch 4** | 22:00 – 23:00 WITA | 14:00 – 15:00 UTC | 7 trials | US morning market peak congestion |
| **Total** | **4 Distinct Windows** | — | **30 trials each** | **Comprehensive network profile** |

#### Execution Command Protocol
- The runner scripts support `--n <count>`:
  - Batch 1: `npm run bench:mint -- --n 8 && npm run bench:revoke -- --n 8 && npm run bench:verify -- --n 8`
  - Batch 2: `npm run bench:mint -- --n 8 && npm run bench:revoke -- --n 8 && npm run bench:verify -- --n 8`
  - Batch 3: `npm run bench:mint -- --n 7 && npm run bench:revoke -- --n 7 && npm run bench:verify -- --n 7`
  - Batch 4: `npm run bench:mint -- --n 7 && npm run bench:revoke -- --n 7 && npm run bench:verify -- --n 7`
- Receipts automatically append to `experiments/<YYYY-MM-DD>/run-<operation>.jsonl` with exact `sendTimestamp` and `wallClockTime`.

---

## 6. Caveats

1. **RPC Rate Limits:** While Helius Devnet is configured as the dedicated RPC provider, free-tier rate limits (e.g. 50 RPS) can still trigger HTTP 429 during rapid sequential mints. The harness must maintain a 2-second inter-trial pause.
2. **Devnet Slot Variability:** Solana Devnet exhibits higher slot skip rates and block time variances than mainnet-beta. This variance is expected and will be reflected in the p95 metric.
3. **Pre-existing UI Lint Warnings:** The repository contains several pre-existing React/ESLint warnings in `app/` and `components/` (e.g. `react-hooks/set-state-in-effect` in `audit/page.tsx` and `preview-blinks/page.tsx`). These are outside `scripts/benchmark/` but should be resolved before Phase 3 final handoff.

---

## 7. Conclusion

Phase 1 (Measurement Harness & Type Fixes) specification mining is complete. The exact causes of the 14 TypeScript errors and ESLint warnings in `scripts/benchmark/` have been identified and mapped to drop-in code fixes. The receipt logging schema, retry policy, benchmark blueprints, and measurement schedule fully satisfy requirements P1.1 through P1.4 and provide a clear, unambiguous blueprint for the builders in Milestone 1.

---

## 8. Verification Method

To verify this specification and validate the fixes once implemented by builders:
1. **TypeScript Type Check:**
   ```bash
   npx tsc --noEmit
   ```
   *Expected outcome:* Exit code 0, 0 errors reported.
2. **Next.js Production Build:**
   ```bash
   npm run build
   ```
   *Expected outcome:* Exit code 0, all 42 App Router routes compiled and type-checked cleanly.
3. **ESLint Validation:**
   ```bash
   npm run lint
   ```
   *Expected outcome:* Zero errors in `scripts/benchmark/`.
4. **Harness Smoke Test:**
   ```bash
   npm run bench:mint -- --n 1
   npm run bench:verify -- --n 1
   npm run bench:negative
   ```
   *Expected outcome:* Single trial executes end-to-end on Solana Devnet and generates receipt JSONL + CSV under `experiments/$(date +%Y-%m-%d)/`.

