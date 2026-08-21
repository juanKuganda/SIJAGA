import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { data: session } = await auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ambil data user dari Prisma DB menggunakan email atau id
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: session.user.email },
          { id: session.user.id }
        ]
      },
      select: {
        id: true,
        nama: true,
        nim: true,
        email: true,
        role: true,
        prodi: true,
        angkatan: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan di database" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Auth /me error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
