import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(_request: NextRequest) {
  try {
    const payload = await getAuthUser();
    if (!payload) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Ambil data certificate
    const certificate = await prisma.certificate.findUnique({
      where: { userId: payload.userId },
    });

    return NextResponse.json({ certificate });
  } catch (error) {
    console.error("NFT status error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
