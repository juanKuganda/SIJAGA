import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { CertStatus } from "@prisma/client";
import { restoreSoulboundNFT } from "@/lib/metaplex";
import { generateCertificateImageBuffer } from "@/lib/certificate-image";
import { uploadImageToPinata, generateCertificateMetadata, uploadMetadataToPinata } from "@/lib/pinata";

/**
 * POST — Recovery sertifikat dari backup
 * Mengembalikan data sertifikat yang sudah di-revoke atau hilang
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { backupId } = body;

    if (!backupId) {
      return NextResponse.json(
        { error: "Backup ID wajib diisi" },
        { status: 400 }
      );
    }

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

    if (certData.nftAddress) {
      try {
        // 1. Generate Image baru (berdasarkan data User saat ini)
        const imageBuffer = await generateCertificateImageBuffer({
          nama: user.nama,
          nim: user.nim,
          prodi: user.prodi || "Informatika",
          tahunLulus: user.angkatan || "2026",
          status: "MINTED",
        });
        const imageBlob = new Blob([imageBuffer], { type: "image/png" });
        const imageFile = new File([imageBlob], `ijazah-${user.nim}.png`, { type: "image/png" });
        
        // 2. Upload ke Pinata
        const { gatewayUrl: imageUrl } = await uploadImageToPinata(imageFile);

        // 3. Generate Metadata baru
        const metadata = generateCertificateMetadata({
          nama: user.nama,
          nim: user.nim,
          prodi: user.prodi || "Informatika",
          tahunLulus: user.angkatan || "2026",
          imageUri: imageUrl,
        });

        // 4. Upload Metadata
        const { uri: newMetadataUri } = await uploadMetadataToPinata(metadata);
        updatedMetadataUri = newMetadataUri;

        // 5. Update NFT Solana
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
    await prisma.auditLog.create({
      data: {
        userId: backup.userId,
        action: "CERT_RECOVERY",
        detail: `Sertifikat di-restore untuk ${user.nama} (${user.nim}) oleh admin ${payload.userId} dari backup ${backupId}`,
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      },
    });

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
