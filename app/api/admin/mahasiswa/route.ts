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

    // Ambil semua mahasiswa dengan wallet dan certificate
    const mahasiswa = await prisma.user.findMany({
      where: { role: "MAHASISWA" },
      select: {
        id: true,
        nama: true,
        nim: true,
        email: true,
        prodi: true,
        angkatan: true,
        wallet: {
          select: {
            id: true,
            walletAddress: true,
            status: true,
          },
        },
        certificate: {
          select: {
            status: true,
            txSignature: true,
          },
        },
      },
      orderBy: { nama: "asc" },
    });

    return NextResponse.json({ mahasiswa });
  } catch (error) {
    console.error("Mahasiswa list error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
