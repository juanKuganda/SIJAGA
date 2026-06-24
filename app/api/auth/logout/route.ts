import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  // Ambil user info sebelum logout untuk audit log
  const token = request.cookies.get("token")?.value;
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      await prisma.auditLog.create({
        data: {
          userId: payload.userId,
          action: "USER_LOGOUT",
          detail: `User ${payload.nim} logout`,
          ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        },
      }).catch(console.error);
    }
  }

  const response = NextResponse.json({ success: true });

  // Hapus cookie token
  response.cookies.delete("token");

  return response;
}
