import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { revokeNftSchema } from "@/lib/validation";
import { generateRevokedMetadata, uploadMetadataToPinata, generateAndUploadCertificateImage } from "@/lib/pinata";
import { revokeSoulboundNFT } from "@/lib/metaplex";
import { createAuditLog } from "@/lib/audit";


export async function POST(request: NextRequest) {
  try {
    const payload = await getAuthUser();
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized - hanya admin yang bisa revoke" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validasi input
    const result = revokeNftSchema.safeParse(body);
    if (!result.success) {
      const errorMessage = result.error.issues[0]?.message || "Validasi gagal";
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    const { userId, reason } = result.data;

    // Ambil data user dan certificate
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallet: true,
        certificate: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User tidak ditemukan" },
        { status: 404 }
      );
    }

    if (!user.certificate) {
      return NextResponse.json(
        { error: "Sertifikat tidak ditemukan" },
        { status: 404 }
      );
    }

    if (user.certificate.status === "REVOKED") {
      return NextResponse.json(
        { error: "Sertifikat sudah direvoke sebelumnya" },
        { status: 400 }
      );
    }

    if (user.certificate.status === "NOT_ISSUED" || user.certificate.status === "ISSUING") {
      return NextResponse.json(
        { error: user.certificate.status === "ISSUING" ? "Sertifikat masih dalam proses penerbitan" : "Sertifikat belum diterbitkan" },
        { status: 400 }
      );
    }

    // Backup data sertifikat sebelum revoke
    await prisma.certificateBackup.create({
      data: {
        certificateId: user.certificate.id,
        userId: userId,
        backupData: JSON.stringify({
          certificate: user.certificate,
          user: {
            nama: user.nama,
            nim: user.nim,
            email: user.email,
            prodi: user.prodi,
            angkatan: user.angkatan,
          },
          wallet: user.wallet,
        }),
        nftAddress: user.certificate.nftAddress,
        metadataUri: user.certificate.metadataUri,
        txSignature: user.certificate.txSignature,
        reason: `REVOKE: ${reason}`,
        createdBy: payload.userId,
      },
    });

    // 1. Generate Revoked PNG Image & Upload (TANPA PII)
    const { gatewayUrl: revokedImageUrl } = await generateAndUploadCertificateImage({
      prodi: user.prodi || "Informatika",
      tahunLulus: user.angkatan || "2026",
    }, "REVOKED");

    // 2. Generate Revoked Metadata with image
    const revokedMetadata = generateRevokedMetadata({
      prodi: user.prodi || "Informatika",
      tahunLulus: user.angkatan || "2026",
    });
    // Override image with IPFS-hosted revoked SVG
    revokedMetadata.image = revokedImageUrl;
    revokedMetadata.properties.files[0].uri = revokedImageUrl;

    // 3. Upload Revoked Metadata to IPFS via Pinata
    const { gatewayUrl: newMetadataUri } = await uploadMetadataToPinata(revokedMetadata);

    // 4. Eksekusi On-Chain Revoke (Update URI) — FAIL-CLOSED
    if (user.certificate.nftAddress) {
      const revokeResult = await revokeSoulboundNFT({
        mintAddress: user.certificate.nftAddress,
        metadataUri: newMetadataUri,
      });

      if (!revokeResult.success) {
        // FAIL-CLOSED: DB tidak berubah, admin harus retry
        return NextResponse.json(
          { error: `Gagal revoke on-chain: ${revokeResult.error}. DB tidak diubah — silakan coba lagi.` },
          { status: 502 }
        );
      }
    }

    // 5. Update status certificate ke REVOKED di Database
    // HANYA jika on-chain berhasil (fail-closed principle)
    const revokedCert = await prisma.certificate.update({
      where: { id: user.certificate.id },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
        revokedBy: payload.userId,
        revokeReason: reason,
        metadataUri: newMetadataUri,
      },
    });

    // Buat audit log — userId merujuk ke mahasiswa, bukan admin
    await createAuditLog(
      userId,
      "NFT_REVOKE",
      `NFT ijazah di-revoke untuk user ${userId} oleh admin ${payload.userId}. Alasan: ${reason}`,
      request.headers.get("x-forwarded-for") || "unknown"
    );

    return NextResponse.json({
      success: true,
      message: `Sertifikat berhasil direvoke`,
      certificate: {
        id: revokedCert.id,
        status: revokedCert.status,
        revokedAt: revokedCert.revokedAt,
        revokeReason: revokedCert.revokeReason,
      },
    });
  } catch (error) {
    console.error("NFT revoke error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
