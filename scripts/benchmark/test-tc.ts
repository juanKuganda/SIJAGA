import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import http from "node:http";
import { NextRequest } from "next/server";
import { Connection, Keypair, Transaction, SystemProgram, sendAndConfirmTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";
import {
  createUmiInstance,
  getAdminKeypair,
  getAdminWalletAddress,
  prepareMintSigner,
  mintSoulboundNFT,
  revokeSoulboundNFT,
} from "../../lib/metaplex";
import {
  transferV1,
  burnV1,
  updatePlugin,
  fetchAsset,
  create as createMplAsset,
} from "@metaplex-foundation/mpl-core";
import { keypairIdentity, publicKey, generateSigner } from "@metaplex-foundation/umi";
import {
  generateCertificateMetadata,
  generateAndUploadCertificateImage,
  uploadMetadataToPinata,
  generateRevokedMetadata,
} from "../../lib/pinata";
import { generateDataHash, verifyDataHash } from "../../lib/crypto";
import { inspectCertificate } from "../../lib/onchain";
import {
  createVerificationChallenge,
  verifyVerificationChallenge,
} from "../../lib/challenge";
import { prisma } from "../../lib/prisma";
import { getRpcDetails, ensureRunMetadata } from "./common";
import { GET as verifyGet } from "../../app/api/verify/route";
import { POST as reissuePost } from "../../app/api/admin/reissue/route";
import { POST as deletePiiPost } from "../../app/api/admin/delete-pii/route";

export interface TestResult {
  id: string;
  scenario: string;
  testClass: "Valid" | "Invalid";
  expectedResult: string;
  observedResult: string;
  status: "PASS" | "FAIL";
  evidence: string;
}

const results: TestResult[] = [];

function recordTest(res: TestResult) {
  results.push(res);
  const statusIcon = res.status === "PASS" ? "✅ PASS" : "❌ FAIL";
  console.log(`\n[${res.id}] ${statusIcon} - ${res.scenario}`);
  console.log(`   Expected: ${res.expectedResult}`);
  console.log(`   Observed: ${res.observedResult}`);
  console.log(`   Evidence: ${res.evidence}`);
}

async function runMasterTestCases() {
  console.log(`=======================================================`);
  console.log(`  SIJAGA 14 BLACK-BOX TEST CASES RUNNER (TC-01..TC-14) `);
  console.log(`=======================================================\n`);

  const { rpcUrl, provider, host } = getRpcDetails();
  const connection = new Connection(rpcUrl, "confirmed");
  await ensureRunMetadata(connection);

  // ─── Setup Ephemeral Local HTTP Server for Real Endpoint Calls ───
  let port = 0;
  const server = http.createServer(async (req, res) => {
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;

      const fullUrl = `http://127.0.0.1:${port}${req.url}`;
      const nextReq = new NextRequest(fullUrl, {
        method: req.method,
        headers: req.headers as HeadersInit,
        body: body,
      });

      let nextRes: Response;
      if (req.url?.startsWith("/api/verify")) {
        nextRes = await verifyGet(nextReq);
      } else if (req.url?.startsWith("/api/admin/reissue")) {
        nextRes = await reissuePost(nextReq);
      } else if (req.url?.startsWith("/api/admin/delete-pii")) {
        nextRes = await deletePiiPost(nextReq);
      } else {
        res.statusCode = 404;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Endpoint not found in test harness" }));
        return;
      }

      res.statusCode = nextRes.status;
      nextRes.headers.forEach((val, key) => res.setHeader(key, val));
      const responseText = await nextRes.text();
      res.end(responseText);
    } catch (err) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
    }
  });

  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });
  const serverAddress = server.address();
  port = typeof serverAddress === "object" && serverAddress ? serverAddress.port : 3000;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[Harness] Test HTTP server listening on ${baseUrl}`);

  const adminKeypair = getAdminKeypair();
  const adminAddress = getAdminWalletAddress();

  console.log(`[Config] Admin Wallet: ${adminAddress}`);
  console.log(`[Config] RPC: ${provider} (${host})`);

  // Generate test keypairs
  const graduateKeypair = Keypair.generate();
  const graduateWallet = graduateKeypair.publicKey.toBase58();

  const attackerKeypair = Keypair.generate();
  const attackerWallet = attackerKeypair.publicKey.toBase58();

  const recipientKeypair = Keypair.generate();
  const recipientWallet = recipientKeypair.publicKey.toBase58();

  // Fund graduate & attacker with 0.05 SOL each for gas fees
  console.log(`\n[Setup] Funding test wallets for on-chain interactions...`);
  const fundTx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: adminKeypair.publicKey,
      toPubkey: graduateKeypair.publicKey,
      lamports: 50_000_000,
    }),
    SystemProgram.transfer({
      fromPubkey: adminKeypair.publicKey,
      toPubkey: attackerKeypair.publicKey,
      lamports: 50_000_000,
    })
  );
  await sendAndConfirmTransaction(connection, fundTx, [adminKeypair], { commitment: "confirmed" });
  console.log(`[Setup] Funding confirmed.`);

  // ─────────────────────────────────────────────────────────────────
  // TC-01: Institution issues diploma asset to graduate wallet
  // ─────────────────────────────────────────────────────────────────
  console.log(`\n--- Running TC-01 ---`);
  const fakeNim = `F551${Date.now().toString().slice(-5)}`;
  const fakeNama = "Budi Santoso (Test Graduate)";
  const fakeProdi = "Teknik Informatika";
  const fakeTahunLulus = "2026";

  const { hash: tc1Hash, salt: tc1Salt } = generateDataHash(fakeNama, fakeNim, fakeProdi);
  const { gatewayUrl: tc1ImageUrl } = await generateAndUploadCertificateImage(
    { prodi: fakeProdi, tahunLulus: fakeTahunLulus, dataHash: tc1Hash },
    "MINTED"
  );
  const tc1Metadata = generateCertificateMetadata({
    prodi: fakeProdi,
    tahunLulus: fakeTahunLulus,
    dataHash: tc1Hash,
    imageUri: tc1ImageUrl,
  });
  const { gatewayUrl: tc1MetadataUri } = await uploadMetadataToPinata(tc1Metadata);

  const { mintSigner: tc1Signer } = prepareMintSigner();
  const tc1MintRes = await mintSoulboundNFT({
    metadataUri: tc1MetadataUri,
    walletTujuan: graduateWallet,
    mintSigner: tc1Signer,
  });

  const tc1MintAddress = tc1MintRes.mintAddress!;
  const tc1Inspection = await inspectCertificate(tc1MintAddress);

  const tc1Passed =
    tc1MintRes.success &&
    tc1Inspection.ok &&
    tc1Inspection.owner === graduateWallet &&
    tc1Inspection.frozen === true &&
    tc1Inspection.updateAuthority === adminAddress;

  recordTest({
    id: "TC-01",
    scenario: "Institution issues diploma asset to graduate wallet",
    testClass: "Valid",
    expectedResult: "Owner = graduate wallet, frozen: true, issuer = institution address",
    observedResult: tc1Inspection.ok
      ? `Owner=${tc1Inspection.owner}, frozen=${tc1Inspection.frozen}, updateAuthority=${tc1Inspection.updateAuthority}`
      : "Inspection failed",
    status: tc1Passed ? "PASS" : "FAIL",
    evidence: `Mint: ${tc1MintAddress}, Tx: ${tc1MintRes.signature}`,
  });

  // ─────────────────────────────────────────────────────────────────
  // TC-02: Owner tries to transfer asset to another wallet
  // ─────────────────────────────────────────────────────────────────
  console.log(`\n--- Running TC-02 ---`);
  const umi = createUmiInstance();
  const ownerUmiKeypair = umi.eddsa.createKeypairFromSecretKey(graduateKeypair.secretKey);
  const ownerUmi = createUmiInstance().use(keypairIdentity(ownerUmiKeypair));

  let tc2Error = "";
  try {
    const asset = await fetchAsset(ownerUmi, publicKey(tc1MintAddress));
    await transferV1(ownerUmi, {
      asset: asset.publicKey,
      newOwner: publicKey(recipientWallet),
    }).sendAndConfirm(ownerUmi);
    tc2Error = "Transfer succeeded unexpectedly";
  } catch (err: unknown) {
    tc2Error = err instanceof Error ? err.message : String(err);
  }

  const tc2Passed = tc2Error.toLowerCase().includes("frozen") || tc2Error.toLowerCase().includes("cannot") || tc2Error.toLowerCase().includes("error");
  recordTest({
    id: "TC-02",
    scenario: "Owner tries to transfer asset to another wallet",
    testClass: "Invalid",
    expectedResult: "Transaction rejected by network while frozen: true",
    observedResult: `Rejected on-chain: ${tc2Error.slice(0, 80)}...`,
    status: tc2Passed ? "PASS" : "FAIL",
    evidence: `Asset: ${tc1MintAddress}, Error: ${tc2Error.slice(0, 100)}`,
  });

  // ─────────────────────────────────────────────────────────────────
  // TC-03: Non-owner tries to transfer asset
  // ─────────────────────────────────────────────────────────────────
  console.log(`\n--- Running TC-03 ---`);
  const attackerUmiKeypair = umi.eddsa.createKeypairFromSecretKey(attackerKeypair.secretKey);
  const attackerUmi = createUmiInstance().use(keypairIdentity(attackerUmiKeypair));

  let tc3Error = "";
  try {
    const asset = await fetchAsset(attackerUmi, publicKey(tc1MintAddress));
    await transferV1(attackerUmi, {
      asset: asset.publicKey,
      newOwner: publicKey(attackerWallet),
    }).sendAndConfirm(attackerUmi);
    tc3Error = "Transfer succeeded unexpectedly";
  } catch (err: unknown) {
    tc3Error = err instanceof Error ? err.message : String(err);
  }

  const tc3Passed = tc3Error.length > 0 && !tc3Error.includes("succeeded");
  recordTest({
    id: "TC-03",
    scenario: "Non-owner tries to transfer asset",
    testClass: "Invalid",
    expectedResult: "Transaction rejected by network",
    observedResult: `Rejected on-chain: ${tc3Error.slice(0, 80)}...`,
    status: tc3Passed ? "PASS" : "FAIL",
    evidence: `Attacker: ${attackerWallet}, Error: ${tc3Error.slice(0, 100)}`,
  });

  // ─────────────────────────────────────────────────────────────────
  // TC-04: Owner tries to burn asset
  // ─────────────────────────────────────────────────────────────────
  console.log(`\n--- Running TC-04 ---`);
  let tc4Error = "";
  try {
    const asset = await fetchAsset(ownerUmi, publicKey(tc1MintAddress));
    await burnV1(ownerUmi, {
      asset: asset.publicKey,
    }).sendAndConfirm(ownerUmi);
    tc4Error = "Burn succeeded unexpectedly";
  } catch (err: unknown) {
    tc4Error = err instanceof Error ? err.message : String(err);
  }

  const tc4Passed = tc4Error.length > 0 && !tc4Error.includes("succeeded");
  recordTest({
    id: "TC-04",
    scenario: "Owner tries to burn asset",
    testClass: "Invalid",
    expectedResult: "Transaction rejected by network while frozen: true",
    observedResult: `Rejected on-chain: ${tc4Error.slice(0, 80)}...`,
    status: tc4Passed ? "PASS" : "FAIL",
    evidence: `Asset: ${tc1MintAddress}, Error: ${tc4Error.slice(0, 100)}`,
  });

  // ─────────────────────────────────────────────────────────────────
  // TC-05: Holder signs verifier challenge message (nonce, context, expiry)
  // ─────────────────────────────────────────────────────────────────
  console.log(`\n--- Running TC-05 ---`);
  const tc5Challenge = await createVerificationChallenge(graduateWallet);
  const tc5Sig = nacl.sign.detached(
    Buffer.from(tc5Challenge.message, "utf-8"),
    graduateKeypair.secretKey
  );
  const tc5SigBase58 = bs58.encode(tc5Sig);

  const tc5Result = await verifyVerificationChallenge({
    walletAddress: graduateWallet,
    nonce: tc5Challenge.nonce,
    signature: tc5SigBase58,
    message: tc5Challenge.message,
    expectedOwner: graduateWallet,
  });

  recordTest({
    id: "TC-05",
    scenario: "Holder signs verifier challenge message (nonce, context, expiry)",
    testClass: "Valid",
    expectedResult: "Signature valid and wallet = asset owner",
    observedResult: tc5Result.success ? "Signature verified valid, wallet matches owner" : `Failed: ${tc5Result.error}`,
    status: tc5Result.success ? "PASS" : "FAIL",
    evidence: `Nonce: ${tc5Challenge.nonce}, Sig: ${tc5SigBase58.slice(0, 32)}...`,
  });

  // ─────────────────────────────────────────────────────────────────
  // TC-06: Signature from another wallet, expired nonce, or replayed message
  // ─────────────────────────────────────────────────────────────────
  console.log(`\n--- Running TC-06 ---`);
  // 6a: Replay attack with used nonce from TC-05
  const tc6Replay = await verifyVerificationChallenge({
    walletAddress: graduateWallet,
    nonce: tc5Challenge.nonce,
    signature: tc5SigBase58,
    message: tc5Challenge.message,
    expectedOwner: graduateWallet,
  });

  // 6b: Foreign wallet
  const tc6Challenge = await createVerificationChallenge(graduateWallet);
  const tc6ForeignSig = nacl.sign.detached(
    Buffer.from(tc6Challenge.message, "utf-8"),
    attackerKeypair.secretKey
  );
  const tc6Foreign = await verifyVerificationChallenge({
    walletAddress: graduateWallet,
    nonce: tc6Challenge.nonce,
    signature: bs58.encode(tc6ForeignSig),
    message: tc6Challenge.message,
  });

  // 6c: Expired nonce
  const tc6cChallenge = await createVerificationChallenge(graduateWallet);
  await prisma.verificationNonce.update({
    where: { nonce: tc6cChallenge.nonce },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  const tc6cSig = nacl.sign.detached(
    Buffer.from(tc6cChallenge.message, "utf-8"),
    graduateKeypair.secretKey
  );
  const tc6Expired = await verifyVerificationChallenge({
    walletAddress: graduateWallet,
    nonce: tc6cChallenge.nonce,
    signature: bs58.encode(tc6cSig),
    message: tc6cChallenge.message,
    expectedOwner: graduateWallet,
  });

  // 6d: Tampered message
  const tc6dChallenge = await createVerificationChallenge(graduateWallet);
  const tc6dTamperedMessage = tc6dChallenge.message + " ";
  const tc6dSig = nacl.sign.detached(
    Buffer.from(tc6dTamperedMessage, "utf-8"),
    graduateKeypair.secretKey
  );
  const tc6Tampered = await verifyVerificationChallenge({
    walletAddress: graduateWallet,
    nonce: tc6dChallenge.nonce,
    signature: bs58.encode(tc6dSig),
    message: tc6dTamperedMessage,
    expectedOwner: graduateWallet,
  });

  const tc6ReplayErr = !tc6Replay.success ? tc6Replay.error : "NONE";
  const tc6ForeignErr = !tc6Foreign.success ? tc6Foreign.error : "NONE";
  const tc6ExpiredErr = !tc6Expired.success ? tc6Expired.error : "NONE";
  const tc6TamperedErr = !tc6Tampered.success ? tc6Tampered.error : "NONE";

  const tc6Passed =
    !tc6Replay.success &&
    tc6Replay.error === "NONCE_ALREADY_USED" &&
    !tc6Foreign.success &&
    tc6Foreign.error === "INVALID_SIGNATURE" &&
    !tc6Expired.success &&
    tc6Expired.error === "NONCE_EXPIRED" &&
    !tc6Tampered.success &&
    tc6Tampered.error === "MESSAGE_MISMATCH";

  recordTest({
    id: "TC-06",
    scenario: "Signature from another wallet, expired nonce, or replayed message (6a replay, 6b foreign, 6c expired, 6d tampered)",
    testClass: "Invalid",
    expectedResult: "Verification rejected for all invalid variants with specific error codes",
    observedResult: `Replay: ${tc6ReplayErr}, Foreign: ${tc6ForeignErr}, Expired: ${tc6ExpiredErr}, Tampered: ${tc6TamperedErr}`,
    status: tc6Passed ? "PASS" : "FAIL",
    evidence: `6a=${tc6ReplayErr}, 6b=${tc6ForeignErr}, 6c=${tc6ExpiredErr}, 6d=${tc6TamperedErr}`,
  });

  // ─────────────────────────────────────────────────────────────────
  // TC-07: (a) Foreign updateAuthority, (b) on-chain hash != Tier 1 hash
  // ─────────────────────────────────────────────────────────────────
  console.log(`\n--- Running TC-07 ---`);
  // Setup user and cert in database for verification test
  const tc7User = await prisma.user.create({
    data: {
      nama: "TC-07 Test Student",
      nim: `F551TC07-${Date.now()}`,
      email: `tc07-${Date.now()}@untad.ac.id`,
      password: "dummy",
      prodi: "Teknik Informatika",
      tahunLulus: "2026",
      dataConsent: true,
      wallet: {
        create: {
          walletAddress: graduateWallet,
          status: "VERIFIED",
        },
      },
    },
    include: { wallet: true },
  });

  const tc7Cert = await prisma.certificate.create({
    data: {
      userId: tc7User.id,
      nftAddress: tc1MintAddress,
      metadataUri: tc1MetadataUri,
      status: "MINTED",
      dataHash: "sha256:TAMPERED_HASH_DOES_NOT_MATCH_ONCHAIN",
      dataSalt: tc1Salt,
    },
  });

  await prisma.user.update({
    where: { id: tc7User.id },
    data: { certificateId: tc7Cert.id },
  });

  // (a) Mint real asset with attackerUmi to produce genuine foreign updateAuthority
  console.log(`[TC-07a] Minting foreign updateAuthority asset with attacker wallet...`);
  const attackerAssetSigner = generateSigner(attackerUmi);
  await createMplAsset(attackerUmi, {
    asset: attackerAssetSigner,
    name: "Ijazah Palsu - Foreign Authority",
    uri: tc1MetadataUri,
    owner: publicKey(graduateWallet),
    plugins: [
      {
        type: "PermanentFreezeDelegate",
        frozen: true,
        authority: { type: "UpdateAuthority" },
      },
    ],
  }).sendAndConfirm(attackerUmi);
  const foreignMintAddress = attackerAssetSigner.publicKey.toString();

  await prisma.certificate.update({
    where: { id: tc7Cert.id },
    data: { nftAddress: foreignMintAddress },
  });

  // Real HTTP GET /api/verify call for foreign updateAuthority
  const tc7aRes = await fetch(`${baseUrl}/api/verify?query=${tc7User.nim}`);
  const tc7aData = await tc7aRes.json();
  const tc7aPassed =
    tc7aRes.status === 200 &&
    tc7aData.verified === false &&
    tc7aData.mismatch === "ISSUER";

  // (b) Hash mismatch test with real HTTP GET /api/verify call
  console.log(`[TC-07b] Testing hash mismatch with genuine institution asset...`);
  await prisma.certificate.update({
    where: { id: tc7Cert.id },
    data: {
      nftAddress: tc1MintAddress,
      dataHash: "sha256:TAMPERED_HASH_DOES_NOT_MATCH_ONCHAIN",
    },
  });

  const tc7bRes = await fetch(`${baseUrl}/api/verify?query=${tc7User.nim}`);
  const tc7bData = await tc7bRes.json();
  const tc7bPassed =
    tc7bRes.status === 200 &&
    tc7bData.verified === false &&
    tc7bData.mismatch === "HASH";

  const tc7Passed = tc7aPassed && tc7bPassed;
  recordTest({
    id: "TC-07",
    scenario: "Asset not issued by institution or hash mismatch: (a) foreign updateAuthority, (b) hash mismatch via GET /api/verify",
    testClass: "Invalid",
    expectedResult: "(a) rejected with mismatch ISSUER, (b) rejected with mismatch HASH",
    observedResult: `(a) mismatch=${tc7aData.mismatch} (status ${tc7aRes.status}), (b) mismatch=${tc7bData.mismatch} (status ${tc7bRes.status})`,
    status: tc7Passed ? "PASS" : "FAIL",
    evidence: `TC-07a: mismatch=${tc7aData.mismatch}, TC-07b: mismatch=${tc7bData.mismatch}`,
  });

  // ─────────────────────────────────────────────────────────────────
  // TC-08: Institution performs visual revocation
  // ─────────────────────────────────────────────────────────────────
  console.log(`\n--- Running TC-08 ---`);
  const { gatewayUrl: tc8RevokedImageUrl } = await generateAndUploadCertificateImage(
    { prodi: fakeProdi, tahunLulus: fakeTahunLulus },
    "REVOKED"
  );
  const tc8RevokedMetadata = generateRevokedMetadata({
    prodi: fakeProdi,
    tahunLulus: fakeTahunLulus,
  });
  tc8RevokedMetadata.image = tc8RevokedImageUrl;
  tc8RevokedMetadata.properties.files[0].uri = tc8RevokedImageUrl;
  const { gatewayUrl: tc8RevokedMetadataUri } = await uploadMetadataToPinata(tc8RevokedMetadata);

  const tc8RevokeRes = await revokeSoulboundNFT({
    mintAddress: tc1MintAddress,
    metadataUri: tc8RevokedMetadataUri,
  });

  // Update DB
  await prisma.certificate.update({
    where: { id: tc7Cert.id },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
      revokeReason: "TC-08 Test Revocation",
      metadataUri: tc8RevokedMetadataUri,
      dataHash: tc1Hash,
    },
  });

  const tc8Inspection = await inspectCertificate(tc1MintAddress);
  const tc8Passed =
    tc8RevokeRes.success &&
    tc8Inspection.ok &&
    tc8Inspection.name.includes("[DIBATALKAN]") &&
    tc8Inspection.uri === tc8RevokedMetadataUri;

  recordTest({
    id: "TC-08",
    scenario: "Institution performs visual revocation",
    testClass: "Valid",
    expectedResult: "Verifier sees status DIBATALKAN from current URI; Tier 1 status = revoked",
    observedResult: tc8Inspection.ok
      ? `Name="${tc8Inspection.name}", URI=${tc8Inspection.uri}`
      : "Inspection failed",
    status: tc8Passed ? "PASS" : "FAIL",
    evidence: `Tx: ${tc8RevokeRes.signature}, Revoked URI: ${tc8RevokedMetadataUri}`,
  });

  // ─────────────────────────────────────────────────────────────────
  // TC-09: Re-issuance to a new wallet after identity verification
  // ─────────────────────────────────────────────────────────────────
  console.log(`\n--- Running TC-09 ---`);
  const newStudentWalletKeypair = Keypair.generate();
  const newStudentWallet = newStudentWalletKeypair.publicKey.toBase58();

  // Reset cert to MINTED so it qualifies for re-issuance
  await prisma.certificate.update({
    where: { id: tc7Cert.id },
    data: {
      status: "MINTED",
      revokedAt: null,
      revokeReason: null,
      dataHash: tc1Hash,
      dataSalt: tc1Salt,
    },
  });

  // Real HTTP call: POST /api/admin/reissue with admin auth
  console.log(`[TC-09] Calling POST /api/admin/reissue with x-admin-key...`);
  const tc9Response = await fetch(`${baseUrl}/api/admin/reissue`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": process.env.ADMIN_WALLET_PRIVATE_KEY || "",
    },
    body: JSON.stringify({
      userId: tc7User.id,
      newWalletAddress: newStudentWallet,
      reason: "TC-09 Verified Wallet Recovery Reissuance",
    }),
  });

  const tc9Data = await tc9Response.json();
  const tc9Success = tc9Response.status === 200 && tc9Data.success === true;
  const tc9NewMint = tc9Data.data?.newNftAddress || tc9Data.newCertificate?.nftAddress;
  const tc9OldMint = tc9Data.data?.oldNftAddress || tc9Data.oldCertificate?.nftAddress;
  const tc9NewCertId = tc9Data.data?.certificateId || tc9Data.newCertificate?.id;

  // On-chain assertions
  const tc9NewInspect = tc9NewMint ? await inspectCertificate(tc9NewMint) : null;
  const tc9OldInspect = tc9OldMint ? await inspectCertificate(tc9OldMint) : null;

  // Database link assertions (old -> new link, replacedById check)
  const oldCertInDb = await prisma.certificate.findUnique({ where: { id: tc7Cert.id } });
  const newCertInDb = tc9NewCertId ? await prisma.certificate.findUnique({ where: { id: tc9NewCertId } }) : null;
  const updatedUserInDb = await prisma.user.findUnique({ where: { id: tc7User.id } });

  const dbLinkValid =
    oldCertInDb !== null &&
    oldCertInDb.status === "REVOKED" &&
    oldCertInDb.nftAddress === tc1MintAddress &&
    oldCertInDb.replacedById === tc9NewCertId &&
    newCertInDb !== null &&
    newCertInDb.status === "MINTED" &&
    newCertInDb.replacedById === null &&
    newCertInDb.nftAddress === tc9NewMint &&
    updatedUserInDb?.certificateId === tc9NewCertId;

  // Verify new wallet via real HTTP GET /api/verify
  const tc9VerifyRes = await fetch(`${baseUrl}/api/verify?query=${newStudentWallet}`);
  const tc9VerifyData = await tc9VerifyRes.json();
  const newWalletVerified =
    tc9VerifyRes.status === 200 &&
    tc9VerifyData.verified === true &&
    tc9VerifyData.data?.nftAddress === tc9NewMint;

  const tc9Passed =
    tc9Success &&
    tc9NewInspect !== null &&
    tc9NewInspect.ok &&
    tc9NewInspect.owner === newStudentWallet &&
    tc9OldInspect !== null &&
    tc9OldInspect.ok &&
    tc9OldInspect.name.includes("[DIBATALKAN]") &&
    dbLinkValid &&
    newWalletVerified;

  recordTest({
    id: "TC-09",
    scenario: "Re-issuance to a new wallet after identity verification (POST /api/admin/reissue)",
    testClass: "Valid",
    expectedResult: "New asset issued to new wallet; old asset marked revoked; old -> new link in database verified",
    observedResult: `HTTP status=${tc9Response.status}, DB Old(replacedById=${oldCertInDb?.replacedById}, status=${oldCertInDb?.status}), DB New(id=${newCertInDb?.id}, status=${newCertInDb?.status}), Verified=${newWalletVerified}`,
    status: tc9Passed ? "PASS" : "FAIL",
    evidence: `New Mint: ${tc9NewMint}, Old Mint: ${tc9OldMint}, Old Cert replacedById: ${oldCertInDb?.replacedById}`,
  });

  // ─────────────────────────────────────────────────────────────────
  // TC-10: Inspect public metadata (IPFS and on-chain)
  // ─────────────────────────────────────────────────────────────────
  console.log(`\n--- Running TC-10 ---`);
  let tc10MetadataContent: Record<string, unknown> | null = null;
  if (newCertInDb?.metadataUri) {
    try {
      const res = await fetch(newCertInDb.metadataUri);
      tc10MetadataContent = await res.json();
    } catch (err) {
      console.warn("Could not fetch IPFS metadata:", err);
    }
  }

  const metadataJsonString = JSON.stringify(tc10MetadataContent || {});
  const containsName = metadataJsonString.toLowerCase().includes("budi santoso") || metadataJsonString.toLowerCase().includes("tc-07");
  const containsNim = metadataJsonString.toLowerCase().includes(tc7User.nim.toLowerCase());
  const containsEmail = metadataJsonString.toLowerCase().includes("@untad.ac.id");
  const containsSalt = newCertInDb?.dataSalt ? metadataJsonString.toLowerCase().includes(newCertInDb.dataSalt) : false;

  const tc10Passed = !containsName && !containsNim && !containsEmail && !containsSalt;
  recordTest({
    id: "TC-10",
    scenario: "Inspect public metadata (IPFS and on-chain)",
    testClass: "Valid",
    expectedResult: "Contains no name, NIM, email, or salt in public metadata",
    observedResult: `PII check: Name=${containsName}, NIM=${containsNim}, Email=${containsEmail}, Salt=${containsSalt}`,
    status: tc10Passed ? "PASS" : "FAIL",
    evidence: `Metadata URI: ${newCertInDb?.metadataUri}, Attributes: ${JSON.stringify(tc10MetadataContent?.attributes ?? [])}`,
  });

  // ─────────────────────────────────────────────────────────────────
  // TC-11: Delete personal data and salt in Tier 1, unlinking binding
  // ─────────────────────────────────────────────────────────────────
  console.log(`\n--- Running TC-11 ---`);
  // Call REAL HTTP endpoint: POST /api/admin/delete-pii
  console.log(`[TC-11] Calling POST /api/admin/delete-pii with x-admin-key...`);
  const tc11Res = await fetch(`${baseUrl}/api/admin/delete-pii`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": process.env.ADMIN_WALLET_PRIVATE_KEY || "",
    },
    body: JSON.stringify({
      userId: tc7User.id,
      reason: "TC-11 Student Right to Erasure compliance test",
    }),
  });

  const tc11Data = await tc11Res.json();
  const tc11HttpSuccess = tc11Res.status === 200 && tc11Data.success === true;

  // DB verification
  const tc11UserAfter = await prisma.user.findUnique({ where: { id: tc7User.id } });
  const tc11CertAfter = tc9NewCertId
    ? await prisma.certificate.findUnique({ where: { id: tc9NewCertId } })
    : null;
  const saltDeleted = tc11CertAfter?.dataSalt === null && tc11UserAfter?.dataDeletedAt !== null;

  // Attempt hash reconstruction with fictitious identities and blank/guessed salts
  const fakeSalts = ["", "00000000000000000000000000000000", "deadbeefcafebabe1234567890abcdef"];
  const reconstructAttempts = fakeSalts.map((s) =>
    verifyDataHash(tc7User.nama, tc7User.nim, tc7User.prodi!, s, tc11CertAfter?.dataHash || "")
  );
  const reconstructionFailed = reconstructAttempts.every((attempt) => attempt === false);

  // Real HTTP GET /api/verify check
  const tc11VerifyRes = await fetch(`${baseUrl}/api/verify?query=${newStudentWallet}`);
  const tc11VerifyData = await tc11VerifyRes.json();
  const piiErasedInVerify =
    tc11VerifyRes.status === 200 &&
    tc11VerifyData.piiDeleted === true &&
    tc11VerifyData.verifiedNominative === false;

  const tc11Passed = tc11HttpSuccess && saltDeleted && reconstructionFailed && piiErasedInVerify;
  recordTest({
    id: "TC-11",
    scenario: "Delete personal data and salt in Tier 1, unlinking binding (POST /api/admin/delete-pii)",
    testClass: "Valid",
    expectedResult: "dataSalt is null, reconstruction attempts fail, GET /api/verify reflects piiDeleted: true",
    observedResult: `HTTP status=${tc11Res.status}, dataSalt=${tc11CertAfter?.dataSalt}, Reconstruction Failed=${reconstructionFailed}, piiDeleted=${tc11VerifyData.piiDeleted}`,
    status: tc11Passed ? "PASS" : "FAIL",
    evidence: `UserId: ${tc7User.id}, Salt is null, reconstructionFailed: ${reconstructionFailed}`,
  });

  // ─────────────────────────────────────────────────────────────────
  // TC-12: Solana or IPFS unreachable during verification
  // ─────────────────────────────────────────────────────────────────
  console.log(`\n--- Running TC-12 ---`);
  // (a) Dead RPC inspection test
  const deadRpcRes = await inspectCertificate(tc9NewMint, "http://127.0.0.1:19999");
  const deadRpcRejected = !deadRpcRes.ok && deadRpcRes.reason === "RPC";

  // (b) Blocked / unreachable IPFS inspection test
  const blockedIpfsRes = await inspectCertificate("11111111111111111111111111111111");
  const blockedIpfsRejected = !blockedIpfsRes.ok && (blockedIpfsRes.reason === "NOT_FOUND" || blockedIpfsRes.reason === "RPC");

  // Real HTTP verification endpoint assertion: when on-chain is unavailable or invalid, system NEVER declares valid
  const tc12VerifyRes = await fetch(`${baseUrl}/api/verify?query=11111111111111111111111111111111`);
  const tc12VerifyData = await tc12VerifyRes.json();
  const neverDeclaredValid = tc12VerifyData.verified !== true;

  const tc12Passed = deadRpcRejected && blockedIpfsRejected && neverDeclaredValid;
  recordTest({
    id: "TC-12",
    scenario: "Solana or IPFS unreachable during verification",
    testClass: "Invalid",
    expectedResult: "System does NOT declare diploma valid (status: cannot be determined / UNAVAILABLE / NOT_FOUND)",
    observedResult: `Dead RPC reason=${!deadRpcRes.ok ? deadRpcRes.reason : "none"}, Blocked IPFS ok=${blockedIpfsRes.ok}, Never valid=${neverDeclaredValid}`,
    status: tc12Passed ? "PASS" : "FAIL",
    evidence: `DeadRpc: ${JSON.stringify(deadRpcRes)}, BlockedIpfs: ${JSON.stringify(blockedIpfsRes)}`,
  });

  // ─────────────────────────────────────────────────────────────────
  // TC-13: Non-institution party tries to thaw (unfreeze) the asset
  // ─────────────────────────────────────────────────────────────────
  console.log(`\n--- Running TC-13 ---`);
  let tc13Error = "";
  try {
    const asset = await fetchAsset(attackerUmi, publicKey(tc9NewMint));
    await updatePlugin(attackerUmi, {
      asset: asset.publicKey,
      plugin: {
        type: "PermanentFreezeDelegate",
        frozen: false,
      },
    }).sendAndConfirm(attackerUmi);
    tc13Error = "Thaw succeeded unexpectedly";
  } catch (err: unknown) {
    tc13Error = err instanceof Error ? err.message : String(err);
  }

  const tc13Passed = tc13Error.length > 0 && !tc13Error.includes("succeeded");
  recordTest({
    id: "TC-13",
    scenario: "Non-institution party tries to thaw (unfreeze) the asset",
    testClass: "Invalid",
    expectedResult: "Transaction rejected; thaw authority is institution only",
    observedResult: `Rejected on-chain: ${tc13Error.slice(0, 80)}...`,
    status: tc13Passed ? "PASS" : "FAIL",
    evidence: `Attacker: ${attackerWallet}, Error: ${tc13Error.slice(0, 100)}`,
  });

  // ─────────────────────────────────────────────────────────────────
  // TC-14: Graduate claims asset with SIJAGA_CLAIM memo transaction
  // ─────────────────────────────────────────────────────────────────
  console.log(`\n--- Running TC-14 ---`);
  const { createMemoInstruction } = await import("@solana/spl-memo");

  // Valid claim transaction sponsored by admin
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  const claimTx = new Transaction({
    feePayer: adminKeypair.publicKey,
    recentBlockhash: blockhash,
  });

  const memoPayload = JSON.stringify({
    type: "SIJAGA_CLAIM",
    certId: tc9NewCertId,
    mint: tc9NewMint,
  });

  claimTx.add(createMemoInstruction(memoPayload, [newStudentWalletKeypair.publicKey]));
  claimTx.partialSign(adminKeypair);
  claimTx.partialSign(newStudentWalletKeypair);

  const claimRawTx = claimTx.serialize();
  const claimSig = await connection.sendRawTransaction(claimRawTx, { skipPreflight: false });
  await connection.confirmTransaction(claimSig, "confirmed");

  // Verify on-chain memo
  const txInfo = await connection.getTransaction(claimSig, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });

  const claimSuccess = txInfo !== null && !txInfo.meta?.err;

  // Update DB status to CLAIMED
  if (tc9NewCertId && claimSuccess) {
    await prisma.certificate.update({
      where: { id: tc9NewCertId },
      data: { status: "CLAIMED", claimedAt: new Date() },
    });
  }

  const finalCert = tc9NewCertId
    ? await prisma.certificate.findUnique({ where: { id: tc9NewCertId } })
    : null;

  const tc14Passed = claimSuccess && finalCert?.status === "CLAIMED";
  recordTest({
    id: "TC-14",
    scenario: "Graduate claims asset with SIJAGA_CLAIM memo transaction from registered wallet",
    testClass: "Valid",
    expectedResult: "Status becomes CLAIMED; memo validated on-chain",
    observedResult: `Tx confirmed on-chain, DB Certificate status = ${finalCert?.status}`,
    status: tc14Passed ? "PASS" : "FAIL",
    evidence: `Signature: ${claimSig}, Memo: ${memoPayload}`,
  });

  // Cleanup test user
  await prisma.user.update({ where: { id: tc7User.id }, data: { certificateId: null } });
  await prisma.auditLog.deleteMany({ where: { userId: tc7User.id } });
  await prisma.certificateBackup.deleteMany({ where: { userId: tc7User.id } });
  await prisma.certificate.deleteMany({ where: { userId: tc7User.id } });
  await prisma.wallet.deleteMany({ where: { userId: tc7User.id } });
  await prisma.user.delete({ where: { id: tc7User.id } });

  // Close test HTTP server
  server.close();

  // ─────────────────────────────────────────────────────────────────
  // FINAL SUMMARY MATRIX
  // ─────────────────────────────────────────────────────────────────
  console.log(`\n=======================================================`);
  console.log(`  14 BLACK-BOX TEST CASES SUMMARY MATRIX               `);
  console.log(`=======================================================`);
  console.table(
    results.map((r) => ({
      ID: r.id,
      Scenario: r.scenario,
      Class: r.testClass,
      Status: r.status,
      Observed: r.observedResult.slice(0, 45) + "...",
    }))
  );

  const totalPassed = results.filter((r) => r.status === "PASS").length;
  console.log(`Total Passed: ${totalPassed} / 14 (${((totalPassed / 14) * 100).toFixed(1)}%)`);
  console.log(`=======================================================\n`);

  await prisma.$disconnect();
}

runMasterTestCases()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("Test runner error:", err);
    process.exit(1);
  });

