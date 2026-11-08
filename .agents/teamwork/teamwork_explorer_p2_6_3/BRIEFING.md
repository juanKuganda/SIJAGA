# BRIEFING — 2026-11-08T10:42:00Z

## Mission
Investigate On-Chain Hash Retrieval, Assertion, Verification Route, and Documentation Requirements for R4 & R5 of TRACE P2.6.

## 🔒 My Identity
- Archetype: explorer
- Roles: read-only investigation, synthesis
- Working directory: /home/junnnnnnnn/Code/sijaga/.agents/teamwork/teamwork_explorer_p2_6_3/
- Original parent: 4e066bb9-5502-4a56-99b0-69a20ff48b56
- Milestone: P2.6 End-to-End Pipeline Verification Trace

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Do NOT modify source code files
- Preserve all existing n=30 experiment data in `experiments/2026-11-07/` and `experiments/2026-11-08/`
- Do not re-run benchmarks or start Phase 3
- Write only to own directory: `/home/junnnnnnnn/Code/sijaga/.agents/teamwork/teamwork_explorer_p2_6_3/`

## Current Parent
- Conversation ID: 4e066bb9-5502-4a56-99b0-69a20ff48b56
- Updated: 2026-11-08T10:42:00Z

## Investigation State
- **Explored paths**:
  - `lib/onchain.ts` (`inspectCertificate`, `extractDataHash`, `fetchMetadataJson`, `isFrozen`)
  - `lib/metaplex.ts` (`createUmiInstance`, `fetchAsset`, `mintSoulboundNFT`)
  - `lib/pinata.ts` (`generateCertificateMetadata`, IPFS attributes)
  - `lib/crypto.ts` (`generateDataHash`, `verifyDataHash`)
  - `app/api/verify/route.ts` (3-layer verification, query param logic, response format)
  - `lib/validation.ts` (`verifySchema`)
  - `app/page.tsx` (frontend search & verify integration)
  - `prisma/schema.prisma` (`User`, `Certificate`, `Wallet` models)
  - `BAB4_PROGRESS.md` & `experiments/CHECKPOINT.json` (task P2.6 location, tracking schema)
  - Git repository state (branch `feat/bab4-experiments`, remote origin, boundaries)
- **Key findings**:
  - `inspectCertificate(mintAddress)` in `lib/onchain.ts` handles Metaplex Core `fetchAsset` + IPFS metadata retrieval (with 15s timeout) and parses `attributes[trait_type='Data Hash'].value`.
  - In Metaplex Core, `dataHash` is NOT in the Solana account bytes directly, but in IPFS JSON attributes.
  - `GET /api/verify` expects `?query=<nim>` or `?query=<walletAddress>` (or `?wallet=<walletAddress>`). It does NOT support `?asset=<mintAddress>`. Passing mint address returns 404 because `query` is matched against `walletAddress`.
  - Tier 1 hash is computed as `sha256(name|NIM|prodi|salt)` and stored in `prisma.certificate.dataHash`. Both Tier 1 and on-chain hashes must be `sha256:<64-hex-chars>` and match 1:1.
  - `BAB4_PROGRESS.md` has P2.6 at line 83 under Phase 2 checklist. Complete trace details must be added there.
  - Boundaries: `experiments/2026-11-07/` and `experiments/2026-11-08/` are frozen and must not be touched. Branch is `feat/bab4-experiments`.
- **Unexplored areas**: None for R4/R5 scope.

## Key Decisions Made
- Fully documented all 5 areas for R4 and R5 to guide the worker implementation.
- Ready to author `handoff.md`.

## Artifact Index
- /home/junnnnnnnn/Code/sijaga/.agents/teamwork/teamwork_explorer_p2_6_3/DISPATCH.md — Incoming mission dispatch
- /home/junnnnnnnn/Code/sijaga/.agents/teamwork/teamwork_explorer_p2_6_3/progress.md — Liveness heartbeat
- /home/junnnnnnnn/Code/sijaga/.agents/teamwork/teamwork_explorer_p2_6_3/BRIEFING.md — Working memory and context index
- /home/junnnnnnnn/Code/sijaga/.agents/teamwork/teamwork_explorer_p2_6_3/handoff.md — Final investigation deliverable
