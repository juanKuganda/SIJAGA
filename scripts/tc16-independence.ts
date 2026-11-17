/**
 * scripts/tc16-independence.ts — TC-16: Uji Kemandirian Verifikasi Tingkat 1
 *
 * TUJUAN
 * Membuktikan bahwa verifikasi tingkat 1 SIJAGA dapat dilakukan oleh
 * verifikator independen TANPA bergantung pada infrastruktur institusi:
 * skrip ini HANYA menghubungi (1) RPC publik Solana Devnet dan
 * (2) gateway IPFS publik. Semua panggilan jaringan dicatat (host +
 * waktu) dan ditulis ke log JSONL sebagai bukti.
 *
 * BATASAN KERAS (syarat uji — pelanggaran membatalkan hasil):
 * - TIDAK BOLEH memanggil endpoint portal /api/verify/tingkat-1
 *   (endpoint itu di-host institusi; memakainya membatalkan uji).
 * - TIDAK BOLEH memakai secret/key apa pun. Skrip ini TIDAK membaca
 *   .env.local / .env dan TIDAK membaca process.env untuk kredensial.
 *   RPC dan gateway di-hardcode ke endpoint PUBLIK di bawah.
 * - TIDAK BOLEH mengirim transaksi — hanya baca (read-only).
 *   Satu-satunya operasi on-chain adalah fetchAsset (getAccountInfo).
 * - TIDAK menghitung-ulang hash dari data pribadi + salt: skrip tidak
 *   punya data pribadi dan tidak boleh membutuhkannya. Yang diperiksa
 *   adalah hash tersedia di metadata publik (atribut "Data Hash").
 *
 * CARA MENJALANKAN (dari root repo, TANPA --env-file):
 *   node ./node_modules/tsx/dist/cli.mjs scripts/tc16-independence.ts <ASSET_ADDRESS>
 *
 *   Contoh:
 *   node ./node_modules/tsx/dist/cli.mjs scripts/tc16-independence.ts GqM5cbrY3QpPV6cHhaFdYzPcgDjzm9M6TchsxBTkUv1q
 *   node ./node_modules/tsx/dist/cli.mjs scripts/tc16-independence.ts FDQKnrLVQdZqP4efoNarLb87gmZj529kebFPz8SVMQCc
 *
 *   Aset acuan (hanya dokumentasi — skrip menerima argumen apa pun):
 *   - Alifa nursintia marsya (F55124011):
 *     aset GqM5cbrY3QpPV6cHhaFdYzPcgDjzm9M6TchsxBTkUv1q
 *     CID QmZeEGn1fnkYztMqrfDRoTC1mMNMusBPDbEqrBFiUTq8kj
 *     dataHash sha256:6c32ca2ed28f12dae40a3211cf8fd3dcc8c3b377fe2fb71866ea4dcffd78b804
 *     admin Bat5VTbjGqsThS5oERuXVi7d2JY2TBNomJD2ZciaztaQ
 *     pemilik DtUVhcmkVnj6nfn8DJWnRiU3RqfSz2APBbGXzFdgxkpx
 *   - Trace P2.6:
 *     aset FDQKnrLVQdZqP4efoNarLb87gmZj529kebFPz8SVMQCc
 *     dompet FGpNtVV1bewy5p8YcHAifvEsEZ9ScKeSbjVcF7uE1V5D
 *     CID QmPuymRiKnzd6pPqVS5jdDbCtHpZGyXz5bXLaaJRdLmn2j
 *
 * OUTPUT
 * - stdout: vonis tingkat 1 (DAPAT DIPERIKSA / TIDAK DIPERIKSA),
 *   ringkasan pemeriksaan, jumlah panggilan ke host non-publik
 *   (institusi/lainnya — harus 0), dan daftar host yang dihubungi.
 * - Log JSONL: experiments/<YYYY-MM-DD>/tc16-<YYYY-MM-DD>.jsonl
 *   (satu baris JSON per run; mengikuti konvensi experiments/ repo).
 * - Exit code: 0 bila vonis DAPAT DIPERIKSA dan 0 panggilan ke host
 *   non-publik; 1 bila vonis TIDAK DIPERIKSA / ada panggilan ke host
 *   non-publik / RPC atau IPFS gagal; 2 bila argumen CLI tidak valid.
 *
 * CONTOH OUTPUT YANG DIHARAPKAN (vonis lolos):
 *   TC-16 — Uji Kemandirian Verifikasi Tingkat 1
 *   Aset: GqM5cbrY3QpPV6cHhaFdYzPcgDjzm9M6TchsxBTkUv1q
 *   ...
 *   VONIS TINGKAT 1: DAPAT DIPERIKSA
 *   Panggilan ke host institusi/non-publik: 0
 *   Host yang dihubungi: api.devnet.solana.com, gateway.pinata.cloud
 *   Log jaringan: experiments/2026-11-17/tc16-2026-11-17.jsonl
 *
 * DEPENDENSI (sudah ada di package.json — tidak ada dependensi baru):
 * - @metaplex-foundation/mpl-core (fetchAsset)
 * - @metaplex-foundation/umi-bundle-defaults (createUmi)
 * - @metaplex-foundation/umi (publicKey)
 * - bs58 (validasi alamat aset)
 *
 * CATATAN IMPLEMENTASI
 * - Pembacaan aset mengikuti lib/onchain.ts (inspectCertificate) dan
 *   lib/metaplex.ts, TAPI sengaja TIDAK memakai createUmiInstance /
 *   inspectCertificate dari lib: keduanya membaca RPC/gateway dari
 *   process.env, dan TC-16 harus kebal terhadap env apa pun.
 *   Umi di sini dibangun langsung dengan URL RPC publik eksplisit.
 * - Logika status frozen disalin dari isFrozen() di lib/onchain.ts.
 */

import fs from "node:fs";
import path from "node:path";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { fetchAsset, mplCore } from "@metaplex-foundation/mpl-core";
import { publicKey } from "@metaplex-foundation/umi";
import bs58 from "bs58";

// ─── Endpoint PUBLIK — satu-satunya host yang boleh dihubungi ─────
// Sengaja konstanta literal, BUKAN dari env: env mana pun (termasuk
// SOLANA_RPC_URL / NEXT_PUBLIC_SOLANA_RPC / PINATA_GATEWAY institusi)
// tidak boleh mengubah target uji ini.
const PUBLIC_RPC_URL = "https://api.devnet.solana.com";
const PUBLIC_IPFS_GATEWAY = "https://gateway.pinata.cloud";

// Host yang diizinkan. Panggilan ke host lain = gagal uji kemandirian.
const ALLOWED_HOSTS = new Set([
  new URL(PUBLIC_RPC_URL).host, // api.devnet.solana.com
  new URL(PUBLIC_IPFS_GATEWAY).host, // gateway.pinata.cloud
]);

const METADATA_TIMEOUT_MS = 15_000;
const RPC_TIMEOUT_MS = 30_000;

// ─── Log jaringan ──────────────────────────────────────────────────

type NetworkLogEntry = {
  seq: number;
  ts: string; // ISO 8601
  kind: "rpc" | "ipfs";
  method: string;
  url: string;
  host: string;
  status: number | null;
  ms: number;
  error: string | null;
};

const networkLog: NetworkLogEntry[] = [];
let logSeq = 0;

function recordNetworkCall(entry: Omit<NetworkLogEntry, "seq">): void {
  networkLog.push({ seq: ++logSeq, ...entry });
}

/**
 * fetch pembungkus yang mencatat SEMUA panggilan jaringan.
 * Dipakai baik oleh Umi (RPC) maupun oleh fetch metadata (IPFS),
 * sehingga tidak ada panggilan yang lolos dari log.
 */
async function loggingFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const url = String(input instanceof URL ? input.href : input);
  const method = (init?.method ?? "GET").toUpperCase();
  let host = "unknown";
  try {
    host = new URL(url).host;
  } catch {
    // host tetap "unknown" — dicatat apa adanya, tidak disembunyikan
  }
  const kind: "rpc" | "ipfs" =
    host === new URL(PUBLIC_RPC_URL).host ? "rpc" : "ipfs";
  const start = Date.now();
  try {
    const response = await fetch(input, init);
    recordNetworkCall({
      ts: new Date().toISOString(),
      kind,
      method,
      url,
      host,
      status: response.status,
      ms: Date.now() - start,
      error: null,
    });
    return response;
  } catch (error) {
    recordNetworkCall({
      ts: new Date().toISOString(),
      kind,
      method,
      url,
      host,
      status: null,
      ms: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// ─── Helper: metadata ──────────────────────────────────────────────

function resolveMetadataUri(uri: string): string {
  if (uri.startsWith("ipfs://")) {
    return `${PUBLIC_IPFS_GATEWAY}/ipfs/${uri.replace("ipfs://", "")}`;
  }
  // URI https:// dipakai apa adanya — host-nya tetap tercatat di log
  // dan akan menaikkan hitungan host non-publik bila bukan gateway publik.
  return uri;
}

async function fetchMetadataJson(
  uri: string
): Promise<{ metadata: Record<string, unknown> | null; error: string | null }> {
  const resolvedUri = resolveMetadataUri(uri);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), METADATA_TIMEOUT_MS);
  try {
    const response = await loggingFetch(resolvedUri, {
      signal: controller.signal,
    });
    if (!response.ok) {
      return {
        metadata: null,
        error: `HTTP ${response.status} saat mengambil metadata dari ${resolvedUri}`,
      };
    }
    const metadata = (await response.json()) as Record<string, unknown>;
    return { metadata, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      metadata: null,
      error: `Gagal mengambil metadata dari ${resolvedUri}: ${message}`,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function extractAttribute(
  metadata: Record<string, unknown>,
  traitType: string
): string | null {
  const attributes = metadata.attributes;
  if (!Array.isArray(attributes)) return null;
  for (const attr of attributes) {
    if (
      typeof attr === "object" &&
      attr !== null &&
      "trait_type" in attr &&
      "value" in attr &&
      String((attr as { trait_type: unknown }).trait_type).toLowerCase() ===
        traitType.toLowerCase()
    ) {
      const value = (attr as { value: unknown }).value;
      return value !== undefined && value !== null ? String(value) : null;
    }
  }
  return null;
}

// ─── Helper: status frozen (disalin dari isFrozen() lib/onchain.ts) ─

type FetchedAsset = Awaited<ReturnType<typeof fetchAsset>>;

function isFrozen(asset: FetchedAsset): boolean {
  if (
    "plugins" in asset &&
    Array.isArray((asset as Record<string, unknown>).plugins)
  ) {
    for (const plugin of (
      asset as { plugins: Array<Record<string, unknown>> }
    ).plugins) {
      if (plugin.type === "PermanentFreezeDelegate") {
        return (plugin as { frozen?: boolean }).frozen === true;
      }
    }
  }
  const permanentFreeze = (
    asset as Record<string, unknown>
  ).permanentFreezeDelegate;
  if (
    permanentFreeze &&
    typeof permanentFreeze === "object" &&
    "frozen" in permanentFreeze
  ) {
    return (permanentFreeze as { frozen: boolean }).frozen === true;
  }
  const freezeDelegate = (asset as Record<string, unknown>).freezeDelegate;
  if (
    freezeDelegate &&
    typeof freezeDelegate === "object" &&
    "frozen" in freezeDelegate
  ) {
    return (freezeDelegate as { frozen: boolean }).frozen === true;
  }
  return false;
}

function extractUpdateAuthority(asset: FetchedAsset): string {
  if (asset.updateAuthority.type === "Address") {
    return asset.updateAuthority.address?.toString() ?? "Unknown";
  }
  if (asset.updateAuthority.type === "Collection") {
    return asset.updateAuthority.address?.toString() ?? "Unknown";
  }
  return "None";
}

// ─── Validasi argumen ──────────────────────────────────────────────

function parseAssetAddress(raw: string | undefined): string {
  if (!raw) {
    throw new Error(
      "Alamat aset wajib diisi. Pemakaian: node ./node_modules/tsx/dist/cli.mjs scripts/tc16-independence.ts <ASSET_ADDRESS>"
    );
  }
  let decoded: Uint8Array;
  try {
    decoded = bs58.decode(raw);
  } catch {
    throw new Error(
      `Alamat aset tidak valid (bukan base58): ${raw}. Harus berupa alamat aset Solana (base58, 32 byte).`
    );
  }
  if (decoded.length !== 32) {
    throw new Error(
      `Alamat aset tidak valid: panjang ${decoded.length} byte, harus 32 byte. Alamat: ${raw}`
    );
  }
  return raw;
}

// ─── Main ──────────────────────────────────────────────────────────

type CheckResult = { name: string; passed: boolean; detail: string };

async function main(): Promise<number> {
  const startedAt = new Date().toISOString();
  const today = startedAt.split("T")[0];

  console.log("TC-16 — Uji Kemandirian Verifikasi Tingkat 1");
  console.log("=".repeat(60));

  // --- Argumen (error eksplisit, tanpa default/mock) ---
  let assetAddress: string;
  try {
    assetAddress = parseAssetAddress(process.argv[2]);
  } catch (error) {
    console.error(
      `ERROR: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exitCode = 2;
    return 2;
  }
  if (process.argv.length > 3) {
    console.error(
      `ERROR: Terlalu banyak argumen. Hanya satu alamat aset yang diterima; diterima ${process.argv.length - 2} argumen.`
    );
    process.exitCode = 2;
    return 2;
  }

  console.log(`Aset            : ${assetAddress}`);
  console.log(`RPC publik      : ${PUBLIC_RPC_URL}`);
  console.log(`Gateway IPFS    : ${PUBLIC_IPFS_GATEWAY}`);
  console.log(
    "Endpoint portal : TIDAK dipakai (uji kemandirian melarang /api/verify/tingkat-1)"
  );
  console.log("Secret/key      : TIDAK dipakai (tidak ada .env yang dibaca)");
  console.log("");

  const checks: CheckResult[] = [];
  const timings = { rpcMs: 0, ipfsMs: 0 };
  let failReason: string | null = null;

  // --- Umi read-only: RPC publik eksplisit, tanpa identity/keypair ---
  const umi = createUmi(PUBLIC_RPC_URL, {
    httpHeaders: {},
    fetch: loggingFetch,
  }).use(mplCore());

  // --- 1. Baca aset on-chain (read-only: fetchAsset = getAccountInfo) ---
  let asset: FetchedAsset | null = null;
  const rpcStart = Date.now();
  try {
    asset = await fetchAsset(umi, publicKey(assetAddress));
    timings.rpcMs = Date.now() - rpcStart;
  } catch (error) {
    timings.rpcMs = Date.now() - rpcStart;
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes("AccountNotFoundError") ||
      message.includes("Account does not exist") ||
      message.includes("could not find account")
    ) {
      failReason = `Aset tidak ditemukan di Devnet (AccountNotFound): ${assetAddress}`;
    } else {
      failReason = `Gagal membaca aset dari RPC publik: ${message}`;
    }
    checks.push({
      name: "Aset ditemukan on-chain",
      passed: false,
      detail: failReason,
    });
  }

  let owner = "";
  let name = "";
  let uri = "";
  let frozen = false;
  let updateAuthority = "";
  let dataHash: string | null = null;
  let metadataCid: string | null = null;

  if (asset) {
    owner = asset.owner.toString();
    name = asset.name;
    uri = asset.uri;
    frozen = isFrozen(asset);
    updateAuthority = extractUpdateAuthority(asset);

    checks.push({
      name: "Aset ditemukan on-chain",
      passed: true,
      detail: `nama="${name}", pemilik=${owner}`,
    });
    checks.push({
      name: "Penerbit (update authority) terbaca",
      passed: updateAuthority !== "" && updateAuthority !== "Unknown",
      detail: `updateAuthority=${updateAuthority}`,
    });
    checks.push({
      name: "Aset berstatus frozen (non-transferable)",
      passed: frozen,
      detail: frozen
        ? "plugin PermanentFreezeDelegate: frozen=true"
        : "plugin PermanentFreezeDelegate TIDAK frozen / tidak ditemukan",
    });
    checks.push({
      name: "Metadata URI tersedia",
      passed: uri !== "",
      detail: uri !== "" ? uri : "asset.uri kosong",
    });
  }

  // --- 2. Ambil metadata JSON dari IPFS publik ---
  if (asset && uri !== "") {
    if (uri.startsWith("ipfs://")) {
      metadataCid = uri.replace("ipfs://", "");
    }
    const ipfsStart = Date.now();
    const { metadata, error } = await fetchMetadataJson(uri);
    timings.ipfsMs = Date.now() - ipfsStart;
    if (!metadata) {
      checks.push({
        name: "Metadata JSON dapat diambil dari IPFS publik",
        passed: false,
        detail: error ?? "metadata null tanpa pesan error (tidak boleh terjadi)",
      });
      if (!failReason) failReason = error ?? "Metadata tidak dapat diambil";
    } else {
      checks.push({
        name: "Metadata JSON dapat diambil dari IPFS publik",
        passed: true,
        detail: `URI terurai: ${resolveMetadataUri(uri)}`,
      });
      dataHash = extractAttribute(metadata, "Data Hash");
      checks.push({
        name: "Data Hash tersedia di metadata publik",
        passed: dataHash !== null && dataHash !== "",
        detail:
          dataHash !== null && dataHash !== ""
            ? `dataHash=${dataHash}`
            : 'atribut "Data Hash" tidak ada di metadata (hash tidak dapat diperiksa tingkat 1)',
      });
    }
  }

  // --- 3. Vonis tingkat 1 (fail-closed: semua pemeriksaan harus lolos) ---
  const allChecksPassed = checks.every((c) => c.passed);
  const verdict: "DAPAT DIPERIKSA" | "TIDAK DIPERIKSA" = allChecksPassed
    ? "DAPAT DIPERIKSA"
    : "TIDAK DIPERIKSA";
  if (!allChecksPassed && !failReason) {
    const firstFailed = checks.find((c) => !c.passed);
    failReason = firstFailed
      ? `Pemeriksaan gagal: ${firstFailed.name} — ${firstFailed.detail}`
      : "Pemeriksaan gagal tanpa detail (tidak boleh terjadi)";
  }

  // --- 4. Audit host: panggilan ke host non-publik = gagal uji ---
  const hostsContacted = [...new Set(networkLog.map((e) => e.host))];
  const nonPublicCalls = networkLog.filter((e) => !ALLOWED_HOSTS.has(e.host));
  const nonPublicHosts = [...new Set(nonPublicCalls.map((e) => e.host))];
  const independencePassed = nonPublicCalls.length === 0;

  // --- 5. Tulis log JSONL (konvensi experiments/<YYYY-MM-DD>/) ---
  const experimentsDir = path.join(process.cwd(), "experiments", today);
  fs.mkdirSync(experimentsDir, { recursive: true });
  const logFile = path.join(experimentsDir, `tc16-${today}.jsonl`);
  const runRecord = {
    testCase: "TC-16",
    name: "Uji Kemandirian Verifikasi Tingkat 1",
    runAt: startedAt,
    date: today,
    assetAddress,
    cluster: "devnet",
    rpc: { provider: "Solana Foundation Public", endpoint: PUBLIC_RPC_URL },
    ipfsGateway: PUBLIC_IPFS_GATEWAY,
    portalEndpointUsed: false,
    secretsUsed: false,
    transactionsSent: 0,
    verdict,
    failReason,
    checks,
    asset: asset
      ? {
          owner,
          name,
          uri,
          metadataCid,
          frozen,
          updateAuthority,
          dataHash,
        }
      : null,
    timings,
    network: {
      totalCalls: networkLog.length,
      hostsContacted,
      institutionHostCalls: nonPublicCalls.length,
      institutionHosts: nonPublicHosts,
      independencePassed,
      calls: networkLog,
    },
    softwareVersions: {
      node: process.version,
      mplCore: "@metaplex-foundation/mpl-core ^1.10.0",
      umi: "@metaplex-foundation/umi ^1.5.1",
      solanaWeb3: "@solana/web3.js ^1.98.4",
    },
  };
  fs.appendFileSync(logFile, JSON.stringify(runRecord) + "\n", "utf8");

  // --- 6. stdout ---
  console.log("Hasil pemeriksaan tingkat 1:");
  for (const check of checks) {
    console.log(
      `  [${check.passed ? "LOLOS" : "GAGAL"}] ${check.name} — ${check.detail}`
    );
  }
  console.log(`  Waktu RPC : ${timings.rpcMs} ms`);
  console.log(`  Waktu IPFS: ${timings.ipfsMs} ms`);
  console.log("");
  console.log(`VONIS TINGKAT 1: ${verdict}`);
  if (failReason) console.log(`Alasan: ${failReason}`);
  console.log("");
  console.log("Audit jaringan (bukti kemandirian):");
  console.log(`  Total panggilan jaringan : ${networkLog.length}`);
  console.log(
    `  Panggilan ke host institusi/non-publik: ${nonPublicCalls.length}` +
      (nonPublicCalls.length > 0
        ? ` — HOST: ${nonPublicHosts.join(", ")} (UJI GAGAL)`
        : " (harus 0 — LOLOS)")
  );
  console.log(
    `  Host yang dihubungi: ${hostsContacted.length > 0 ? hostsContacted.join(", ") : "(tidak ada — tidak ada panggilan jaringan tercatat)"}`
  );
  console.log(`  Log jaringan: ${logFile}`);
  console.log("");
  if (verdict === "DAPAT DIPERIKSA" && independencePassed) {
    console.log(
      "TC-16 LOLOS: tingkat 1 dapat diperiksa hanya dengan RPC publik + gateway IPFS publik, tanpa host institusi."
    );
    return 0;
  }
  console.log(
    "TC-16 GAGAL: " +
      (verdict !== "DAPAT DIPERIKSA"
        ? "vonis tingkat 1 TIDAK DIPERIKSA. "
        : "") +
      (!independencePassed
        ? "ada panggilan ke host non-publik (kemandirian tidak terbukti). "
        : "")
  );
  return 1;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    // Error tak terduga di luar alur pemeriksaan: laporkan eksplisit, jangan diam.
    console.error(
      `[TC-16] Error tak terduga: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exitCode = 1;
  });
