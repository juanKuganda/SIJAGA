import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySchema } from "@/lib/validation";
import { verifyDataHash } from "@/lib/crypto";
import { getAuthUser } from "@/lib/auth";

/**
 * GET /api/verify — Verifikasi publik ijazah
 *
 * ARSITEKTUR: Endpoint ini hanya query PostgreSQL.
 * - Hash (dataHash) dan salt (dataSalt) keduanya dari database server.
 * - TIDAK memanggil fetchAsset() Metaplex.
 * - TIDAK menarik metadata dari IPFS untuk perbandingan.
 * - Verifikasi hash dilakukan sepenuhnya off-chain via SHA-256.
 * - explorerUrl disediakan sebagai referensi opsional ke bukti on-chain.
 */
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

    // Cek Autentikasi untuk menentukan level akses PII
    const authUser = await getAuthUser();
    // Jika tidak ada userWithWallet, kita kembalikan 404 nanti, jadi aman pakai optional chaining
    const isOwner = authUser?.userId === userWithWallet?.userId;
    const isAdmin = authUser?.role === "ADMIN";
    const canSeePII = isOwner || isAdmin;

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
    const maskString = (str: string) => str ? `${str.charAt(0)}***${str.charAt(str.length - 1)}` : "";
    const maskNim = (nim: string) => nim ? `${nim.substring(0, 3)}***${nim.substring(nim.length - 3)}` : "";

    const formatNama = () => piiDeleted ? "[DATA DIHAPUS]" : (canSeePII ? userWithWallet.nama : maskString(userWithWallet.nama));
    const formatNim = () => piiDeleted ? "[DIHAPUS]" : (canSeePII ? userWithWallet.nim : maskNim(userWithWallet.nim));

    if (certificate.status === "REVOKED") {
      return NextResponse.json({
        verified: false,
        revoked: true,
        message: "Ijazah ini telah DIREVOKE / DICABUT",
        revokeReason: certificate.revokeReason || "Tidak ada alasan yang diberikan",
        revokedAt: certificate.revokedAt,
        data: {
          nama: formatNama(),
          nim: formatNim(),
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
        nama: formatNama(),
        nim: formatNim(),
        prodi: userWithWallet.prodi,
        tahunLulus: userWithWallet.angkatan,
        status: certificate.status,
        nftAddress: certificate.nftAddress,
        issuedAt: certificate.issuedAt,
        penerbit: "Universitas Tadulako",
        // SECURITY: dataHash dihapus dari response publik
        // Hash adalah detail internal kriptografi yang tidak perlu diekspos
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

