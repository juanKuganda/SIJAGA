import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createNft,
  mplTokenMetadata,
  updateV1,
  fetchMetadataFromSeeds,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  keypairIdentity,
  publicKey,
  percentAmount,
  generateSigner,
} from "@metaplex-foundation/umi";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000; // 2 seconds between retries

/**
 * Helper: sleep for ms
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Custom fetch wrapper with retry logic and timeout
 * Solana Devnet public RPC sering rate-limited / timeout,
 * jadi kita perlu retry mechanism.
 */
function createFetchWithRetry(maxRetries = MAX_RETRIES) {
  return async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        const response = await fetch(input, {
          ...init,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Check for rate limiting (HTTP 429)
        if (response.status === 429) {
          console.warn(
            `[Metaplex] Rate limited (429), retry ${attempt}/${maxRetries}...`
          );
          if (attempt < maxRetries) {
            await sleep(RETRY_DELAY_MS * attempt); // Exponential backoff
            continue;
          }
        }

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(
          `[Metaplex] Fetch attempt ${attempt}/${maxRetries} failed:`,
          lastError.message
        );

        if (attempt < maxRetries) {
          await sleep(RETRY_DELAY_MS * attempt);
        }
      }
    }

    throw new Error(
      `Fetch failed after ${maxRetries} retries. Last error: ${lastError?.message || "unknown"}`
    );
  };
}

/**
 * Inisialisasi Umi instance untuk Metaplex
 * Menggunakan custom fetch dengan retry logic
 */
export function createUmiInstance() {
  const rpcUrl =
    process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.devnet.solana.com";

  console.log("[Metaplex] Using RPC:", rpcUrl);

  const umi = createUmi(rpcUrl, {
    httpHeaders: {},
    fetch: createFetchWithRetry(MAX_RETRIES),
  }).use(mplTokenMetadata());

  return umi;
}

/**
 * Get admin keypair dari environment variable
 *
 * Support 2 format:
 * 1. Base58 string (contoh: "3wHg7...")
 * 2. JSON array (contoh: "[123,45,67,...]")
 */
export function getAdminKeypair(): Keypair {
  const privateKey = process.env.ADMIN_WALLET_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("ADMIN_WALLET_PRIVATE_KEY tidak ditemukan");
  }

  try {
    // Coba parse sebagai JSON array dulu
    if (privateKey.startsWith("[")) {
      const secretKey = Uint8Array.from(JSON.parse(privateKey));
      return Keypair.fromSecretKey(secretKey);
    }

    // Jika bukan array, anggap base58 string
    const decoded = bs58.decode(privateKey);
    return Keypair.fromSecretKey(decoded);
  } catch (error) {
    console.error("Error parsing private key:", error);
    throw new Error(
      "Format ADMIN_WALLET_PRIVATE_KEY tidak valid. Gunakan base58 string atau JSON array."
    );
  }
}

/**
 * Mint NFT Soulbound (non-transferable)
 * Menggunakan Metaplex UMI untuk mint NFT di Solana Devnet.
 */
export async function mintSoulboundNFT(data: {
  nama: string;
  nim: string;
  prodi: string;
  tahunLulus: string;
  metadataUri: string;
  walletTujuan: string;
}) {
  try {
    console.log("[Metaplex] Starting NFT mint for:", data.nama);

    const umi = createUmiInstance();
    const adminKeypair = getAdminKeypair();

    console.log(
      "[Metaplex] Admin wallet:",
      adminKeypair.publicKey.toBase58()
    );

    // Convert keypair ke format Umi dan set sebagai identity
    const umiKeypair = umi.eddsa.createKeypairFromSecretKey(
      adminKeypair.secretKey
    );
    umi.use(keypairIdentity(umiKeypair));

    const recipient = publicKey(data.walletTujuan);

    // Generate new signer untuk mint NFT
    const mintSigner = generateSigner(umi);

    console.log("[Metaplex] Mint address:", mintSigner.publicKey);
    console.log("[Metaplex] Recipient:", data.walletTujuan);
    console.log("[Metaplex] Metadata URI:", data.metadataUri);

    // Create NFT dengan Metaplex
    const result = await createNft(umi, {
      mint: mintSigner,
      name: `Ijazah S1 - ${data.nama}`,
      symbol: "SIJAGA",
      uri: data.metadataUri,
      sellerFeeBasisPoints: percentAmount(0), // Tidak ada royalti (Soulbound)
      tokenOwner: recipient,
      isMutable: true, // Metadata bisa diubah setelah mint (Visual Revoke)
    }).sendAndConfirm(umi, {
      send: { commitment: "finalized" },
      confirm: { commitment: "finalized" },
    });

    // Convert signature dari Uint8Array ke base58 string
    const signatureBase58 = bs58.encode(result.signature);
    const mintAddress = mintSigner.publicKey.toString();

    console.log("[Metaplex] NFT minted successfully!");
    console.log("[Metaplex] Signature:", signatureBase58);
    console.log("[Metaplex] Mint address:", mintAddress);

    return {
      success: true,
      signature: signatureBase58,
      mintAddress,
    };
  } catch (error) {
    console.error("[Metaplex] Error minting NFT:", error);

    // Provide more helpful error messages
    let errorMessage = "Gagal mint NFT";
    if (error instanceof Error) {
      if (error.message.includes("fetch failed") || error.message.includes("blockhash")) {
        errorMessage =
          "Koneksi ke Solana Devnet gagal. Coba lagi dalam beberapa detik. Jika terus gagal, gunakan RPC provider seperti Helius (gratis).";
      } else if (error.message.includes("insufficient")) {
        errorMessage =
          "Saldo SOL wallet admin tidak cukup. Tambahkan SOL devnet via https://faucet.solana.com";
      } else if (error.message.includes("private key") || error.message.includes("ADMIN_WALLET")) {
        errorMessage = error.message;
      } else {
        errorMessage = error.message;
      }
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Revoke NFT Soulbound (Visual Revoke)
 * Mengubah metadata URI NFT menjadi metadata 'DIBATALKAN'
 * 
 * Jika NFT immutable (tidak bisa diubah on-chain), 
 * fungsi ini akan mengembalikan partial success agar 
 * proses revoke di database tetap berjalan.
 */
export async function revokeSoulboundNFT(data: {
  mintAddress: string;
  metadataUri: string;
}) {
  try {
    console.log("[Metaplex] Starting NFT revoke for:", data.mintAddress);

    const umi = createUmiInstance();
    const adminKeypair = getAdminKeypair();

    // Convert keypair ke format Umi dan set sebagai identity
    const umiKeypair = umi.eddsa.createKeypairFromSecretKey(
      adminKeypair.secretKey
    );
    umi.use(keypairIdentity(umiKeypair));

    const mint = publicKey(data.mintAddress);
    
    // Ambil data metadata awal
    const initialMetadata = await fetchMetadataFromSeeds(umi, { mint });

    // Cek apakah metadata bisa diubah (mutable)
    if (!initialMetadata.isMutable) {
      console.warn("[Metaplex] NFT is immutable. Skipping on-chain update, proceeding with database-only revoke.");
      return {
        success: true,
        signature: null,
        warning: "NFT immutable — revoke hanya dilakukan di database. Metadata on-chain tidak diubah.",
      };
    }

    // Update NFT
    const result = await updateV1(umi, {
      mint,
      authority: umi.identity,
      data: {
        ...initialMetadata,
        uri: data.metadataUri,
        // Kita tidak mengubah 'name' on-chain karena batas maksimal Metaplex adalah 32 bytes.
        // Penanda DIBATALKAN sudah ada di dalam JSON metadata (URI).
      },
    }).sendAndConfirm(umi, {
      send: { commitment: "finalized" },
      confirm: { commitment: "finalized" },
    });

    const signatureBase58 = bs58.encode(result.signature);
    console.log("[Metaplex] NFT revoked successfully!");
    
    return {
      success: true,
      signature: signatureBase58,
    };
  } catch (error) {
    console.error("[Metaplex] Error revoking NFT:", error);
    
    const errorMsg = error instanceof Error ? error.message : "Gagal revoke NFT";
    
    // Jika error karena immutable, tetap lanjutkan (revoke di DB saja)
    if (errorMsg.includes("immutable") || errorMsg.includes("0x3b")) {
      console.warn("[Metaplex] NFT immutable detected from error. Proceeding with database-only revoke.");
      return {
        success: true,
        signature: null,
        warning: "NFT immutable — revoke hanya dilakukan di database. Metadata on-chain tidak diubah.",
      };
    }
    
    return {
      success: false,
      error: errorMsg,
    };
  }
}

export async function restoreSoulboundNFT(data: {
  mintAddress: string;
  metadataUri: string;
}) {
  try {
    console.log("[Metaplex] Starting NFT restore for:", data.mintAddress);

    const umi = createUmiInstance();
    const adminKeypair = getAdminKeypair();

    const umiKeypair = umi.eddsa.createKeypairFromSecretKey(
      adminKeypair.secretKey
    );
    umi.use(keypairIdentity(umiKeypair));

    const mint = publicKey(data.mintAddress);
    
    const initialMetadata = await fetchMetadataFromSeeds(umi, { mint });

    if (!initialMetadata.isMutable) {
      console.warn("[Metaplex] NFT is immutable. Skipping on-chain update.");
      return {
        success: true,
        signature: null,
        warning: "NFT immutable — restore hanya dilakukan di database. Metadata on-chain tidak diubah.",
      };
    }

    const result = await updateV1(umi, {
      mint,
      authority: umi.identity,
      data: {
        ...initialMetadata,
        uri: data.metadataUri,
      },
    }).sendAndConfirm(umi, {
      send: { commitment: "finalized" },
      confirm: { commitment: "finalized" },
    });

    const signatureBase58 = bs58.encode(result.signature);
    console.log("[Metaplex] NFT restored successfully!");
    
    return {
      success: true,
      signature: signatureBase58,
    };
  } catch (error) {
    console.error("[Metaplex] Error restoring NFT:", error);
    
    const errorMsg = error instanceof Error ? error.message : "Gagal restore NFT";
    
    if (errorMsg.includes("immutable") || errorMsg.includes("0x3b")) {
      return {
        success: true,
        signature: null,
        warning: "NFT immutable — metadata on-chain tidak dapat diubah (sudah di-lock).",
      };
    }

    return {
      success: false,
      error: errorMsg,
    };
  }
}
