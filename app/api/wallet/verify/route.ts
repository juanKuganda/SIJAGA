import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { walletVerifySchema } from "@/lib/validation";

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

    // Validasi input
    const result = walletVerifySchema.safeParse(body);
    if (!result.success) {
      const errorMessage = result.error.issues[0]?.message || "Validasi gagal";
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    const { walletId, status } = result.data;

    // Cek apakah wallet ada
    const existingWallet = await prisma.wallet.findUnique({
      where: { id: walletId },
    });

    if (!existingWallet) {
      return NextResponse.json(
        { error: "Wallet tidak ditemukan" },
        { status: 404 }
      );
    }

    // Guard: hanya boleh ubah status dari PENDING
    if (existingWallet.status !== "PENDING") {
      return NextResponse.json(
        { error: `Wallet sudah ${existingWallet.status.toLowerCase()}. Tidak bisa diubah lagi.` },
        { status: 400 }
      );
    }

    // Update status wallet
    const wallet = await prisma.wallet.update({
      where: { id: walletId },
      data: {
        status,
        verifiedAt: status === "VERIFIED" ? new Date() : null,
        verifiedBy: status === "VERIFIED" ? payload.userId : null,
      },
      include: {
        user: true,
      },
    });

    // Buat audit log — userId merujuk ke mahasiswa (pemilik wallet), bukan admin
    await prisma.auditLog.create({
      data: {
        userId: wallet.userId,
        action: `WALLET_${status}`,
        detail: `Wallet ${wallet.walletAddress} ${status.toLowerCase()} oleh admin ${payload.userId}`,
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      },
    });

    return NextResponse.json({ wallet });
  } catch (error) {
    console.error("Wallet verify error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
