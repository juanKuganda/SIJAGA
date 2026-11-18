/**
 * scripts/restore-user-from-backup.ts — Prosedur Pemulihan User & Sertifikat dari Backup
 *
 * FUNGSI:
 * Memulihkan data identitas mahasiswa yang teranonimkan akibat penghapusan PII (UU PDP)
 * atau penarikan consent, kemudian mengkoordinasikan proses recovery sertifikat on-chain
 * dan re-klaim sertifikat kembali ke status CLAIMED (4/4 profile stepper selesai).
 *
 * ARSITEKTUR RESTORE 2-LANGKAH (+ Re-claim):
 * Step A: Pulihkan data `User` dari JSON `CertificateBackup.backupData`
 *         (nama, nim, email, prodi, tahunLulus, dataConsent: true, dataDeletedAt: null).
 * Step B: Panggil route admin recovery (`POST /api/admin/recovery`) dengan header `x-admin-key`.
 *         Route ini membaca identitas terbaru dari tabel User, me-regenerate dataHash & salt baru,
 *         mengunggah gambar & metadata baru ke IPFS Pinata, memperbarui URI NFT di Solana Metaplex Core,
 *         dan mengubah status sertifikat di database menjadi MINTED.
 * Step C: Panggil callback klaim (`POST /api/actions/claim-callback?nim=<nim>`)
 *         menggunakan tanda tangan transaksi klaim mahasiswa yang sah di Solana Devnet,
 *         sehingga status sertifikat kembali menjadi CLAIMED dan stepper profil lengkap 4/4.
 *
 * CARA MENJALANKAN (STANDALONE):
 *   node --env-file=.env ./node_modules/tsx/dist/cli.mjs scripts/restore-user-from-backup.ts [backupId]
 */

import { loadEnvConfig } from "@next/env";
import { NextRequest } from "next/server";
import { prisma } from "../lib/prisma";
import { POST as recoveryPOST } from "../app/api/admin/recovery/route";
import { POST as claimCallbackPOST } from "../app/api/actions/claim-callback/route";

loadEnvConfig(process.cwd());

export const DEFAULT_ALIFA_USER_ID = "46bf8d52-efa5-4f39-991c-4e3f872f0c0d";
export const DEFAULT_ALIFA_NIM = "F55124011";

export interface RestoreOptions {
  backupId?: string;
  userId?: string;
  nim?: string;
  adminKey?: string;
  overrideClaimSignature?: string;
}

export interface BackupDataPayload {
  user?: {
    nama?: string;
    nim?: string;
    email?: string;
    prodi?: string;
    tahunLulus?: string;
  };
  certificate?: {
    id?: string;
    nftAddress?: string;
    metadataUri?: string;
    txSignature?: string;
    status?: string;
  };
  wallet?: {
    id?: string;
    walletAddress?: string;
    status?: string;
  };
}

export interface RestoreResult {
  success: boolean;
  backupId: string;
  userId: string;
  nim: string;
  nama: string;
  prodi: string;
  certificateId: string;
  nftAddress: string;
  newMetadataUri: string;
  newDataHash: string;
  newDataSalt: string;
  status: string;
  stepperCompleted: boolean;
  stepDetails: {
    step1Registration: boolean;
    step2Wallet: boolean;
    step3Issuance: boolean;
    step4Claim: boolean;
  };
  durationMs: number;
  error?: string;
}

/**
 * Pulihkan mahasiswa dan sertifikat dari CertificateBackup
 */
export async function restoreUserFromBackup(options: RestoreOptions = {}): Promise<RestoreResult> {
  const startTime = Date.now();
  console.log("=== Memulai Prosedur Restore User dari Backup ===");

  const adminKey =
    options.adminKey ||
    process.env.ADMIN_WALLET_PRIVATE_KEY ||
    process.env.ADMIN_API_SECRET;

  if (!adminKey) {
    throw new Error("ADMIN_WALLET_PRIVATE_KEY atau ADMIN_API_SECRET tidak ditemukan pada environment!");
  }

  // 1. Temukan record CertificateBackup yang sesuai
  let backup = null;
  if (options.backupId) {
    backup = await prisma.certificateBackup.findUnique({
      where: { id: options.backupId },
    });
  } else {
    const targetUserId = options.userId || DEFAULT_ALIFA_USER_ID;
    backup = await prisma.certificateBackup.findFirst({
      where: { userId: targetUserId },
      orderBy: { createdAt: "desc" },
    });
  }

  if (!backup) {
    throw new Error(
      `CertificateBackup tidak ditemukan untuk kriteria: ${JSON.stringify({
        backupId: options.backupId,
        userId: options.userId,
      })}`
    );
  }

  console.log(`[1] Backup ditemukan: ID=${backup.id}, Dibuat=${backup.createdAt.toISOString()}`);

  // 2. Parse backupData
  let parsedBackup: BackupDataPayload;
  try {
    parsedBackup = JSON.parse(backup.backupData) as BackupDataPayload;
  } catch (err) {
    throw new Error(`Gagal mem-parse JSON backupData pada backup ${backup.id}: ${String(err)}`);
  }

  const origUser = parsedBackup.user;
  if (!origUser || !origUser.nama || !origUser.nim || !origUser.prodi) {
    throw new Error(`Data user dalam backup tidak lengkap: ${JSON.stringify(origUser)}`);
  }

  console.log(`[2] Data Asli dari Backup: Nama="${origUser.nama}", NIM="${origUser.nim}", Prodi="${origUser.prodi}"`);

  // 3. Step A: Pulihkan tabel User
  console.log("[3] Step A: Memperbarui tabel User dengan identitas asli dari backup...");
  const restoredUser = await prisma.user.update({
    where: { id: backup.userId },
    data: {
      nama: origUser.nama,
      nim: origUser.nim,
      email: origUser.email,
      prodi: origUser.prodi,
      tahunLulus: origUser.tahunLulus,
      dataConsent: true,
      consentGivenAt: new Date(),
      dataDeletedAt: null,
      dataDeleteNote: null,
    },
  });
  console.log(`    User berhasil dipulihkan: ID=${restoredUser.id}, Nama="${restoredUser.nama}", NIM="${restoredUser.nim}"`);

  // 4. Step B: Jalankan route Admin Recovery
  console.log("[4] Step B: Memanggil endpoint POST /api/admin/recovery dengan x-admin-key...");
  const recoveryReq = new NextRequest("http://localhost:3000/api/admin/recovery", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": adminKey,
    },
    body: JSON.stringify({ backupId: backup.id }),
  });

  const recoveryRes = await recoveryPOST(recoveryReq);
  const recoveryBody = await recoveryRes.json();

  if (!recoveryRes.ok || !recoveryBody.success) {
    throw new Error(
      `Gagal menjalankan admin recovery (HTTP ${recoveryRes.status}): ${
        recoveryBody.error || JSON.stringify(recoveryBody)
      }`
    );
  }
  console.log(`    Recovery on-chain & IPFS berhasil: ${recoveryBody.message}`);

  // 5. Step C: Re-Claim Sertifikat
  console.log("[5] Step C: Menjalankan klaim ulang sertifikat via claim-callback...");
  // Cari signature transaksi klaim yang valid untuk user ini
  let claimSignature = options.overrideClaimSignature;
  if (!claimSignature) {
    const claimAudit = await prisma.auditLog.findFirst({
      where: { userId: backup.userId, action: "CERT_CLAIMED" },
      orderBy: { createdAt: "desc" },
    });
    const match = claimAudit?.detail?.match(/Tx:\s*([A-Za-z0-9]+)/);
    if (match) {
      claimSignature = match[1];
    } else if (parsedBackup.certificate?.txSignature) {
      claimSignature = parsedBackup.certificate.txSignature;
    }
  }

  if (!claimSignature) {
    throw new Error("Tidak menemukan signature klaim yang valid untuk klaim ulang!");
  }

  console.log(`    Menggunakan signature klaim: ${claimSignature}`);
  const claimReq = new NextRequest(
    `http://localhost:3000/api/actions/claim-callback?nim=${encodeURIComponent(restoredUser.nim)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signature: claimSignature }),
    }
  );

  const claimRes = await claimCallbackPOST(claimReq);
  const claimBody = await claimRes.json();

  if (!claimRes.ok || claimBody.type === "error") {
    throw new Error(
      `Gagal klaim ulang (HTTP ${claimRes.status}): ${claimBody.message || JSON.stringify(claimBody)}`
    );
  }
  console.log("    Klaim ulang via claim-callback berhasil diterima!");

  // 6. Validasi Kondisi Akhir & Stepper
  console.log("[6] Memeriksa kondisi akhir di database pasca pemulihan...");
  const finalUserData = await prisma.user.findUnique({
    where: { id: backup.userId },
    include: { certificate: true, wallet: true },
  });

  if (!finalUserData || !finalUserData.certificate) {
    throw new Error("Sertifikat tidak ditemukan setelah proses restore!");
  }

  const cert = finalUserData.certificate;
  const wallet = finalUserData.wallet;

  // Evaluasi stepper sesuai app/(mahasiswa)/profil/page.tsx
  const isRevoked = cert.status === "REVOKED";
  let currentStep = 1;
  if (wallet?.status === "PENDING") currentStep = 1;
  else if (wallet?.status === "VERIFIED") {
    currentStep = 2;
    if (cert.status === "MINTED") currentStep = 3;
    if (cert.status === "CLAIMED" || cert.status === "REVOKED") currentStep = 4;
  }

  const step1 = currentStep >= 1;
  const step2 = currentStep > 1 || wallet?.status === "VERIFIED";
  const step3 = currentStep > 2;
  const step4 = currentStep >= 4 && !isRevoked;
  const all4StepsCompleted = step1 && step2 && step3 && step4;

  console.log(`    Status Sertifikat : ${cert.status}`);
  console.log(`    Data Hash Baru    : ${cert.dataHash}`);
  console.log(`    Data Salt Baru    : ${cert.dataSalt}`);
  console.log(`    Stepper 4/4 Selesai: ${all4StepsCompleted ? "YA (4/4)" : "TIDAK"}`);

  const durationMs = Date.now() - startTime;

  return {
    success: cert.status === "CLAIMED" && all4StepsCompleted,
    backupId: backup.id,
    userId: restoredUser.id,
    nim: restoredUser.nim,
    nama: restoredUser.nama,
    prodi: restoredUser.prodi || "",
    certificateId: cert.id,
    nftAddress: cert.nftAddress || "",
    newMetadataUri: cert.metadataUri || "",
    newDataHash: cert.dataHash || "",
    newDataSalt: cert.dataSalt || "",
    status: cert.status,
    stepperCompleted: all4StepsCompleted,
    stepDetails: {
      step1Registration: step1,
      step2Wallet: step2,
      step3Issuance: step3,
      step4Claim: step4,
    },
    durationMs,
  };
}

// -----------------------------------------------------------------------------
// Standalone CLI Execution
// -----------------------------------------------------------------------------
async function runCli() {
  const argBackupId = process.argv[2];
  try {
    const result = await restoreUserFromBackup({ backupId: argBackupId });
    console.log("\n===============================================================================");
    console.log("RESTORE USER DARI BACKUP SELESAI:");
    console.log(`- Mahasiswa   : ${result.nama} (${result.nim})`);
    console.log(`- Cert Status : ${result.status}`);
    console.log(`- NFT Address : ${result.nftAddress}`);
    console.log(`- Hash Baru   : ${result.newDataHash}`);
    console.log(`- Salt Baru   : ${result.newDataSalt}`);
    console.log(`- Stepper 4/4 : ${result.stepperCompleted ? "LENGKAP" : "BELUM LENGKAP"}`);
    console.log(`- Durasi Total: ${result.durationMs}ms`);
    console.log("===============================================================================");
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error("\n[FATAL] Gagal memulihkan user dari backup:", error);
    process.exit(1);
  }
}

if (process.argv[1]?.endsWith("restore-user-from-backup.ts")) {
  runCli();
}
