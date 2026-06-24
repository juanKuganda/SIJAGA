import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySchema } from "@/lib/validation";
import { isValidSolanaAddress } from "@/lib/solana";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get("wallet");

    // Validasi input
    const result = verifySchema.safeParse({ wallet });
    if (!result.success) {
      const errorMessage = result.error.issues[0]?.message || "Validasi gagal";
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    const { wallet: walletAddress } = result.data;

    // Validasi format wallet address
    if (!isValidSolanaAddress(walletAddress)) {
      return NextResponse.json(
        { error: "Format alamat wallet tidak valid" },
        { status: 400 }
      );
    }

    // Cari wallet di database
    const walletData = await prisma.wallet.findUnique({
      where: { walletAddress },
      include: {
        user: {
          select: {
            nama: true,
            nim: true,
            prodi: true,
            angkatan: true,
          },
        },
      },
    });

    if (!walletData) {
      return NextResponse.json(
        { error: "Wallet tidak ditemukan" },
        { status: 404 }
      );
    }

    // Cari certificate
    const certificate = await prisma.certificate.findUnique({
      where: { userId: walletData.userId },
    });

    if (!certificate || certificate.status === "NOT_ISSUED") {
      return NextResponse.json({
        verified: false,
        message: "Tidak ditemukan ijazah untuk wallet ini",
      });
    }

    // Cek apakah sertifikat sudah direvoke
    if (certificate.status === "REVOKED") {
      return NextResponse.json({
        verified: false,
        revoked: true,
        message: "Ijazah ini telah DIREVOKE / DICABUT",
        revokeReason: certificate.revokeReason || "Tidak ada alasan yang diberikan",
        revokedAt: certificate.revokedAt,
        data: {
          nama: walletData.user.nama,
          nim: walletData.user.nim,
          prodi: walletData.user.prodi,
          tahunLulus: walletData.user.angkatan,
          nftAddress: certificate.nftAddress,
        },
      });
    }

    return NextResponse.json({
      verified: true,
      data: {
        nama: walletData.user.nama,
        nim: walletData.user.nim,
        prodi: walletData.user.prodi,
        tahunLulus: walletData.user.angkatan,
        status: certificate.status,
        nftAddress: certificate.nftAddress,
        issuedAt: certificate.issuedAt,
        penerbit: "Universitas Tadulako",
      },
      explorerUrl: certificate.nftAddress
        ? `https://explorer.solana.com/address/${certificate.nftAddress}?cluster=devnet`
        : null,
    });
  } catch (error) {
    console.error("Verify error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
