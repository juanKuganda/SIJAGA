import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET_RAW = process.env.JWT_SECRET;
const JWT_SECRET = JWT_SECRET_RAW ? new TextEncoder().encode(JWT_SECRET_RAW) : null;

/**
 * Verify JWT token menggunakan jose (Edge-compatible)
 */
async function verifyToken(token: string) {
  if (!JWT_SECRET) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { userId: string; role: string; nim: string };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  // Jika JWT_SECRET tidak diset, tolak semua request
  if (!JWT_SECRET) {
    console.error("JWT_SECRET tidak ditemukan di environment variables");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const token = request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;

  // Public routes yang tidak perlu auth
  const publicRoutes = [
    "/login",
    "/register",
    "/verifikasi",
    "/ijazah",
    "/api/auth/login",
    "/api/auth/register",
    "/api/verify",
    "/api/certificate",
    "/api/actions/claim",
  ];
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route),
  );

  // Landing page ("/") selalu public
  if (pathname === "/") {
    return NextResponse.next();
  }

  // Jika sudah login dan akses login/register, redirect ke dashboard/profil
  if ((pathname === "/login" || pathname === "/register") && token) {
    const payload = await verifyToken(token);
    if (payload) {
      if (payload.role === "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      } else {
        return NextResponse.redirect(new URL("/profil", request.url));
      }
    }
    // Token invalid, biarkan akses login/register
  }

  // Jika route publik, biarkan akses
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Jika tidak ada token dan bukan route publik, redirect ke login
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Verify token dengan signature check
  const payload = await verifyToken(token);
  if (!payload) {
    // Token invalid atau expired, hapus cookie dan redirect ke login
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("token");
    return response;
  }

  // Route admin (termasuk /revoke)
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/mahasiswa") ||
    pathname.startsWith("/terbitkan") ||
    pathname.startsWith("/revoke") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/nft/mint") ||
    pathname.startsWith("/api/nft/revoke") ||
    pathname.startsWith("/api/wallet/verify")
  ) {
    if (payload.role !== "ADMIN") {
      // Jika API route, return 403
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Forbidden - Admin only" },
          { status: 403 },
        );
      }
      return NextResponse.redirect(new URL("/profil", request.url));
    }
  }

  // Route mahasiswa
  if (
    pathname.startsWith("/profil") ||
    pathname.startsWith("/wallet") ||
    pathname.startsWith("/api/wallet/register") ||
    pathname.startsWith("/api/wallet/status") ||
    pathname.startsWith("/api/nft/status")
  ) {
    if (payload.role !== "MAHASISWA") {
      // Jika API route, return 403
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Forbidden - Mahasiswa only" },
          { status: 403 },
        );
      }
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
