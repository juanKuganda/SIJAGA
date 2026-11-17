# BRIEFING — 2026-11-15T11:06:00Z

## Mission
Conduct a read-only, evidence-based code and architectural assessment for Area 1 (Rencana Eksekusi Uji Server Institusi Mati: TC-15, F1–F3) of Bab 4 testing design.

## 🔒 My Identity
- Archetype: teamwork_explorer
- Roles: explorer
- Working directory: /home/junnnnnnnn/Code/sijaga/.agents/teamwork/explorer_area1/
- Original parent: 5360fff4-b625-4255-94e4-c4d3a7c9a278
- Milestone: Bab 4 Testing Architecture Evaluation - Area 1 (TC-15, F1-F3 Server Down / Independent Verification)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Read-only review: DO NOT run curl, dev servers, background processes, or any network/RPC requests.
- DO NOT modify any codebase files, thesis drafts, or existing reports.
- DO NOT re-run the n=30 benchmark or recommend discarding trial data.
- DO NOT touch branch main, git push, or merge.
- DO NOT perform manual tests.
- Every single assertion of finding, gap, risk, or contradiction MUST cite specific file paths and line numbers (`file_path:line`).

## Current Parent
- Conversation ID: 5360fff4-b625-4255-94e4-c4d3a7c9a278
- Updated: 2026-11-15T10:50:31Z

## Investigation State
- **Explored paths**: `Brief-Bab4-untuk-Gemini-2026-11-15.md`, `BAB4_PROGRESS.md`, `experiments/CHECKPOINT.json`, `app/api/verify/route.ts`, `app/api/certificate/[id]/route.ts`, `app/api/verify/challenge/route.ts`, `app/api/actions/verify/route.ts`, `app/ijazah/[id]/page.tsx`, `lib/onchain.ts`, `lib/challenge.ts`, `lib/crypto.ts`, `lib/metaplex.ts`, `lib/pinata.ts`, `components/certificate-ui.tsx`, `.agents/teamwork/*`.
- **Key findings**:
  1. Portal is 100% DB-first & fail-closed (`app/api/verify/route.ts:50, 333-339`), returns 500 when DB is unreachable.
  2. F1 is 100% feasible via public RPC/IPFS without DB or laptop.
  3. F2 should be SKIPPED per brief §5:127 & Decision 13 because DB is remote Neon Serverless Postgres, not local Docker.
  4. Parameter contradiction in Decision 12 & Brief §6 B30: `/ijazah/[id]` expects CUID record ID (`cmw7pykyz0009ijxgm0zy8cg0`), NOT mint address (`FDQKnrLV...`).
  5. Challenge UI on portal requires DB (`VerificationNonce`); offline stateless challenge exists only via standalone script.
  6. Visual rendering survives server downtime ONLY as raw PNG on IPFS; portal UI cannot render offline.
  7. `lib/verification.ts` does not exist; on-chain inspection is in `lib/onchain.ts:155`.
- **Unexplored areas**: None for Area 1. Investigation complete.

## Key Decisions Made
- Completed read-only investigation with comprehensive evidence chains and citations (`file_path:line`).
- Written detailed handoff report to `handoff.md`.

## Artifact Index
- DISPATCH.md — Received dispatch instructions
- BRIEFING.md — Situational awareness and state
- progress.md — Liveness and progress heartbeat
- handoff.md — Final comprehensive report
