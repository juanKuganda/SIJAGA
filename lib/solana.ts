import { Connection, clusterApiUrl, PublicKey } from "@solana/web3.js";

/**
 * Koneksi ke Solana cluster
 */
export const connection = new Connection(
  process.env.NEXT_PUBLIC_SOLANA_RPC || clusterApiUrl("devnet"),
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
 */
export async function getTokenAccounts(walletAddress: string) {
  try {
    const publicKey = new PublicKey(walletAddress);
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      publicKey,
      {
        programId: new PublicKey(
          "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        ),
      }
    );
    return tokenAccounts.value;
  } catch {
    return [];
  }
}
