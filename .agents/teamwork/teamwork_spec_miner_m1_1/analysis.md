# Phase 1 Specification Mining & Implementation Blueprints

## 1. Specification Sources Analyzed
1. `SIJAGA-Bab4-Agent-Prompt.md` (Sections 1, 3, 5, 6, 7, 8, 10, 11, 12, 13)
2. `BAB4_PROGRESS.md` (Fase 0 completed, Fase 1 pending)
3. `experiments/CHECKPOINT.json` (State checkpoint, DG-1 Opsi A, DG-2 Author Proposal, Node v25.7.0, Solana Devnet core 4.4.1)
4. `package.json` (dependencies, scripts)
5. `scripts/benchmark/` existing files: `common.ts`, `bench-mint.ts`, `bench-revoke.ts`, `bench-verify.ts`, `bench-negative.ts`, `test-tc.ts`, `README.md`
6. `lib/metaplex.ts`, `lib/challenge.ts`, `lib/onchain.ts`, `lib/pinata.ts`, `lib/crypto.ts`
7. `@metaplex-foundation/mpl-core` typings in `node_modules/@metaplex-foundation/mpl-core/dist/`

## 2. Inventory of TypeScript & ESLint Errors
`npx tsc --noEmit` fails with 14 errors in 2 files:
- `scripts/benchmark/bench-negative.ts` (5 errors):
  - Line 110: `asset` passed to `transferV1` is `AssetV1` instead of `PublicKey | Pda` -> Fix: `asset.publicKey`
  - Line 126: `asset` passed to `transferV1` is `AssetV1` -> Fix: `asset.publicKey`
  - Line 142: `asset` passed to `burnV1` is `AssetV1` -> Fix: `asset.publicKey`
  - Line 157: `asset` passed to `updatePluginV1` is `AssetV1` -> Fix: `asset.publicKey`
  - Line 159: `type: "PermanentFreezeDelegate"` in `updatePluginV1` -> Fix: use `updatePlugin` or discriminator `plugin: { __kind: 'PermanentFreezeDelegate', fields: [{ frozen: false }] }`
- `scripts/benchmark/test-tc.ts` (9 errors):
  - Line 160: `asset` in `transferV1` -> Fix: `asset.publicKey`
  - Line 190: `asset` in `transferV1` -> Fix: `asset.publicKey`
  - Line 217: `asset` in `burnV1` -> Fix: `asset.publicKey`
  - Lines 301, 303: Property `error` does not exist on union `ChallengeVerificationResult` -> Fix: Type narrowing or checking `!res.success ? res.error : ""`
  - Line 594: `asset` in `updatePluginV1` -> Fix: `asset.publicKey`
  - Line 596: `type: "PermanentFreezeDelegate"` in `updatePluginV1` -> Fix: same as bench-negative.ts

ESLint errors in `scripts/benchmark/`:
- `scripts/benchmark/common.ts`: prefer-const on `attempt` in loop (line 210), `no-explicit-any` on lines 220, 248.
- `scripts/benchmark/bench-mint.ts`: unused import `createUmiInstance` (line 4), unused var `pre` (line 122), `no-explicit-any` on line 40.
- `scripts/benchmark/bench-negative.ts`: unused import `createSignerFromKeypair` (line 17), `no-explicit-any` on line 212.
- `scripts/benchmark/bench-revoke.ts`: `no-explicit-any` on line 35.
- `scripts/benchmark/bench-verify.ts`: `no-explicit-any` on line 72.
- `scripts/benchmark/test-tc.ts`: unused import `PublicKey` (line 1), unused import `verifyDataHash` (line 25), unused vars `tc9RevokeRes` (line 451) and `deadUmi` (line 572), `no-explicit-any` on lines 164, 194, 220, 510, 601.

