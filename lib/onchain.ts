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
import { createUmiInstance, getAdminKeypair } from "./metaplex";
import { keypairIdentity } from "@metaplex-foundation/umi";

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
    }
  | {
      ok: false;
      reason: "NOT_FOUND" | "RPC" | "METADATA" | "NO_HASH";
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

// ─── Helper: extract Data Hash from metadata attributes ──────────

function extractDataHash(
  metadata: Record<string, unknown>
): string | null {
  const attributes = metadata.attributes;
  if (!Array.isArray(attributes)) return null;

  for (const attr of attributes) {
    if (
      typeof attr === "object" &&
      attr !== null &&
      "trait_type" in attr &&
      "value" in attr &&
      (attr as { trait_type: string }).trait_type === "Data Hash"
    ) {
      const value = (attr as { value: string }).value;
      return typeof value === "string" ? value : null;
    }
  }

  return null;
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
  mintAddress: string
): Promise<OnChainInspect> {
  try {
    const umi = createUmiInstance();
    const adminKeypair = getAdminKeypair();
    const umiKeypair = umi.eddsa.createKeypairFromSecretKey(
      adminKeypair.secretKey
    );
    umi.use(keypairIdentity(umiKeypair));

    // 1. Fetch asset dari Solana
    let asset: Awaited<ReturnType<typeof fetchAsset>>;
    try {
      asset = await fetchAsset(umi, publicKey(mintAddress));
    } catch (fetchErr) {
      const msg =
        fetchErr instanceof Error ? fetchErr.message : String(fetchErr);

      // Asset tidak ditemukan di blockchain
      if (
        msg.includes("AccountNotFoundError") ||
        msg.includes("Account does not exist") ||
        msg.includes("could not find account")
      ) {
        return { ok: false, reason: "NOT_FOUND" };
      }

      // RPC error (timeout, rate limit, dll)
      console.error("[OnChain] RPC error fetching asset:", msg);
      return { ok: false, reason: "RPC" };
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
      return {
        ok: true,
        owner,
        name,
        uri: "",
        frozen,
        dataHash: null,
        updateAuthority,
      };
    }

    const metadata = await fetchMetadataJson(uri);
    if (!metadata) {
      // Metadata fetch gagal — tetap return data asset tanpa hash
      // Ini bisa terjadi jika IPFS down, tapi asset on-chain valid
      return {
        ok: true,
        owner,
        name,
        uri,
        frozen,
        dataHash: null,
        updateAuthority,
      };
    }

    // 4. Extract Data Hash dari attributes
    const dataHash = extractDataHash(metadata);

    return {
      ok: true,
      owner,
      name,
      uri,
      frozen,
      dataHash,
      updateAuthority,
    };
  } catch (error) {
    console.error(
      "[OnChain] Unexpected error in inspectCertificate:",
      error instanceof Error ? error.message : error
    );
    return { ok: false, reason: "RPC" };
  }
}
