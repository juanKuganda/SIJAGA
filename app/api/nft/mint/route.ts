import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { mintNftSchema } from "@/lib/validation";
import { uploadMetadataToPinata, generateCertificateMetadata } from "@/lib/pinata";
import { mintSoulboundNFT } from "@/lib/metaplex";

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
      return NextResponse.json(
        { error: "Ijazah sudah diterbitkan" },
        { status: 400 }
      );
    }

    // Generate metadata
    const metadata = generateCertificateMetadata({
      nama: user.nama,
      nim: user.nim,
      prodi: user.prodi || "Informatika",
      tahunLulus: user.angkatan || "2026",
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
        nftAddress: mintResult.signature, // Note: ini seharusnya NFT address, bukan signature
        metadataUri,
        txSignature: mintResult.signature,
        status: "MINTED",
        issuedAt: new Date(),
        issuedBy: payload.userId,
      },
      create: {
        userId,
        nftAddress: mintResult.signature,
        metadataUri,
        txSignature: mintResult.signature,
        status: "MINTED",
        issuedAt: new Date(),
        issuedBy: payload.userId,
      },
    });

    // Buat audit log
    await prisma.auditLog.create({
      data: {
        userId: payload.userId,
        action: "NFT_MINT",
        detail: `NFT ijazah di-mint untuk ${user.nama} (${user.nim})`,
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
