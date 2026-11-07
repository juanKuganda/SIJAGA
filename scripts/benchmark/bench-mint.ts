import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
  getAdminKeypair,
  prepareMintSigner,
  mintSoulboundNFT,
} from "../../lib/metaplex";
import {
  generateCertificateMetadata,
  generateAndUploadCertificateImage,
  uploadMetadataToPinata,
} from "../../lib/pinata";
import { generateDataHash } from "../../lib/crypto";
import {
  recordReceipt,
  ensureRunMetadata,
  getRpcDetails,
  executeWithProposalRetry,
  getTransactionWithRetry,
  TransactionReceipt,
} from "./common";

async function runBenchMint() {
  const args = process.argv.slice(2);
  const nIndex = args.indexOf("--n");
  const numTrials = nIndex !== -1 && args[nIndex + 1] ? parseInt(args[nIndex + 1], 10) : 30;

  console.log(`=======================================================`);
  console.log(`  SIJAGA BENCHMARK: MINTING (Soulbound NFT Issuance)   `);
  console.log(`  Total Trials Planned: ${numTrials}                   `);
  console.log(`=======================================================\n`);

  const { rpcUrl, provider, host } = getRpcDetails();
  const connection = new Connection(rpcUrl, "confirmed");
  const clusterVersion = await ensureRunMetadata(connection);

  const adminKeypair = getAdminKeypair();
  console.log(`[Config] Admin Wallet: ${adminKeypair.publicKey.toBase58()}`);
  console.log(`[Config] RPC: ${provider} (${host})`);

  const receipts: TransactionReceipt[] = [];

  for (let i = 1; i <= numTrials; i++) {
    console.log(`\n--- [Trial ${i}/${numTrials}] Starting Diploma Issuance ---`);

    // Data mahasiswa fiktif
    const fakeNim = `F551${String(10000 + i).slice(1)}`;
    const fakeNama = `Fictitious Graduate ${i}`;
    const fakeProdi = "Teknik Informatika";
    const fakeTahunLulus = "2026";

    // Dummy student wallet
    const studentWallet = Keypair.generate().publicKey.toBase58();

    try {
      await executeWithProposalRetry({
        operationName: "MINT",
        trialIndex: i,
        rpcEndpoint: host,
        rpcProvider: provider,
        clusterVersion,
        onAttemptReceipt: (receipt) => {
          recordReceipt(receipt);
          receipts.push(receipt);
        },
        fn: async () => {
          // 1. IPFS Phase: Generate hash, image, and metadata
          const ipfsStart = Date.now();
          const { hash: dataHash } = generateDataHash(fakeNama, fakeNim, fakeProdi);

          const { gatewayUrl: imageUrl } = await generateAndUploadCertificateImage(
            {
              prodi: fakeProdi,
              tahunLulus: fakeTahunLulus,
              dataHash,
            },
            "MINTED"
          );

          const metadata = generateCertificateMetadata({
            prodi: fakeProdi,
            tahunLulus: fakeTahunLulus,
            dataHash,
            imageUri: imageUrl,
          });

          const { gatewayUrl: metadataUri } = await uploadMetadataToPinata(metadata);
          const ipfsElapsedSeconds = (Date.now() - ipfsStart) / 1000;

          // 2. On-Chain Phase: Mint Soulbound NFT
          const onchainStart = Date.now();
          const { mintSigner } = prepareMintSigner();

          const mintRes = await mintSoulboundNFT({
            metadataUri,
            walletTujuan: studentWallet,
            mintSigner,
          });

          if (!mintRes.success || !mintRes.signature) {
            throw new Error(mintRes.error || "Minting failed without signature");
          }

          const onchainElapsedSeconds = (Date.now() - onchainStart) / 1000;

          // 3. Fetch Transaction Fee & Slot from Solana
          let feeLamports: number | null = null;
          let slot: number | null = null;
          let rentDepositLamports: number | null = null;

          try {
            const txInfo = await getTransactionWithRetry(connection, mintRes.signature, 3, 500);
            if (txInfo) {
              feeLamports = txInfo.meta?.fee ?? null;
              slot = txInfo.slot;
              // Rent deposit for Metaplex Core asset account
              if (txInfo.meta?.postBalances) {
                const post = txInfo.meta.postBalances;
                const assetBalance = post[1] ?? null;
                rentDepositLamports = assetBalance;
              }
            }

            if (rentDepositLamports === null && mintRes.mintAddress) {
              for (let bAttempt = 1; bAttempt <= 3; bAttempt++) {
                try {
                  rentDepositLamports = await connection.getBalance(
                    new PublicKey(mintRes.mintAddress),
                    "confirmed"
                  );
                  if (rentDepositLamports !== null) break;
                } catch {
                  if (bAttempt < 3) await new Promise((r) => setTimeout(r, 500 * bAttempt));
                }
              }
            }
          } catch (err) {
            console.warn(`[Trial ${i}] Could not fetch txInfo for fee:`, err);
          }

          console.log(`✓ Trial ${i} Success:`);
          console.log(`  - Mint Address: ${mintRes.mintAddress}`);
          console.log(`  - Signature: ${mintRes.signature}`);
          console.log(`  - IPFS Time: ${ipfsElapsedSeconds.toFixed(2)}s | On-Chain Time: ${onchainElapsedSeconds.toFixed(2)}s`);
          console.log(`  - Fee: ${feeLamports ?? "?"} lamports | Rent: ${rentDepositLamports ?? "?"} lamports`);

          return {
            signature: mintRes.signature,
            mintAddress: mintRes.mintAddress,
            ipfsElapsedSeconds,
            onchainElapsedSeconds,
            feeLamports,
            rentDepositLamports,
            slot,
          };
        },
      });
    } catch (err) {
      console.error(`✗ Trial ${i} Failed completely:`, err instanceof Error ? err.message : err);
    }
  }

  // Summary statistics
  const successReceipts = receipts.filter((r) => r.status === "SUCCESS");
  const times = successReceipts.map((r) => r.elapsedSeconds).sort((a, b) => a - b);
  const onchainTimes = successReceipts
    .map((r) => r.onchainElapsedSeconds || 0)
    .sort((a, b) => a - b);

  const median = times[Math.floor(times.length / 2)] || 0;
  const p95Index = Math.min(Math.floor(times.length * 0.95), times.length - 1);
  const p95 = times[p95Index] || 0;
  const min = times[0] || 0;
  const max = times[times.length - 1] || 0;

  console.log(`\n=======================================================`);
  console.log(`  BENCHMARK MINT SUMMARY (n=${receipts.length})       `);
  console.log(`=======================================================`);
  console.log(`- Total Success: ${successReceipts.length}/${receipts.length}`);
  console.log(`- End-to-End Elapsed Time (IPFS + On-chain):`);
  console.log(`  * Median (p50): ${median.toFixed(2)} s`);
  console.log(`  * 95th Percentile (p95): ${p95.toFixed(2)} s`);
  console.log(`  * Min: ${min.toFixed(2)} s | Max: ${max.toFixed(2)} s`);
  console.log(`- On-Chain Only Time:`);
  console.log(`  * Median (p50): ${(onchainTimes[Math.floor(onchainTimes.length / 2)] || 0).toFixed(2)} s`);
  console.log(`  * Max: ${(onchainTimes[onchainTimes.length - 1] || 0).toFixed(2)} s`);
  console.log(`=======================================================\n`);
}

runBenchMint()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error("Bench-mint error:", e);
    process.exit(1);
  });

