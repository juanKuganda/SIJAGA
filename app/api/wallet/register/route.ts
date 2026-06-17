import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { walletRegisterSchema } from "@/lib/validation";
import { isValidSolanaAddress } from "@/lib/solana";

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

    // Verify token
    const payload = verifyToken(token);
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
      return NextResponse.json(
        { error: "Anda sudah mendaftarkan wallet" },
        { status: 400 }
      );
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
