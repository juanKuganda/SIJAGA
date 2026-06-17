import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { walletVerifySchema } from "@/lib/validation";

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
    const result = walletVerifySchema.safeParse(body);
    if (!result.success) {
      const errorMessage = result.error.issues[0]?.message || "Validasi gagal";
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    const { walletId, status } = result.data;

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

    // Buat audit log
    await prisma.auditLog.create({
      data: {
        userId: payload.userId,
        action: `WALLET_${status}`,
        detail: `Wallet ${wallet.walletAddress} ${status.toLowerCase()}`,
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
