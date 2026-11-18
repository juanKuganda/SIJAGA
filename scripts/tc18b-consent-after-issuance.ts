/**
 * scripts/tc18b-consent-after-issuance.ts — TC-18b: Penarikan Consent Pasca-Penerbitan & Pemulihan Penuh Alifa
 *
 * TUJUAN:
 * Menguji dan memverifikasi siklus hidup privasi UU PDP (Right to Erasure / Consent Withdrawal)
 * yang diinisiasi langsung oleh MAHASISWA (Alifa - F55124011) SETELAH sertifikat diterbitkan
 * (post-minting lifecycle state), kemudian memverifikasi imutabilitas on-chain & IPFS,
 * dan menjalankan prosedur restore penuh 2-langkah (+ re-claim) hingga Alifa kembali berstatus CLAIMED (4/4 stepper).
 *
 * ALUR PENGUJIAN:
 * 1. Scenario 0: Baseline Snapshot Mahasiswa Alifa:
 *    - Database: User, Wallet, Certificate, Audit Logs.
 *    - On-chain Solana Metaplex Core & Pinata IPFS metadata.
 *    - Verifikasi Tingkat 1: "DAPAT DIPERIKSA".
 *    - Verifikasi Tingkat 2 via NIM & Wallet: verifiedNominative: true, hashVerified: true, piiDeleted: false.
 *
 * 2. Scenario 1: Mahasiswa Alifa Menarik Consent via `DELETE /api/consent`:
 *    - Memanggil endpoint dalam konteks identitas mahasiswa Alifa (x-user-id: ALIFA_USER_ID + x-admin-key).
 *    - Respons HTTP 200, success: true.
 *
 * 3. Scenario 2: Pengujian Komprehensif Status Pasca-Penarikan Consent & Imutabilitas Blockchain/IPFS:
 *    - CertificateBackup auto-backup row terbentuk dengan reason "Auto-backup before Withdraw Consent (Student)"
 *      dan createdBy === ALIFA_USER_ID, berisi data asli unmasked.
 *    - Active User teranonimkan: nama: "[DATA ANONIM]", nim berawalan "ANON-", email berawalan "deleted_",
 *      dataDeletedAt terisi, dataDeleteNote: "Dihapus oleh mahasiswa (Withdraw Consent)", dataConsent: false.
 *    - Certificate.dataSalt menjadi null.
 *    - AuditLog DATA_CONSENT_WITHDRAWN tercatat.
 *    - Verifikasi Tingkat 1 tetap "DAPAT DIPERIKSA" (Solana on-chain & IPFS tidak tersentuh).
 *    - Verifikasi Tingkat 2 via wallet: HTTP 200, verifiedNominative: false, hashVerified: null, piiDeleted: true.
 *    - Verifikasi Tingkat 2 via NIM lama F55124011: HTTP 404 (NIM tidak ditemukan).
 *    - Aset on-chain Solana & metadata IPFS publik terbukti bit-for-bit tidak berubah dibanding baseline.
 *
 * 4. Scenario 3: Prosedur Pemulihan Penuh 2-Langkah (+ Re-Claim) Mahasiswa Alifa:
 *    - Memanggil `restoreUserFromBackup` dari `scripts/restore-user-from-backup.ts`:
 *      Step A: Mengembalikan data User dari backup JSON (nama, nim, email, dataConsent: true, dataDeletedAt: null).
 *      Step B: Memanggil route admin recovery (`POST /api/admin/recovery`) dengan header x-admin-key.
 *      Step C: Memanggil callback klaim (`POST /api/actions/claim-callback?nim=F55124011`).
 *    - AuditLog CERT_RECOVERY dan CERT_CLAIMED tercatat.
 *
 * 5. Scenario 4: Pengujian Komprehensif Status Pasca-Pemulihan:
 *    - Sertifikat Alifa kembali berstatus CLAIMED.
 *    - Stepper profil mahasiswa Alifa lengkap 4/4 langkah.
 *    - Verifikasi Tingkat 1 tetap "DAPAT DIPERIKSA".
 *    - Verifikasi Tingkat 2 (query=F55124011): verifiedNominative: true, hashVerified: true, piiDeleted: false.
 *    - Verifikasi Tingkat 2 via wallet: verifiedNominative: true, hashVerified: true, piiDeleted: false.
 *    - Dokumentasi bahwa dataHash & dataSalt baru terbentuk secara sah sesuai desain.
 *
 * 6. Pencatatan log terstruktur JSONL ke:
 *    `experiments/2026-11-18/tc18b-2026-11-18.jsonl`
 *
 * CARA MENJALANKAN:
 *   node --env-file=.env ./node_modules/tsx/dist/cli.mjs scripts/tc18b-consent-after-issuance.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { loadEnvConfig } from "@next/env";
import { NextRequest } from "next/server";
import { prisma } from "../lib/prisma";
import { inspectCertificate } from "../lib/onchain";
import { DELETE as consentDELETE } from "../app/api/consent/route";
import { POST as tingkat1POST } from "../app/api/verify/tingkat-1/route";
import { GET as verifyGET } from "../app/api/verify/route";
import { restoreUserFromBackup } from "./restore-user-from-backup";

loadEnvConfig(process.cwd());

export const ALIFA_USER_ID = "46bf8d52-efa5-4f39-991c-4e3f872f0c0d";
export const ALIFA_NIM = "F55124011";
export const ALIFA_WALLET = "DtUVhcmkVnj6nfn8DJWnRiU3RqfSz2APBbGXzFdgxkpx";
export const ALIFA_MINT = "GqM5cbrY3QpPV6cHhaFdYzPcgDjzm9M6TchsxBTkUv1q";

export interface ScenarioAssertion {
  name: string;
  expected: unknown;
  actual: unknown;
  passed: boolean;
}

export interface ScenarioResult {
  scenarioNumber: number;
  scenarioKey: string;
  name: string;
  httpStatus?: number | null;
  durationMs: number;
  data?: Record<string, unknown>;
  assertions: ScenarioAssertion[];
  passed: boolean;
}

function assertEq(name: string, actual: unknown, expected: unknown): ScenarioAssertion {
  const passed = actual === expected;
  return { name, expected, actual, passed };
}

function assertNotNull(name: string, actual: unknown): ScenarioAssertion {
  const passed = actual !== null && actual !== undefined;
  return { name, expected: "NOT_NULL", actual: passed ? "VALID_VALUE" : String(actual), passed };
}

function assertNull(name: string, actual: unknown): ScenarioAssertion {
  const passed = actual === null;
  return { name, expected: null, actual, passed };
}

function assertTrue(name: string, actual: unknown): ScenarioAssertion {
  const passed = actual === true;
  return { name, expected: true, actual, passed };
}

function assertFalse(name: string, actual: unknown): ScenarioAssertion {
  const passed = actual === false;
  return { name, expected: false, actual, passed };
}

async function main() {
  const startedAt = new Date().toISOString();
  const today = startedAt.slice(0, 10);
  const results: ScenarioResult[] = [];

  console.log("===============================================================================");
  console.log("TC-18b: Penarikan Consent Pasca-Penerbitan & Pemulihan Penuh Alifa");
  console.log(`Waktu Mulai : ${startedAt}`);
  console.log(`Target      : Alifa (${ALIFA_NIM} / ${ALIFA_USER_ID})`);
  console.log(`NFT Mint    : ${ALIFA_MINT}`);
  console.log("===============================================================================\n");

  const adminKey =
    process.env.ADMIN_WALLET_PRIVATE_KEY || process.env.ADMIN_API_SECRET;
  if (!adminKey) {
    console.error("FATAL: ADMIN_WALLET_PRIVATE_KEY atau ADMIN_API_SECRET tidak diset!");
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // Skenario 0: Baseline Snapshot Mahasiswa Alifa
  // ---------------------------------------------------------------------------
  console.log("[Skenario 0] Mencatat Baseline Awal Mahasiswa Alifa...");
  const t0Start = Date.now();

  const userBaseline = await prisma.user.findUnique({
    where: { id: ALIFA_USER_ID },
    include: { certificate: true, wallet: true },
  });

  const onchainBaseline = await inspectCertificate(ALIFA_MINT);

  // Ambil metadata IPFS publik baseline
  let ipfsMetadataBaseline: Record<string, unknown> | null = null;
  if (userBaseline?.certificate?.metadataUri) {
    try {
      const ipfsRes = await fetch(userBaseline.certificate.metadataUri, {
        signal: AbortSignal.timeout(10000),
      });
      if (ipfsRes.ok) {
        ipfsMetadataBaseline = (await ipfsRes.json()) as Record<string, unknown>;
      }
    } catch (ipfsErr) {
      console.warn("Peringatan: Gagal fetch metadata IPFS baseline:", ipfsErr);
    }
  }

  // Verifikasi Tingkat 1 (baseline)
  const reqTingkat1Base = new NextRequest("http://localhost:3000/api/verify/tingkat-1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ asset: ALIFA_MINT }),
  });
  const resTingkat1Base = await tingkat1POST(reqTingkat1Base);
  const bodyTingkat1Base = await resTingkat1Base.json();

  // Verifikasi Tingkat 2 via NIM (baseline)
  const reqTingkat2NimBase = new NextRequest(
    `http://localhost:3000/api/verify?query=${ALIFA_NIM}`
  );
  const resTingkat2NimBase = await verifyGET(reqTingkat2NimBase);
  const bodyTingkat2NimBase = await resTingkat2NimBase.json();

  // Verifikasi Tingkat 2 via Wallet (baseline)
  const reqTingkat2WalletBase = new NextRequest(
    `http://localhost:3000/api/verify?query=${ALIFA_WALLET}`
  );
  const resTingkat2WalletBase = await verifyGET(reqTingkat2WalletBase);
  const bodyTingkat2WalletBase = await resTingkat2WalletBase.json();

  const s0Assertions: ScenarioAssertion[] = [
    assertNotNull("User Alifa ditemukan di database", userBaseline),
    assertEq("Nama Alifa sesuai baseline", userBaseline?.nama, "alifa nursintia marsya"),
    assertEq("NIM Alifa sesuai baseline", userBaseline?.nim, ALIFA_NIM),
    assertTrue("Consent Alifa bernilai true", userBaseline?.dataConsent),
    assertNull("dataDeletedAt Alifa adalah null (utuh)", userBaseline?.dataDeletedAt),
    assertEq("Wallet Alifa berstatus VERIFIED", userBaseline?.wallet?.status, "VERIFIED"),
    assertEq("Alamat wallet Alifa sesuai", userBaseline?.wallet?.walletAddress, ALIFA_WALLET),
    assertEq("Status sertifikat Alifa adalah CLAIMED", userBaseline?.certificate?.status, "CLAIMED"),
    assertEq("NFT address sertifikat sesuai", userBaseline?.certificate?.nftAddress, ALIFA_MINT),
    assertNotNull("dataSalt sertifikat terisi", userBaseline?.certificate?.dataSalt),
    assertNotNull("dataHash sertifikat terisi", userBaseline?.certificate?.dataHash),
    assertTrue("NFT on-chain exists", onchainBaseline.ok === true),
    assertTrue("NFT on-chain frozen", onchainBaseline.ok ? onchainBaseline.frozen : false),
    assertFalse("NFT on-chain revoked adalah false", onchainBaseline.ok ? onchainBaseline.revoked : true),
    assertEq("NFT on-chain owner sesuai", onchainBaseline.ok ? onchainBaseline.owner : null, ALIFA_WALLET),
    assertEq("Tingkat 1 HTTP status 200", resTingkat1Base.status, 200),
    assertEq("Tingkat 1 verdict adalah DAPAT DIPERIKSA", bodyTingkat1Base.verdict, "DAPAT DIPERIKSA"),
    assertEq("Tingkat 1 tokenExists DAPAT DIPERIKSA", bodyTingkat1Base.checks?.tokenExists?.status, "DAPAT DIPERIKSA"),
    assertEq("Tingkat 1 issuerAuthority DAPAT DIPERIKSA", bodyTingkat1Base.checks?.issuerAuthority?.status, "DAPAT DIPERIKSA"),
    assertEq("Tingkat 1 statusPencabutan DAPAT DIPERIKSA", bodyTingkat1Base.checks?.statusPencabutan?.status, "DAPAT DIPERIKSA"),
    assertEq("Tingkat 1 tokenFrozen DAPAT DIPERIKSA", bodyTingkat1Base.checks?.tokenFrozen?.status, "DAPAT DIPERIKSA"),
    assertEq("Tingkat 1 dataHashOnChain DAPAT DIPERIKSA", bodyTingkat1Base.checks?.dataHashOnChain?.status, "DAPAT DIPERIKSA"),
    assertEq("Tingkat 2 (NIM) HTTP status 200", resTingkat2NimBase.status, 200),
    assertTrue("Tingkat 2 (NIM) verifiedNominative true", bodyTingkat2NimBase.verifiedNominative),
    assertTrue("Tingkat 2 (NIM) hashVerified true", bodyTingkat2NimBase.hashVerified),
    assertFalse("Tingkat 2 (NIM) piiDeleted false", bodyTingkat2NimBase.piiDeleted),
    assertEq("Tingkat 2 (Wallet) HTTP status 200", resTingkat2WalletBase.status, 200),
    assertTrue("Tingkat 2 (Wallet) verifiedNominative true", bodyTingkat2WalletBase.verifiedNominative),
    assertTrue("Tingkat 2 (Wallet) hashVerified true", bodyTingkat2WalletBase.hashVerified),
    assertFalse("Tingkat 2 (Wallet) piiDeleted false", bodyTingkat2WalletBase.piiDeleted),
  ];

  const s0Passed = s0Assertions.every((a) => a.passed);
  results.push({
    scenarioNumber: 0,
    scenarioKey: "ALIFA_BASELINE_SNAPSHOT",
    name: "Pencatatan Lengkap Baseline Mahasiswa Alifa",
    httpStatus: 200,
    durationMs: Date.now() - t0Start,
    assertions: s0Assertions,
    passed: s0Passed,
    data: {
      userId: userBaseline?.id,
      nama: userBaseline?.nama,
      nim: userBaseline?.nim,
      certStatus: userBaseline?.certificate?.status,
      nftAddress: userBaseline?.certificate?.nftAddress,
      dataHash: userBaseline?.certificate?.dataHash,
      dataSalt: userBaseline?.certificate?.dataSalt,
      metadataUri: userBaseline?.certificate?.metadataUri,
      onchainOwner: onchainBaseline.ok ? onchainBaseline.owner : null,
      onchainFrozen: onchainBaseline.ok ? onchainBaseline.frozen : null,
      tingkat1Verdict: bodyTingkat1Base.verdict,
      tingkat2NimVerifiedNominative: bodyTingkat2NimBase.verifiedNominative,
    },
  });
  console.log(`[Skenario 0] Selesai (${s0Passed ? "LOLOS" : "GAGAL"}): ${s0Assertions.filter(a => a.passed).length}/${s0Assertions.length} asersi lolos.\n`);

  if (!s0Passed) {
    console.error("Baseline Alifa tidak valid! Pengujian dihentikan.");
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // Skenario 1: Mahasiswa Alifa Menarik Consent via DELETE /api/consent
  // ---------------------------------------------------------------------------
  console.log("[Skenario 1] Mahasiswa Alifa menarik consent via DELETE /api/consent...");
  const t1Start = Date.now();

  const consentReq = new NextRequest("http://localhost:3000/api/consent", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": adminKey,
      "x-user-id": ALIFA_USER_ID,
    },
  });

  const consentRes = await consentDELETE(consentReq);
  const consentBody = await consentRes.json();

  const s1Assertions: ScenarioAssertion[] = [
    assertEq("Endpoint DELETE /api/consent merespons HTTP 200", consentRes.status, 200),
    assertTrue("DELETE /api/consent mengembalikan success: true", consentBody.success),
    assertEq("Pesan respons penarikan consent sesuai", consentBody.message, "Persetujuan berhasil ditarik kembali"),
  ];

  const s1Passed = s1Assertions.every((a) => a.passed);
  results.push({
    scenarioNumber: 1,
    scenarioKey: "STUDENT_WITHDRAW_CONSENT_ACTION",
    name: "Mahasiswa Alifa Menarik Consent via DELETE /api/consent",
    httpStatus: consentRes.status,
    durationMs: Date.now() - t1Start,
    assertions: s1Assertions,
    passed: s1Passed,
    data: {
      userId: ALIFA_USER_ID,
      response: consentBody,
    },
  });
  console.log(`[Skenario 1] Selesai (${s1Passed ? "LOLOS" : "GAGAL"}): ${s1Assertions.filter(a => a.passed).length}/${s1Assertions.length} asersi lolos.\n`);

  if (!s1Passed) {
    console.error("Gagal menarik consent Alifa! Pengujian dihentikan.");
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // Skenario 2: Asersi Kondisi Pasca-Penarikan Consent
  // ---------------------------------------------------------------------------
  console.log("[Skenario 2] Menguji Kondisi Pasca-Penarikan Consent & Imutabilitas Blockchain/IPFS...");
  const t2Start = Date.now();

  // 1. Ambil data backup yang baru terbentuk
  const latestBackup = await prisma.certificateBackup.findFirst({
    where: { userId: ALIFA_USER_ID },
    orderBy: { createdAt: "desc" },
  });

  let parsedBackupData: Record<string, unknown> | null = null;
  if (latestBackup?.backupData) {
    try {
      parsedBackupData = JSON.parse(latestBackup.backupData);
    } catch {
      parsedBackupData = null;
    }
  }

  // 2. Ambil user aktif setelah penarikan consent
  const userAfterRevoke = await prisma.user.findUnique({
    where: { id: ALIFA_USER_ID },
    include: { certificate: true, wallet: true },
  });

  // 3. Ambil audit log DATA_CONSENT_WITHDRAWN
  const auditConsentWithdrawn = await prisma.auditLog.findFirst({
    where: { userId: ALIFA_USER_ID, action: "DATA_CONSENT_WITHDRAWN" },
    orderBy: { createdAt: "desc" },
  });

  // 4. Verifikasi Tingkat 1 pasca-penarikan consent
  const reqTingkat1PostRevoke = new NextRequest("http://localhost:3000/api/verify/tingkat-1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ asset: ALIFA_MINT }),
  });
  const resTingkat1PostRevoke = await tingkat1POST(reqTingkat1PostRevoke);
  const bodyTingkat1PostRevoke = await resTingkat1PostRevoke.json();

  // 5. Verifikasi Tingkat 2 via wallet pasca-penarikan consent
  const reqTingkat2WalletPostRevoke = new NextRequest(
    `http://localhost:3000/api/verify?query=${ALIFA_WALLET}`
  );
  const resTingkat2WalletPostRevoke = await verifyGET(reqTingkat2WalletPostRevoke);
  const bodyTingkat2WalletPostRevoke = await resTingkat2WalletPostRevoke.json();

  // 6. Verifikasi Tingkat 2 via NIM lama (F55124011) pasca-penarikan consent (harus 404)
  const reqTingkat2OldNim = new NextRequest(
    `http://localhost:3000/api/verify?query=${ALIFA_NIM}`
  );
  const resTingkat2OldNim = await verifyGET(reqTingkat2OldNim);
  const bodyTingkat2OldNim = await resTingkat2OldNim.json();

  // 7. Periksa aset on-chain Solana pasca-penarikan consent (harus tidak berubah bit-for-bit)
  const onchainPostRevoke = await inspectCertificate(ALIFA_MINT);

  // 8. Periksa metadata Pinata IPFS pasca-penarikan consent (harus tidak berubah bit-for-bit)
  let ipfsMetadataPostRevoke: Record<string, unknown> | null = null;
  if (userBaseline?.certificate?.metadataUri) {
    try {
      const res = await fetch(userBaseline.certificate.metadataUri, {
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        ipfsMetadataPostRevoke = (await res.json()) as Record<string, unknown>;
      }
    } catch (err) {
      console.warn("Peringatan: Gagal fetch metadata IPFS post revoke:", err);
    }
  }

  const backupUser = parsedBackupData?.user as Record<string, unknown> | undefined;
  const backupCert = parsedBackupData?.certificate as Record<string, unknown> | undefined;

  const s2Assertions: ScenarioAssertion[] = [
    assertNotNull("CertificateBackup baru terbentuk", latestBackup),
    assertEq("Reason CertificateBackup sesuai alur penarikan consent mahasiswa", latestBackup?.reason, "Auto-backup before Withdraw Consent (Student)"),
    assertEq("CertificateBackup createdBy adalah userId mahasiswa", latestBackup?.createdBy, ALIFA_USER_ID),
    assertNull("CertificateBackup usedAt awalnya null", latestBackup?.usedAt),
    assertEq("Backup berisi nama asli Alifa", backupUser?.nama, "alifa nursintia marsya"),
    assertEq("Backup berisi NIM asli Alifa", backupUser?.nim, ALIFA_NIM),
    assertEq("Backup berisi email asli Alifa", backupUser?.email, "f55124011@untad.ac.id"),
    assertEq("Backup berisi NFT address asli", backupCert?.nftAddress, ALIFA_MINT),
    assertEq("User nama dianonimkan menjadi [DATA ANONIM]", userAfterRevoke?.nama, "[DATA ANONIM]"),
    assertTrue("User nim diawali ANON-", userAfterRevoke?.nim.startsWith("ANON-")),
    assertTrue("User email diawali deleted_", userAfterRevoke?.email.startsWith("deleted_")),
    assertNotNull("User dataDeletedAt terisi", userAfterRevoke?.dataDeletedAt),
    assertEq("User dataDeleteNote adalah 'Dihapus oleh mahasiswa (Withdraw Consent)'", userAfterRevoke?.dataDeleteNote, "Dihapus oleh mahasiswa (Withdraw Consent)"),
    assertFalse("User dataConsent bernilai false", userAfterRevoke?.dataConsent),
    assertNull("User consentGivenAt bernilai null", userAfterRevoke?.consentGivenAt),
    assertNull("Certificate dataSalt adalah null", userAfterRevoke?.certificate?.dataSalt),
    assertEq("Certificate dataHash lama tetap tersimpan", userAfterRevoke?.certificate?.dataHash, userBaseline?.certificate?.dataHash),
    assertNotNull("AuditLog DATA_CONSENT_WITHDRAWN tercatat", auditConsentWithdrawn),
    assertEq("Tingkat 1 pasca-revoke tetap 200", resTingkat1PostRevoke.status, 200),
    assertEq("Tingkat 1 pasca-revoke tetap DAPAT DIPERIKSA", bodyTingkat1PostRevoke.verdict, "DAPAT DIPERIKSA"),
    assertEq("Tingkat 1 tokenExists tetap DAPAT DIPERIKSA", bodyTingkat1PostRevoke.checks?.tokenExists?.status, "DAPAT DIPERIKSA"),
    assertEq("Tingkat 1 issuerAuthority tetap DAPAT DIPERIKSA", bodyTingkat1PostRevoke.checks?.issuerAuthority?.status, "DAPAT DIPERIKSA"),
    assertEq("Tingkat 1 statusPencabutan tetap DAPAT DIPERIKSA", bodyTingkat1PostRevoke.checks?.statusPencabutan?.status, "DAPAT DIPERIKSA"),
    assertEq("Tingkat 1 tokenFrozen tetap DAPAT DIPERIKSA", bodyTingkat1PostRevoke.checks?.tokenFrozen?.status, "DAPAT DIPERIKSA"),
    assertEq("Tingkat 1 dataHashOnChain tetap DAPAT DIPERIKSA", bodyTingkat1PostRevoke.checks?.dataHashOnChain?.status, "DAPAT DIPERIKSA"),
    assertEq("Tingkat 2 (Wallet) pasca-revoke mengembalikan 200", resTingkat2WalletPostRevoke.status, 200),
    assertFalse("Tingkat 2 (Wallet) verifiedNominative adalah false", bodyTingkat2WalletPostRevoke.verifiedNominative),
    assertNull("Tingkat 2 (Wallet) hashVerified adalah null", bodyTingkat2WalletPostRevoke.hashVerified),
    assertTrue("Tingkat 2 (Wallet) piiDeleted adalah true", bodyTingkat2WalletPostRevoke.piiDeleted),
    assertEq("Tingkat 2 (Wallet) data.nama disamarkan", bodyTingkat2WalletPostRevoke.data?.nama, "[DATA DIHAPUS]"),
    assertEq("Tingkat 2 (Wallet) data.nim disamarkan", bodyTingkat2WalletPostRevoke.data?.nim, "[DIHAPUS]"),
    assertEq("Tingkat 2 (NIM Lama) mengembalikan HTTP 404", resTingkat2OldNim.status, 404),
    assertEq("Aset on-chain Solana owner tidak berubah", onchainPostRevoke.ok ? onchainPostRevoke.owner : null, onchainBaseline.ok ? onchainBaseline.owner : null),
    assertEq("Aset on-chain Solana frozen tidak berubah", onchainPostRevoke.ok ? onchainPostRevoke.frozen : null, onchainBaseline.ok ? onchainBaseline.frozen : null),
    assertEq("Aset on-chain Solana updateAuthority tidak berubah", onchainPostRevoke.ok ? onchainPostRevoke.updateAuthority : null, onchainBaseline.ok ? onchainBaseline.updateAuthority : null),
    assertEq("Aset on-chain Solana name tidak berubah", onchainPostRevoke.ok ? onchainPostRevoke.name : null, onchainBaseline.ok ? onchainBaseline.name : null),
    assertEq("Aset on-chain Solana uri tidak berubah", onchainPostRevoke.ok ? onchainPostRevoke.uri : null, onchainBaseline.ok ? onchainBaseline.uri : null),
    assertEq(
      "Metadata IPFS bit-for-bit tidak berubah",
      JSON.stringify(ipfsMetadataPostRevoke),
      JSON.stringify(ipfsMetadataBaseline)
    ),
  ];

  const s2Passed = s2Assertions.every((a) => a.passed);
  results.push({
    scenarioNumber: 2,
    scenarioKey: "POST_WITHDRAWAL_ASSERTIONS",
    name: "Pengujian Komprehensif Status Pasca-Penarikan Consent & Imutabilitas Blockchain/IPFS",
    httpStatus: 200,
    durationMs: Date.now() - t2Start,
    assertions: s2Assertions,
    passed: s2Passed,
    data: {
      backupId: latestBackup?.id,
      backupReason: latestBackup?.reason,
      backupCreatedBy: latestBackup?.createdBy,
      userAnonimNim: userAfterRevoke?.nim,
      userAnonimEmail: userAfterRevoke?.email,
      tingkat1Verdict: bodyTingkat1PostRevoke.verdict,
      tingkat2WalletResponse: bodyTingkat2WalletPostRevoke,
      tingkat2OldNimStatus: resTingkat2OldNim.status,
      onchainUriUnchanged: onchainPostRevoke.ok && onchainBaseline.ok ? onchainPostRevoke.uri === onchainBaseline.uri : false,
    },
  });
  console.log(`[Skenario 2] Selesai (${s2Passed ? "LOLOS" : "GAGAL"}): ${s2Assertions.filter(a => a.passed).length}/${s2Assertions.length} asersi lolos.\n`);

  if (!s2Passed) {
    console.error("Asersi pasca-penarikan consent gagal! Melanjutkan ke recovery untuk memulihkan Alifa...");
  }

  // ---------------------------------------------------------------------------
  // Skenario 3: Prosedur Pemulihan Penuh 2-Langkah (+ Re-Claim) Mahasiswa Alifa
  // ---------------------------------------------------------------------------
  console.log("[Skenario 3] Menjalankan Prosedur Pemulihan Alifa (Restore User -> Recovery Route -> Re-Claim)...");
  const t3Start = Date.now();

  let restoreResult = null;
  let restoreError: string | null = null;
  try {
    restoreResult = await restoreUserFromBackup({
      backupId: latestBackup?.id,
      userId: ALIFA_USER_ID,
      adminKey,
    });
  } catch (err) {
    restoreError = String(err);
    console.error("Kesalahan saat menjalankan restoreUserFromBackup:", err);
  }

  // Ambil audit log pemulihan
  const auditRecovery = await prisma.auditLog.findFirst({
    where: { userId: ALIFA_USER_ID, action: "CERT_RECOVERY" },
    orderBy: { createdAt: "desc" },
  });
  const auditClaimed = await prisma.auditLog.findFirst({
    where: { userId: ALIFA_USER_ID, action: "CERT_CLAIMED" },
    orderBy: { createdAt: "desc" },
  });

  const s3Assertions: ScenarioAssertion[] = [
    assertNull("Tidak ada exception saat menjalankan pemulihan", restoreError),
    assertNotNull("Hasil restoreUserFromBackup tidak null", restoreResult),
    assertTrue("Prosedur restore dinyatakan berhasil (success: true)", restoreResult?.success),
    assertEq("Status sertifikat hasil pemulihan adalah CLAIMED", restoreResult?.status, "CLAIMED"),
    assertTrue("Stepper profil mahasiswa selesai 4/4 langkah", restoreResult?.stepperCompleted),
    assertTrue("Stepper Step 1 (Registrasi) selesai", restoreResult?.stepDetails.step1Registration),
    assertTrue("Stepper Step 2 (Wallet) selesai", restoreResult?.stepDetails.step2Wallet),
    assertTrue("Stepper Step 3 (Penerbitan) selesai", restoreResult?.stepDetails.step3Issuance),
    assertTrue("Stepper Step 4 (Klaim) selesai", restoreResult?.stepDetails.step4Claim),
    assertNotNull("AuditLog CERT_RECOVERY tercatat", auditRecovery),
    assertNotNull("AuditLog CERT_CLAIMED tercatat", auditClaimed),
  ];

  const s3Passed = s3Assertions.every((a) => a.passed);
  results.push({
    scenarioNumber: 3,
    scenarioKey: "RESTORE_TWO_STEP_EXECUTION",
    name: "Eksekusi Pemulihan 2-Langkah Alifa (User -> Admin Recovery -> Claim Callback)",
    httpStatus: 200,
    durationMs: Date.now() - t3Start,
    assertions: s3Assertions,
    passed: s3Passed,
    data: {
      backupId: latestBackup?.id,
      restoreResult,
      auditRecovery: auditRecovery?.detail,
      auditClaimed: auditClaimed?.detail,
    },
  });
  console.log(`[Skenario 3] Selesai (${s3Passed ? "LOLOS" : "GAGAL"}): ${s3Assertions.filter(a => a.passed).length}/${s3Assertions.length} asersi lolos.\n`);

  // ---------------------------------------------------------------------------
  // Skenario 4: Pengujian Kondisi Pasca-Pemulihan
  // ---------------------------------------------------------------------------
  console.log("[Skenario 4] Menguji Kondisi Pasca-Pemulihan Mahasiswa Alifa...");
  const t4Start = Date.now();

  const userRestored = await prisma.user.findUnique({
    where: { id: ALIFA_USER_ID },
    include: { certificate: true, wallet: true },
  });

  const onchainRestored = await inspectCertificate(ALIFA_MINT);

  // Verifikasi Tingkat 1 pasca-pemulihan
  const reqTingkat1Restored = new NextRequest("http://localhost:3000/api/verify/tingkat-1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ asset: ALIFA_MINT }),
  });
  const resTingkat1Restored = await tingkat1POST(reqTingkat1Restored);
  const bodyTingkat1Restored = await resTingkat1Restored.json();

  // Verifikasi Tingkat 2 via NIM pasca-pemulihan
  const reqTingkat2NimRestored = new NextRequest(
    `http://localhost:3000/api/verify?query=${ALIFA_NIM}`
  );
  const resTingkat2NimRestored = await verifyGET(reqTingkat2NimRestored);
  const bodyTingkat2NimRestored = await resTingkat2NimRestored.json();

  // Verifikasi Tingkat 2 via Wallet pasca-pemulihan
  const reqTingkat2WalletRestored = new NextRequest(
    `http://localhost:3000/api/verify?query=${ALIFA_WALLET}`
  );
  const resTingkat2WalletRestored = await verifyGET(reqTingkat2WalletRestored);
  const bodyTingkat2WalletRestored = await resTingkat2WalletRestored.json();

  // Evaluasi stepper profil
  const restoredCert = userRestored?.certificate;
  const restoredWallet = userRestored?.wallet;
  let currentStepRestored = 1;
  if (restoredWallet?.status === "PENDING") currentStepRestored = 1;
  else if (restoredWallet?.status === "VERIFIED") {
    currentStepRestored = 2;
    if (restoredCert?.status === "MINTED") currentStepRestored = 3;
    if (restoredCert?.status === "CLAIMED" || restoredCert?.status === "REVOKED") currentStepRestored = 4;
  }
  const isRevokedRestored = restoredCert?.status === "REVOKED";
  const finalStepper4of4 =
    currentStepRestored >= 4 && !isRevokedRestored && restoredWallet?.status === "VERIFIED";

  // Periksa bahwa dataHash dan dataSalt baru di-regenerate (berbeda dari baseline)
  const hashRegenerated =
    userRestored?.certificate?.dataHash !== userBaseline?.certificate?.dataHash;
  const saltRegenerated =
    userRestored?.certificate?.dataSalt !== userBaseline?.certificate?.dataSalt;

  const s4Assertions: ScenarioAssertion[] = [
    assertNotNull("User Alifa terverifikasi ada di DB", userRestored),
    assertEq("Nama Alifa pulih sempurna", userRestored?.nama, "alifa nursintia marsya"),
    assertEq("NIM Alifa pulih sempurna", userRestored?.nim, ALIFA_NIM),
    assertEq("Email Alifa pulih sempurna", userRestored?.email, "f55124011@untad.ac.id"),
    assertTrue("dataConsent Alifa kembali true", userRestored?.dataConsent),
    assertNull("dataDeletedAt Alifa kembali null", userRestored?.dataDeletedAt),
    assertNull("dataDeleteNote Alifa kembali null", userRestored?.dataDeleteNote),
    assertEq("Status sertifikat Alifa adalah CLAIMED", userRestored?.certificate?.status, "CLAIMED"),
    assertNotNull("dataSalt sertifikat baru terisi", userRestored?.certificate?.dataSalt),
    assertNotNull("dataHash sertifikat baru terisi", userRestored?.certificate?.dataHash),
    assertTrue("dataHash baru di-regenerate sesuai desain", hashRegenerated),
    assertTrue("dataSalt baru di-regenerate sesuai desain", saltRegenerated),
    assertTrue("Stepper profil Alifa terkonfirmasi 4/4 selesai", finalStepper4of4),
    assertTrue("NFT on-chain exists", onchainRestored.ok === true),
    assertTrue("NFT on-chain frozen", onchainRestored.ok ? onchainRestored.frozen : false),
    assertFalse("NFT on-chain revoked adalah false", onchainRestored.ok ? onchainRestored.revoked : true),
    assertEq("Tingkat 1 pasca-restore status 200", resTingkat1Restored.status, 200),
    assertEq("Tingkat 1 pasca-restore verdict adalah DAPAT DIPERIKSA", bodyTingkat1Restored.verdict, "DAPAT DIPERIKSA"),
    assertEq("Tingkat 1 tokenExists DAPAT DIPERIKSA", bodyTingkat1Restored.checks?.tokenExists?.status, "DAPAT DIPERIKSA"),
    assertEq("Tingkat 1 issuerAuthority DAPAT DIPERIKSA", bodyTingkat1Restored.checks?.issuerAuthority?.status, "DAPAT DIPERIKSA"),
    assertEq("Tingkat 1 statusPencabutan DAPAT DIPERIKSA", bodyTingkat1Restored.checks?.statusPencabutan?.status, "DAPAT DIPERIKSA"),
    assertEq("Tingkat 1 tokenFrozen DAPAT DIPERIKSA", bodyTingkat1Restored.checks?.tokenFrozen?.status, "DAPAT DIPERIKSA"),
    assertEq("Tingkat 1 dataHashOnChain DAPAT DIPERIKSA", bodyTingkat1Restored.checks?.dataHashOnChain?.status, "DAPAT DIPERIKSA"),
    assertEq("Tingkat 2 (NIM) pasca-restore status 200", resTingkat2NimRestored.status, 200),
    assertTrue("Tingkat 2 (NIM) verifiedNominative true", bodyTingkat2NimRestored.verifiedNominative),
    assertTrue("Tingkat 2 (NIM) hashVerified true", bodyTingkat2NimRestored.hashVerified),
    assertFalse("Tingkat 2 (NIM) piiDeleted false", bodyTingkat2NimRestored.piiDeleted),
    assertEq("Tingkat 2 (Wallet) pasca-restore status 200", resTingkat2WalletRestored.status, 200),
    assertTrue("Tingkat 2 (Wallet) verifiedNominative true", bodyTingkat2WalletRestored.verifiedNominative),
    assertTrue("Tingkat 2 (Wallet) hashVerified true", bodyTingkat2WalletRestored.hashVerified),
    assertFalse("Tingkat 2 (Wallet) piiDeleted false", bodyTingkat2WalletRestored.piiDeleted),
  ];

  const s4Passed = s4Assertions.every((a) => a.passed);
  results.push({
    scenarioNumber: 4,
    scenarioKey: "POST_RESTORE_ASSERTIONS",
    name: "Pengujian Komprehensif Status Pasca-Pemulihan & Verifikasi Kriptografis/Nominatif",
    httpStatus: 200,
    durationMs: Date.now() - t4Start,
    assertions: s4Assertions,
    passed: s4Passed,
    data: {
      userId: userRestored?.id,
      nama: userRestored?.nama,
      nim: userRestored?.nim,
      certStatus: userRestored?.certificate?.status,
      baselineDataHash: userBaseline?.certificate?.dataHash,
      restoredDataHash: userRestored?.certificate?.dataHash,
      baselineDataSalt: userBaseline?.certificate?.dataSalt,
      restoredDataSalt: userRestored?.certificate?.dataSalt,
      newMetadataUri: userRestored?.certificate?.metadataUri,
      stepper4of4: finalStepper4of4,
      tingkat1Verdict: bodyTingkat1Restored.verdict,
      tingkat2NimVerifiedNominative: bodyTingkat2NimRestored.verifiedNominative,
      tingkat2NimHashVerified: bodyTingkat2NimRestored.hashVerified,
    },
  });
  console.log(`[Skenario 4] Selesai (${s4Passed ? "LOLOS" : "GAGAL"}): ${s4Assertions.filter(a => a.passed).length}/${s4Assertions.length} asersi lolos.\n`);

  // ---------------------------------------------------------------------------
  // Penulisan Log Terstruktur JSONL
  // ---------------------------------------------------------------------------
  const expDir = path.join(process.cwd(), "experiments", "2026-11-18");
  if (!fs.existsSync(expDir)) {
    fs.mkdirSync(expDir, { recursive: true });
  }
  const logFile = path.join(expDir, "tc18b-2026-11-18.jsonl");

  if (fs.existsSync(logFile)) {
    fs.unlinkSync(logFile);
  }

  const allPassed = results.every((r) => r.passed);

  for (const r of results) {
    const record = {
      testCase: "TC-18b",
      scenario: r.scenarioKey,
      scenarioNumber: r.scenarioNumber,
      name: r.name,
      runAt: startedAt,
      date: today,
      httpStatus: r.httpStatus ?? null,
      durationMs: r.durationMs,
      assertions: r.assertions,
      passed: r.passed,
      data: r.data ?? null,
      softwareVersions: {
        node: process.version,
        next: "16.2.11",
        prisma: "5.19.1",
      },
    };
    fs.appendFileSync(logFile, JSON.stringify(record) + "\n", "utf8");
  }

  // Tulis satu entri SUMMARY terpadu
  const summaryRecord = {
    testCase: "TC-18b",
    scenario: "SUMMARY",
    runAt: startedAt,
    date: today,
    totalScenarios: results.length,
    scenariosPassed: results.filter((r) => r.passed).length,
    allPassed,
    student: {
      userId: ALIFA_USER_ID,
      nim: ALIFA_NIM,
      wallet: ALIFA_WALLET,
      nftMint: ALIFA_MINT,
      baselineDataHash: userBaseline?.certificate?.dataHash,
      restoredDataHash: userRestored?.certificate?.dataHash,
      baselineDataSalt: userBaseline?.certificate?.dataSalt,
      restoredDataSalt: userRestored?.certificate?.dataSalt,
      certStatus: userRestored?.certificate?.status,
      stepperCompleted: finalStepper4of4,
    },
    scenarios: results.map((r) => ({
      number: r.scenarioNumber,
      key: r.scenarioKey,
      name: r.name,
      passed: r.passed,
      assertionsCount: r.assertions.length,
      passedAssertions: r.assertions.filter((a) => a.passed).length,
      durationMs: r.durationMs,
    })),
  };
  fs.appendFileSync(logFile, JSON.stringify(summaryRecord) + "\n", "utf8");

  // ---------------------------------------------------------------------------
  // Tampilkan Ringkasan Lengkap ke Console
  // ---------------------------------------------------------------------------
  console.log("===============================================================================");
  console.log("RINGKASAN HASIL EKSEKUSI TC-18b:");
  for (const r of results) {
    console.log(`  [${r.passed ? "LOLOS" : "GAGAL"}] Skenario ${r.scenarioNumber}: ${r.name} (${r.durationMs}ms)`);
    for (const a of r.assertions) {
      console.log(`      * ${a.passed ? "✓" : "✗"} ${a.name} (Ekspektasi: ${JSON.stringify(a.expected)}, Aktual: ${JSON.stringify(a.actual)})`);
    }
  }
  console.log(`\nLog JSONL tersimpan di: ${logFile}`);
  console.log(`Status Akhir: ${allPassed ? "SELURUH SKENARIO TC-18b LOLOS (EXIT CODE 0)" : "ADA SKENARIO GAGAL (EXIT CODE 1)"}`);
  console.log("===============================================================================");

  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal error during TC-18b execution:", err);
  process.exit(1);
});
