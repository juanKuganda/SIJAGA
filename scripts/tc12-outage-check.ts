/**
 * scripts/tc12-outage-check.ts — TC-12: Verifikasi Ketahanan Pemadaman & Regresi Tingkat 1
 *
 * TUJUAN:
 * Memverifikasi perilaku penanganan pemadaman infrastruktur desentralisasi
 * (Solana RPC dan IPFS Gateway) serta regresi kondisi normal pada endpoint
 * verifikasi tingkat 1 (POST /api/verify/tingkat-1).
 *
 * SKENARIO UJI:
 * 1. RPC Outage:
 *    Simulasi node RPC Solana mati/tidak dapat dihubungi (port 19999).
 *    Ekspektasi: HTTP 503, reason="RPC", verdict="TIDAK DAPAT DIPASTIKAN",
 *    checks.tokenExists.status="TIDAK DAPAT DIPASTIKAN".
 * 2. IPFS Outage:
 *    Simulasi IPFS gateway mati/tidak dapat dihubungi (port 19999).
 *    Ekspektasi: HTTP 502, reason="METADATA", verdict="TIDAK DAPAT DIPASTIKAN",
 *    checks.tokenExists.status="DAPAT DIPERIKSA".
 * 3. Normal Valid Asset (Trace P2.6):
 *    Ekspektasi: HTTP 200, verdict="DAPAT DIPERIKSA".
 * 4. Normal Wallet Address (Alifa Wallet):
 *    Ekspektasi: HTTP 400, reason="NOT_ASSET".
 * 5. Normal Nonexistent Random Base58 Address:
 *    Ekspektasi: HTTP 404, reason="NOT_FOUND".
 *
 * OUTPUT:
 * - stdout: Ringkasan hasil uji per skenario, rincian assertion, durasi, dan status.
 * - JSONL: experiments/<YYYY-MM-DD>/tc12-<YYYY-MM-DD>.jsonl (rekaman terstruktur append-only).
 * - Exit code: 0 jika seluruh 5 skenario lolos assertion; 1 jika ada assertion gagal.
 *
 * CARA MENJALANKAN:
 *   node --env-file=.env.local ./node_modules/tsx/dist/cli.mjs scripts/tc12-outage-check.ts
 */

import fs from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { NextRequest } from "next/server";
import { Keypair } from "@solana/web3.js";
import { POST } from "../app/api/verify/tingkat-1/route";

// Pastikan environment variables dari .env.local termuat
loadEnvConfig(process.cwd());

// Target pengujian acuan
const TRACE_P26_ASSET = "FDQKnrLVQdZqP4efoNarLb87gmZj529kebFPz8SVMQCc";
const ALIFA_WALLET = "DtUVhcmkVnj6nfn8DJWnRiU3RqfSz2APBbGXzFdgxkpx";
// Buat alamat acak Base58 yang pasti belum pernah di-mint di Solana
const RANDOM_UNMINTED_ADDRESS = Keypair.generate().publicKey.toBase58();

// Simpan konfigurasi awal untuk restorasi antar-skenario
const ORIGINAL_ENV = {
  SOLANA_RPC_URL: process.env.SOLANA_RPC_URL,
  NEXT_PUBLIC_SOLANA_RPC: process.env.NEXT_PUBLIC_SOLANA_RPC,
  NEXT_PUBLIC_PINATA_GATEWAY: process.env.NEXT_PUBLIC_PINATA_GATEWAY,
};

function restoreEnv() {
  if (ORIGINAL_ENV.SOLANA_RPC_URL !== undefined) {
    process.env.SOLANA_RPC_URL = ORIGINAL_ENV.SOLANA_RPC_URL;
  } else {
    delete process.env.SOLANA_RPC_URL;
  }

  if (ORIGINAL_ENV.NEXT_PUBLIC_SOLANA_RPC !== undefined) {
    process.env.NEXT_PUBLIC_SOLANA_RPC = ORIGINAL_ENV.NEXT_PUBLIC_SOLANA_RPC;
  } else {
    delete process.env.NEXT_PUBLIC_SOLANA_RPC;
  }

  if (ORIGINAL_ENV.NEXT_PUBLIC_PINATA_GATEWAY !== undefined) {
    process.env.NEXT_PUBLIC_PINATA_GATEWAY = ORIGINAL_ENV.NEXT_PUBLIC_PINATA_GATEWAY;
  } else {
    delete process.env.NEXT_PUBLIC_PINATA_GATEWAY;
  }
}

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
  targetAddress: string;
  httpStatus: number;
  durationMs: number;
  body: Record<string, unknown>;
  assertions: ScenarioAssertion[];
  passed: boolean;
}

async function invokeTingkat1(asset: string): Promise<{ status: number; body: Record<string, unknown>; durationMs: number }> {
  const req = new NextRequest("http://localhost:3000/api/verify/tingkat-1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ asset }),
  });

  const start = Date.now();
  const res = await POST(req);
  const durationMs = Date.now() - start;
  const body = (await res.json()) as Record<string, unknown>;
  return { status: res.status, body, durationMs };
}

async function runScenario1RpcOutage(): Promise<ScenarioResult> {
  // Simulasi RPC Outage
  process.env.SOLANA_RPC_URL = "http://127.0.0.1:19999";
  process.env.NEXT_PUBLIC_SOLANA_RPC = "http://127.0.0.1:19999";
  if (ORIGINAL_ENV.NEXT_PUBLIC_PINATA_GATEWAY !== undefined) {
    process.env.NEXT_PUBLIC_PINATA_GATEWAY = ORIGINAL_ENV.NEXT_PUBLIC_PINATA_GATEWAY;
  } else {
    delete process.env.NEXT_PUBLIC_PINATA_GATEWAY;
  }

  const { status, body, durationMs } = await invokeTingkat1(TRACE_P26_ASSET);
  restoreEnv();

  const tokenExistsStatus = (body.checks as Record<string, { status: string }> | undefined)?.tokenExists?.status;

  const assertions: ScenarioAssertion[] = [
    {
      name: "HTTP Status Code 503 (Service Unavailable)",
      expected: 503,
      actual: status,
      passed: status === 503,
    },
    {
      name: 'Reason is "RPC"',
      expected: "RPC",
      actual: body.reason,
      passed: body.reason === "RPC",
    },
    {
      name: 'Verdict is "TIDAK DAPAT DIPASTIKAN"',
      expected: "TIDAK DAPAT DIPASTIKAN",
      actual: body.verdict,
      passed: body.verdict === "TIDAK DAPAT DIPASTIKAN",
    },
    {
      name: 'checks.tokenExists.status is "TIDAK DAPAT DIPASTIKAN"',
      expected: "TIDAK DAPAT DIPASTIKAN",
      actual: tokenExistsStatus,
      passed: tokenExistsStatus === "TIDAK DAPAT DIPASTIKAN",
    },
  ];

  return {
    scenarioNumber: 1,
    scenarioKey: "RPC_OUTAGE",
    name: "Simulasi Pemadaman Solana RPC (Port 19999 Unreachable)",
    targetAddress: TRACE_P26_ASSET,
    httpStatus: status,
    durationMs,
    body,
    assertions,
    passed: assertions.every((a) => a.passed),
  };
}

async function runScenario2IpfsOutage(): Promise<ScenarioResult> {
  // Simulasi IPFS Outage
  restoreEnv();
  process.env.NEXT_PUBLIC_PINATA_GATEWAY = "http://127.0.0.1:19999";

  const { status, body, durationMs } = await invokeTingkat1(TRACE_P26_ASSET);
  restoreEnv();

  const tokenExistsStatus = (body.checks as Record<string, { status: string }> | undefined)?.tokenExists?.status;

  const assertions: ScenarioAssertion[] = [
    {
      name: "HTTP Status Code 502 (Bad Gateway)",
      expected: 502,
      actual: status,
      passed: status === 502,
    },
    {
      name: 'Reason is "METADATA"',
      expected: "METADATA",
      actual: body.reason,
      passed: body.reason === "METADATA",
    },
    {
      name: 'Verdict is "TIDAK DAPAT DIPASTIKAN"',
      expected: "TIDAK DAPAT DIPASTIKAN",
      actual: body.verdict,
      passed: body.verdict === "TIDAK DAPAT DIPASTIKAN",
    },
    {
      name: 'checks.tokenExists.status is "DAPAT DIPERIKSA"',
      expected: "DAPAT DIPERIKSA",
      actual: tokenExistsStatus,
      passed: tokenExistsStatus === "DAPAT DIPERIKSA",
    },
  ];

  return {
    scenarioNumber: 2,
    scenarioKey: "IPFS_OUTAGE",
    name: "Simulasi Pemadaman IPFS Gateway (Port 19999 Unreachable)",
    targetAddress: TRACE_P26_ASSET,
    httpStatus: status,
    durationMs,
    body,
    assertions,
    passed: assertions.every((a) => a.passed),
  };
}

async function runScenario3NormalValid(): Promise<ScenarioResult> {
  restoreEnv();
  const { status, body, durationMs } = await invokeTingkat1(TRACE_P26_ASSET);

  const assertions: ScenarioAssertion[] = [
    {
      name: "HTTP Status Code 200 (OK)",
      expected: 200,
      actual: status,
      passed: status === 200,
    },
    {
      name: 'Verdict is "DAPAT DIPERIKSA"',
      expected: "DAPAT DIPERIKSA",
      actual: body.verdict,
      passed: body.verdict === "DAPAT DIPERIKSA",
    },
    {
      name: "success is true",
      expected: true,
      actual: body.success,
      passed: body.success === true,
    },
  ];

  return {
    scenarioNumber: 3,
    scenarioKey: "NORMAL_VALID",
    name: "Regresi Normal: Aset Valid (Trace P2.6)",
    targetAddress: TRACE_P26_ASSET,
    httpStatus: status,
    durationMs,
    body,
    assertions,
    passed: assertions.every((a) => a.passed),
  };
}

async function runScenario4WalletAddress(): Promise<ScenarioResult> {
  restoreEnv();
  const { status, body, durationMs } = await invokeTingkat1(ALIFA_WALLET);

  const assertions: ScenarioAssertion[] = [
    {
      name: "HTTP Status Code 400 (Bad Request)",
      expected: 400,
      actual: status,
      passed: status === 400,
    },
    {
      name: 'Reason is "NOT_ASSET"',
      expected: "NOT_ASSET",
      actual: body.reason,
      passed: body.reason === "NOT_ASSET",
    },
    {
      name: "success is false",
      expected: false,
      actual: body.success,
      passed: body.success === false,
    },
  ];

  return {
    scenarioNumber: 4,
    scenarioKey: "NORMAL_WALLET_NOT_ASSET",
    name: "Regresi Normal: Alamat Dompet Non-NFT (Alifa Wallet)",
    targetAddress: ALIFA_WALLET,
    httpStatus: status,
    durationMs,
    body,
    assertions,
    passed: assertions.every((a) => a.passed),
  };
}

async function runScenario5RandomNonexistent(): Promise<ScenarioResult> {
  restoreEnv();
  const { status, body, durationMs } = await invokeTingkat1(RANDOM_UNMINTED_ADDRESS);

  const assertions: ScenarioAssertion[] = [
    {
      name: "HTTP Status Code 404 (Not Found)",
      expected: 404,
      actual: status,
      passed: status === 404,
    },
    {
      name: 'Reason is "NOT_FOUND"',
      expected: "NOT_FOUND",
      actual: body.reason,
      passed: body.reason === "NOT_FOUND",
    },
    {
      name: "success is false",
      expected: false,
      actual: body.success,
      passed: body.success === false,
    },
  ];

  return {
    scenarioNumber: 5,
    scenarioKey: "NORMAL_RANDOM_NOT_FOUND",
    name: "Regresi Normal: Alamat Acak Base58 Belum Terbit (Not Found)",
    targetAddress: RANDOM_UNMINTED_ADDRESS,
    httpStatus: status,
    durationMs,
    body,
    assertions,
    passed: assertions.every((a) => a.passed),
  };
}

async function main() {
  const startedAt = new Date().toISOString();
  const today = startedAt.slice(0, 10);

  console.log("===============================================================================");
  console.log("TC-12 — Verifikasi Ketahanan Pemadaman (Outage) & Regresi Normal Tingkat 1");
  console.log(`Waktu Mulai : ${startedAt}`);
  console.log(`Trace P2.6  : ${TRACE_P26_ASSET}`);
  console.log(`Alifa Wallet: ${ALIFA_WALLET}`);
  console.log(`Random Addr : ${RANDOM_UNMINTED_ADDRESS}`);
  console.log("===============================================================================\n");

  const results: ScenarioResult[] = [];

  console.log("Menjalankan Skenario 1: Simulasi RPC Outage (Solana Devnet RPC mati)...");
  const s1 = await runScenario1RpcOutage();
  results.push(s1);
  console.log(`  -> Status: ${s1.httpStatus}, Verdict: ${s1.body.verdict}, Reason: ${s1.body.reason} (${s1.durationMs}ms)`);
  console.log(`  -> Lolos: ${s1.passed ? "YA" : "TIDAK"}\n`);

  console.log("Menjalankan Skenario 2: Simulasi IPFS Outage (Gateway Pinata mati)...");
  const s2 = await runScenario2IpfsOutage();
  results.push(s2);
  console.log(`  -> Status: ${s2.httpStatus}, Verdict: ${s2.body.verdict}, Reason: ${s2.body.reason} (${s2.durationMs}ms)`);
  console.log(`  -> Lolos: ${s2.passed ? "YA" : "TIDAK"}\n`);

  console.log("Menjalankan Skenario 3: Regresi Aset Valid Normal (Trace P2.6)...");
  const s3 = await runScenario3NormalValid();
  results.push(s3);
  console.log(`  -> Status: ${s3.httpStatus}, Verdict: ${s3.body.verdict} (${s3.durationMs}ms)`);
  console.log(`  -> Lolos: ${s3.passed ? "YA" : "TIDAK"}\n`);

  console.log("Menjalankan Skenario 4: Regresi Alamat Dompet Normal (Alifa Wallet)...");
  const s4 = await runScenario4WalletAddress();
  results.push(s4);
  console.log(`  -> Status: ${s4.httpStatus}, Reason: ${s4.body.reason} (${s4.durationMs}ms)`);
  console.log(`  -> Lolos: ${s4.passed ? "YA" : "TIDAK"}\n`);

  console.log("Menjalankan Skenario 5: Regresi Alamat Acak Base58 Belum Terbit...");
  const s5 = await runScenario5RandomNonexistent();
  results.push(s5);
  console.log(`  -> Status: ${s5.httpStatus}, Reason: ${s5.body.reason} (${s5.durationMs}ms)`);
  console.log(`  -> Lolos: ${s5.passed ? "YA" : "TIDAK"}\n`);

  const allPassed = results.every((r) => r.passed);

  // ─── Tulis Log JSONL Terstruktur ──────────────────────────────────────────
  const experimentsDir = path.join(process.cwd(), "experiments", today);
  fs.mkdirSync(experimentsDir, { recursive: true });
  const logFile = path.join(experimentsDir, `tc12-${today}.jsonl`);

  for (const r of results) {
    const record = {
      testCase: "TC-12",
      scenario: r.scenarioKey,
      scenarioNumber: r.scenarioNumber,
      name: r.name,
      runAt: startedAt,
      date: today,
      targetAddress: r.targetAddress,
      httpStatus: r.httpStatus,
      durationMs: r.durationMs,
      verdict: r.body.verdict || null,
      reason: r.body.reason || null,
      checks: r.body.checks || null,
      assertions: r.assertions,
      passed: r.passed,
      body: r.body,
      softwareVersions: {
        node: process.version,
        mplCore: "@metaplex-foundation/mpl-core ^1.10.0",
        umi: "@metaplex-foundation/umi ^1.5.1",
        solanaWeb3: "@solana/web3.js ^1.98.4",
      },
    };
    fs.appendFileSync(logFile, JSON.stringify(record) + "\n", "utf8");
  }

  // Tulis satu entri ringkasan keseluruhan
  const summaryRecord = {
    testCase: "TC-12",
    scenario: "SUMMARY",
    runAt: startedAt,
    date: today,
    totalScenarios: results.length,
    scenariosPassed: results.filter((r) => r.passed).length,
    allPassed,
    scenarios: results.map((r) => ({
      number: r.scenarioNumber,
      key: r.scenarioKey,
      status: r.httpStatus,
      passed: r.passed,
      durationMs: r.durationMs,
    })),
  };
  fs.appendFileSync(logFile, JSON.stringify(summaryRecord) + "\n", "utf8");

  console.log("===============================================================================");
  console.log("RINGKASAN HASIL EKSEKUSI TC-12:");
  for (const r of results) {
    console.log(`  [${r.passed ? "LOLOS" : "GAGAL"}] Skenario ${r.scenarioNumber}: ${r.name}`);
    for (const a of r.assertions) {
      console.log(`      * ${a.passed ? "✓" : "✗"} ${a.name} (Ekspektasi: ${a.expected}, Aktual: ${a.actual})`);
    }
  }
  console.log(`\nLog JSONL tersimpan di: ${logFile}`);
  console.log(`Hasil Akhir: ${allPassed ? "SELURUH SKENARIO TC-12 LOLOS (EXIT CODE 0)" : "ADA SKENARIO GAGAL (EXIT CODE 1)"}`);
  console.log("===============================================================================");

  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal error during TC-12 execution:", err);
  process.exit(1);
});
