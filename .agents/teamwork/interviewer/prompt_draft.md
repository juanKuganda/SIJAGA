Execute TRACE P2.6 as an end-to-end evaluation trace of certificate issuance and verification through the application HTTP endpoints (not benchmark scripts) for Bab IV thesis experiment validation. Document all evidence and hash comparisons in `BAB4_PROGRESS.md`.

Working directory: /home/junnnnnnnn/Code/sijaga
Integrity mode: demo
The team must NOT: use benchmark scripts or test harnesses (like bench-mint.ts) instead of actual application HTTP endpoints; modify existing n=30 experiment data, re-run benchmarks, or begin Phase 3

## Requirements

### R1. Environment and Server Setup
Run and manage a local Next.js dev server instance during the trace. Use existing credentials or admin session from the local environment/seed for administrative actions; if an administrative action cannot be performed via public HTTP, execute and document the direct admin endpoint/handler as-is.

### R2. Fictitious Tier 1 User Registration and Verification via HTTP
Create one fictitious Tier 1 user through application HTTP endpoints (register → consent → register wallet → admin approval to VERIFIED status). Use clearly fictitious data (e.g., name "Trace Test", fictitious NIM). Record the user ID. Record the hash stored in the Tier 1 user row (sha256 of name|NIM|prodi|salt) exactly as-is.

### R3. Certificate Issuance via Application Endpoint
Issue the certificate for the fictitious user using the application's actual issuance endpoint (as used by the admin `/terbitkan` page), not `bench-mint.ts`. Record the resulting mint address and transaction signature.

### R4. On-chain Data Hash Assertion and Verification
Read back the on-chain asset data hash (via `getAsset`/`inspectCertificate`) and compare it directly with the Tier 1 hash, asserting that both are identical. Record both hash values and the assertion result. Verify the asset through the actual application verification route (`GET /api/verify` or verification flow) and record the verification outcome.

### R5. Trace Documentation and Version Control
Record the complete trace in `BAB4_PROGRESS.md`: user ID, mint address, transaction signature, both hash values, assertion result, and verification result. Document any non-HTTP step explicitly. Commit and push the changes to branch `feat/bab4-experiments`, then STOP waiting without touching existing n=30 experiment data, re-running benchmarks, or starting Phase 3.

## Acceptance Criteria

### Execution & Verification
- [ ] Local Next.js dev server instance is started and accessible for executing HTTP requests.
- [ ] Fictitious Tier 1 user is registered, consented, wallet registered, and approved to VERIFIED status via application HTTP endpoints, with user ID recorded.
- [ ] Tier 1 hash (sha256 of name|NIM|prodi|salt) is recorded exactly as stored.
- [ ] Certificate is minted via the actual application issuance endpoint (admin `/terbitkan` route, not `bench-mint.ts`), with mint address and transaction signature recorded.
- [ ] On-chain data hash fetched via `getAsset`/`inspectCertificate` is asserted equal to the Tier 1 hash, with both values and assertion result recorded.
- [ ] Asset is verified via the application verification route (`GET /api/verify`), with verification result recorded.

### Documentation & Deliverables
- [ ] `BAB4_PROGRESS.md` contains the complete trace (user ID, mint address, tx signature, both hashes, assertion result, verification result, and any non-HTTP step explicitly noted).
- [ ] Changes are committed and pushed to branch `feat/bab4-experiments`.
- [ ] Existing n=30 dataset is untouched, no benchmarks are re-run, and Phase 3 is not started.