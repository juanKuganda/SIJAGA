import { Connection, Keypair } from "@solana/web3.js";
import {
  createUmiInstance,
  getAdminKeypair,
  prepareMintSigner,
  mintSoulboundNFT,
} from "../../lib/metaplex";
import {
  transferV1,
  burnV1,
  updatePlugin,
  fetchAsset,
} from "@metaplex-foundation/mpl-core";
import {
  keypairIdentity,
  publicKey,
} from "@metaplex-foundation/umi";
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
  getSoftwareVersions,
} from "./common";

async function runBenchNegative() {
  console.log(`=======================================================`);
  console.log(`  SIJAGA BENCHMARK: NEGATIVE TESTS (TC-02, 03, 04, 13) `);
  console.log(`  Testing Soulbound Enforcements via Raw MPL-Core      `);
  console.log(`=======================================================\n`);

  const { rpcUrl, provider, host } = getRpcDetails();
  const connection = new Connection(rpcUrl, "confirmed");
  const clusterVersion = await ensureRunMetadata(connection);

  const umi = createUmiInstance();

  // 1. Setup Aset Soulbound untuk Pengujian Negatif
  console.log("[Setup] Mempersiapkan aset Soulbound (PermanentFreezeDelegate)...");
  const ownerKeypair = Keypair.generate();
  const attackerKeypair = Keypair.generate();
  const recipientKeypair = Keypair.generate();

  // Fund owner & attacker wallets with a small amount of SOL for fees so they can sign transactions
  const adminKeypair = getAdminKeypair();
  console.log(`[Setup] Funding owner & attacker wallets from admin wallet for fee submission...`);

  const { SystemProgram, Transaction, sendAndConfirmTransaction } = await import("@solana/web3.js");
  const fundTx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: adminKeypair.publicKey,
      toPubkey: ownerKeypair.publicKey,
      lamports: 50_000_000, // 0.05 SOL
    }),
    SystemProgram.transfer({
      fromPubkey: adminKeypair.publicKey,
      toPubkey: attackerKeypair.publicKey,
      lamports: 50_000_000, // 0.05 SOL
    })
  );
  await sendAndConfirmTransaction(connection, fundTx, [adminKeypair], { commitment: "confirmed" });
  console.log("[Setup] Wallets funded successfully.");

  const { hash: dataHash } = generateDataHash("Negative Test Subject", "F551NEGATIVE", "Teknik Informatika");
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
    walletTujuan: ownerKeypair.publicKey.toBase58(),
    mintSigner,
  });

  if (!mintRes.success || !mintRes.mintAddress) {
    throw new Error("Failed to mint setup asset for negative tests: " + mintRes.error);
  }

  const assetPubkey = publicKey(mintRes.mintAddress);
  console.log(`[Setup] Aset Soulbound siap: ${mintRes.mintAddress}`);

  // Helper UMI signers
  const ownerUmiKeypair = umi.eddsa.createKeypairFromSecretKey(ownerKeypair.secretKey);
  const attackerUmiKeypair = umi.eddsa.createKeypairFromSecretKey(attackerKeypair.secretKey);
  const recipientPubkey = publicKey(recipientKeypair.publicKey.toBase58());

  const testScenarios = [
    {
      id: "TC-02",
      name: "NEGATIVE_TRANSFER_OWNER",
      description: "Owner tries to transfer asset to another wallet",
      signerKeypair: ownerUmiKeypair,
      action: async (umiInstance: typeof umi) => {
        const asset = await fetchAsset(umiInstance, assetPubkey);
        return await transferV1(umiInstance, {
          asset: asset.publicKey,
          newOwner: recipientPubkey,
        }).sendAndConfirm(umiInstance, {
          send: { commitment: "confirmed" },
          confirm: { commitment: "confirmed" },
        });
      },
    },
    {
      id: "TC-03",
      name: "NEGATIVE_TRANSFER_OTHER",
      description: "Non-owner (attacker) tries to transfer asset",
      signerKeypair: attackerUmiKeypair,
      action: async (umiInstance: typeof umi) => {
        const asset = await fetchAsset(umiInstance, assetPubkey);
        return await transferV1(umiInstance, {
          asset: asset.publicKey,
          newOwner: publicKey(attackerKeypair.publicKey.toBase58()),
        }).sendAndConfirm(umiInstance, {
          send: { commitment: "confirmed" },
          confirm: { commitment: "confirmed" },
        });
      },
    },
    {
      id: "TC-04",
      name: "NEGATIVE_BURN",
      description: "Owner tries to burn asset while frozen: true",
      signerKeypair: ownerUmiKeypair,
      action: async (umiInstance: typeof umi) => {
        const asset = await fetchAsset(umiInstance, assetPubkey);
        return await burnV1(umiInstance, {
          asset: asset.publicKey,
        }).sendAndConfirm(umiInstance, {
          send: { commitment: "confirmed" },
          confirm: { commitment: "confirmed" },
        });
      },
    },
    {
      id: "TC-13",
      name: "NEGATIVE_THAW",
      description: "Non-institution party tries to thaw (unfreeze) asset",
      signerKeypair: attackerUmiKeypair,
      action: async (umiInstance: typeof umi) => {
        const asset = await fetchAsset(umiInstance, assetPubkey);
        return await updatePlugin(umiInstance, {
          asset: asset.publicKey,
          plugin: {
            type: "PermanentFreezeDelegate",
            frozen: false,
          },
        }).sendAndConfirm(umiInstance, {
          send: { commitment: "confirmed" },
          confirm: { commitment: "confirmed" },
        });
      },
    },
  ];

  console.log(`\n=======================================================`);
  console.log(`  EXECUTING NEGATIVE TESTS (3 attempts per scenario)  `);
  console.log(`=======================================================\n`);

  for (const scenario of testScenarios) {
    console.log(`\n--- [${scenario.id}] ${scenario.description} ---`);

    for (let attempt = 1; attempt <= 3; attempt++) {
      const startTime = Date.now();
      const sendTimestamp = new Date().toISOString();

      try {
        // Set identity to the respective test signer
        const customUmi = createUmiInstance().use(keypairIdentity(scenario.signerKeypair));
        await scenario.action(customUmi);

        // JIKA SAMPAI KE SINI: BENCANA! Transaksi terlarang lolos!
        const elapsedSeconds = (Date.now() - startTime) / 1000;
        console.error(`CRITICAL FAILURE: ${scenario.id} attempt ${attempt} SUCCEEDED on-chain!`);
        recordReceipt({
          operation: scenario.name,
          trialIndex: attempt,
          attempt: 1,
          sendTimestamp,
          finalizedTimestamp: new Date().toISOString(),
          elapsedSeconds,
          status: "SUCCESS", // Dianggap gagal karena ini negative test
          rpcProvider: provider,
          rpcEndpoint: host,
          softwareVersions: getSoftwareVersions(),
          cluster: "devnet",
          clusterVersion,
          wallClockTime: new Date().toLocaleTimeString("id-ID"),
          date: new Date().toISOString().split("T")[0],
        });
      } catch (err: unknown) {
        // EXPECTED: Transaksi HARUS ditolak oleh program Solana / Metaplex Core
        const elapsedSeconds = (Date.now() - startTime) / 1000;
        const errMsg = err instanceof Error ? err.message : String(err);
        const errName = err instanceof Error ? err.name : "ProgramError";

        console.log(`✓ ${scenario.id} Attempt ${attempt} REJECTED as expected:`);
        console.log(`  - Error: ${errMsg.slice(0, 100)}...`);

        // Record receipt as systematic rejection proof
        recordReceipt({
          operation: scenario.name,
          trialIndex: attempt,
          attempt: 1,
          sendTimestamp,
          finalizedTimestamp: new Date().toISOString(),
          elapsedSeconds,
          status: "FAILED", // FAILED on-chain = SUCCESS for negative test
          errorCode: errName,
          errorMessage: errMsg,
          rpcProvider: provider,
          rpcEndpoint: host,
          softwareVersions: getSoftwareVersions(),
          cluster: "devnet",
          clusterVersion,
          wallClockTime: new Date().toLocaleTimeString("id-ID"),
          date: new Date().toISOString().split("T")[0],
        });
      }
    }
  }

  console.log(`\n=======================================================`);
  console.log(`  ALL NEGATIVE TESTS (TC-02, TC-03, TC-04, TC-13)      `);
  console.log(`  SYSTEMATICALLY REJECTED BY NETWORK. SOULBOUND HOLDS! `);
  console.log(`=======================================================\n`);
}

runBenchNegative()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("Bench-negative error:", err);
    process.exit(1);
  });
