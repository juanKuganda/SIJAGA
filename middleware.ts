import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;

  // Public routes yang tidak perlu auth
  const publicRoutes = ["/login", "/verifikasi", "/api/auth/login", "/api/verify", "/api/actions/claim"];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // Jika sudah login dan akses login, redirect ke dashboard/profil
  if (pathname === "/login" && token) {
    // Decode token untuk cek role (simplified - production perlu verify)
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.role === "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      } else {
        return NextResponse.redirect(new URL("/profil", request.url));
      }
    } catch {
      // Token invalid, biarkan akses login
    }
  }

  // Jika route publik, biarkan akses
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Jika tidak ada token dan bukan route publik, redirect ke login
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Decode token untuk cek role
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));

    // Route admin
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/mahasiswa") || pathname.startsWith("/terbitkan")) {
      if (payload.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/profil", request.url));
      }
    }

    // Route mahasiswa
    if (pathname.startsWith("/profil") || pathname.startsWith("/wallet")) {
      if (payload.role !== "MAHASISWA") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  } catch {
    // Token invalid, redirect ke login
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
