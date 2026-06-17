import { Keypair, Connection, clusterApiUrl, LAMPORTS_PER_SOL } from "@solana/web3.js";
import bs58 from "bs58";

async function main() {
  const privateKey = process.env.ADMIN_WALLET_PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ ADMIN_WALLET_PRIVATE_KEY not set in environment");
    process.exit(1);
  }

  try {
    // Decode private key
    let keypair: Keypair;
    if (privateKey.startsWith("[")) {
      const secretKey = Uint8Array.from(JSON.parse(privateKey));
      keypair = Keypair.fromSecretKey(secretKey);
    } else {
      const decoded = bs58.decode(privateKey);
      keypair = Keypair.fromSecretKey(decoded);
    }

    const publicKey = keypair.publicKey.toBase58();
    console.log("✅ Wallet public key:", publicKey);

    // Check balance on devnet
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.devnet.solana.com";
    console.log("📡 RPC URL:", rpcUrl);

    const connection = new Connection(rpcUrl, "confirmed");

    console.log("⏳ Connecting to Solana Devnet...");
    const balance = await connection.getBalance(keypair.publicKey);
    console.log(`💰 Balance: ${balance / LAMPORTS_PER_SOL} SOL (${balance} lamports)`);

    if (balance === 0) {
      console.log("\n⚠️  Wallet has 0 SOL! Minting NFT requires ~0.01-0.02 SOL.");
      console.log("   Request devnet SOL from: https://faucet.solana.com");
      console.log(`   Your address: ${publicKey}`);
    } else if (balance < 0.02 * LAMPORTS_PER_SOL) {
      console.log("\n⚠️  Balance might be too low for minting. Consider adding more SOL.");
    } else {
      console.log("\n✅ Balance looks sufficient for minting!");
    }

    // Quick RPC health check
    console.log("\n📡 Testing RPC connection...");
    const slot = await connection.getSlot();
    console.log("✅ Current slot:", slot);

    const blockhash = await connection.getLatestBlockhash();
    console.log("✅ Latest blockhash:", blockhash.blockhash);
    console.log("✅ RPC connection is working!");

  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : error);
    if (error instanceof Error && error.message.includes("fetch failed")) {
      console.log("\n💡 The Solana Devnet RPC might be down or rate-limited.");
      console.log("   Consider using a dedicated RPC provider:");
      console.log("   - Helius (free): https://dev.helius.xyz");
      console.log("   - QuickNode (free tier): https://quicknode.com");
    }
  }
}

main();
