import { Connection, clusterApiUrl, PublicKey } from "@solana/web3.js";

/**
 * Koneksi ke Solana cluster
 */
export const connection = new Connection(
  process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC || clusterApiUrl("devnet"),
  "confirmed"
);

/**
 * Validasi alamat wallet Solana
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get SOL balance dari wallet
 */
export async function getSolBalance(walletAddress: string): Promise<number> {
  try {
    const publicKey = new PublicKey(walletAddress);
    const balance = await connection.getBalance(publicKey);
    return balance / 1e9; // Convert lamports to SOL
  } catch {
    return 0;
  }
}

/**
 * Get token accounts dari wallet
 * 
 * CATATAN: Fungsi ini DIHAPUS karena menggunakan SPL Token program
 * (TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA) yang TIDAK relevan
 * untuk Metaplex Core NFT. Gunakan inspectCertificate() dari lib/onchain.ts
 * untuk membaca state NFT ijazah.
 */
// getTokenAccounts REMOVED — gunakan inspectCertificate() dari lib/onchain.ts

