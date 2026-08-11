import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { mintNftSchema } from "@/lib/validation";
import { uploadMetadataToPinata, generateCertificateMetadata, uploadImageToPinata } from "@/lib/pinata";
import { mintSoulboundNFT } from "@/lib/metaplex";
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
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validasi input
    const result = mintNftSchema.safeParse(body);
    if (!result.success) {
      const errorMessage = result.error.issues[0]?.message || "Validasi gagal";
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    const { userId } = result.data;

    // Ambil data user dan wallet
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

    if (!user.wallet || user.wallet.status !== "VERIFIED") {
      return NextResponse.json(
        { error: "Wallet belum terverifikasi" },
        { status: 400 }
      );
    }

    if (user.certificate && user.certificate.status !== "NOT_ISSUED") {
      const statusMsg: Record<string, string> = {
        MINTED: "Ijazah sudah diterbitkan dan menunggu klaim",
        CLAIMED: "Ijazah sudah diklaim oleh mahasiswa",
        REVOKED: "Ijazah sudah direvoke. Gunakan fitur Recovery untuk mengembalikan",
      };
      return NextResponse.json(
        { error: statusMsg[user.certificate.status] || "Ijazah sudah diterbitkan" },
        { status: 400 }
      );
    }

    // Generate & upload SVG certificate image to IPFS
    const svgContent = generateCertificateSVG({
      nama: user.nama,
      nim: user.nim,
      prodi: user.prodi || "Informatika",
      tahunLulus: user.angkatan || "2026",
    });
    const svgBlob = new Blob([svgContent], { type: "image/svg+xml" });
    const svgFile = new File([svgBlob], `ijazah-${user.nim}.svg`, { type: "image/svg+xml" });
    const { gatewayUrl: imageUrl } = await uploadImageToPinata(svgFile);

    // Generate metadata with image
    const metadata = generateCertificateMetadata({
      nama: user.nama,
      nim: user.nim,
      prodi: user.prodi || "Informatika",
      tahunLulus: user.angkatan || "2026",
      imageUri: imageUrl,
    });

    // Upload metadata ke Pinata
    const { uri: metadataUri } = await uploadMetadataToPinata(metadata);

    // Mint NFT Soulbound
    const mintResult = await mintSoulboundNFT({
      nama: user.nama,
      nim: user.nim,
      prodi: user.prodi || "Informatika",
      tahunLulus: user.angkatan || "2026",
      metadataUri,
      walletTujuan: user.wallet.walletAddress,
    });

    if (!mintResult.success) {
      return NextResponse.json(
        { error: mintResult.error || "Gagal mint NFT" },
        { status: 500 }
      );
    }

    // Update atau buat certificate
    const certificate = await prisma.certificate.upsert({
      where: { userId },
      update: {
        nftAddress: mintResult.mintAddress || mintResult.signature,
        metadataUri,
        txSignature: mintResult.signature,
        status: "MINTED",
        issuedAt: new Date(),
        issuedBy: payload.userId,
      },
      create: {
        userId,
        nftAddress: mintResult.mintAddress || mintResult.signature,
        metadataUri,
        txSignature: mintResult.signature,
        status: "MINTED",
        issuedAt: new Date(),
        issuedBy: payload.userId,
      },
    });

    // Buat audit log — userId merujuk ke mahasiswa, bukan admin
    await prisma.auditLog.create({
      data: {
        userId: userId,
        action: "NFT_MINT",
        detail: `NFT ijazah di-mint untuk ${user.nama} (${user.nim}) oleh admin ${payload.userId}`,
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      },
    });

    return NextResponse.json({
      certificate: {
        id: certificate.id,
        nftAddress: certificate.nftAddress,
        txSignature: certificate.txSignature,
        status: certificate.status,
      },
    });
  } catch (error) {
    console.error("NFT mint error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
