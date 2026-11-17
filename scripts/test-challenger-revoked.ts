import { Keypair } from "@solana/web3.js";
import nacl from "tweetnacl";
import bs58 from "bs58";

// ==========================================
// EMPIRICAL TEST SUITE: REVOKED CHALLENGE DEFENSE
// Role: teamwork_challenger_2 (Empirical Verifier)
// ==========================================

interface CertRecord {
  id: string;
  userId: string;
  status: "NOT_ISSUED" | "ISSUING" | "MINTED" | "CLAIMED" | "REVOKED";
  revokeReason: string | null;
}

const mockCerts = new Map<string, CertRecord>([
  [
    "cert-revoked-001",
    {
      id: "cert-revoked-001",
      userId: "user-revoked-001",
      status: "REVOKED",
      revokeReason: "Indikasi pemalsuan dokumen akademik oleh universitas",
    },
  ],
  [
    "cert-minted-002",
    {
      id: "cert-minted-002",
      userId: "user-minted-002",
      status: "MINTED",
      revokeReason: null,
    },
  ],
  [
    "cert-claimed-003",
    {
      id: "cert-claimed-003",
      userId: "user-claimed-003",
      status: "CLAIMED",
      revokeReason: null,
    },
  ],
]);

const mockUsers = new Map<string, any>();

interface NonceRecord {
  id: string;
  nonce: string;
  walletAddress: string;
  message: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

const mockNonces = new Map<string, NonceRecord>();

// Setup Mock Prisma before importing app modules
const mockPrisma = {
  certificate: {
    findUnique: async ({ where }: { where: { id: string } }) => {
      const found = mockCerts.get(where.id);
      return found ? { ...found } : null;
    },
  },
  user: {
    findFirst: async ({ where }: { where: any }) => {
      const targetWallet = where?.wallet?.walletAddress;
      if (targetWallet && mockUsers.has(targetWallet)) {
        return mockUsers.get(targetWallet);
      }
      return null;
    },
  },
  verificationNonce: {
    create: async ({ data }: { data: any }) => {
      const record: NonceRecord = {
        id: `nonce-id-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        usedAt: null,
        createdAt: new Date(),
        ...data,
      };
      mockNonces.set(data.nonce, record);
      return record;
    },
    findUnique: async ({ where }: { where: { nonce: string } }) => {
      const found = mockNonces.get(where.nonce);
      return found ? { ...found } : null;
    },
    update: async ({ where, data }: { where: any; data: any }) => {
      let found: NonceRecord | null = null;
      for (const val of mockNonces.values()) {
        if (where.id && val.id === where.id) {
          found = val;
          break;
        }
        if (where.nonce && val.nonce === where.nonce) {
          found = val;
          break;
        }
      }
      if (found) {
        Object.assign(found, data);
        return { ...found };
      }
      throw new Error(`VerificationNonce not found: ${JSON.stringify(where)}`);
    },
  },
  $disconnect: async () => {},
};

(globalThis as any).prisma = mockPrisma;

let reqIpCounter = 1;
function getUniqueIp(): string {
  reqIpCounter++;
  return `192.168.100.${reqIpCounter}`;
}

async function runEmpiricalSuite() {
  const { verifyVerificationChallenge, createVerificationChallenge } = await import("../lib/challenge");
  const { POST: challengeRoute } = await import("../app/api/verify/challenge/route");
  const { NextRequest } = await import("next/server");

  console.log("===============================================================");
  console.log("   SIJAGA CHALLENGER: EMPIRICAL STRESS TEST HARNESS (TUGAS 2)  ");
  console.log("===============================================================");

  let passedCount = 0;
  let totalCount = 0;

  function assert(condition: boolean, testName: string, detail: any) {
    totalCount++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`[FAIL] ${testName}:`, detail);
      throw new Error(`Test assertion failed: ${testName}`);
    }
  }

  // --- 1. TC-REV-01: verifyVerificationChallenge on REVOKED certificate ---
  console.log("\n--- Category 1: verifyVerificationChallenge Revocation Rejection ---");
  {
    const keypair = Keypair.generate();
    const walletAddress = keypair.publicKey.toBase58();
    const challenge = await createVerificationChallenge(walletAddress);

    const sig = nacl.sign.detached(
      Buffer.from(challenge.message, "utf-8"),
      keypair.secretKey
    );
    const sigBase58 = bs58.encode(sig);

    const res = await verifyVerificationChallenge({
      walletAddress,
      nonce: challenge.nonce,
      signature: sigBase58,
      message: challenge.message,
      expectedOwner: walletAddress,
      certificateId: "cert-revoked-001",
    });

    assert(
      res.success === false && res.error === "CERT_REVOKED",
      "TC-REV-01a: verifyVerificationChallenge returns CERT_REVOKED for revoked certificate",
      res
    );

    const stored = mockNonces.get(challenge.nonce);
    assert(
      stored?.usedAt === null,
      "TC-REV-01b: Nonce is NOT consumed/marked used when rejected for CERT_REVOKED",
      stored
    );
  }

  // --- 2. TC-REV-02: POST /api/verify/challenge Mode B (Issue Nonce) on REVOKED ---
  console.log("\n--- Category 2: Mode B Route Issue Nonce on REVOKED Certificate ---");
  {
    const keypair = Keypair.generate();
    const walletAddress = keypair.publicKey.toBase58();
    const noncesBefore = mockNonces.size;

    const req = new NextRequest("http://localhost:3000/api/verify/challenge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": getUniqueIp(),
      },
      body: JSON.stringify({
        walletAddress,
        certificateId: "cert-revoked-001",
      }),
    });

    const res = await challengeRoute(req);
    const data = await res.json();

    assert(
      res.status === 400,
      "TC-REV-02a: Mode B returns HTTP 400 for revoked certificate",
      { status: res.status, data }
    );
    assert(
      data.success === false && data.error === "CERT_REVOKED",
      "TC-REV-02b: Mode B payload contains success: false and error: 'CERT_REVOKED'",
      data
    );
    assert(
      data.revokeReason === "Indikasi pemalsuan dokumen akademik oleh universitas",
      "TC-REV-02c: Mode B payload includes specific revokeReason",
      data
    );
    assert(
      mockNonces.size === noncesBefore,
      "TC-REV-02d: Mode B does NOT persist any nonce in DB on revoked cert",
      { noncesBefore, current: mockNonces.size }
    );
  }

  // --- 3. TC-REV-03: POST /api/verify/challenge Mode A on REVOKED (Direct certificateId) ---
  console.log("\n--- Category 3: Mode A Route Verify Signature on REVOKED (Direct ID) ---");
  {
    const keypair = Keypair.generate();
    const walletAddress = keypair.publicKey.toBase58();
    const challenge = await createVerificationChallenge(walletAddress);

    const sig = nacl.sign.detached(
      Buffer.from(challenge.message, "utf-8"),
      keypair.secretKey
    );
    const sigBase58 = bs58.encode(sig);

    const req = new NextRequest("http://localhost:3000/api/verify/challenge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": getUniqueIp(),
      },
      body: JSON.stringify({
        action: "verify",
        walletAddress,
        nonce: challenge.nonce,
        signature: sigBase58,
        message: challenge.message,
        expectedOwner: walletAddress,
        certificateId: "cert-revoked-001",
      }),
    });

    const res = await challengeRoute(req);
    const data = await res.json();

    assert(
      res.status === 400,
      "TC-REV-03a: Mode A returns HTTP 400 for revoked certificate",
      { status: res.status, data }
    );
    assert(
      data.verified === false && data.error === "CERT_REVOKED",
      "TC-REV-03b: Mode A payload contains verified: false and error: 'CERT_REVOKED'",
      data
    );
  }

  // --- 4. TC-REV-04: POST /api/verify/challenge Mode A on REVOKED (Fallback via expectedOwner) ---
  console.log("\n--- Category 4: Mode A Route Verify Signature on REVOKED (Fallback expectedOwner) ---");
  {
    const revokedWallet = "RevokedOwnerWallet111111111111111111111111111";
    mockUsers.set(revokedWallet, {
      id: "user-revoked-001",
      nama: "Mahasiswa Revoked",
      wallet: { walletAddress: revokedWallet },
      certificate: mockCerts.get("cert-revoked-001"),
    });

    const req = new NextRequest("http://localhost:3000/api/verify/challenge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": getUniqueIp(),
      },
      body: JSON.stringify({
        action: "verify",
        walletAddress: revokedWallet,
        nonce: "dummy-nonce-fallback",
        signature: "dummy-sig-fallback",
        message: "dummy-msg-fallback",
        expectedOwner: revokedWallet, // expectedOwner triggers fallback query
        // certificateId deliberately omitted!
      }),
    });

    const res = await challengeRoute(req);
    const data = await res.json();

    assert(
      res.status === 400,
      "TC-REV-04a: Mode A fallback returns HTTP 400 when expectedOwner holds REVOKED cert",
      { status: res.status, data }
    );
    assert(
      data.verified === false && data.error === "CERT_REVOKED",
      "TC-REV-04b: Mode A fallback payload has verified: false and error: 'CERT_REVOKED'",
      data
    );
  }

  // --- 5. TC-EDGE-01: Non-existent certificateId in DB ---
  console.log("\n--- Category 5: Edge Case — Non-existent certificateId in DB ---");
  {
    const keypair = Keypair.generate();
    const walletAddress = keypair.publicKey.toBase58();
    const nonExistentCertId = "non-existent-cert-id-999999";

    // 5a: Mode B with non-existent cert
    const reqModeB = new NextRequest("http://localhost:3000/api/verify/challenge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": getUniqueIp(),
      },
      body: JSON.stringify({
        walletAddress,
        certificateId: nonExistentCertId,
      }),
    });
    const resModeB = await challengeRoute(reqModeB);
    const dataModeB = await resModeB.json();

    assert(
      resModeB.status === 200 && dataModeB.success === true && !!dataModeB.nonce,
      "TC-EDGE-01a: Mode B handles non-existent certId gracefully without 500 error",
      { status: resModeB.status, dataModeB }
    );

    // 5b: Mode A with non-existent cert
    const sig = nacl.sign.detached(
      Buffer.from(dataModeB.message, "utf-8"),
      keypair.secretKey
    );
    const sigBase58 = bs58.encode(sig);

    const reqModeA = new NextRequest("http://localhost:3000/api/verify/challenge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": getUniqueIp(),
      },
      body: JSON.stringify({
        action: "verify",
        walletAddress,
        nonce: dataModeB.nonce,
        signature: sigBase58,
        message: dataModeB.message,
        expectedOwner: walletAddress,
        certificateId: nonExistentCertId,
      }),
    });
    const resModeA = await challengeRoute(reqModeA);
    const dataModeA = await resModeA.json();

    assert(
      resModeA.status === 200 && dataModeA.verified === true,
      "TC-EDGE-01b: Mode A handles non-existent certId gracefully and verifies valid crypto",
      { status: resModeA.status, dataModeA }
    );
  }

  // --- 6. TC-EDGE-02: Missing certificateId (Backward Compatibility) ---
  console.log("\n--- Category 6: Edge Case — Missing certificateId (Backward Compatibility) ---");
  {
    const keypair = Keypair.generate();
    const walletAddress = keypair.publicKey.toBase58();

    // 6a: verifyVerificationChallenge without certificateId
    const challenge = await createVerificationChallenge(walletAddress);
    const sig = nacl.sign.detached(
      Buffer.from(challenge.message, "utf-8"),
      keypair.secretKey
    );
    const sigBase58 = bs58.encode(sig);

    const resLib = await verifyVerificationChallenge({
      walletAddress,
      nonce: challenge.nonce,
      signature: sigBase58,
      message: challenge.message,
      expectedOwner: walletAddress,
      // certificateId omitted
    });

    assert(
      resLib.success === true && resLib.walletAddress === walletAddress,
      "TC-EDGE-02a: verifyVerificationChallenge succeeds when certificateId is omitted",
      resLib
    );

    // 6b: Route Mode B without certificateId
    const reqModeB = new NextRequest("http://localhost:3000/api/verify/challenge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": getUniqueIp(),
      },
      body: JSON.stringify({ walletAddress }),
    });
    const resModeB = await challengeRoute(reqModeB);
    const dataModeB = await resModeB.json();

    assert(
      resModeB.status === 200 && dataModeB.success === true,
      "TC-EDGE-02b: Mode B succeeds when certificateId is omitted",
      { status: resModeB.status, dataModeB }
    );

    // 6c: Route Mode A without certificateId
    const sig2 = nacl.sign.detached(
      Buffer.from(dataModeB.message, "utf-8"),
      keypair.secretKey
    );
    const sig2Base58 = bs58.encode(sig2);

    const reqModeA = new NextRequest("http://localhost:3000/api/verify/challenge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": getUniqueIp(),
      },
      body: JSON.stringify({
        action: "verify",
        walletAddress,
        nonce: dataModeB.nonce,
        signature: sig2Base58,
        message: dataModeB.message,
        expectedOwner: walletAddress,
        // certificateId omitted
      }),
    });
    const resModeA = await challengeRoute(reqModeA);
    const dataModeA = await resModeA.json();

    assert(
      resModeA.status === 200 && dataModeA.verified === true,
      "TC-EDGE-02c: Mode A succeeds when certificateId is omitted",
      { status: resModeA.status, dataModeA }
    );
  }

  // --- 7. TC-EDGE-03: Active Certificates (MINTED & CLAIMED) ---
  console.log("\n--- Category 7: Edge Case — Active Certificates (MINTED & CLAIMED) ---");
  for (const [status, certId] of [["MINTED", "cert-minted-002"], ["CLAIMED", "cert-claimed-003"]]) {
    const keypair = Keypair.generate();
    const walletAddress = keypair.publicKey.toBase58();

    // Mode B with active cert
    const reqModeB = new NextRequest("http://localhost:3000/api/verify/challenge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": getUniqueIp(),
      },
      body: JSON.stringify({
        walletAddress,
        certificateId: certId,
      }),
    });
    const resModeB = await challengeRoute(reqModeB);
    const dataModeB = await resModeB.json();

    assert(
      resModeB.status === 200 && dataModeB.success === true,
      `TC-EDGE-03a (${status}): Mode B issues challenge for active cert`,
      { status: resModeB.status, dataModeB }
    );

    // Mode A with active cert
    const sig = nacl.sign.detached(
      Buffer.from(dataModeB.message, "utf-8"),
      keypair.secretKey
    );
    const sigBase58 = bs58.encode(sig);

    const reqModeA = new NextRequest("http://localhost:3000/api/verify/challenge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": getUniqueIp(),
      },
      body: JSON.stringify({
        action: "verify",
        walletAddress,
        nonce: dataModeB.nonce,
        signature: sigBase58,
        message: dataModeB.message,
        expectedOwner: walletAddress,
        certificateId: certId,
      }),
    });
    const resModeA = await challengeRoute(reqModeA);
    const dataModeA = await resModeA.json();

    assert(
      resModeA.status === 200 && dataModeA.verified === true,
      `TC-EDGE-03b (${status}): Mode A verifies successfully for active cert`,
      { status: resModeA.status, dataModeA }
    );
  }

  // --- 8. TC-EDGE-04: Cryptographic Negative Edge Cases ---
  console.log("\n--- Category 8: Edge Cases — Cryptographic Negative Tests ---");
  {
    const ownerKeypair = Keypair.generate();
    const foreignKeypair = Keypair.generate();
    const ownerWallet = ownerKeypair.publicKey.toBase58();
    const foreignWallet = foreignKeypair.publicKey.toBase58();

    const challenge = await createVerificationChallenge(ownerWallet);

    // 8a: OWNER_MISMATCH (foreign wallet attempts to verify as owner)
    const foreignSig = nacl.sign.detached(
      Buffer.from(challenge.message, "utf-8"),
      foreignKeypair.secretKey
    );
    const foreignSigBase58 = bs58.encode(foreignSig);

    const resOwnerMismatch = await verifyVerificationChallenge({
      walletAddress: foreignWallet,
      nonce: challenge.nonce,
      signature: foreignSigBase58,
      message: challenge.message,
      expectedOwner: ownerWallet,
    });
    // Can be WALLET_MISMATCH (storedNonce.wallet !== walletAddress) or OWNER_MISMATCH
    assert(
      resOwnerMismatch.success === false &&
        (resOwnerMismatch.error === "WALLET_MISMATCH" || resOwnerMismatch.error === "OWNER_MISMATCH"),
      `TC-EDGE-04a: Foreign wallet rejected with ${resOwnerMismatch.success ? "none" : resOwnerMismatch.error}`,
      resOwnerMismatch
    );

    // 8b: Explicit OWNER_MISMATCH when storedNonce matches request wallet, but expectedOwner differs
    const foreignChallenge = await createVerificationChallenge(foreignWallet);
    const foreignSig2 = nacl.sign.detached(
      Buffer.from(foreignChallenge.message, "utf-8"),
      foreignKeypair.secretKey
    );
    const resExplicitOwnerMismatch = await verifyVerificationChallenge({
      walletAddress: foreignWallet,
      nonce: foreignChallenge.nonce,
      signature: bs58.encode(foreignSig2),
      message: foreignChallenge.message,
      expectedOwner: ownerWallet, // Expected is ownerWallet, but signer is foreignWallet
    });
    assert(
      resExplicitOwnerMismatch.success === false &&
        resExplicitOwnerMismatch.error === "OWNER_MISMATCH",
      "TC-EDGE-04b: Explicit OWNER_MISMATCH returned when expectedOwner differs from signer",
      resExplicitOwnerMismatch
    );

    // 8c: INVALID_SIGNATURE (signature signed by wrong private key for claimed walletAddress)
    const forgedSig = nacl.sign.detached(
      Buffer.from(challenge.message, "utf-8"),
      foreignKeypair.secretKey // Signed with foreign key, but claiming to be ownerWallet
    );
    const resInvalidSig = await verifyVerificationChallenge({
      walletAddress: ownerWallet,
      nonce: challenge.nonce,
      signature: bs58.encode(forgedSig),
      message: challenge.message,
      expectedOwner: ownerWallet,
    });
    assert(
      resInvalidSig.success === false && resInvalidSig.error === "INVALID_SIGNATURE",
      "TC-EDGE-04c: Signature signed by wrong private key rejected as INVALID_SIGNATURE",
      resInvalidSig
    );

    // 8d: MESSAGE_MISMATCH
    const tamperedMessage = challenge.message + "\nextra";
    const sigTampered = nacl.sign.detached(
      Buffer.from(tamperedMessage, "utf-8"),
      ownerKeypair.secretKey
    );
    const resTamperedMsg = await verifyVerificationChallenge({
      walletAddress: ownerWallet,
      nonce: challenge.nonce,
      signature: bs58.encode(sigTampered),
      message: tamperedMessage,
      expectedOwner: ownerWallet,
    });
    assert(
      resTamperedMsg.success === false && resTamperedMsg.error === "MESSAGE_MISMATCH",
      "TC-EDGE-04d: Tampered message rejected as MESSAGE_MISMATCH",
      resTamperedMsg
    );

    // 8e: NONCE_ALREADY_USED (Replay attack)
    // First, verify a legitimate challenge to mark it used
    const validSig = nacl.sign.detached(
      Buffer.from(challenge.message, "utf-8"),
      ownerKeypair.secretKey
    );
    const resValid = await verifyVerificationChallenge({
      walletAddress: ownerWallet,
      nonce: challenge.nonce,
      signature: bs58.encode(validSig),
      message: challenge.message,
      expectedOwner: ownerWallet,
    });
    assert(resValid.success === true, "Pre-requisite: Valid challenge succeeds and marks used", resValid);

    // Now try to replay the exact same challenge
    const resReplay = await verifyVerificationChallenge({
      walletAddress: ownerWallet,
      nonce: challenge.nonce,
      signature: bs58.encode(validSig),
      message: challenge.message,
      expectedOwner: ownerWallet,
    });
    assert(
      resReplay.success === false && resReplay.error === "NONCE_ALREADY_USED",
      "TC-EDGE-04e: Replayed challenge rejected as NONCE_ALREADY_USED",
      resReplay
    );

    // 8f: NONCE_EXPIRED
    const expChallenge = await createVerificationChallenge(ownerWallet);
    const expRecord = mockNonces.get(expChallenge.nonce)!;
    expRecord.expiresAt = new Date(Date.now() - 10000); // 10 seconds in past

    const expSig = nacl.sign.detached(
      Buffer.from(expChallenge.message, "utf-8"),
      ownerKeypair.secretKey
    );
    const resExpired = await verifyVerificationChallenge({
      walletAddress: ownerWallet,
      nonce: expChallenge.nonce,
      signature: bs58.encode(expSig),
      message: expChallenge.message,
      expectedOwner: ownerWallet,
    });
    assert(
      resExpired.success === false && resExpired.error === "NONCE_EXPIRED",
      "TC-EDGE-04f: Expired nonce rejected as NONCE_EXPIRED",
      resExpired
    );

    // 8g: NONCE_NOT_FOUND
    const resNotFound = await verifyVerificationChallenge({
      walletAddress: ownerWallet,
      nonce: "non-existent-nonce-hex",
      signature: bs58.encode(validSig),
      message: challenge.message,
      expectedOwner: ownerWallet,
    });
    assert(
      resNotFound.success === false && resNotFound.error === "NONCE_NOT_FOUND",
      "TC-EDGE-04g: Non-existent nonce rejected as NONCE_NOT_FOUND",
      resNotFound
    );

    // 8h: MALFORMED_INPUT on Route
    const reqMalformed = new NextRequest("http://localhost:3000/api/verify/challenge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": getUniqueIp(),
      },
      body: JSON.stringify({
        action: "verify",
        walletAddress: ownerWallet,
        // nonce, signature, message missing!
      }),
    });
    const resMalformed = await challengeRoute(reqMalformed);
    assert(
      resMalformed.status === 400,
      "TC-EDGE-04h: Incomplete Mode A verification input rejected with HTTP 400",
      { status: resMalformed.status }
    );
  }

  console.log("\n===============================================================");
  console.log(`   ALL EMPIRICAL TESTS PASSED! (${passedCount}/${totalCount} assertions)`);
  console.log("===============================================================");
}

runEmpiricalSuite().catch((err) => {
  console.error("FATAL ERROR IN EMPIRICAL SUITE:", err);
  process.exit(1);
});
