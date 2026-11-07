import { Connection, Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";
import {
  prepareMintSigner,
  mintSoulboundNFT,
} from "../../lib/metaplex";
import {
  generateCertificateMetadata,
  generateAndUploadCertificateImage,
  uploadMetadataToPinata,
} from "../../lib/pinata";
import { generateDataHash } from "../../lib/crypto";
import { inspectCertificate } from "../../lib/onchain";
import {
  createVerificationChallenge,
  verifyVerificationChallenge,
} from "../../lib/challenge";
import {
  recordReceipt,
  ensureRunMetadata,
  getRpcDetails,
  executeWithProposalRetry,
  TransactionReceipt,
} from "./common";

async function runBenchVerify() {
  const args = process.argv.slice(2);
  const nIndex = args.indexOf("--n");
  const numTrials = nIndex !== -1 && args[nIndex + 1] ? parseInt(args[nIndex + 1], 10) : 30;

  console.log(`=======================================================`);
  console.log(`  SIJAGA BENCHMARK: VERIFICATION (On-Chain + Challenge)`);
  console.log(`  Total Trials Planned: ${numTrials}                   `);
  console.log(`=======================================================\n`);

  const { rpcUrl, provider, host } = getRpcDetails();
  const connection = new Connection(rpcUrl, "confirmed");
  const clusterVersion = await ensureRunMetadata(connection);

  // Setup 1 asset valid untuk diverifikasi berulang
  console.log("[Setup] Mempersiapkan aset ijazah valid untuk verifikasi benchmark...");
  const studentKeypair = Keypair.generate();
  const studentWallet = studentKeypair.publicKey.toBase58();

  const { hash: dataHash } = generateDataHash("Verify Benchmark Graduate", "F55199999", "Teknik Informatika");
  const { gatewayUrl: imageUrl } = await generateAndUploadCertificateImage(
    { prodi: "Teknik Informatika", tahunLulus: "2026", dataHash },
    "MINTED"
  );
  const metadata = generateCertificateMetadata({
    prodi: "Teknik Informatika",
    tahunLulus: "2026",
    dataHash,
    imageUri: imageUrl,
  });
  const { gatewayUrl: metadataUri } = await uploadMetadataToPinata(metadata);

  const { mintSigner } = prepareMintSigner();
  const mintRes = await mintSoulboundNFT({
    metadataUri,
    walletTujuan: studentWallet,
    mintSigner,
  });

  if (!mintRes.success || !mintRes.mintAddress) {
    throw new Error("Gagal setup base asset untuk benchmark verifikasi: " + mintRes.error);
  }

  const mintAddress = mintRes.mintAddress;
  console.log(`[Setup] Aset siap: ${mintAddress} (Owner: ${studentWallet})\n`);

  const receipts: TransactionReceipt[] = [];

  for (let i = 1; i <= numTrials; i++) {
    console.log(`--- [Trial ${i}/${numTrials}] Verification Trial ---`);

    try {
      await executeWithProposalRetry({
        operationName: "VERIFY",
        trialIndex: i,
        rpcEndpoint: host,
        rpcProvider: provider,
        clusterVersion,
        onAttemptReceipt: (receipt) => {
          recordReceipt(receipt);
          receipts.push(receipt);
        },
        fn: async () => {
          const startTime = Date.now();

          // 1. On-Chain inspection (Solana state + IPFS metadata fetch)
          const inspection = await inspectCertificate(mintAddress);
          if (!inspection.ok) {
            throw new Error(`Inspect failed: ${inspection.reason}`);
          }

          // 2. Cryptographic challenge-response
          const challenge = await createVerificationChallenge(studentWallet);
          const sig = nacl.sign.detached(
            Buffer.from(challenge.message, "utf-8"),
            studentKeypair.secretKey
          );
          const sigBase58 = bs58.encode(sig);

          const verifyRes = await verifyVerificationChallenge({
            walletAddress: studentWallet,
            nonce: challenge.nonce,
            signature: sigBase58,
            message: challenge.message,
            expectedOwner: inspection.owner,
          });

          if (!verifyRes.success) {
            throw new Error(`Challenge verify failed: ${verifyRes.error}`);
          }

          const elapsedSeconds = (Date.now() - startTime) / 1000;
          console.log(`✓ Trial ${i} Success: Latency = ${elapsedSeconds.toFixed(3)}s`);

          return {
            elapsedSeconds,
          };
        },
      });
    } catch (err) {
      console.error(`✗ Trial ${i} Failed:`, err instanceof Error ? err.message : err);
    }
  }

  // Summary statistics
  const successReceipts = receipts.filter((r) => r.status === "SUCCESS");
  const times = successReceipts.map((r) => r.elapsedSeconds).sort((a, b) => a - b);

  const median = times[Math.floor(times.length / 2)] || 0;
  const p95Index = Math.min(Math.floor(times.length * 0.95), times.length - 1);
  const p95 = times[p95Index] || 0;
  const min = times[0] || 0;
  const max = times[times.length - 1] || 0;

  console.log(`\n=======================================================`);
  console.log(`  BENCHMARK VERIFY SUMMARY (n=${receipts.length})     `);
  console.log(`=======================================================`);
  console.log(`- Total Success: ${successReceipts.length}/${receipts.length}`);
  console.log(`- Median Latency (p50): ${median.toFixed(3)} s (Threshold: <= 5.0 s)`);
  console.log(`- 95th Percentile (p95): ${p95.toFixed(3)} s`);
  console.log(`- Min: ${min.toFixed(3)} s | Max: ${max.toFixed(3)} s`);
  console.log(`=======================================================\n`);
}

runBenchVerify().catch((e) => {
  console.error("Bench-verify error:", e);
  process.exit(1);
});

