/**
 * scripts/tc18a-consent-before-issuance.ts — TC-18a: Penarikan Consent Pra-Penerbitan
 *
 * TUJUAN:
 * Menguji dan memverifikasi perilaku sistem SIJAGA ketika mahasiswa menarik
 * persetujuan pemrosesan data (consent withdrawal) SEBELUM sertifikat/ijazah diterbitkan
 * (pre-minting lifecycle state).
 *
 * PERSYARATAN & ATURAN INTEGRITAS:
 * 1. DILARANG menyentuh data mahasiswa Alifa (F55124011) — Alifa sudah berstatus CLAIMED.
 * 2. Mahasiswa uji dibuat melalui alur normal aplikasi (`registerWithEmail` di `app/(auth)/register/actions.ts`),
 *    bukan direct DB write `prisma.user.create`.
 * 3. Menggunakan identitas uji unik per run (`TC18A_<timestamp>`, email `tc18a_<timestamp>@sijaga.ac.id`).
 * 4. Verifikasi bertahap:
 *    a. Registrasi mahasiswa uji berhasil dan tercatat di Prisma DB & Neon Auth.
 *    b. Mahasiswa login dan memberikan persetujuan (`POST /api/consent`):
 *       - dataConsent: true, consentGivenAt: not null, consentVersion: "v1.0"
 *       - Audit log: DATA_CONSENT_GIVEN tercatat.
 *    c. Mahasiswa menarik persetujuan (`DELETE /api/consent`) sebelum sertifikat terbit:
 *       - dataConsent: false, consentGivenAt: null.
 *       - 0 sertifikat / NFT terbit di database maupun on-chain.
 *       - PII mahasiswa (nama, NIM, email) TETAP UTUH (tidak dianonimkan, dataDeletedAt: null).
 *       - Audit log: DATA_CONSENT_WITHDRAWN tercatat.
 * 5. Simpan rekaman terstruktur ke `experiments/2026-11-18/tc18a-2026-11-18.jsonl`.
 *
 * CARA MENJALANKAN:
 *   node --env-file=.env ./node_modules/tsx/dist/cli.mjs scripts/tc18a-consent-before-issuance.ts
 */

import fs from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { NextRequest } from "next/server";
import { prisma } from "../lib/prisma";
import { auth } from "../lib/auth/server";
import { registerWithEmail } from "../app/(auth)/register/actions";
import { POST as consentPOST, GET as consentGET, DELETE as consentDELETE } from "../app/api/consent/route";

// Muat variabel lingkungan
loadEnvConfig(process.cwd());

const ALIFA_NIM = "F55124011";

interface ScenarioAssertion {
  name: string;
  expected: unknown;
  actual: unknown;
  passed: boolean;
}

interface ScenarioResult {
  scenarioNumber: number;
  scenarioKey: string;
  name: string;
  httpStatus?: number;
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

async function main() {
  const startedAt = new Date().toISOString();
  const today = startedAt.slice(0, 10);
  const runTimestamp = Date.now();
  const results: ScenarioResult[] = [];

  console.log("===============================================================================");
  console.log("TC-18a: Penarikan Consent Pra-Penerbitan (Consent Withdrawal Before Minting)");
  console.log(`Waktu Mulai : ${startedAt}`);
  console.log(`Tanggal Uji : ${today}`);
  console.log("===============================================================================\n");

  // ---------------------------------------------------------------------------
  // Skenario 0: Pemeriksaan Baseline Mahasiswa Alifa (Safety & Isolation Invariant)
  // ---------------------------------------------------------------------------
  console.log("[Skenario 0] Memeriksa status isolasi mahasiswa Alifa (F55124011)...");
  const t0Start = Date.now();
  const alifaBefore = await prisma.user.findFirst({
    where: { nim: ALIFA_NIM },
    include: { certificate: true, wallet: true },
  });

  const s0Assertions: ScenarioAssertion[] = [
    assertNotNull("Mahasiswa Alifa terdaftar di DB", alifaBefore),
    assertEq("Status sertifikat Alifa adalah CLAIMED", alifaBefore?.certificate?.status, "CLAIMED"),
    assertEq("Consent Alifa bernilai true", alifaBefore?.dataConsent, true),
    assertNull("dataDeletedAt Alifa adalah null (utuh)", alifaBefore?.dataDeletedAt),
  ];

  const s0Passed = s0Assertions.every((a) => a.passed);
  results.push({
    scenarioNumber: 0,
    scenarioKey: "ALIFA_SAFETY_BASELINE",
    name: "Pemeriksaan Keutuhan Data Mahasiswa Alifa (Baseline)",
    durationMs: Date.now() - t0Start,
    data: {
      nim: alifaBefore?.nim,
      nama: alifaBefore?.nama,
      certStatus: alifaBefore?.certificate?.status,
      nftAddress: alifaBefore?.certificate?.nftAddress,
    },
    assertions: s0Assertions,
    passed: s0Passed,
  });

  if (!s0Passed) {
    console.error("GAGAL: Baseline Alifa tidak sesuai ekspektasi. Uji dibatalkan demi keamanan.");
    process.exit(1);
  }
  console.log(`  ✓ Alifa aman (status: ${alifaBefore?.certificate?.status}, nft: ${alifaBefore?.certificate?.nftAddress})\n`);

  // ---------------------------------------------------------------------------
  // Skenario 1: Registrasi Mahasiswa Uji Baru Melalui Normal Application Flow
  // ---------------------------------------------------------------------------
  const testNim = `TC18A_${runTimestamp}`;
  const testEmail = `tc18a_${runTimestamp}@sijaga.ac.id`;
  const testNama = `TC18A Mahasiswa Uji ${runTimestamp}`;
  const testPassword = "Password123!";
  const testProdi = "Informatika";
  const testTahunLulus = "2026";

  console.log(`[Skenario 1] Mendaftarkan mahasiswa uji disposable via registerWithEmail...`);
  console.log(`  NIM   : ${testNim}`);
  console.log(`  Nama  : ${testNama}`);
  console.log(`  Email : ${testEmail}`);

  const t1Start = Date.now();
  const regFormData = new FormData();
  regFormData.append("nama", testNama);
  regFormData.append("nim", testNim);
  regFormData.append("email", testEmail);
  regFormData.append("password", testPassword);
  regFormData.append("confirmPassword", testPassword);
  regFormData.append("prodi", testProdi);
  regFormData.append("tahunLulus", testTahunLulus);

  let redirectDigest: string | null = null;
  let regActionError: string | null = null;

  try {
    const regResult = await registerWithEmail(null, regFormData);
    if (regResult && "error" in regResult && regResult.error) {
      regActionError = regResult.error;
    }
  } catch (err: unknown) {
    // Normal redirect in Next.js Server Action
    if (err && typeof err === "object" && "digest" in err) {
      redirectDigest = String((err as { digest: unknown }).digest);
    } else {
      regActionError = err instanceof Error ? err.message : String(err);
    }
  }

  // Verifikasi record di DB
  const createdUser = await prisma.user.findFirst({
    where: { nim: testNim },
    include: { certificates: true },
  });

  const initialBackup = createdUser
    ? await prisma.certificateBackup.findFirst({
        where: { userId: createdUser.id, reason: "Auto-backup initial registration" },
      })
    : null;

  const s1Assertions: ScenarioAssertion[] = [
    assertNull("Tidak ada error saat pemanggilan registerWithEmail", regActionError),
    assertNotNull("User baru terbentuk di Prisma DB", createdUser),
    assertEq("Role user adalah MAHASISWA", createdUser?.role, "MAHASISWA"),
    assertEq("Status consent awal adalah false", createdUser?.dataConsent, false),
    assertNull("consentGivenAt awal adalah null", createdUser?.consentGivenAt),
    assertNull("dataDeletedAt awal adalah null", createdUser?.dataDeletedAt),
    assertEq("Jumlah sertifikat awal adalah 0", createdUser?.certificates.length, 0),
    assertNotNull("Auto-backup awal pendaftaran dibuat", initialBackup),
  ];

  const s1Passed = s1Assertions.every((a) => a.passed);
  results.push({
    scenarioNumber: 1,
    scenarioKey: "REGISTER_NORMAL_FLOW",
    name: "Registrasi Mahasiswa Uji Baru (registerWithEmail)",
    durationMs: Date.now() - t1Start,
    data: {
      userId: createdUser?.id,
      nim: createdUser?.nim,
      nama: createdUser?.nama,
      email: createdUser?.email,
      redirectDigest,
      backupId: initialBackup?.id,
    },
    assertions: s1Assertions,
    passed: s1Passed,
  });

  if (!s1Passed || !createdUser) {
    console.error("GAGAL: Registrasi mahasiswa uji gagal.");
    process.exit(1);
  }
  console.log(`  ✓ User berhasil terdaftar: ID=${createdUser.id}, initial backup ID=${initialBackup?.id}\n`);

  // ---------------------------------------------------------------------------
  // Skenario 2: Login Mahasiswa Uji untuk Mendapatkan Session Cookies
  // ---------------------------------------------------------------------------
  console.log(`[Skenario 2] Login mahasiswa uji via /api/auth/sign-in/email...`);
  const t2Start = Date.now();
  const authHandler = auth.handler();
  const signInReq = new Request("http://localhost:3000/api/auth/sign-in/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: testEmail, password: testPassword }),
  });

  const signInRes = await authHandler.POST(signInReq, {
    params: Promise.resolve({ path: ["sign-in", "email"] }),
  });
  const signInHttpStatus = signInRes.status;
  const rawSetCookie = signInRes.headers.get("set-cookie") || "";
  const cookieHeader = rawSetCookie
    .split(", ")
    .map((c) => c.split(";")[0])
    .join("; ");

  const hasSessionToken = cookieHeader.includes("__Secure-neon-auth.session_token");
  const hasSessionData = cookieHeader.includes("__Secure-neon-auth.local.session_data");

  const s2Assertions: ScenarioAssertion[] = [
    assertEq("HTTP status sign-in adalah 200", signInHttpStatus, 200),
    assertEq("Session token cookie hadir", hasSessionToken, true),
    assertEq("Signed session data cookie hadir", hasSessionData, true),
  ];

  const s2Passed = s2Assertions.every((a) => a.passed);
  results.push({
    scenarioNumber: 2,
    scenarioKey: "STUDENT_SIGNIN",
    name: "Autentikasi Mahasiswa Uji (Neon Auth Session Cookies)",
    httpStatus: signInHttpStatus,
    durationMs: Date.now() - t2Start,
    data: {
      hasSessionToken,
      hasSessionData,
      cookieHeaderLength: cookieHeader.length,
    },
    assertions: s2Assertions,
    passed: s2Passed,
  });

  if (!s2Passed) {
    console.error("GAGAL: Gagal melakukan login mahasiswa uji.");
    process.exit(1);
  }
  console.log(`  ✓ Login berhasil, session cookies berhasil diperoleh\n`);

  // ---------------------------------------------------------------------------
  // Skenario 3: Pemberian Consent (POST /api/consent) & Invariant Check
  // ---------------------------------------------------------------------------
  console.log(`[Skenario 3] Memberikan consent via POST /api/consent...`);
  const t3Start = Date.now();
  const postReq = new NextRequest("http://localhost:3000/api/consent", {
    method: "POST",
    headers: {
      cookie: cookieHeader,
      "x-forwarded-for": "180.247.45.82",
    },
  });

  const postRes = await consentPOST(postReq);
  const postStatus = postRes.status;
  const postBody = (await postRes.json()) as { success?: boolean; message?: string };

  // Verifikasi via GET /api/consent
  const getReq = new NextRequest("http://localhost:3000/api/consent", {
    headers: { cookie: cookieHeader },
  });
  const getRes = await consentGET(getReq);
  const getStatus = getRes.status;
  const getBody = (await getRes.json()) as {
    dataConsent?: boolean;
    consentGivenAt?: string | null;
    consentVersion?: string | null;
    certificateStatus?: string;
  };

  // Verifikasi via Prisma DB
  const userAfterConsent = await prisma.user.findUnique({
    where: { id: createdUser.id },
  });

  // Verifikasi Audit Log
  const consentGivenLog = await prisma.auditLog.findFirst({
    where: {
      userId: createdUser.id,
      action: "DATA_CONSENT_GIVEN",
    },
    orderBy: { createdAt: "desc" },
  });

  const s3Assertions: ScenarioAssertion[] = [
    assertEq("POST /api/consent status 200", postStatus, 200),
    assertEq("POST response success is true", postBody.success, true),
    assertEq("GET /api/consent status 200", getStatus, 200),
    assertEq("GET response dataConsent is true", getBody.dataConsent, true),
    assertNotNull("GET response consentGivenAt is not null", getBody.consentGivenAt),
    assertEq("GET response consentVersion is v1.0", getBody.consentVersion, "v1.0"),
    assertEq("GET response certificateStatus is NOT_ISSUED", getBody.certificateStatus, "NOT_ISSUED"),
    assertEq("DB user.dataConsent is true", userAfterConsent?.dataConsent, true),
    assertNotNull("DB user.consentGivenAt is not null", userAfterConsent?.consentGivenAt),
    assertEq("DB user.consentVersion is v1.0", userAfterConsent?.consentVersion, "v1.0"),
    assertNotNull("AuditLog DATA_CONSENT_GIVEN tercatat", consentGivenLog),
  ];

  const s3Passed = s3Assertions.every((a) => a.passed);
  results.push({
    scenarioNumber: 3,
    scenarioKey: "GRANT_CONSENT",
    name: "Pemberian Consent Mahasiswa (POST /api/consent)",
    httpStatus: postStatus,
    durationMs: Date.now() - t3Start,
    data: {
      postResponse: postBody,
      getStatus,
      getBody,
      auditLogId: consentGivenLog?.id,
      auditLogDetail: consentGivenLog?.detail,
    },
    assertions: s3Assertions,
    passed: s3Passed,
  });

  if (!s3Passed) {
    console.error("GAGAL: Pemberian consent gagal memenuhi assertion.");
    process.exit(1);
  }
  console.log(`  ✓ Consent berhasil diberikan: dataConsent=true, log action=${consentGivenLog?.action}\n`);

  // ---------------------------------------------------------------------------
  // Skenario 4: Penarikan Consent Pra-Penerbitan (DELETE /api/consent)
  // ---------------------------------------------------------------------------
  console.log(`[Skenario 4] Menarik consent sebelum penerbitan via DELETE /api/consent...`);
  const t4Start = Date.now();
  const delReq = new NextRequest("http://localhost:3000/api/consent", {
    method: "DELETE",
    headers: {
      cookie: cookieHeader,
      "x-forwarded-for": "180.247.45.82",
    },
  });

  const delRes = await consentDELETE(delReq);
  const delStatus = delRes.status;
  const delBody = (await delRes.json()) as { success?: boolean; message?: string };

  // Verifikasi via GET /api/consent setelah delete
  const getAfterDelReq = new NextRequest("http://localhost:3000/api/consent", {
    headers: { cookie: cookieHeader },
  });
  const getAfterDelRes = await consentGET(getAfterDelReq);
  const getAfterDelBody = (await getAfterDelRes.json()) as {
    dataConsent?: boolean;
    consentGivenAt?: string | null;
    consentVersion?: string | null;
    certificateStatus?: string;
  };

  const s4Assertions: ScenarioAssertion[] = [
    assertEq("DELETE /api/consent status 200", delStatus, 200),
    assertEq("DELETE response success is true", delBody.success, true),
    assertEq("GET /api/consent status 200", getAfterDelRes.status, 200),
    assertEq("GET dataConsent setelah penarikan adalah false", getAfterDelBody.dataConsent, false),
    assertNull("GET consentGivenAt setelah penarikan adalah null", getAfterDelBody.consentGivenAt),
    assertNull("GET consentVersion setelah penarikan adalah null", getAfterDelBody.consentVersion),
  ];

  const s4Passed = s4Assertions.every((a) => a.passed);
  results.push({
    scenarioNumber: 4,
    scenarioKey: "WITHDRAW_CONSENT_PRE_MINT",
    name: "Penarikan Consent Pra-Penerbitan (DELETE /api/consent)",
    httpStatus: delStatus,
    durationMs: Date.now() - t4Start,
    data: {
      deleteResponse: delBody,
      getAfterDelBody,
    },
    assertions: s4Assertions,
    passed: s4Passed,
  });

  if (!s4Passed) {
    console.error("GAGAL: Penarikan consent gagal memenuhi assertion endpoint.");
    process.exit(1);
  }
  console.log(`  ✓ Endpoint DELETE /api/consent berhasil dijalankan\n`);

  // ---------------------------------------------------------------------------
  // Skenario 5: Verifikasi Invarian Privasi, Data Utuh, & Ketiadaan Sertifikat
  // ---------------------------------------------------------------------------
  console.log(`[Skenario 5] Memeriksa invarian privasi, PII utuh, dan ketiadaan aset sertifikat...`);
  const t5Start = Date.now();

  const userAfterWithdraw = await prisma.user.findUnique({
    where: { id: createdUser.id },
    include: {
      certificates: true,
      certificate: true,
    },
  });

  // Audit logs verifikasi
  const auditLogs = await prisma.auditLog.findMany({
    where: { userId: createdUser.id },
    orderBy: { createdAt: "asc" },
  });

  const withdrawLog = auditLogs.find((l) => l.action === "DATA_CONSENT_WITHDRAWN");

  // Certificate backups: pada alur pra-penerbitan, tidak ada backup baru yang dibuat saat withdraw consent
  // Hanya initial registration backup yang ada.
  const backupsAfterWithdraw = await prisma.certificateBackup.findMany({
    where: { userId: createdUser.id },
  });

  const s5Assertions: ScenarioAssertion[] = [
    // 1. Consent flags
    assertEq("DB user.dataConsent adalah false", userAfterWithdraw?.dataConsent, false),
    assertNull("DB user.consentGivenAt adalah null", userAfterWithdraw?.consentGivenAt),
    assertNull("DB user.consentIpAddress adalah null", userAfterWithdraw?.consentIpAddress),
    assertNull("DB user.consentVersion adalah null", userAfterWithdraw?.consentVersion),

    // 2. PII INTACT (UU PDP: Pra-penerbitan data pribadi TIDAK boleh dianonimkan)
    assertEq("Nama mahasiswa TETAP UTUH (tidak dianonimkan)", userAfterWithdraw?.nama, testNama),
    assertEq("NIM mahasiswa TETAP UTUH (tidak dianonimkan)", userAfterWithdraw?.nim, testNim),
    assertEq("Email mahasiswa TETAP UTUH (tidak dianonimkan)", userAfterWithdraw?.email, testEmail),
    assertNull("dataDeletedAt mahasiswa adalah null", userAfterWithdraw?.dataDeletedAt),
    assertNull("dataDeleteNote mahasiswa adalah null", userAfterWithdraw?.dataDeleteNote),

    // 3. Sertifikat & NFT tidak pernah terbit
    assertEq("Jumlah relasi certificates adalah 0", userAfterWithdraw?.certificates.length, 0),
    assertNull("Relasi active certificate adalah null", userAfterWithdraw?.certificate),

    // 4. Audit Log
    assertNotNull("AuditLog DATA_CONSENT_WITHDRAWN tercatat", withdrawLog),

    // 5. Cadangan: Hanya initial registration backup (tidak ada anonymization backup)
    assertEq("Jumlah certificateBackup tetap 1 (initial reg only)", backupsAfterWithdraw.length, 1),
    assertEq(
      "Alasan backup adalah initial registration",
      backupsAfterWithdraw[0]?.reason,
      "Auto-backup initial registration",
    ),
  ];

  const s5Passed = s5Assertions.every((a) => a.passed);
  results.push({
    scenarioNumber: 5,
    scenarioKey: "PRIVACY_AND_INVARIANTS_CHECK",
    name: "Audit Invarian Privasi DB, PII Utuh, dan Ketiadaan Sertifikat",
    durationMs: Date.now() - t5Start,
    data: {
      userId: userAfterWithdraw?.id,
      nama: userAfterWithdraw?.nama,
      nim: userAfterWithdraw?.nim,
      email: userAfterWithdraw?.email,
      dataConsent: userAfterWithdraw?.dataConsent,
      consentGivenAt: userAfterWithdraw?.consentGivenAt,
      dataDeletedAt: userAfterWithdraw?.dataDeletedAt,
      certificatesCount: userAfterWithdraw?.certificates.length,
      auditLogs: auditLogs.map((l) => ({ action: l.action, detail: l.detail, createdAt: l.createdAt })),
      backupsCount: backupsAfterWithdraw.length,
    },
    assertions: s5Assertions,
    passed: s5Passed,
  });

  if (!s5Passed) {
    console.error("GAGAL: Invarian privasi atau data utuh gagal diverifikasi.");
    process.exit(1);
  }
  console.log(`  ✓ Seluruh invarian privasi terpenuhi: PII utuh, consent=false, 0 sertifikat, audit log tercatat\n`);

  // ---------------------------------------------------------------------------
  // Skenario 6: Konfirmasi Akhir Isolasi Mahasiswa Alifa (Untouched Guarantee)
  // ---------------------------------------------------------------------------
  console.log(`[Skenario 6] Memverifikasi data Alifa tetap utuh setelah seluruh pengujian...`);
  const t6Start = Date.now();
  const alifaAfter = await prisma.user.findFirst({
    where: { nim: ALIFA_NIM },
    include: { certificate: true, wallet: true },
  });

  const s6Assertions: ScenarioAssertion[] = [
    assertEq("Status sertifikat Alifa tetap CLAIMED", alifaAfter?.certificate?.status, "CLAIMED"),
    assertEq("NFT Address Alifa tidak berubah", alifaAfter?.certificate?.nftAddress, alifaBefore?.certificate?.nftAddress),
    assertEq("Metadata URI Alifa tidak berubah", alifaAfter?.certificate?.metadataUri, alifaBefore?.certificate?.metadataUri),
    assertEq("dataHash Alifa tidak berubah", alifaAfter?.certificate?.dataHash, alifaBefore?.certificate?.dataHash),
    assertEq("Consent Alifa tetap bernilai true", alifaAfter?.dataConsent, true),
    assertNull("dataDeletedAt Alifa tetap null (utuh)", alifaAfter?.dataDeletedAt),
    assertEq("Nama Alifa tidak berubah", alifaAfter?.nama, alifaBefore?.nama),
    assertEq("NIM Alifa tidak berubah", alifaAfter?.nim, alifaBefore?.nim),
  ];

  const s6Passed = s6Assertions.every((a) => a.passed);
  results.push({
    scenarioNumber: 6,
    scenarioKey: "ALIFA_FINAL_ISOLATION_CHECK",
    name: "Verifikasi Akhir Isolasi Mahasiswa Alifa (Untouched)",
    durationMs: Date.now() - t6Start,
    data: {
      nim: alifaAfter?.nim,
      nama: alifaAfter?.nama,
      status: alifaAfter?.certificate?.status,
      nftAddress: alifaAfter?.certificate?.nftAddress,
    },
    assertions: s6Assertions,
    passed: s6Passed,
  });

  if (!s6Passed) {
    console.error("GAGAL: Data Alifa terpengaruh selama pengujian!");
    process.exit(1);
  }
  console.log(`  ✓ Mahasiswa Alifa 100% aman dan tidak terpengaruh sedikit pun\n`);

  // ---------------------------------------------------------------------------
  // Penulisan Log JSONL ke experiments/2026-11-18/tc18a-2026-11-18.jsonl
  // ---------------------------------------------------------------------------
  const logDir = path.join(process.cwd(), "experiments", today);
  fs.mkdirSync(logDir, { recursive: true });
  const logFile = path.join(logDir, `tc18a-${today}.jsonl`);

  const allPassed = results.every((r) => r.passed);

  for (const r of results) {
    const record = {
      testCase: "TC-18a",
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
    testCase: "TC-18a",
    scenario: "SUMMARY",
    runAt: startedAt,
    date: today,
    totalScenarios: results.length,
    scenariosPassed: results.filter((r) => r.passed).length,
    allPassed,
    testStudent: {
      id: createdUser.id,
      nim: testNim,
      nama: testNama,
      email: testEmail,
      dataConsent: userAfterWithdraw?.dataConsent,
      consentGivenAt: userAfterWithdraw?.consentGivenAt,
      dataDeletedAt: userAfterWithdraw?.dataDeletedAt,
      certificatesCount: userAfterWithdraw?.certificates.length,
    },
    alifaUntouched: s6Passed,
    scenarios: results.map((r) => ({
      number: r.scenarioNumber,
      key: r.scenarioKey,
      passed: r.passed,
      durationMs: r.durationMs,
    })),
  };
  fs.appendFileSync(logFile, JSON.stringify(summaryRecord) + "\n", "utf8");

  // ---------------------------------------------------------------------------
  // Tampilkan Ringkasan Lengkap ke Console
  // ---------------------------------------------------------------------------
  console.log("===============================================================================");
  console.log("RINGKASAN HASIL EKSEKUSI TC-18a:");
  for (const r of results) {
    console.log(`  [${r.passed ? "LOLOS" : "GAGAL"}] Skenario ${r.scenarioNumber}: ${r.name} (${r.durationMs}ms)`);
    for (const a of r.assertions) {
      console.log(`      * ${a.passed ? "✓" : "✗"} ${a.name} (Ekspektasi: ${JSON.stringify(a.expected)}, Aktual: ${JSON.stringify(a.actual)})`);
    }
  }
  console.log(`\nLog JSONL tersimpan di: ${logFile}`);
  console.log(`Status Akhir: ${allPassed ? "SELURUH SKENARIO TC-18a LOLOS (EXIT CODE 0)" : "ADA SKENARIO GAGAL (EXIT CODE 1)"}`);
  console.log("===============================================================================");

  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal error during TC-18a execution:", err);
  process.exit(1);
});
