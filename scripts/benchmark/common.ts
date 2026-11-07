import fs from "fs";
import path from "path";
import { Connection, clusterApiUrl } from "@solana/web3.js";
import { loadEnvConfig } from "@next/env";

// Ensure environment variables (.env.local / .env) are loaded
loadEnvConfig(process.cwd());

export interface SoftwareVersions {
  node: string;
  solanaWeb3: string;
  mplCore: string;
  umi: string;
  pinata: string;
  next: string;
}

export interface TransactionReceipt {
  // P1.2 Mandated Core Identifiers
  operation: string;
  trialIndex: number;
  attempt: 1 | 2;

  // Timing & Latency
  sendTimestamp: string;
  finalizedTimestamp: string;
  elapsedSeconds: number;
  onchainElapsedSeconds?: number;
  ipfsElapsedSeconds?: number;

  // Blockchain Data
  slot?: number | null;
  txSignature?: string | null;
  feeLamports?: number | null;
  rentDepositLamports?: number | null;

  // Outcome & Diagnostics
  status: "SUCCESS" | "FAILED";
  errorCode?: string | null;
  errorMessage?: string | null;

  // Environment & Provenance
  rpcProvider: string;
  rpcEndpoint: string;
  softwareVersions: SoftwareVersions;
  cluster: string;
  clusterVersion: string;
  wallClockTime: string;
  date: string;
}

export function getExperimentsDir(): string {
  const today = new Date().toISOString().split("T")[0];
  const dir = path.join(process.cwd(), "experiments", today);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getSoftwareVersions(): SoftwareVersions {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8")
  );
  return {
    node: process.version,
    solanaWeb3: pkg.dependencies?.["@solana/web3.js"] || "unknown",
    mplCore: pkg.dependencies?.["@metaplex-foundation/mpl-core"] || "unknown",
    umi: pkg.dependencies?.["@metaplex-foundation/umi"] || "unknown",
    pinata: pkg.dependencies?.["pinata"] || "unknown",
    next: pkg.dependencies?.["next"] || "unknown",
  };
}

export function getRpcDetails() {
  const rpcUrl =
    process.env.SOLANA_RPC_URL ||
    process.env.NEXT_PUBLIC_SOLANA_RPC ||
    clusterApiUrl("devnet");

  let provider = "Unknown / Public";
  let host = "api.devnet.solana.com";

  try {
    const url = new URL(rpcUrl);
    host = url.host;
    if (host.includes("helius")) provider = "Helius";
    else if (host.includes("quicknode")) provider = "QuickNode";
    else if (host.includes("alchemy")) provider = "Alchemy";
    else if (host.includes("solana.com")) provider = "Solana Foundation Public";
  } catch {
    // fallback
  }

  return { rpcUrl, provider, host };
}

/**
 * Tulis receipt ke file JSONL dan update CSV summary
 */
export function recordReceipt(receipt: TransactionReceipt) {
  const dir = getExperimentsDir();
  const jsonlFile = path.join(dir, `run-${receipt.operation.toLowerCase()}.jsonl`);
  const csvFile = path.join(dir, `summary-${receipt.operation.toLowerCase()}.csv`);

  // 1. Tulis JSONL
  fs.appendFileSync(jsonlFile, JSON.stringify(receipt) + "\n", "utf8");

  // 2. Tulis CSV
  const csvHeaders = [
    "operation",
    "trialIndex",
    "attempt",
    "status",
    "elapsedSeconds",
    "onchainElapsedSeconds",
    "ipfsElapsedSeconds",
    "feeLamports",
    "rentDepositLamports",
    "slot",
    "txSignature",
    "errorCode",
    "wallClockTime",
    "date",
  ];

  if (!fs.existsSync(csvFile)) {
    fs.writeFileSync(csvFile, csvHeaders.join(",") + "\n", "utf8");
  }

  const csvRow = [
    receipt.operation,
    receipt.trialIndex,
    receipt.attempt,
    receipt.status,
    receipt.elapsedSeconds.toFixed(3),
    receipt.onchainElapsedSeconds !== undefined ? receipt.onchainElapsedSeconds.toFixed(3) : "",
    receipt.ipfsElapsedSeconds !== undefined ? receipt.ipfsElapsedSeconds.toFixed(3) : "",
    receipt.feeLamports ?? "",
    receipt.rentDepositLamports ?? "",
    receipt.slot ?? "",
    receipt.txSignature ?? "",
    receipt.errorCode ? `"${receipt.errorCode.replace(/"/g, '""')}"` : "",
    receipt.wallClockTime,
    receipt.date,
  ];

  fs.appendFileSync(csvFile, csvRow.join(",") + "\n", "utf8");
}

/**
 * Simpan run metadata sekali per hari eksperimen
 */
export async function ensureRunMetadata(connection: Connection): Promise<string> {
  const dir = getExperimentsDir();
  const metaFile = path.join(dir, "run-metadata.json");

  let clusterVersion = "unknown";
  try {
    const v = await connection.getVersion();
    clusterVersion = `solana-core: ${v["solana-core"]}, feature-set: ${v["feature-set"]}`;
  } catch {
    // fallback
  }

  const rpc = getRpcDetails();
  const versions = getSoftwareVersions();

  const meta = {
    date: new Date().toISOString().split("T")[0],
    createdAt: new Date().toISOString(),
    cluster: "devnet",
    clusterVersion,
    rpc: {
      provider: rpc.provider,
      endpointHost: rpc.host,
    },
    softwareVersions: versions,
    adminWallet: "Bat5VTbjGqsThS5oERuXVi7d2JY2TBNomJD2ZciaztaQ",
  };

  fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2), "utf8");
  return clusterVersion;
}

/**
 * Deteksi apakah sebuah error adalah error jaringan transient (yang berhak di-retry sesuai kebijakan proposal)
 */
export function isNetworkError(error: unknown): boolean {
  if (!error) return false;

  const errObj = error as {
    message?: unknown;
    cause?: { message?: unknown; code?: unknown };
    name?: unknown;
    code?: unknown;
    logs?: unknown;
  };

  const msg = typeof errObj?.message === "string" ? errObj.message.toLowerCase() : String(error).toLowerCase();
  const causeMsg = typeof errObj?.cause?.message === "string" ? errObj.cause.message.toLowerCase() : "";
  const causeCode = typeof errObj?.cause?.code === "string" ? errObj.cause.code.toLowerCase() : "";
  const name = typeof errObj?.name === "string" ? errObj.name.toLowerCase() : "";
  const code = typeof errObj?.code === "string" ? errObj.code.toLowerCase() : "";
  const logs = Array.isArray(errObj?.logs) ? errObj.logs.join(" ").toLowerCase() : "";

  const combined = `${msg} ${causeMsg} ${causeCode} ${name} ${code} ${logs}`;

  // Guard: Deterministic contract rejections must NEVER be classified as network errors (check full combined context)
  if (
    combined.includes("frozen") ||
    combined.includes("permanentfreeze") ||
    combined.includes("custom program error") ||
    combined.includes("instructionerror") ||
    combined.includes("unauthorized") ||
    combined.includes("signature verification failed")
  ) {
    return false;
  }

  return (
    combined.includes("fetch failed") ||
    combined.includes("timeout") ||
    combined.includes("timed out") ||
    combined.includes("network") ||
    combined.includes("blockhash not found") ||
    combined.includes("blockhashnotfound") ||
    combined.includes("socket") ||
    combined.includes("econnreset") ||
    combined.includes("econnrefused") ||
    combined.includes("ehostunreach") ||
    combined.includes("eai_again") ||
    combined.includes("429") ||
    combined.includes("too many requests") ||
    combined.includes("rate limit") ||
    combined.includes("502") ||
    combined.includes("503") ||
    combined.includes("504") ||
    combined.includes("bad gateway") ||
    combined.includes("service unavailable") ||
    combined.includes("gateway time") ||
    combined.includes("transactionexpired") ||
    combined.includes("node is behind")
  );
}

interface AttemptMetadataRecord {
  signature?: string;
  txSignature?: string;
  mintAddress?: string;
  onchainElapsedSeconds?: number;
  ipfsElapsedSeconds?: number;
  slot?: number | null;
  feeLamports?: number | null;
  rentDepositLamports?: number | null;
}

interface ErrorLikeRecord {
  name?: string;
  code?: string;
  signature?: string;
  feeLamports?: number;
  message?: string;
}

/**
 * Eksekutor operasi dengan kebijakan retry proposal:
 * Maksimal 2 attempts (1 retry HANYA untuk network error).
 */
export async function executeWithProposalRetry<T>(params: {
  operationName: string;
  trialIndex: number;
  fn: (attempt: 1 | 2) => Promise<T>;
  onAttemptReceipt: (receipt: TransactionReceipt) => void;
  rpcEndpoint: string;
  rpcProvider: string;
  clusterVersion: string;
}): Promise<T> {
  const { operationName, trialIndex, fn, onAttemptReceipt, rpcEndpoint, rpcProvider, clusterVersion } = params;
  const softwareVersions = getSoftwareVersions();
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];

  for (const attempt of [1, 2] as const) {
    const startTime = Date.now();
    const sendTimestamp = new Date().toISOString();

    try {
      const result = await fn(attempt);
      const finalizedTimestamp = new Date().toISOString();
      const elapsedSeconds = (Date.now() - startTime) / 1000;

      // Extract result metadata if available
      const meta = typeof result === "object" && result !== null ? (result as AttemptMetadataRecord) : undefined;
      onAttemptReceipt({
        operation: operationName,
        trialIndex,
        attempt,
        sendTimestamp,
        finalizedTimestamp,
        elapsedSeconds,
        onchainElapsedSeconds: meta?.onchainElapsedSeconds,
        ipfsElapsedSeconds: meta?.ipfsElapsedSeconds,
        slot: meta?.slot,
        txSignature: meta?.txSignature || meta?.signature,
        feeLamports: meta?.feeLamports,
        rentDepositLamports: meta?.rentDepositLamports,
        status: "SUCCESS",
        rpcProvider,
        rpcEndpoint,
        softwareVersions,
        cluster: "devnet",
        clusterVersion,
        wallClockTime: new Date().toLocaleTimeString("id-ID"),
        date: dateStr,
      });

      return result;
    } catch (error) {
      const finalizedTimestamp = new Date().toISOString();
      const elapsedSeconds = (Date.now() - startTime) / 1000;
      const errObj = typeof error === "object" && error !== null ? (error as ErrorLikeRecord) : undefined;
      const errorCode = errObj?.code || (error instanceof Error ? error.name : "UNKNOWN_ERROR");
      const errorMessage = error instanceof Error ? error.message : String(error);

      onAttemptReceipt({
        operation: operationName,
        trialIndex,
        attempt,
        sendTimestamp,
        finalizedTimestamp,
        elapsedSeconds,
        txSignature: errObj?.signature || null,
        feeLamports: errObj?.feeLamports || null,
        status: "FAILED",
        errorCode,
        errorMessage,
        rpcProvider,
        rpcEndpoint,
        softwareVersions,
        cluster: "devnet",
        clusterVersion,
        wallClockTime: new Date().toLocaleTimeString("id-ID"),
        date: dateStr,
      });

      const networkErr = isNetworkError(error);

      if (attempt === 1 && networkErr) {
        console.warn(
          `[Harness] Attempt 1 failed with network error for ${operationName} #${trialIndex}: ${errorMessage}. Retrying (attempt 2)...`
        );
        // Delay 2 detik sebelum retry
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }

      // Jika bukan network error atau sudah attempt 2, lempar error
      throw error;
    }
  }

  throw new Error(`Exhausted 2 attempts for ${operationName} trial ${trialIndex}`);
}


/**
 * Helper untuk mengambil parsed transaction info dengan retry (default 3 attempts, backoff 500ms * attempt)
 * untuk mengatasi RPC indexing latency dan transient network blips saat pengayaan receipt transaksi.
 */
export async function getTransactionWithRetry(
  connection: Connection,
  signature: string,
  maxAttempts: number = 3,
  delayMs: number = 500
) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const txInfo = await connection.getTransaction(signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
      if (txInfo) {
        return txInfo;
      }
    } catch (err) {
      if (attempt === maxAttempts) {
        console.warn(
          `[Receipt Enrichment] Failed to fetch transaction ${signature} after ${maxAttempts} attempts:`,
          err instanceof Error ? err.message : err
        );
        return null;
      }
    }

    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }

  return null;
}
