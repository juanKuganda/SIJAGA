import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { revokeNftSchema } from "@/lib/validation";
import { generateRevokedMetadata, uploadMetadataToPinata, uploadImageToPinata } from "@/lib/pinata";
import { revokeSoulboundNFT } from "@/lib/metaplex";
import { generateCertificateSVG } from "@/lib/certificate-image";


export async function POST(request: NextRequest) {
  try {
    // Ambil token dari cookie
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify token - hanya admin
    const payload = verifyToken(token);
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

    if (user.certificate.status === "NOT_ISSUED") {
      return NextResponse.json(
        { error: "Sertifikat belum diterbitkan" },
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

    // 1. Generate Revoked SVG Image
    const revokedSvg = generateCertificateSVG({
      nama: user.nama,
      nim: user.nim,
      prodi: user.prodi || "Informatika",
      tahunLulus: user.angkatan || "2026",
      status: "REVOKED",
    });
    const svgBlob = new Blob([revokedSvg], { type: "image/svg+xml" });
    const svgFile = new File([svgBlob], `ijazah-revoked-${user.nim}.svg`, { type: "image/svg+xml" });
    const { gatewayUrl: revokedImageUrl } = await uploadImageToPinata(svgFile);

    // 2. Generate Revoked Metadata with image
    const revokedMetadata = generateRevokedMetadata({
      nama: user.nama,
      nim: user.nim,
      prodi: user.prodi || "Informatika",
      tahunLulus: user.angkatan || "2026",
    });
    // Override image with IPFS-hosted revoked SVG
    revokedMetadata.image = revokedImageUrl;

    // 3. Upload Revoked Metadata to IPFS via Pinata
    const { uri: newMetadataUri } = await uploadMetadataToPinata(revokedMetadata);

    // 4. Eksekusi On-Chain Revoke (Update URI)
    let onChainWarning: string | null = null;
    if (user.certificate.nftAddress) {
      const revokeResult = await revokeSoulboundNFT({
        mintAddress: user.certificate.nftAddress,
        metadataUri: newMetadataUri,
      });

      if (!revokeResult.success) {
        return NextResponse.json(
          { error: `Gagal revoke on-chain: ${revokeResult.error}` },
          { status: 500 }
        );
      }
      
      if ('warning' in revokeResult && revokeResult.warning) {
        onChainWarning = revokeResult.warning as string;
      }
    }

    // 5. Update status certificate ke REVOKED di Database
    const revokedCert = await prisma.certificate.update({
      where: { id: user.certificate.id },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
        revokedBy: payload.userId,
        revokeReason: reason,
        // Menyimpan metadata baru yang direvoke
        metadataUri: newMetadataUri,
      },
    });

    // Buat audit log — userId merujuk ke mahasiswa, bukan admin
    await prisma.auditLog.create({
      data: {
        userId: userId,
        action: "NFT_REVOKE",
        detail: `NFT ijazah di-revoke untuk ${user.nama} (${user.nim}) oleh admin ${payload.userId}. Alasan: ${reason}`,
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      },
    });

    return NextResponse.json({
      success: true,
      message: `Sertifikat ${user.nama} berhasil direvoke${onChainWarning ? " (Catatan: " + onChainWarning + ")" : ""}`,
      warning: onChainWarning,
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
