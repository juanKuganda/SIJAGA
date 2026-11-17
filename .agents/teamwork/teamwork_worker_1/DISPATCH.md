## 2026-11-17T15:58:10Z
You are teamwork_worker_1 (Role: Core Implementation Worker).
Your working directory is: /home/junnnnnnnn/Code/sijaga/.agents/teamwork/teamwork_worker_1

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Consult the domain skills:
- /home/junnnnnnnn/Code/sijaga/.agents/skills/blockchain-developer/SKILL.md
- /home/junnnnnnnn/Code/sijaga/.agents/skills/database-architect/SKILL.md

Read the authoritative request and project plan:
- /home/junnnnnnnn/Code/sijaga/.agents/teamwork/ORIGINAL_REQUEST.md
- /home/junnnnnnnn/Code/sijaga/.agents/teamwork/orchestrator_1/PROJECT.md
And the thorough analysis from the three explorers:
- /home/junnnnnnnn/Code/sijaga/.agents/teamwork/teamwork_explorer_1/handoff.md
- /home/junnnnnnnn/Code/sijaga/.agents/teamwork/teamwork_explorer_2/handoff.md
- /home/junnnnnnnn/Code/sijaga/.agents/teamwork/teamwork_explorer_3/handoff.md

Your exclusive write ownership:
1. `app/api/verify/tingkat-1/route.ts`
2. `app/verify-onchain/page.tsx`
3. `lib/challenge.ts`
4. `app/api/verify/challenge/route.ts`
5. `app/ijazah/[id]/page.tsx`

Tasks to implement:
TUGAS 1 — TC-12 (RPC/IPFS Outage Handling):
- In `app/api/verify/tingkat-1/route.ts`:
  When `result.reason === "RPC"` or `result.reason === "METADATA"`, return structured response (HTTP 503 for RPC, 502 for METADATA) with `success: false`, `level: "TINGKAT 1"`, `verdict: "TIDAK DAPAT DIPASTIKAN"`, `reason: result.reason`, `error`, `timings`, full `checks` object (all checks evaluated with proper status and explanatory details), and `warning`.
  Ensure `NOT_FOUND` (404), `NOT_ASSET` (400), and valid/revoked logic remain 100% intact!
- In `app/verify-onchain/page.tsx`:
  Update `InspectionResult` type to make fields nullable/optional where appropriate.
  Handle response gracefully if `data && data.verdict === "TIDAK DAPAT DIPASTIKAN"` so it sets result rather than throwing to generic raw red error box.
  Add `isUndetermined` / `verdictKind === "undetermined"` with amber/orange Bento styling (`AlertTriangle`, status token `"TIDAK DIKETAHUI"`, proper `bannerTitle`).
  Add safe fallbacks for owner, image, and challenge button when data is unavailable.

TUGAS 2 — Challenge on REVOKED Certificate:
- In `lib/challenge.ts`:
  Add `"CERT_REVOKED"` to `ChallengeVerificationResult` error union.
  Add optional `certificateId?: string` parameter to `verifyVerificationChallenge`.
  If `certificateId` is provided and the certificate status in Prisma is `"REVOKED"`, return `{ success: false, error: "CERT_REVOKED", message: "Ijazah ini telah dicabut oleh Universitas Tadulako. Kepemilikan tidak dapat diverifikasi untuk ijazah yang telah dicabut." }`. Keep this parameter optional so existing tests (TC-05, TC-06) remain 100% backward-compatible.
- In `app/api/verify/challenge/route.ts`:
  In Mode B (nonce generation), accept optional `certificateId`. If provided and the certificate in Prisma has `status === "REVOKED"`, return HTTP 400 with `{ success: false, error: "CERT_REVOKED", message: "..." }`.
  In Mode A (signature verification), accept `certificateId` and pass it to `verifyVerificationChallenge`. If `!certificateId && expectedOwner`, perform fallback query to check if owner's certificate is revoked. If revoked, return HTTP 400 with `{ verified: false, error: "CERT_REVOKED", message: "..." }`.
- In `app/ijazah/[id]/page.tsx`:
  Pass `certificateId: resolvedParams.id` in both challenge request and verify calls.
  Add guard in `handleVerifyOwnership`: if `isRevoked`, set status "gagal" with `errorCode = "CERT_REVOKED"`.
  Ensure `challengeStatus === "sukses"` is NEVER entered if `isRevoked` is true.
  Update status badge in "Buktikan Kepemilikan" section to show red "Ijazah Dicabut" when `isRevoked`.
  Add warning banner inside the Buktikan Kepemilikan section explaining ownership proof is disabled for revoked diploma.
  Disable the challenge button when `isRevoked`, with label "Ijazah Telah Dicabut".
  Add error message display for `errorCode === "CERT_REVOKED"`.

Constraints:
- Branch `feat/bab4-experiments` only. DO NOT commit or push to git.
- DO NOT add new dependencies.
- Cryptographic logic (nonce, tweetnacl Ed25519, 5-minute expiry, anti-replay, rate limit) must remain 100% intact.
- Verify changes using `npx tsc --noEmit` and `npx eslint` on modified files.
- Verify production build / type safety with `npm run build` if possible.

Write your complete implementation report to `/home/junnnnnnnn/Code/sijaga/.agents/teamwork/teamwork_worker_1/handoff.md`.
Report back when finished with your verification results.
