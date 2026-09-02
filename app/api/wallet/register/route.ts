import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { walletRegisterSchema } from "@/lib/validation";
import { isValidSolanaAddress } from "@/lib/solana";

export async function POST(request: NextRequest) {
  try {
    const payload = await getAuthUser();
    if (!payload || payload.role !== "MAHASISWA") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validasi input
    const result = walletRegisterSchema.safeParse(body);
    if (!result.success) {
      const errorMessage = result.error.issues[0]?.message || "Validasi gagal";
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    const { walletAddress } = result.data;

    // Validasi format wallet address
    if (!isValidSolanaAddress(walletAddress)) {
      return NextResponse.json(
        { error: "Format alamat wallet tidak valid" },
        { status: 400 }
      );
    }

    // Cek apakah user sudah punya wallet
    const existingWallet = await prisma.wallet.findUnique({
      where: { userId: payload.userId },
    });

    if (existingWallet) {
      // Jika wallet sudah VERIFIED, tolak
      if (existingWallet.status === "VERIFIED") {
        return NextResponse.json(
          { error: "Wallet Anda sudah terverifikasi dan tidak dapat diubah lagi." },
          { status: 400 }
        );
      }

      // Jika wallet PENDING atau REJECTED, hapus yang lama supaya bisa daftar baru
      if (existingWallet.status === "PENDING" || existingWallet.status === "REJECTED") {
        await prisma.wallet.delete({
          where: { id: existingWallet.id },
        });
      }
    }

    // Cek apakah wallet address sudah digunakan
    const existingAddress = await prisma.wallet.findUnique({
      where: { walletAddress },
    });

    if (existingAddress) {
      return NextResponse.json(
        { error: "Alamat wallet sudah digunakan" },
        { status: 400 }
      );
    }

    // Buat wallet baru
    const wallet = await prisma.wallet.create({
      data: {
        userId: payload.userId,
        walletAddress,
        status: "PENDING",
      },
    });

    // Buat audit log
    await prisma.auditLog.create({
      data: {
        userId: payload.userId,
        action: "WALLET_REGISTER",
        detail: `Wallet ${walletAddress} didaftarkan`,
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      },
    });

    return NextResponse.json({
      wallet: {
        id: wallet.id,
        walletAddress: wallet.walletAddress,
        status: wallet.status,
      },
    });
  } catch (error) {
    console.error("Wallet register error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
