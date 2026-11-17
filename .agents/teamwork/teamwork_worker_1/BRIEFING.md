# BRIEFING — 2026-11-17T16:28:00Z

## Mission
Implement robust outage handling (TC-12) for Tingkat 1 on-chain verification and revoked certificate ownership challenge protection.

## 🔒 My Identity
- Archetype: teamwork_worker_1
- Roles: implementer, qa, specialist
- Working directory: /home/junnnnnnnn/Code/sijaga/.agents/teamwork/teamwork_worker_1
- Original parent: b129e651-00c4-4cf6-b087-5c8baeee3744
- Milestone: TC-12 RPC/IPFS Outage Handling and Challenge on REVOKED Certificate

## 🔒 Key Constraints
- Branch `feat/bab4-experiments` only. DO NOT commit or push to git.
- DO NOT add new dependencies.
- Cryptographic logic (nonce, tweetnacl Ed25519, 5-minute expiry, anti-replay, rate limit) must remain 100% intact.
- Verify changes using `npx tsc --noEmit` and `npx eslint` on modified files.
- Verify production build / type safety with `npm run build` if possible.
- Exclusive write ownership:
  1. `app/api/verify/tingkat-1/route.ts`
  2. `app/verify-onchain/page.tsx`
  3. `lib/challenge.ts`
  4. `app/api/verify/challenge/route.ts`
  5. `app/ijazah/[id]/page.tsx`
- Integrity mandate: No hardcoding test results, no dummy implementations.

## Current Parent
- Conversation ID: b129e651-00c4-4cf6-b087-5c8baeee3744
- Updated: 2026-11-17T16:28:00Z

## Task Summary
- **What to build**:
  - TUGAS 1 (TC-12 Outage Handling): `app/api/verify/tingkat-1/route.ts` structured responses for RPC (503) & METADATA (502) outages with `verdict: "TIDAK DAPAT DIPASTIKAN"`, and `app/verify-onchain/page.tsx` Bento styling, amber tokens, fallback for image/owner/challenge button.
  - TUGAS 2 (Challenge on REVOKED): `lib/challenge.ts`, `app/api/verify/challenge/route.ts`, and `app/ijazah/[id]/page.tsx` preventing nonce generation and challenge verification for revoked certificates with `"CERT_REVOKED"`, while keeping backward compatibility.
- **Success criteria**:
  - `npx tsc --noEmit` clean (PASSED, 0 error)
  - `npm run build` passes (PASSED, 44 routes generated)
  - All existing tests & validation requirements satisfied (TC-05, TC-06, TC-12 simulation PASSED)
- **Interface contracts**: PROJECT.md, ORIGINAL_REQUEST.md
- **Code layout**: Next.js App Router

## Change Tracker
- **Files modified**:
  - `app/api/verify/tingkat-1/route.ts`: Structured error response for RPC (503) & METADATA (502) with `verdict: "TIDAK DAPAT DIPASTIKAN"`, checks, and warning.
  - `app/verify-onchain/page.tsx`: Amber/orange Bento card rendering for `undetermined`, status token `"TIDAK DIKETAHUI"`, safe fallbacks for missing owner/uri, disabled challenge.
  - `lib/challenge.ts`: Added `"CERT_REVOKED"` to error union, optional `certificateId?: string` parameter to `verifyVerificationChallenge`.
  - `app/api/verify/challenge/route.ts`: Rejected Mode B nonce and Mode A verify when `certificateId` (or fallback owner query) indicates `REVOKED` cert.
  - `app/ijazah/[id]/page.tsx`: Passed `certificateId`, early guard in `handleVerifyOwnership`, disabled button with "Ijazah Telah Dicabut", red badge, warning banner, and `CERT_REVOKED` error display.
- **Build status**: PASS (`npm run build` exit code 0, `npx tsc --noEmit` exit code 0)
- **Pending issues**: None

## Quality Status
- **Build/test result**: PASS (Build: 0 errors; TypeScript: 0 errors; ESLint: 0 errors/warnings)
- **Lint status**: 0 violations
- **Tests added/modified**: Verified against `scripts/test-challenge.ts` and automated simulation scripts for dead RPC and revoked cert.

## Loaded Skills
- **Source**: /home/junnnnnnnn/Code/sijaga/.agents/skills/blockchain-developer/SKILL.md
  - **Core methodology**: Solana Web3.js / Metaplex UMI architecture, RPC resilience, Soulbound NFT lifecycle
- **Source**: /home/junnnnnnnn/Code/sijaga/.agents/skills/database-architect/SKILL.md
  - **Core methodology**: Prisma schema patterns, status query checks, data integrity

## Key Decisions Made
- Chose Option (a) for TC-12: HTTP 503 (RPC down) and HTTP 502 (IPFS down) with structured JSON payload (`verdict: "TIDAK DAPAT DIPASTIKAN"`), with frontend client handling it gracefully into `setResult` rather than throwing to raw error box. This preserves HTTP semantic compliance (RFC 9110), protects against CDN/Edge cache poisoning, and ensures observabilitas APM metrics reflect upstream outages while delivering user-friendly Bento UI.
- Implemented Defense-in-Depth for Revoked Challenge across UI (`page.tsx`), API route (`route.ts`), and core library (`challenge.ts`) with optional `certificateId` to preserve 100% backward compatibility with existing tests and scripts.

## Artifact Index
- /home/junnnnnnnn/Code/sijaga/.agents/teamwork/teamwork_worker_1/DISPATCH.md
- /home/junnnnnnnn/Code/sijaga/.agents/teamwork/teamwork_worker_1/BRIEFING.md
- /home/junnnnnnnn/Code/sijaga/.agents/teamwork/teamwork_worker_1/progress.md
- /home/junnnnnnnn/Code/sijaga/.agents/teamwork/teamwork_worker_1/handoff.md
- /home/junnnnnnnn/Code/sijaga/.agents/teamwork/2026-11-17-tc12-challenge-revoked.md
