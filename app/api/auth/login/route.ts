import { NextRequest, NextResponse } from "next/server";
import { loginUser } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validasi input
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      const errorMessage = result.error.issues[0]?.message || "Validasi gagal";
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    const { nim, password } = result.data;

    // Login
    const loginResult = await loginUser(nim, password);

    if ("error" in loginResult) {
      return NextResponse.json(
        { error: loginResult.error },
        { status: 401 }
      );
    }

    // Set cookie
    const response = NextResponse.json({
      user: loginResult.user,
    });

    response.cookies.set("token", loginResult.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 jam
      path: "/",
    });

    // Audit log untuk login
    await prisma.auditLog.create({
      data: {
        userId: loginResult.user.id,
        action: "USER_LOGIN",
        detail: `User ${loginResult.user.nama} (${loginResult.user.nim}) login sebagai ${loginResult.user.role}`,
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      },
    }).catch(console.error); // Jangan gagalkan login jika audit log error

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
