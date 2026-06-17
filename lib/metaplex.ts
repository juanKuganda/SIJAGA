import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createNft,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  keypairIdentity,
  publicKey,
  percentAmount,
  generateSigner,
} from "@metaplex-foundation/umi";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

/**
 * Inisialisasi Umi instance untuk Metaplex
 */
export function createUmiInstance() {
  const rpcUrl =
    process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.devnet.solana.com";
  const umi = createUmi(rpcUrl).use(mplTokenMetadata());
  return umi;
}

/**
 * Get admin keypair dari environment variable
 */
export function getAdminKeypair(): Keypair {
  const privateKeyJson = process.env.ADMIN_WALLET_PRIVATE_KEY;
  if (!privateKeyJson) {
    throw new Error("ADMIN_WALLET_PRIVATE_KEY tidak ditemukan");
  }

  try {
    const secretKey = Uint8Array.from(JSON.parse(privateKeyJson));
    return Keypair.fromSecretKey(secretKey);
  } catch {
    throw new Error("Format ADMIN_WALLET_PRIVATE_KEY tidak valid");
  }
}

/**
 * Mint NFT Soulbound (non-transferable)
 *
 * Note: Untuk production, implementasi lengkap Metaplex diperlukan.
 * Fungsi ini adalah placeholder yang menunjukkan struktur dasar.
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
    const umi = createUmiInstance();
    const adminKeypair = getAdminKeypair();

    // Convert keypair ke format Umi dan set sebagai identity
    const umiKeypair = umi.eddsa.createKeypairFromSecretKey(
      adminKeypair.secretKey
    );
    umi.use(keypairIdentity(umiKeypair));

    const recipient = publicKey(data.walletTujuan);

    // Generate new signer untuk mint NFT
    const mintSigner = generateSigner(umi);

    // Create NFT dengan Metaplex
    const result = await createNft(umi, {
      mint: mintSigner,
      name: `Ijazah S1 - ${data.nama}`,
      symbol: "SIJAGA",
      uri: data.metadataUri,
      sellerFeeBasisPoints: percentAmount(0), // Tidak ada royalti (Soulbound)
      tokenOwner: recipient,
      isMutable: false, // Metadata tidak bisa diubah setelah mint (Soulbound)
    }).sendAndConfirm(umi);

    // Convert signature dari Uint8Array ke base58 string
    const signatureBase58 = bs58.encode(result.signature);

    return {
      success: true,
      signature: signatureBase58,
    };
  } catch (error) {
    console.error("Error minting NFT:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mint NFT",
    };
  }
}
