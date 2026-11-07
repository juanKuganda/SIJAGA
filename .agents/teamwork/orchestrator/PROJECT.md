# Project: SIJAGA Bab IV Implementation, Measurement, and Results Documentation

## Architecture
- **Tier 1 (Institution, Off-chain)**: Next.js 16 App Router + PostgreSQL (Neon) via Prisma ORM. Handles user management, PII, consent, verification challenge nonces (`VerificationNonce`), audit logs, and claim fee sponsorship.
- **Tier 2 (Public, On-chain)**: Solana Devnet (`devnet.helius-rpc.com`, core 4.4.1) + IPFS via Pinata. Metaplex Core asset with `PermanentFreezeDelegate` (frozen: true at mint), UpdateAuthority = Institution Admin wallet (`Bat5VTbjGqsThS5oERuXVi7d2JY2TBNomJD2ZciaztaQ`). Visual revocation renames to `[DIBATALKAN]` with revoked URI. No PII crosses to Tier 2 (only salted SHA-256 dataHash).
- **Measurement Harness**: Dedicated benchmark suite under `scripts/benchmark/` logging structured transaction receipts (JSONL) and summary metrics (CSV) into `experiments/<YYYY-MM-DD>/`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Benchmark Suite Setup | Scripts under `scripts/benchmark/` for mint, revoke, verify, negative, and TCs | M1 | SIJAGA-Bab4-Agent-Prompt §6 (P1.1) |
| 2 | Transaction Receipt Logger | Full transaction receipt logging (JSONL + CSV) per P1.2 specs | M1 | SIJAGA-Bab4-Agent-Prompt §6 (P1.2) |
| 3 | Retry Policy Implementation | Max 2 attempts for network errors at send level | M1 | SIJAGA-Bab4-Agent-Prompt §6 (P1.3) |
| 4 | Type & Build Quality | Zero type errors, `npm run build` and `npm run lint` passing | M1 | Prompt AC & R1 |
| 5 | Performance Experiments ($n=30$) | 30 trials each for mint, revoke, verify with timing and cost logging | M2 | SIJAGA-Bab4-Agent-Prompt §7 (P2.1) |
| 6 | Negative Tests (TC-02, 03, 04, 13) | Transfer, burn, thaw attempts rejected while frozen: true | M2 | SIJAGA-Bab4-Agent-Prompt §7 (P2.2) |
| 7 | Challenge Tests (TC-05, 06) | Valid Ed25519 challenge vs foreign, expired, replayed, tampered | M2 | SIJAGA-Bab4-Agent-Prompt §7 (P2.3) |
| 8 | Validity Tests (TC-07, 08, 09, 12, 14) | ISSUER mismatch, visual revocation, re-issuance, offline RPC, claim memo | M2 | SIJAGA-Bab4-Agent-Prompt §7 (P2.4) |
| 9 | Privacy Tests (TC-10, 11) | IPFS/on-chain PII absence & Tier 1 data+salt deletion reconstruction failure | M2 | SIJAGA-Bab4-Agent-Prompt §7 (P2.5) |
| 10 | Demonstration Trace (TC-01) | End-to-end trace with verifiable identifiers | M2 | SIJAGA-Bab4-Agent-Prompt §7 (P2.6) |
| 11 | Statistical Analysis & Thresholds | Median, p95, min, max, reliability vs proposal Tabel 3.5 | M3 | SIJAGA-Bab4-Agent-Prompt §8 (P3.1, P3.2) |
| 12 | Test Case Summary Table | Complete TC-01..TC-14 results table with evidence | M3 | SIJAGA-Bab4-Agent-Prompt §8 (P3.3) |
| 13 | Cost Projections | SOL, USD, IDR projection for 100, 1k, 10k graduates | M3 | SIJAGA-Bab4-Agent-Prompt §8 (P3.4) |
| 14 | Privacy Findings & Limitations | Evaluation, pseudonymity caveat, Devnet limits, DG-1/DG-2 status | M3 | SIJAGA-Bab4-Agent-Prompt §8 (P3.5) |
| 15 | Bab IV Documentation & State Tracking | Produce `bab4-results.md`, update `BAB4_PROGRESS.md` & `CHECKPOINT.json` | M3 | SIJAGA-Bab4-Agent-Prompt §8 (P3.6) |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Measurement Harness & Type Fixes | Phase 1 (P1.1 - P1.4), typecheck/lint/build fixes | Phase 0 (Done) | DONE |
| M2 | Test Cases & Performance Experiments | Phase 2 (P2.1 - P2.6) on Solana Devnet | M1 | PAUSED: PENDING_USER_SCHEDULE (4-time-window split) |
| M3 | Results Analysis & Documentation | Phase 3 (P3.1 - P3.6), `bab4-results.md`, progress/checkpoint updates | M2 | PLANNED |

## Interface Contracts
### scripts/benchmark/common.ts
- `createReceiptLogger(operation: string): ReceiptLogger`
- `executeWithRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<ExecutionResult<T>>`
- Data structure:
  - `TransactionReceipt`: operation, trialIndex, attempt, sendTimestamp, finalizedTimestamp, elapsedSeconds, slot, signature, feeLamports, rentDepositLamports, status, errorCode, rpcEndpoint, versions, cluster, wallClockTime.
- Output files: `experiments/<YYYY-MM-DD>/run-<operation>-<timestamp>.jsonl` and `summary-<operation>-<timestamp>.csv`.

### scripts/benchmark/ runners
- `bench-mint.ts`: $n=30$ runs, logs mint latency (total & on-chain), rent, fee.
- `bench-revoke.ts`: $n=30$ runs, logs visual revocation update latency and fee.
- `bench-verify.ts`: $n=30$ runs, logs verification latency (inspectCertificate + challenge verify).
- `bench-negative.ts`: Executes raw Metaplex Core instructions to verify rejection of transfer (owner/non-owner), burn, thaw on frozen assets.
- `test-tc.ts`: Executes TC-01 through TC-14, records evidence and pass/fail state.

## Code Layout
- `scripts/benchmark/`: Benchmark harness and runners (M1, M2)
- `experiments/<YYYY-MM-DD>/`: Raw receipts (.jsonl), CSV summaries, metadata JSON (M2)
- `bab4-results.md`: Thesis Bab IV results documentation (M3)
- `BAB4_PROGRESS.md`: Single source of truth progress tracker (M1, M2, M3)
- `experiments/CHECKPOINT.json`: Experiment checkpoint status (M1, M2, M3)

