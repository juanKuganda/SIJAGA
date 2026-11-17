# BRIEFING — 2026-11-15T10:58:00Z

## Mission
Read-only code and architectural assessment for Area 2: Rencana Implementasi Jalur Verifikasi Tingkat-1 di Portal (prompt iii) of Bab 4 testing design.

## 🔒 My Identity
- Archetype: teamwork_explorer
- Roles: explorer, synthesis, read-only code/architecture investigator
- Working directory: /home/junnnnnnnn/Code/sijaga/.agents/teamwork/explorer_area2/
- Original parent: 5360fff4-b625-4255-94e4-c4d3a7c9a278
- Milestone: Bab 4 Testing Design Review - Area 2 (Prompt iii Portal Tier-1 Verification)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- DO NOT run curl, dev servers, background processes, or any network/RPC requests
- DO NOT modify any codebase files, thesis drafts, or existing reports
- DO NOT re-run the n=30 benchmark or recommend discarding trial data
- DO NOT touch branch main, git push, or merge
- DO NOT perform manual tests
- Every single assertion of finding, gap, risk, or contradiction MUST cite specific file paths and line numbers (`file_path:line`)

## Current Parent
- Conversation ID: 5360fff4-b625-4255-94e4-c4d3a7c9a278
- Updated: 2026-11-15T10:58:00Z

## Investigation State
- **Explored paths**:
  - `Brief-Bab4-untuk-Gemini-2026-11-15.md` (§4, §5, §6, §7, §8, §9, Lampiran B: Prompt iii)
  - `app/ijazah/[id]/page.tsx` (lines 1-1002)
  - `app/api/certificate/[id]/route.ts` (lines 1-87)
  - `app/api/verify/route.ts` (lines 1-340)
  - `app/api/verify/challenge/route.ts` (lines 1-118)
  - `app/api/actions/verify/route.ts` (lines 1-212)
  - `app/api/admin/delete-pii/route.ts` (lines 1-140)
  - `app/page.tsx` (lines 1-1124)
  - `lib/onchain.ts` (lines 1-238)
  - `lib/crypto.ts` (lines 1-46)
  - `lib/challenge.ts` (lines 1-223)
  - `lib/metaplex.ts` (lines 1-385)
  - `components/certificate-ui.tsx` (lines 1-120)
  - `prisma/schema.prisma` (Certificate, VerificationNonce, User, Wallet models)
  - `scripts/benchmark/test-tc.ts` (lines 720-760, TC-11, TC-12)
  - Prior teamwork handoffs (`auditor_1`, `implementer_1`, `swe_1`, `teamwork_auditor_p2_6_1`, `BAB4_PROGRESS.md`, `CHECKPOINT.json`)
- **Key findings**:
  1. `lib/verification.ts` cited in dispatch DOES NOT EXIST in the codebase; actual logic is in `lib/onchain.ts`, `lib/crypto.ts`, `lib/challenge.ts`, `app/api/verify/route.ts`.
  2. Hash formula (`lib/crypto.ts:16`) is strictly 3 attributes + salt: `nama.trim()|nim.toUpperCase()|prodi|salt`. "Nomor Ijazah" or "Tahun Lulus" are NOT in the hash. Salt is 16 bytes hex (128-bit) stored ONLY in `Certificate.dataSalt` in Tier 1 DB.
  3. Under UU PDP No. 27/2022, right to erasure sets `dataSalt = null` (`app/api/admin/delete-pii/route.ts:122`). Without salt, hash recalculation is mathematically impossible, establishing a strict barrier between Tingkat 1 (token validity) and Tingkat 2 (nominative identity).
  4. Severe architectural conflict in Prompt iii: Prompt iii intends to modify `app/ijazah/[id]/page.tsx:630-750`. But `app/ijazah/[id]/page.tsx` is the certificate preview page requiring `GET /api/certificate/[id]` where `[id]` is a Prisma CUID (`app/api/certificate/[id]/route.ts:21`). If Tier 1 DB is down (TC-15 condition), `/api/certificate/[id]` throws a 500 error and renders "Ijazah Tidak Ditemukan" (`app/ijazah/[id]/page.tsx:478-500`), completely bypassing lines 630-1002!
  5. If someone enters a Solana mint address in `/ijazah/[id]`, it returns 404 because `where: { id: mintAddress }` searches by CUID, not `nftAddress`.
  6. Challenge conflict: `app/ijazah/[id]/page.tsx:630-997` already contains a recently audited and committed stateful challenge flow via `/api/verify/challenge` (DB single-use nonce). Replacing it with a local stateless challenge removes global anti-replay protection and conflicts with the existing expectedOwner logic (`cert.walletAddress`).
  7. `inspectCertificate` (`lib/onchain.ts:188-230`) currently only extracts `owner`, `name`, `uri`, `frozen`, `dataHash`, `updateAuthority`. It does NOT extract `Program Studi` or `Tahun Lulus` from metadata JSON attributes, which `<CertificateUI>` requires.
- **Unexplored areas**: None for Area 2. Ready for final handoff synthesis.

## Key Decisions Made
- All evidence chains compiled with exact file paths and line numbers.
- Ready to write 5-component handoff report.

## Artifact Index
- /home/junnnnnnnn/Code/sijaga/.agents/teamwork/explorer_area2/DISPATCH.md
- /home/junnnnnnnn/Code/sijaga/.agents/teamwork/explorer_area2/BRIEFING.md
- /home/junnnnnnnn/Code/sijaga/.agents/teamwork/explorer_area2/progress.md
- /home/junnnnnnnn/Code/sijaga/.agents/teamwork/explorer_area2/handoff.md
