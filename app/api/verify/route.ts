import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySchema } from "@/lib/validation";
import { isValidSolanaAddress } from "@/lib/solana";
import { verifyDataHash } from "@/lib/crypto";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParam = searchParams.get("query") || searchParams.get("wallet");

    // Validasi input
    const result = verifySchema.safeParse({ query: queryParam });
    if (!result.success) {
      const errorMessage = result.error.issues[0]?.message || "Validasi gagal";
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    const { query } = result.data;
    const isSolanaAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(query);

    // Cari di database
    let userWithWallet = null;

    if (isSolanaAddress) {
      // Cari by wallet address
      const walletData = await prisma.wallet.findUnique({
        where: { walletAddress: query },
        include: {
          user: {
            select: {
              nama: true,
              nim: true,
              prodi: true,
              angkatan: true,
              dataDeletedAt: true,
            },
          },
        },
      });
      if (walletData) {
        userWithWallet = {
          ...walletData.user,
          userId: walletData.userId,
        };
      }
    } else {
      // Cari by NIM
      const user = await prisma.user.findUnique({
        where: { nim: query },
        include: { wallet: true },
      });
      if (user) {
        userWithWallet = {
          nama: user.nama,
          nim: user.nim,
          prodi: user.prodi,
          angkatan: user.angkatan,
          userId: user.id,
          dataDeletedAt: user.dataDeletedAt,
        };
      }
    }

    if (!userWithWallet) {
      return NextResponse.json(
        { error: isSolanaAddress ? "Wallet tidak ditemukan" : "NIM tidak ditemukan" },
        { status: 404 }
      );
    }

    // Cari certificate
    const certificate = await prisma.certificate.findUnique({
      where: { userId: userWithWallet.userId },
    });

    if (!certificate || certificate.status === "NOT_ISSUED") {
      return NextResponse.json({
        verified: false,
        message: "Tidak ditemukan ijazah untuk wallet ini",
      });
    }

    // Cek apakah PII sudah dihapus (Right to be Forgotten)
    const piiDeleted = !!userWithWallet.dataDeletedAt;

    // 2-tier hash verification (jika salt dan hash tersedia)
    let hashVerified: boolean | null = null;
    if (!piiDeleted && certificate.dataSalt && certificate.dataHash) {
      hashVerified = verifyDataHash(
        userWithWallet.nama,
        userWithWallet.nim,
        userWithWallet.prodi || "Informatika",
        certificate.dataSalt,
        certificate.dataHash
      );
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
          nama: piiDeleted ? "[DATA DIHAPUS]" : userWithWallet.nama,
          nim: piiDeleted ? "[DIHAPUS]" : userWithWallet.nim,
          prodi: userWithWallet.prodi,
          tahunLulus: userWithWallet.angkatan,
          nftAddress: certificate.nftAddress,
        },
        piiDeleted,
      });
    }

    return NextResponse.json({
      verified: true,
      hashVerified,
      data: {
        nama: piiDeleted ? "[DATA DIHAPUS]" : userWithWallet.nama,
        nim: piiDeleted ? "[DIHAPUS]" : userWithWallet.nim,
        prodi: userWithWallet.prodi,
        tahunLulus: userWithWallet.angkatan,
        status: certificate.status,
        nftAddress: certificate.nftAddress,
        issuedAt: certificate.issuedAt,
        penerbit: "Universitas Tadulako",
        dataHash: certificate.dataHash,
      },
      piiDeleted,
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

