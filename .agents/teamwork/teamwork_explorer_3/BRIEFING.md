# BRIEFING — 2026-11-17T15:56:15Z

## Mission
Investigate and design fix for Tugas 2: Preventing "Kepemilikan Terverifikasi" challenge success on REVOKED certificates across API and UI.

## 🔒 My Identity
- Archetype: explorer
- Roles: Revoked Challenge Explorer
- Working directory: /home/junnnnnnnn/Code/sijaga/.agents/teamwork/teamwork_explorer_3
- Original parent: b129e651-00c4-4cf6-b087-5c8baeee3744
- Milestone: Milestone-TC12-Revoked-Challenge-Analysis

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Do NOT modify application source code
- Files for content delivery, Messages for coordination
- Write only to own directory: /home/junnnnnnnn/Code/sijaga/.agents/teamwork/teamwork_explorer_3
- Cryptographic challenge logic (nonce, Ed25519 signature verification, 5-minute expiry, single-use, rate limit) must remain secure and unchanged in its core cryptographic behavior.

## Current Parent
- Conversation ID: b129e651-00c4-4cf6-b087-5c8baeee3744
- Updated: 2026-11-17T15:56:15Z

## Investigation State
- **Explored paths**:
  - `app/api/verify/challenge/route.ts` (Mode A verification & Mode B challenge issuance)
  - `lib/challenge.ts` (`createVerificationChallenge`, `verifyVerificationChallenge`, types, message template)
  - `app/ijazah/[id]/page.tsx` (`isRevoked`, challenge lifecycle, button states, UI banners)
  - `app/api/verify/route.ts` & `app/api/certificate/[id]/route.ts` & `app/api/nft/revoke/route.ts`
  - `prisma/schema.prisma` (`Certificate`, `CertStatus`, `VerificationNonce`, `User`)
  - `scripts/test-challenge.ts` & `scripts/benchmark/test-tc.ts` (TC-05, TC-06, TC-08 test suites)
- **Key findings**:
  1. `app/ijazah/[id]/page.tsx` loads `cert.status` and computes `isRevoked`, but currently only uses it for the top red banner and `<CertificateUI isRevoked={isRevoked} />`. The challenge button, modal/section, and verification logic completely ignore `isRevoked`.
  2. The challenge endpoint `POST /api/verify/challenge` receives neither `certificateId` nor `status`. It verifies the Ed25519 wallet signature against `expectedOwner` and returns `{ verified: true }`, leading to a false positive "Kepemilikan Terverifikasi" on revoked credentials.
  3. The fix requires defense-in-depth:
     - `app/api/verify/challenge/route.ts` must accept `certificateId` and enforce that `cert.status !== "REVOKED"` in both Mode B and Mode A, returning HTTP 400 with `{ verified: false, error: "CERT_REVOKED", message: "..." }`.
     - `lib/challenge.ts` should optionally accept `certificateId?: string` so that existing tests (TC-05/TC-06 in `scripts/test-challenge.ts` and `scripts/benchmark/test-tc.ts`) without `certificateId` continue to pass without regression.
     - `app/ijazah/[id]/page.tsx` must pass `certificateId: resolvedParams.id`, disable the challenge button or show "Ijazah Telah Dicabut", display a prominent revocation warning in the challenge section, show status badge "Ijazah Dicabut", and prevent setting `challengeStatus("sukses")`.
- **Unexplored areas**: None. All questions from dispatch answered.

## Key Decisions Made
- Confirmed database-backed check in `POST /api/verify/challenge` is superior to on-chain RPC query: instant (<5ms), immune to RPC rate limits/outages, and adheres strictly to the rule "Hemat panggilan RPC devnet".
- Retained 100% backward compatibility for cryptographic tests by making `certificateId?: string` optional in `lib/challenge.ts`.

## Artifact Index
- `/home/junnnnnnnn/Code/sijaga/.agents/teamwork/teamwork_explorer_3/DISPATCH.md` — Incoming dispatch log
- `/home/junnnnnnnn/Code/sijaga/.agents/teamwork/teamwork_explorer_3/BRIEFING.md` — Agent state and situational awareness
- `/home/junnnnnnnn/Code/sijaga/.agents/teamwork/teamwork_explorer_3/progress.md` — Heartbeat and activity log
- `/home/junnnnnnnn/Code/sijaga/.agents/teamwork/teamwork_explorer_3/handoff.md` — Final investigation report
