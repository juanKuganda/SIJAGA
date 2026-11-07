# Handoff Report: Empirical Challenge of Milestone 1 Benchmark Harness

**Author:** `teamwork_challenger_m1_2`  
**Milestone:** Milestone 1 (Process Termination, Exit Behavior, Negative Harness, & Error Classification)  
**Date:** 2026-11-07  
**Verdict:** **`REQUEST_CHANGES`**  
**Caller ID:** `7e84c2e9-508f-4116-8923-dd085c2f6c79`  
**Working Directory:** `/home/junnnnnnnn/Code/sijaga/.agents/teamwork/teamwork_challenger_m1_2/`  

---

## Challenge Summary

- **Overall Risk Assessment:** **MEDIUM**
- **Process Termination & WebSockets:** **PASS** (Zero hanging processes, explicit clean exit across all runners)
- **Syntax, Compilation & Typing:** **PASS** (`npx tsc --noEmit`, `npm run lint`, `tsx -c` all exit with code 0)
- **Negative Testing Harness:** **PASS** (Correct instruction structure, systematic rejection recording)
- **Error Classification & Strict Partitioning:** **FAIL (2 Bugs Identified Empirically)**

---

## 1. Observation

### 1.1 Process Lifecycle & Clean Termination Verification
1. Evaluated runner exit behavior:
   - `scripts/benchmark/bench-mint.ts` lines 184–191: Contains `.then(() => process.exit(0)).catch((e) => { ...; process.exit(1); })`.
   - `scripts/benchmark/bench-revoke.ts` lines 169–176: Contains `.then(() => process.exit(0)).catch((e) => { ...; process.exit(1); })`.
   - `scripts/benchmark/bench-verify.ts` lines 151–158: Contains `.then(() => process.exit(0)).catch((e) => { ...; process.exit(1); })`.
   - `scripts/benchmark/bench-negative.ts` lines 243–250: Contains `.then(() => process.exit(0)).catch((err) => { ...; process.exit(1); })`.
   - `scripts/benchmark/test-tc.ts` lines 700–710: Contains `await prisma.$disconnect();` followed by `.then(() => process.exit(0)).catch((err) => { ...; process.exit(1); })`.
2. Empirically executed live verification on Solana Devnet:
   ```bash
   npm run bench:verify -- --n 1
   ```
   **Output:**
   ```
   [Setup] Mempersiapkan aset ijazah valid untuk verifikasi benchmark...
   [Metaplex] Starting NFT mint to: CWXDGGmehq3cMNSXRSMPJdqimEhaoj2GZ96mKEfneXQ6
   [Metaplex] Mint address: 7t4P61D9Ki6so2QSqNW9vhxSdCq7MvwZM9q93TnbyCv4
   [Metaplex] NFT minted successfully!
   [Metaplex] Signature: 3A3EgxwswZFm7tJoE6GxqC6FJFUfjL6wUmkHEb4XEiRasrbSnkd3WA3ApAy5pAXXPXuznNxV4NEms8ATSk4MC2Hd
   --- [Trial 1/1] Verification Trial ---
   ✓ Trial 1 Success: Latency = 16.291s
   =======================================================
     BENCHMARK VERIFY SUMMARY (n=1)     
   =======================================================
   - Total Success: 1/1
   - Median Latency (p50): 16.293 s (Threshold: <= 5.0 s)
   ```
   **Process Status:** Terminated cleanly with code `0`. No background tasks remained, no dangling WebSocket handles. Output receipts verified in `experiments/2026-11-07/run-verify.jsonl` and `summary-verify.csv`.

### 1.2 Syntax and Static Typing Verification
1. Static type check:
   ```bash
   npx tsc --noEmit
   ```
   Exited with code `0` (zero type errors across codebase and benchmark scripts).
2. ESLint verification:
   ```bash
   npm run lint
   ```
   Exited with code `0` (0 errors, 62 warnings).
3. AST and Syntax parsing for negative harness and test runner:
   ```bash
   npx tsx -c scripts/benchmark/bench-negative.ts
   npx tsx -c scripts/benchmark/test-tc.ts
   ```
   Both commands exited with code `0` without syntax or import errors.

### 1.3 Empirical Error Classification Stress Test
Executed an adversarial test matrix against `isNetworkError` in `scripts/benchmark/common.ts` (lines 189–237). 

**Code Under Test (`scripts/benchmark/common.ts`):**
```typescript
199:  const msg = typeof errObj?.message === "string" ? errObj.message.toLowerCase() : String(error).toLowerCase();
200:  const causeMsg = typeof errObj?.cause?.message === "string" ? errObj.cause.message.toLowerCase() : "";
201:  const causeCode = typeof errObj?.cause?.code === "string" ? errObj.cause.code.toLowerCase() : "";
202:  const name = typeof errObj?.name === "string" ? errObj.name.toLowerCase() : "";
203:  const code = typeof errObj?.code === "string" ? errObj.code.toLowerCase() : "";
204:
205:  // Guard: Deterministic contract rejections must NEVER be classified as network errors
206:  if (
207:    msg.includes("frozen") ||
208:    msg.includes("permanentfreeze") ||
209:    msg.includes("custom program error") ||
210:    msg.includes("instructionerror") ||
211:    msg.includes("unauthorized") ||
212:    msg.includes("signature verification failed")
213:  ) {
214:    return false;
215:  }
216:
217:  const combined = `${msg} ${causeMsg} ${causeCode} ${name} ${code}`;
218:
219:  return (
220:    combined.includes("fetch failed") ||
...
223:    combined.includes("network") ||
...
231:    combined.includes("429") ||
232:    combined.includes("too many requests") ||
233:    combined.includes("rate limit") ||
...
```

**Adversarial Results (15 PASS, 5 FAIL):**
1. **FAILED Case 1:** Wrapped program error where parent error contains the word "network":
   ```json
   {
     "message": "Network dispatch failed for transaction",
     "cause": { "message": "custom program error: 0x1770 - asset is frozen" }
   }
   ```
   - **Expected:** `false` (deterministic smart contract rejection should never be retried)
   - **Actual:** `true` (misclassified as network error)
2. **FAILED Case 2:** Contract rejection in `cause` only:
   ```json
   {
     "message": "Transaction failed on network",
     "cause": { "message": "asset is frozen by permanentfreeze delegate" }
   }
   ```
   - **Expected:** `false`
   - **Actual:** `true` (misclassified as network error)
3. **FAILED Case 3:** Transient RPC HTTP 503:
   ```typescript
   new Error("RPC error: 503 Service Unavailable from devnet.helius-rpc.com")
   ```
   - **Expected:** `true` (transient cluster overload should trigger attempt 2 retry)
   - **Actual:** `false` (fails immediately without retry)
4. **FAILED Case 4:** Transient RPC HTTP 502:
   ```typescript
   new Error("RPC error: 502 Bad Gateway from devnet proxy")
   ```
   - **Expected:** `true` (transient proxy gateway error should trigger attempt 2 retry)
   - **Actual:** `false`
5. **FAILED Case 5:** Transient RPC HTTP 504:
   ```typescript
   new Error("RPC status 504 Gateway Time-out")
   ```
   - **Expected:** `true`
   - **Actual:** `false`

---

## 2. Logic Chain

1. **Guard Asymmetry (Observation 1.3 #1 & #2):**
   - Lines 206–215 inspect ONLY `msg` for deterministic contract rejection keywords (`msg.includes("frozen") || ...`).
   - Line 217 concatenates `msg`, `causeMsg`, `causeCode`, `name`, `code` into `combined`.
   - Line 223 checks `combined.includes("network")`.
   - When a library (like Node fetch or an RPC wrapper) wraps a contract error in a message mentioning "network" (e.g. `Network dispatch failed`), `msg.includes("custom program error")` is `false`, bypassing the guard. Then `combined.includes("network")` evaluates to `true`.
   - This breaks the strict partitioning requirement: deterministic program errors are misclassified as network errors, triggering invalid second attempts in `executeWithProposalRetry`.
2. **Omission of Transient Server Error Codes (Observation 1.3 #3, #4, #5):**
   - Line 231 checks `429`, `too many requests`, `rate limit`, but completely omits HTTP `502`, `503`, and `504` (Bad Gateway, Service Unavailable, Gateway Timeout).
   - In Solana Devnet testing, rate spikes on Helius or public RPCs commonly manifest as HTTP 503 ("Service Unavailable") or 502 ("Bad Gateway").
   - Omitting these codes causes legitimate transient network/server failures to immediately fail the entire trial without attempting the proposal-mandated retry (attempt 2), artificially deflating the $R_2$ reliability metric during Phase 2.

---

## 3. Caveats

- In simple single-attempt transactions where `@solana/web3.js` throws a standard unwrapped `SendTransactionError`, the message directly contains `custom program error`, which hits the current guard. The vulnerability manifests specifically when errors are wrapped or chained (e.g. with `cause`).
- Phase 2 execution ($n=30$ batches for mint, revoke, verify, and TC-01..TC-14) is scheduled for Milestone 2; only single-trial smoke tests were executed to challenge harness stability.

---

## 4. Conclusion & Required Changes

**Verdict: `REQUEST_CHANGES`**

While process termination, typing, linting, and script compilation are robust, `isNetworkError` in `scripts/benchmark/common.ts` has two concrete bugs that violate strict partitioning and will compromise Phase 2 reliability data if unaddressed.

### Required Mitigation (in `scripts/benchmark/common.ts`)

Replace lines 205–236 in `scripts/benchmark/common.ts` with:

```typescript
  const combined = `${msg} ${causeMsg} ${causeCode} ${name} ${code}`;

  // Guard: Deterministic contract rejections must NEVER be classified as network errors (check full combined context)
  if (
    combined.includes("frozen") ||
    combined.includes("permanentfreeze") ||
    combined.includes("custom program error") ||
    combined.includes("instructionerror") ||
    combined.includes("unauthorized") ||
    combined.includes("signature verification failed")
  ) {
    return false;
  }

  return (
    combined.includes("fetch failed") ||
    combined.includes("timeout") ||
    combined.includes("timed out") ||
    combined.includes("network") ||
    combined.includes("blockhash not found") ||
    combined.includes("blockhashnotfound") ||
    combined.includes("socket") ||
    combined.includes("econnreset") ||
    combined.includes("econnrefused") ||
    combined.includes("ehostunreach") ||
    combined.includes("eai_again") ||
    combined.includes("429") ||
    combined.includes("too many requests") ||
    combined.includes("rate limit") ||
    combined.includes("502") ||
    combined.includes("503") ||
    combined.includes("504") ||
    combined.includes("bad gateway") ||
    combined.includes("service unavailable") ||
    combined.includes("gateway time") ||
    combined.includes("transactionexpired") ||
    combined.includes("node is behind")
  );
```

---

## 5. Verification Method

To independently verify the bug and the fix:

1. **Reproduce the Classification Bug:**
   Execute the following inline script with `node` or `npx tsx`:
   ```bash
   npx tsx -e '
   import { isNetworkError } from "./scripts/benchmark/common";
   
   // Bug 1: Wrapped contract rejection
   const wrapped = { message: "Network error", cause: { message: "custom program error: 0x1770 - asset is frozen" } };
   console.assert(isNetworkError(wrapped) === false, "FAIL: Wrapped program error misclassified as network error!");

   // Bug 2: HTTP 503 RPC outage
   const rpc503 = new Error("RPC error: 503 Service Unavailable");
   console.assert(isNetworkError(rpc503) === true, "FAIL: 503 Service Unavailable not recognized as network error!");

   console.log("If assertions throw, bugs are confirmed.");
   '
   ```
2. **Verify Process Clean Exit:**
   ```bash
   npm run bench:verify -- --n 1
   ```
   Confirm exit code is `0` and process does not hang.
3. **Invalidation Condition:**
   If `isNetworkError` correctly returns `false` for `wrapped` and `true` for `rpc503`, the changes are verified.
