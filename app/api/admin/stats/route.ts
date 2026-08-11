import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Hitung statistik
    const [
      totalMahasiswa,
      walletPending,
      walletVerified,
      ijazahMinted,
      ijazahClaimed,
      ijazahRevoked,
      readyToMint,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "MAHASISWA" } }),
      prisma.wallet.count({ where: { status: "PENDING" } }),
      prisma.wallet.count({ where: { status: "VERIFIED" } }),
      prisma.certificate.count({ where: { status: "MINTED" } }),
      prisma.certificate.count({ where: { status: "CLAIMED" } }),
      prisma.certificate.count({ where: { status: "REVOKED" } }),
      prisma.user.count({
        where: {
          role: "MAHASISWA",
          wallet: { status: "VERIFIED" },
          OR: [
            { certificate: null },
            { certificate: { status: "NOT_ISSUED" } },
          ],
        },
      }),
    ]);

    return NextResponse.json({
      stats: {
        totalMahasiswa,
        walletPending,
        walletVerified,
        ijazahMinted,
        ijazahClaimed,
        ijazahRevoked,
        readyToMint,
      },
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
