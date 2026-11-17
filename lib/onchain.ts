/**
 * lib/onchain.ts — On-chain inspection helper untuk SIJAGA
 *
 * Fungsi tunggal `inspectCertificate(mintAddress)` yang membaca
 * state aset Metaplex Core dari Solana dan metadata URI dari IPFS.
 *
 * Dipakai oleh:
 * - /api/verify (portal verifikasi publik)
 * - /api/actions/verify (Blink verifikasi)
 * - /api/nft/mint (rekonsiliasi setelah mint)
 */

import { fetchAsset } from "@metaplex-foundation/mpl-core";
import { publicKey } from "@metaplex-foundation/umi";
import { createUmiInstance } from "./metaplex";

// ─── Types ───────────────────────────────────────────────────────

export type OnChainInspect =
  | {
      ok: true;
      owner: string;
      name: string;
      uri: string;
      frozen: boolean;
      dataHash: string | null;
      updateAuthority: string;
      /** true bila metadata terkini menyatakan aset dicabut ([DIBATALKAN]). */
      revoked: boolean;
      prodi?: string | null;
      tahunLulus?: string | null;
      image?: string | null;
      attributes?: Array<{ trait_type: string; value: string }>;
      timings?: {
        rpcMs: number;
        ipfsMs: number;
      };
    }
  | {
      ok: false;
      reason: "NOT_FOUND" | "NOT_ASSET" | "RPC" | "METADATA" | "NO_HASH";
      timings?: {
        rpcMs?: number;
        ipfsMs?: number;
      };
    };

// ─── Helper: fetch metadata JSON with timeout ────────────────────

async function fetchMetadataJson(
  uri: string,
  timeoutMs = 15000
): Promise<Record<string, unknown> | null> {
  try {
    // Resolve IPFS URIs to gateway
    let resolvedUri = uri;
    if (uri.startsWith("ipfs://")) {
      const gateway =
        process.env.NEXT_PUBLIC_PINATA_GATEWAY ||
        "https://gateway.pinata.cloud";
      resolvedUri = `${gateway}/ipfs/${uri.replace("ipfs://", "")}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(resolvedUri, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) return null;

    return (await response.json()) as Record<string, unknown>;
  } catch (error) {
    console.warn(
      "[OnChain] Failed to fetch metadata URI:",
      uri,
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

// ─── Helper: extract attribute from metadata ──────────────────────

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
      (attr as { trait_type: string }).trait_type.toLowerCase() ===
        traitType.toLowerCase()
    ) {
      const value = (attr as { value: unknown }).value;
      return value !== undefined && value !== null ? String(value) : null;
    }
  }

  return null;
}

// ─── Helper: extract Data Hash from metadata attributes ──────────

function extractDataHash(
  metadata: Record<string, unknown>
): string | null {
  return extractAttribute(metadata, "Data Hash");
}

// ─── Helper: detect revoked asset ────────────────────────────────

/**
 * Apakah aset sudah dicabut menurut metadata terkini.
 *
 * Sinyal (salah satu cukup — revoke menulis ketiganya lewat jalur yang
 * berbeda, jadi cek semuanya agar tidak ada jalur yang lolos diam-diam):
 * - nama on-chain mengandung "[DIBATALKAN]" (ditulis revokeSoulboundNFT)
 * - nama di metadata JSON mengandung "[DIBATALKAN]"
 * - atribut metadata Status = "Dibatalkan"
 *
 * Perbandingan case-insensitive: penanda ini konvensi penulisan manusia,
 * bukan konstanta protokol.
 */
export function isRevoked(
  assetName: string,
  metadata: Record<string, unknown>
): boolean {
  const marker = "[dibatalkan]";
  if (assetName.toLowerCase().includes(marker)) return true;
  const metadataName =
    typeof metadata.name === "string" ? metadata.name : "";
  if (metadataName.toLowerCase().includes(marker)) return true;
  const status = extractAttribute(metadata, "Status");
  return status !== null && status.trim().toLowerCase() === "dibatalkan";
}

// ─── Helper: check PermanentFreezeDelegate plugin ────────────────

function isFrozen(
  asset: Awaited<ReturnType<typeof fetchAsset>>
): boolean {
  // Metaplex Core stores plugins in asset.freezeDelegate or similar
  // Check the plugins array/object for PermanentFreezeDelegate
  if ("plugins" in asset && Array.isArray((asset as Record<string, unknown>).plugins)) {
    for (const plugin of (asset as { plugins: Array<Record<string, unknown>> }).plugins) {
      if (plugin.type === "PermanentFreezeDelegate") {
        return (plugin as { frozen?: boolean }).frozen === true;
      }
    }
  }

  // Direct property check (some UMI versions)
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

  // Fallback: check freeze authority structure
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

// ─── Main: inspectCertificate ────────────────────────────────────

/**
 * Inspeksi state on-chain dari Soulbound NFT (Metaplex Core).
 *
 * Mengembalikan union tegas:
 * - `ok: true` + data lengkap jika berhasil
 * - `ok: false` + reason jika gagal
 *
 * TIDAK melempar exception — semua error ditangkap dan dikembalikan
 * sebagai `ok: false` dengan reason yang jelas.
 */
export async function inspectCertificate(
  mintAddress: string,
  customRpcUrl?: string
): Promise<OnChainInspect> {
  const timings = { rpcMs: 0, ipfsMs: 0 };
  try {
    const umi = createUmiInstance(customRpcUrl);

    // 1. Fetch asset dari Solana
    let asset: Awaited<ReturnType<typeof fetchAsset>>;
    const rpcStart = Date.now();
    try {
      asset = await fetchAsset(umi, publicKey(mintAddress));
      timings.rpcMs = Date.now() - rpcStart;
    } catch (fetchErr) {
      timings.rpcMs = Date.now() - rpcStart;
      const msg =
        fetchErr instanceof Error ? fetchErr.message : String(fetchErr);

      // Akun tidak ada di blockchain sama sekali
      if (
        (fetchErr instanceof Error &&
          fetchErr.name === "AccountNotFoundError") ||
        msg.includes("AccountNotFoundError") ||
        msg.includes("Account does not exist") ||
        msg.includes("could not find account")
      ) {
        return { ok: false, reason: "NOT_FOUND", timings };
      }

      // Akun ADA di chain, tapi bukan aset Metaplex Core
      // (mis. alamat dompet / akun program lain): RPC berhasil
      // mengembalikan akun, namun deserialisasi sebagai
      // AssetAccountData gagal. UMI hanya melempar
      // UnexpectedAccountError dari deserializeAccount — setelah
      // RPC mengembalikan data akun — jadi ini BUKAN kegagalan
      // RPC/rate limit. Bukti: probe fetchAsset ke alamat dompet
      // mengembalikan "UnexpectedAccountError: The account at the
      // provided address [...] is not of the expected type
      // [AssetAccountData]. Caused By: DeserializingEmptyBufferError".
      if (
        (fetchErr instanceof Error &&
          fetchErr.name === "UnexpectedAccountError") ||
        msg.includes("is not of the expected type")
      ) {
        return { ok: false, reason: "NOT_ASSET", timings };
      }

      // RPC error (timeout, rate limit, dll)
      console.error("[OnChain] RPC error fetching asset:", msg);
      return { ok: false, reason: "RPC", timings };
    }

    // 2. Extract basic fields
    const owner = asset.owner.toString();
    const name = asset.name;
    const uri = asset.uri;
    const frozen = isFrozen(asset);

    // updateAuthority
    let updateAuthority = "";
    if (asset.updateAuthority.type === "Address") {
      updateAuthority = asset.updateAuthority.address?.toString() ?? "Unknown";
    } else if (asset.updateAuthority.type === "Collection") {
      updateAuthority = asset.updateAuthority.address?.toString() ?? "Unknown";
    } else {
      updateAuthority = "None";
    }

    // 3. Fetch metadata JSON dari URI
    if (!uri) {
      return { ok: false, reason: "METADATA", timings };
    }

    const ipfsStart = Date.now();
    const metadata = await fetchMetadataJson(uri);
    timings.ipfsMs = Date.now() - ipfsStart;
    if (!metadata) {
      // Fail-closed: metadata fetch gagal = inspeksi gagal
      // Tidak boleh return ok: true tanpa dataHash — bisa bypass hash check
      return { ok: false, reason: "METADATA", timings };
    }

    // 4. Extract Data Hash dan atribut dari metadata
    const dataHash = extractDataHash(metadata);
    const revoked = isRevoked(name, metadata);
    const prodi =
      extractAttribute(metadata, "Program Studi") ||
      extractAttribute(metadata, "Prodi");
    const tahunLulus = extractAttribute(metadata, "Tahun Lulus");
    const image = typeof metadata.image === "string" ? metadata.image : null;
    const attributes = Array.isArray(metadata.attributes)
      ? (metadata.attributes as Array<{ trait_type: string; value: string }>)
      : undefined;

    return {
      ok: true,
      owner,
      name,
      uri,
      frozen,
      dataHash,
      updateAuthority,
      revoked,
      prodi,
      tahunLulus,
      image,
      attributes,
      timings,
    };
  } catch (error) {
    console.error(
      "[OnChain] Unexpected error in inspectCertificate:",
      error instanceof Error ? error.message : error
    );
    return { ok: false, reason: "RPC", timings };
  }
}
