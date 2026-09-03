import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { CertStatus } from "@prisma/client";
import { restoreSoulboundNFT } from "@/lib/metaplex";
import { generateCertificateImageBuffer } from "@/lib/certificate-image";
import { generateCertificateMetadata, uploadMetadataToPinata, generateAndUploadCertificateImage } from "@/lib/pinata";
import { generateDataHash } from "@/lib/crypto";
import { createAuditLog } from "@/lib/audit";

/**
 * POST — Recovery sertifikat dari backup
 * Mengembalikan data sertifikat yang sudah di-revoke atau hilang
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await getAuthUser();
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validasi input
    const recoverySchema = (await import("zod")).z.object({
      backupId: (await import("zod")).z.string().min(1, "Backup ID wajib diisi"),
    });
    const result = recoverySchema.safeParse(body);
    if (!result.success) {
      const errorMessage = result.error.issues[0]?.message || "Validasi gagal";
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    const { backupId } = result.data;

    // Ambil data backup
    const backup = await prisma.certificateBackup.findUnique({
      where: { id: backupId },
    });

    if (!backup) {
      return NextResponse.json(
        { error: "Backup tidak ditemukan" },
        { status: 404 }
      );
    }

    // Parse backup data
    interface BackupCertData {
      nftAddress?: string | null;
      metadataUri?: string | null;
      txSignature?: string | null;
      status?: string;
      issuedAt?: string | null;
      issuedBy?: string | null;
      claimedAt?: string | null;
    }
    let backupData: { certificate?: BackupCertData };
    try {
      backupData = JSON.parse(backup.backupData);
    } catch {
      return NextResponse.json(
        { error: "Data backup rusak atau tidak valid" },
        { status: 400 }
      );
    }
    const certData = backupData.certificate;

    if (!certData) {
      return NextResponse.json(
        { error: "Data sertifikat tidak ditemukan dalam backup" },
        { status: 400 }
      );
    }

    // Cek apakah user masih ada
    const user = await prisma.user.findUnique({
      where: { id: backup.userId },
      include: { certificate: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User tidak ditemukan" },
        { status: 404 }
      );
    }

    // Restore certificate — selalu ke MINTED agar mahasiswa bisa klaim ulang
    // (Jangan restore ke CLAIMED karena NFT mungkin tidak ada di wallet mahasiswa)
    const restoredStatus: CertStatus = "MINTED";

    // Kembalikan NFT ke metadata lama di Solana jika memungkinkan
    // PERBAIKAN: Alih-alih memakai metadata usang dari backup, kita "Re-Generate" metadata & gambar
    // menggunakan data `user` (database) terbaru. Ini menjamin jika ada perbaikan nama,
    // ijazah hasil restore akan ikut ter-update.
    let updatedMetadataUri = certData.metadataUri;
    let recoveryDataHash: string | null = null;
    let recoveryDataSalt: string | null = null;

    if (certData.nftAddress) {
      try {
        // 1. Generate dataHash baru untuk recovery
        const { hash, salt } = generateDataHash(
          user.nama,
          user.nim,
          user.prodi || "Informatika"
        );
        recoveryDataHash = hash;
        recoveryDataSalt = salt;

        // 2. Generate Image baru (TANPA PII) & Upload ke Pinata
        const { gatewayUrl: imageUrl } = await generateAndUploadCertificateImage({
          prodi: user.prodi || "Informatika",
          tahunLulus: user.angkatan || "2026",
          dataHash: hash,
        }, "MINTED");

        // 4. Generate Metadata baru (PRIVACY: tanpa PII)
        const metadata = generateCertificateMetadata({
          prodi: user.prodi || "Informatika",
          tahunLulus: user.angkatan || "2026",
          dataHash: hash,
          imageUri: imageUrl,
        });

        // 5. Upload Metadata
        const { gatewayUrl: newMetadataUri } = await uploadMetadataToPinata(metadata);
        updatedMetadataUri = newMetadataUri;

        // 6. Update NFT Solana
        await restoreSoulboundNFT({
          mintAddress: certData.nftAddress,
          metadataUri: newMetadataUri,
        });
      } catch (genError) {
        console.error("Gagal re-generate metadata saat restore:", genError);
        // Fallback: Jika IPFS gagal, update NFT tetap menggunakan metadata lama dari backup
        if (certData.metadataUri) {
          await restoreSoulboundNFT({
            mintAddress: certData.nftAddress,
            metadataUri: certData.metadataUri,
          });
        }
      }
    }

    const restoredCert = await prisma.certificate.upsert({
      where: { userId: backup.userId },
      update: {
        nftAddress: certData.nftAddress,
        metadataUri: updatedMetadataUri, // Gunakan metadata yang baru
        txSignature: certData.txSignature,
        status: restoredStatus,
        issuedAt: certData.issuedAt ? new Date(certData.issuedAt) : null,
        issuedBy: certData.issuedBy,
        claimedAt: null, // Reset karena status MINTED = siap diklaim ulang
        revokedAt: null,
        revokedBy: null,
        revokeReason: null,
        dataHash: recoveryDataHash,
        dataSalt: recoveryDataSalt,
      },
      create: {
        userId: backup.userId,
        nftAddress: certData.nftAddress,
        metadataUri: updatedMetadataUri,
        txSignature: certData.txSignature,
        status: restoredStatus,
        issuedAt: certData.issuedAt ? new Date(certData.issuedAt) : null,
        issuedBy: certData.issuedBy,
        claimedAt: null, // Reset karena status MINTED = siap diklaim ulang
        dataHash: recoveryDataHash,
        dataSalt: recoveryDataSalt,
      },
    });

    // Tandai backup sudah digunakan
    await prisma.certificateBackup.update({
      where: { id: backupId },
      data: {
        usedAt: new Date(),
        usedBy: payload.userId,
      },
    });

    // Audit log — userId merujuk ke mahasiswa, bukan admin
    await createAuditLog(
      backup.userId,
      "CERT_RECOVERY",
      `Sertifikat di-restore untuk ${user.nama} (${user.nim}) oleh admin ${payload.userId} dari backup ${backupId}`,
      request.headers.get("x-forwarded-for") || "unknown"
    );

    return NextResponse.json({
      success: true,
      message: `Sertifikat ${user.nama} berhasil di-restore`,
      certificate: {
        id: restoredCert.id,
        status: restoredCert.status,
        nftAddress: restoredCert.nftAddress,
      },
    });
  } catch (error) {
    console.error("Recovery error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
