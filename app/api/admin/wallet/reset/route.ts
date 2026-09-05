import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const payload = await getAuthUser();
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID diperlukan" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true, certificate: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Mahasiswa tidak ditemukan" },
        { status: 404 }
      );
    }

    // ═══════════════════════════════════════════════════════════
    // Guard: Jangan reset wallet jika ada NFT aktif
    // Mencegah double-mint / NFT yatim
    // ═══════════════════════════════════════════════════════════

    if (user.certificate) {
      const certStatus = user.certificate.status;
      const hasNftAddress = !!user.certificate.nftAddress;

      // MINTED / CLAIMED / ISSUING + ada nftAddress = HARUS revoke dulu
      if (
        (certStatus === "MINTED" || certStatus === "CLAIMED" || certStatus === "ISSUING") &&
        hasNftAddress
      ) {
        return NextResponse.json(
          {
            error: "Tidak bisa reset wallet: sertifikat masih aktif di blockchain. Revoke dulu sebelum reset wallet.",
            certStatus,
            nftAddress: user.certificate.nftAddress,
          },
          { status: 400 }
        );
      }

      // ISSUING tanpa nftAddress = aman untuk reset (mint belum berhasil)
      // REVOKED = aman untuk reset, tapi JANGAN null-kan nftAddress (jejak)
      // NOT_ISSUED = aman
    }

    // ═══════════════════════════════════════════════════════════
    // 1. Hapus Wallet
    // ═══════════════════════════════════════════════════════════

    if (user.wallet) {
      await prisma.wallet.delete({
        where: { id: user.wallet.id },
      });
    }

    // ═══════════════════════════════════════════════════════════
    // 2. Reset Certificate Status jika ada
    // PENTING: JANGAN null-kan nftAddress/metadataUri/txSignature
    // (jejak audit bahwa pernah ada NFT)
    // ═══════════════════════════════════════════════════════════

    if (user.certificate) {
      await prisma.certificate.update({
        where: { id: user.certificate.id },
        data: {
          status: "NOT_ISSUED",
          // Retain nftAddress, metadataUri, txSignature for audit trail
          claimedAt: null,
        },
      });
    }

    // 3. Catat di Audit Log
    await createAuditLog(
      userId,
      "WALLET_RESET",
      `Wallet mahasiswa di-reset oleh admin ${payload.userId} (Sertifikat dikembalikan ke NOT_ISSUED untuk re-minting)`,
      request.headers.get("x-forwarded-for") || "unknown"
    );

    return NextResponse.json({
      success: true,
      message: "Wallet berhasil di-reset. Mahasiswa kini dapat mendaftarkan wallet baru.",
    });
  } catch (error) {
    console.error("Reset wallet error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server saat me-reset wallet" },
      { status: 500 }
    );
  }
}
