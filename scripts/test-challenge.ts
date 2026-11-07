import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";
import {
  createVerificationChallenge,
  verifyVerificationChallenge,
} from "../lib/challenge";
import { prisma } from "../lib/prisma";

async function runChallengeTests() {
  console.log("=== Testing TC-05 & TC-06 (Verification Challenge) ===");

  const ownerKeypair = Keypair.generate();
  const foreignKeypair = Keypair.generate();

  const ownerWallet = ownerKeypair.publicKey.toBase58();
  const foreignWallet = foreignKeypair.publicKey.toBase58();

  console.log("Owner Wallet:", ownerWallet);
  console.log("Foreign Wallet:", foreignWallet);

  // 1. TC-05: Valid challenge & signature
  console.log("\n[TC-05] Testing valid signature...");
  const challenge1 = await createVerificationChallenge(ownerWallet);
  const sig1 = nacl.sign.detached(
    Buffer.from(challenge1.message, "utf-8"),
    ownerKeypair.secretKey
  );
  const sig1Base58 = bs58.encode(sig1);

  const res1 = await verifyVerificationChallenge({
    walletAddress: ownerWallet,
    nonce: challenge1.nonce,
    signature: sig1Base58,
    message: challenge1.message,
    expectedOwner: ownerWallet,
  });

  if (res1.success) {
    console.log("✓ TC-05 PASSED: Valid signature verified successfully.");
  } else {
    console.error("✗ TC-05 FAILED:", res1);
    process.exit(1);
  }

  // 2. TC-06a: Replay attack (reuse the same nonce)
  console.log("\n[TC-06a] Testing replayed nonce (single-use enforcement)...");
  const res2 = await verifyVerificationChallenge({
    walletAddress: ownerWallet,
    nonce: challenge1.nonce,
    signature: sig1Base58,
    message: challenge1.message,
    expectedOwner: ownerWallet,
  });

  if (!res2.success && res2.error === "NONCE_ALREADY_USED") {
    console.log("✓ TC-06a PASSED: Replayed nonce rejected (NONCE_ALREADY_USED).");
  } else {
    console.error("✗ TC-06a FAILED:", res2);
    process.exit(1);
  }

  // 3. TC-06b: Foreign wallet signature
  console.log("\n[TC-06b] Testing foreign wallet signature...");
  const challenge3 = await createVerificationChallenge(ownerWallet);
  const foreignSig = nacl.sign.detached(
    Buffer.from(challenge3.message, "utf-8"),
    foreignKeypair.secretKey
  );
  const foreignSigBase58 = bs58.encode(foreignSig);

  // Scenario 1: Foreign signature submitted with owner wallet
  const res3a = await verifyVerificationChallenge({
    walletAddress: ownerWallet,
    nonce: challenge3.nonce,
    signature: foreignSigBase58,
    message: challenge3.message,
    expectedOwner: ownerWallet,
  });

  // Scenario 2: Foreign signature submitted with foreign wallet
  const res3b = await verifyVerificationChallenge({
    walletAddress: foreignWallet,
    nonce: challenge3.nonce,
    signature: foreignSigBase58,
    message: challenge3.message,
    expectedOwner: ownerWallet,
  });

  if (!res3a.success && !res3b.success) {
    console.log(`✓ TC-06b PASSED: Foreign wallet rejected (3a: ${res3a.error}, 3b: ${res3b.error}).`);
  } else {
    console.error("✗ TC-06b FAILED:", { res3a, res3b });
    process.exit(1);
  }

  // 4. TC-06c: Expired nonce
  console.log("\n[TC-06c] Testing expired nonce...");
  const challenge4 = await createVerificationChallenge(ownerWallet);
  // Force update expiresAt in database to past
  await prisma.verificationNonce.update({
    where: { nonce: challenge4.nonce },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });

  const sig4 = nacl.sign.detached(
    Buffer.from(challenge4.message, "utf-8"),
    ownerKeypair.secretKey
  );
  const sig4Base58 = bs58.encode(sig4);

  const res4 = await verifyVerificationChallenge({
    walletAddress: ownerWallet,
    nonce: challenge4.nonce,
    signature: sig4Base58,
    message: challenge4.message,
    expectedOwner: ownerWallet,
  });

  if (!res4.success && res4.error === "NONCE_EXPIRED") {
    console.log("✓ TC-06c PASSED: Expired nonce rejected (NONCE_EXPIRED).");
  } else {
    console.error("✗ TC-06c FAILED:", res4);
    process.exit(1);
  }

  // 5. TC-06d: Tampered message
  console.log("\n[TC-06d] Testing tampered message (even one byte)...");
  const challenge5 = await createVerificationChallenge(ownerWallet);
  const tamperedMessage = challenge5.message + " ";
  const sig5 = nacl.sign.detached(
    Buffer.from(tamperedMessage, "utf-8"),
    ownerKeypair.secretKey
  );
  const sig5Base58 = bs58.encode(sig5);

  const res5 = await verifyVerificationChallenge({
    walletAddress: ownerWallet,
    nonce: challenge5.nonce,
    signature: sig5Base58,
    message: tamperedMessage,
    expectedOwner: ownerWallet,
  });

  if (!res5.success && res5.error === "MESSAGE_MISMATCH") {
    console.log("✓ TC-06d PASSED: Tampered message rejected (MESSAGE_MISMATCH).");
  } else {
    console.error("✗ TC-06d FAILED:", res5);
    process.exit(1);
  }

  console.log("\n=== ALL TC-05 & TC-06 CHALLENGE TESTS PASSED! ===");
  await prisma.$disconnect();
}

runChallengeTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});

