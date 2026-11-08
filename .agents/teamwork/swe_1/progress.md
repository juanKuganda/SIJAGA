# Progress Tracking

Last visited: 2026-11-08T14:45:40Z

## Iteration Status
Current iteration: 3 / 32

## Open Issues Ledger
- [OPEN] (implementer_1 / reviewer_r1) Penandatanganan pesan langsung via ekstensi dompet Phantom/Solflare di browser (pengguna akan menguji sendiri di localhost sesuai panduan task R4).
- [OPEN] (implementer_1 / reviewer_r1) Remote `git push origin feat/bab4-experiments`: Lingkungan CLI sandboxed meminta kredensial / 403 policy error; commit lokal 5d3ee5c dan d72f323 telah dibuat di branch feat/bab4-experiments.
- [OPEN] (implementer_1) Verifikasi dengan dompet yang bukan pemilik ijazah: Hubungkan wallet yang alamatnya berbeda dari cert.walletAddress untuk memastikan API mengembalikan error OWNER_MISMATCH dan UI menampilkan "Dompet ini bukan pemilik ijazah".
- [OPEN] (implementer_1) Uji pembatalan (user reject): Klik "Hubungkan Dompet & Tanda Tangani", lalu tolak penandatanganan pada prompt pop-up Phantom untuk memverifikasi penanganan status USER_REJECTED.
- [OPEN] (implementer_1) Uji kedaluwarsa challenge: Biarkan tantangan terbuka selama >5 menit lalu klik "Tanda Tangani" atau uji tombol "Minta Challenge Baru" untuk memastikan nonce baru berhasil diterbitkan.

## Milestones & Refinement Rounds
- [x] Round 0: teamwork_implementer (Conv ID: 7c4a9967-56a0-4881-becf-ac6249d45368) - Completed
- [x] Round 1: teamwork_reviewer (Review 1, Conv ID: 0cfb06c6-d745-4ae7-875c-0c0835f0902d) - Completed
- [ ] Round 2: teamwork_reviewer (Review 2, Conv ID: dd344608-b8d6-418b-9b78-2f8bac443c9b) - Running (testing signature extraction)
- [ ] Round 3: teamwork_reviewer (Review 3)
- [ ] Independent Verification (Build, Lint, Tests)
- [ ] Audit: teamwork_victory_auditor
