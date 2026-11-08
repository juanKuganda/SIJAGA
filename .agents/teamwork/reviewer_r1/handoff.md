# Handoff Report — Reviewer Round 1

## 1. Executive Summary
Adversarial review round 1 performed for the "Buktikan Kepemilikan" (Challenge-Response Ownership Verification) UI on `app/ijazah/[id]/page.tsx` on branch `feat/bab4-experiments`.

Identified and resolved critical edge cases, a fatal logical bypass where certificates without registered wallets could falsely verify ownership, non-standard wallet signature format incompatibilities, unhandled user cancellations on wallet connection, and reverted collateral modifications on `package.json` and `app/layout.tsx`.

## 2. Issues Identified and Resolved

### Issue 1: Fatal Logical Bypass on Unregistered Certificate Wallet (Fatal Functional Bug)
- **Input:** Verification attempted on a certificate where `cert.walletAddress` is null (e.g. issued but not yet claimed by student).
- **Expected:** API rejects with `OWNER_MISMATCH` because no registered wallet exists for this certificate, and UI shows "Dompet ini bukan pemilik ijazah".
- **Actual:** Prior attempt passed `expectedOwner: cert?.walletAddress || undefined`. Because `expectedOwner` was `undefined`, JSON serialized it by dropping the key. Server skipped `if (expectedOwner && ...)` check, and tweetnacl signature verification succeeded for the signer's own wallet, returning `{ verified: true }`. The UI displayed "Kepemilikan Terverifikasi: Dompet ini pemilik sah ijazah" for an unclaimed certificate.
- **Root Cause:** Bypassed server-side owner validation when `expectedOwner` evaluated to `undefined`.
- **Fix:** Set `expectedOwner = cert?.walletAddress || "UNREGISTERED_OWNER"`. Any real Solana wallet will mismatch `"UNREGISTERED_OWNER"`, correctly triggering `OWNER_MISMATCH` ("Dompet ini bukan pemilik ijazah").

### Issue 2: Cross-realm & Multi-format Wallet Signature Incompatibility (Minor Robustness Risk)
- **Input:** Wallets returning signatures as cross-realm `Uint8Array`, Base58 strings, or nested objects (e.g. Solflare, Backpack, or custom injected extensions).
- **Expected:** Robust extraction and base58 encoding of Ed25519 signature.
- **Actual:** Prior attempt relied strictly on `signedResult instanceof Uint8Array` which fails across execution contexts/realms, and did not handle Base58 string signatures or `ArrayBuffer.isView`.
- **Root Cause:** Narrow type checking without multi-realm and multi-format support.
- **Fix:** Implemented `extractRawSignature()` supporting `Uint8Array`, `ArrayBuffer.isView`, base58 string decode, nested `{ signature }`, and Buffer JSON `{ type: "Buffer", data: number[] }`.

### Issue 3: Incomplete User Rejection Handling (Minor Robustness Risk)
- **Input:** User cancels or closes the Phantom connection popup during `provider.connect()`.
- **Expected:** UI status transitions to `gagal` with error code `USER_REJECTED` and informative Indonesian message.
- **Actual:** Rejection in `provider.connect()` fell through to the generic catch block with code `CLIENT_ERROR`.
- **Root Cause:** Rejection detection logic was only placed inside `signMessage` try/catch block.
- **Fix:** Extracted `isUserRejection()` helper detecting error code 4001 and cancellation messages across both connection and signing phases.

### Issue 4: Compatibility Fallback for `signMessage` (Minor Robustness Risk)
- **Input:** Solana wallet provider rejecting dual positional parameters (`msgBytes, "utf8"`).
- **Expected:** Graceful fallback to single parameter `provider.signMessage(msgBytes)`.
- **Actual:** Hard failure if provider strictly expects 1 parameter.
- **Fix:** Wrapped in try/catch fallback to call `provider.signMessage(msgBytes)` if non-rejection error occurs.

### Issue 5: Nonce Expiration Timer & Stale UI State
- **Input:** Challenge expires (5 minutes elapsed). User clicks "Minta Challenge Baru".
- **Expected:** Timer immediately resets to 300s, previous error states clear.
- **Actual:** `timeLeft` stayed at 0 until server responded with the new challenge.
- **Fix:** Explicitly reset `setTimeLeft(300)` and state flags at the start of `handleVerifyOwnership`.

### Issue 6: Reverted Collateral Changes
- **Input:** Commit `5d3ee5c` modified `package.json` (`NODE_OPTIONS`) and `app/layout.tsx` (`suppressHydrationWarning`).
- **Expected:** Task changes strictly confined to `app/ijazah/[id]/page.tsx` as per R1-R5.
- **Actual:** Diff contained unrelated edits.
- **Fix:** Reverted `package.json` and `app/layout.tsx` back to `origin/feat/bab4-experiments`. Verified both `lint` and `build` pass cleanly without them.

## 3. Verification Record
- `npm run lint`: PASSED (0 errors, file `app/ijazah/[id]/page.tsx` clean).
- `npm run build`: PASSED (42 static & dynamic routes compiled, 0 errors).
- Commit: `d72f323` on branch `feat/bab4-experiments`.
