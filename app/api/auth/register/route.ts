import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validasi input
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      const errorMessage = result.error.issues[0]?.message || "Validasi gagal";
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    const { nama, nim, email, password, prodi, angkatan } = result.data;

    // Cek duplikasi NIM
    const existingNim = await prisma.user.findUnique({
      where: { nim },
    });

    if (existingNim) {
      return NextResponse.json(
        { error: "NIM sudah terdaftar" },
        { status: 400 }
      );
    }

    // Cek duplikasi email
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: "Email sudah terdaftar" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Buat user baru
    const user = await prisma.user.create({
      data: {
        nama,
        nim,
        email,
        password: hashedPassword,
        role: "MAHASISWA",
        prodi,
        angkatan,
      },
    });

    // Buat audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "USER_REGISTER",
        detail: `Mahasiswa ${nama} (${nim}) mendaftar akun baru`,
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Registrasi berhasil! Silakan login.",
      user: {
        id: user.id,
        nama: user.nama,
        nim: user.nim,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
