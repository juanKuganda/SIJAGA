import { Connection, Keypair } from "@solana/web3.js";
import {
  prepareMintSigner,
  mintSoulboundNFT,
  revokeSoulboundNFT,
} from "../../lib/metaplex";
import {
  generateCertificateMetadata,
  generateAndUploadCertificateImage,
  uploadMetadataToPinata,
  generateRevokedMetadata,
} from "../../lib/pinata";
import { generateDataHash } from "../../lib/crypto";
import {
  recordReceipt,
  ensureRunMetadata,
  getRpcDetails,
  executeWithProposalRetry,
  TransactionReceipt,
} from "./common";

async function runBenchRevoke() {
  const args = process.argv.slice(2);
  const nIndex = args.indexOf("--n");
  const numTrials = nIndex !== -1 && args[nIndex + 1] ? parseInt(args[nIndex + 1], 10) : 30;

  console.log(`=======================================================`);
  console.log(`  SIJAGA BENCHMARK: REVOCATION (Visual Revoke On-Chain)`);
  console.log(`  Total Trials Planned: ${numTrials}                   `);
  console.log(`=======================================================\n`);

  const { rpcUrl, provider, host } = getRpcDetails();
  const connection = new Connection(rpcUrl, "confirmed");
  const clusterVersion = await ensureRunMetadata(connection);

  const receipts: TransactionReceipt[] = [];

  for (let i = 1; i <= numTrials; i++) {
    console.log(`\n--- [Trial ${i}/${numTrials}] Revocation Test ---`);

    // 1. Setup asset untuk direvoke (mint terlebih dahulu)
    const fakeNim = `REVOKE-${String(10000 + i).slice(1)}`;
    const studentWallet = Keypair.generate().publicKey.toBase58();

    const { hash: dataHash } = generateDataHash("Revoke Test Subject", fakeNim, "Teknik Informatika");
    const { gatewayUrl: initialImageUrl } = await generateAndUploadCertificateImage(
      { prodi: "Teknik Informatika", tahunLulus: "2026", dataHash },
      "MINTED"
    );
    const initialMetadata = generateCertificateMetadata({
      prodi: "Teknik Informatika",
      tahunLulus: "2026",
      dataHash,
      imageUri: initialImageUrl,
    });
    const { gatewayUrl: initialMetadataUri } = await uploadMetadataToPinata(initialMetadata);

    const { mintSigner } = prepareMintSigner();
    const mintRes = await mintSoulboundNFT({
      metadataUri: initialMetadataUri,
      walletTujuan: studentWallet,
      mintSigner,
    });

    if (!mintRes.success || !mintRes.mintAddress) {
      console.warn(`[Trial ${i}] Gagal setup mint untuk revoke, skip trial.`);
      continue;
    }

    const mintAddress = mintRes.mintAddress;
    console.log(`[Trial ${i}] Base asset ready: ${mintAddress}`);

    // 2. Ukur Operasi Revoke
    try {
      await executeWithProposalRetry({
        operationName: "REVOKE",
        trialIndex: i,
        rpcEndpoint: host,
        rpcProvider: provider,
        clusterVersion,
        onAttemptReceipt: (receipt) => {
          recordReceipt(receipt);
          receipts.push(receipt);
        },
        fn: async () => {
          const ipfsStart = Date.now();
          const { gatewayUrl: revokedImageUrl } = await generateAndUploadCertificateImage(
            { prodi: "Teknik Informatika", tahunLulus: "2026" },
            "REVOKED"
          );

          const revokedMetadata = generateRevokedMetadata({
            prodi: "Teknik Informatika",
            tahunLulus: "2026",
          });
          revokedMetadata.image = revokedImageUrl;
          revokedMetadata.properties.files[0].uri = revokedImageUrl;

          const { gatewayUrl: revokedMetadataUri } = await uploadMetadataToPinata(revokedMetadata);
          const ipfsElapsedSeconds = (Date.now() - ipfsStart) / 1000;

          const onchainStart = Date.now();
          const revokeRes = await revokeSoulboundNFT({
            mintAddress,
            metadataUri: revokedMetadataUri,
          });

          if (!revokeRes.success || !revokeRes.signature) {
            throw new Error(revokeRes.error || "Revoke failed on-chain");
          }

          const onchainElapsedSeconds = (Date.now() - onchainStart) / 1000;

          // Fetch fee & slot
          let feeLamports: number | null = null;
          let slot: number | null = null;

          try {
            const txInfo = await connection.getTransaction(revokeRes.signature, {
              commitment: "confirmed",
              maxSupportedTransactionVersion: 0,
            });
            if (txInfo) {
              feeLamports = txInfo.meta?.fee ?? null;
              slot = txInfo.slot;
            }
          } catch (err) {
            console.warn(`[Trial ${i}] Could not fetch txInfo for fee:`, err);
          }

          console.log(`✓ Trial ${i} Revoke Success:`);
          console.log(`  - Signature: ${revokeRes.signature}`);
          console.log(`  - IPFS Time: ${ipfsElapsedSeconds.toFixed(2)}s | On-Chain Time: ${onchainElapsedSeconds.toFixed(2)}s`);
          console.log(`  - Fee: ${feeLamports ?? "?"} lamports | Slot: ${slot ?? "?"}`);

          return {
            signature: revokeRes.signature,
            ipfsElapsedSeconds,
            onchainElapsedSeconds,
            feeLamports,
            slot,
          };
        },
      });
    } catch (err) {
      console.error(`✗ Trial ${i} Revoke Failed:`, err instanceof Error ? err.message : err);
    }
  }

  // Summary statistics
  const successReceipts = receipts.filter((r) => r.status === "SUCCESS");
  const times = successReceipts.map((r) => r.elapsedSeconds).sort((a, b) => a - b);
  const onchainTimes = successReceipts.map((r) => r.onchainElapsedSeconds || 0).sort((a, b) => a - b);

  const median = times[Math.floor(times.length / 2)] || 0;
  const p95Index = Math.min(Math.floor(times.length * 0.95), times.length - 1);
  const p95 = times[p95Index] || 0;

  console.log(`\n=======================================================`);
  console.log(`  BENCHMARK REVOKE SUMMARY (n=${receipts.length})     `);
  console.log(`=======================================================`);
  console.log(`- Total Success: ${successReceipts.length}/${receipts.length}`);
  console.log(`- Median Time (p50): ${median.toFixed(2)} s`);
  console.log(`- 95th Percentile (p95): ${p95.toFixed(2)} s`);
  console.log(`- On-Chain Only Median: ${(onchainTimes[Math.floor(onchainTimes.length / 2)] || 0).toFixed(2)} s`);
  console.log(`=======================================================\n`);
}

runBenchRevoke().catch((e) => {
  console.error("Bench-revoke error:", e);
  process.exit(1);
});

