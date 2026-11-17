## 2026-11-17T16:29:40Z
You are teamwork_challenger_1 (Role: TC-12 Empirical Verifier).
Your working directory is: /home/junnnnnnnn/Code/sijaga/.agents/teamwork/teamwork_challenger_1

Read the authoritative documents:
- /home/junnnnnnnn/Code/sijaga/.agents/teamwork/ORIGINAL_REQUEST.md
- /home/junnnnnnnn/Code/sijaga/.agents/teamwork/orchestrator_1/PROJECT.md
- /home/junnnnnnnn/Code/sijaga/.agents/teamwork/teamwork_worker_1/handoff.md
- /home/junnnnnnnn/Code/sijaga/.agents/teamwork/2026-11-17-tc12-challenge-revoked.md

Your focus:
Empirical stress-testing of TUGAS 1 (TC-12 Outage Handling).

Perform actual code-level / execution tests:
1. Simulate dead RPC:
   Run an inline node/ts-node test or harness where `SOLANA_RPC_URL="http://127.0.0.1:19999"` (or simulate unreachable RPC) against `POST /api/verify/tingkat-1` or `inspectCertificate`.
   Verify that:
   - Status is HTTP 503 (or `ok: false, reason: "RPC"`).
   - Response body JSON contains `"verdict": "TIDAK DAPAT DIPASTIKAN"`.
   - `level` is `"TINGKAT 1"`.
   - All 7 checks exist and `tokenExists.status` is `"TIDAK DAPAT DIPASTIKAN"`.
2. Regression tests on normal inputs:
   - Non-asset wallet address (`DtUVhcmkVnj6nfn8DJWnRiU3RqfSz2APBbGXzFdgxkpx`): Must return HTTP 400 (`reason: "NOT_ASSET"`).
   - Invalid Base58 string: Must return HTTP 400.
   - Non-existent mint address (`11111111111111111111111111111111`): Must return HTTP 404 (`reason: "NOT_FOUND"`).
   - Live Trace asset (`FDQKnrLVQdZqP4efoNarLb87gmZj529kebFPz8SVMQCc`): Must return HTTP 200 (`verdict: "DAPAT DIPERIKSA"`).
   - Foreign issuer asset (`115L61TA4BnrtxVZzVhZhdRw6VeuKfBWQEKVbATsb6d`): Must return HTTP 200 (`verdict: "TIDAK DAPAT DIPERIKSA"`).
3. Verify frontend parsing logic in `app/verify-onchain/page.tsx` to ensure `verdictKind === "undetermined"` correctly displays amber Bento without throwing uncaught exceptions.

State your verdict clearly as either APPROVE or REQUEST_CHANGES.
Write your empirical test results and evidence to `/home/junnnnnnnn/Code/sijaga/.agents/teamwork/teamwork_challenger_1/handoff.md` and send a message back with your conclusion and verdict.
