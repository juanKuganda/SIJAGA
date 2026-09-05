import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// In-memory rate limiting map
// Catatan: Ini berjalan di Edge runtime sehingga state bersifat ephemeral per instance,
// namun sudah cukup untuk memberikan proteksi dasar terhadap spam/DDoS.
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();

const RATE_LIMIT_WINDOW_MS = 10000; // 10 detik
const MAX_REQUESTS_PER_WINDOW = 20; // Maksimal 20 request per 10 detik

// Rate limit lebih ketat untuk endpoint AI (publik tapi mahal)
const AI_RATE_LIMIT_WINDOW_MS = 60000; // 1 menit
const AI_MAX_REQUESTS_PER_WINDOW = 10; // Maksimal 10 request per menit
const aiRateLimitMap = new Map<string, { count: number; timestamp: number }>();

/**
 * Security headers standar industri.
 * Diterapkan pada setiap response yang melewati proxy.
 */
const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 1. Rate Limiting untuk Endpoint Autentikasi
  if (pathname.startsWith('/api/auth') || pathname === '/login' || pathname === '/register') {
    const ip = request.headers.get('x-forwarded-for') ?? 'unknown-ip';
    const blocked = checkRateLimit(ip, rateLimitMap, RATE_LIMIT_WINDOW_MS, MAX_REQUESTS_PER_WINDOW);
    
    if (blocked) {
      if (pathname.startsWith('/api')) {
        return addSecurityHeaders(
          NextResponse.json(
            { error: "Terlalu banyak permintaan. Silakan coba lagi nanti." },
            { status: 429, headers: { 'Retry-After': '10' } }
          )
        );
      }
      const url = new URL('/?error=rate_limit', request.url);
      return addSecurityHeaders(NextResponse.redirect(url));
    }
  }

  // 2. Rate Limiting untuk Endpoint AI (publik tapi mahal per-request)
  if (pathname === '/api/ask') {
    const ip = request.headers.get('x-forwarded-for') ?? 'unknown-ip';
    const blocked = checkRateLimit(ip, aiRateLimitMap, AI_RATE_LIMIT_WINDOW_MS, AI_MAX_REQUESTS_PER_WINDOW);
    
    if (blocked) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: "Terlalu banyak pertanyaan. Silakan coba lagi dalam 1 menit." },
          { status: 429, headers: { 'Retry-After': '60' } }
        )
      );
    }
  }

  // 2b. Rate Limiting untuk Endpoint Verify (publik, rawan enumerasi NIM)
  if (pathname === '/api/verify') {
    const ip = request.headers.get('x-forwarded-for') ?? 'unknown-ip';
    const blocked = checkRateLimit(ip, aiRateLimitMap, AI_RATE_LIMIT_WINDOW_MS, AI_MAX_REQUESTS_PER_WINDOW);
    
    if (blocked) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: "Terlalu banyak permintaan verifikasi. Silakan coba lagi dalam 1 menit." },
          { status: 429, headers: { 'Retry-After': '60' } }
        )
      );
    }
  }

  // 3. Proteksi Halaman / Route Protection
  const protectedRoutes = [
    '/dashboard',
    '/profil',
    '/wallet',
    '/consent',
    '/admin',
    '/mahasiswa',
    '/terbitkan',
    '/ocr-scan',
    '/revoke'
  ];

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  if (isProtectedRoute) {
    // Cek session cookie Neon Auth
    // Neon Auth @neondatabase/auth sets cookies with prefix:
    //   - HTTP:  neon-auth.session_token
    //   - HTTPS: __Secure-neon-auth.session_token
    const cookies = request.cookies.getAll();
    const hasSessionToken = cookies.some(c => 
      c.name.includes('neon-auth.session_token') ||
      c.name.includes('better-auth.session_token')
    );
    
    if (!hasSessionToken) {
      const url = new URL('/login', request.url);
      return addSecurityHeaders(NextResponse.redirect(url));
    }
  }
  
  // Tambahkan security headers ke semua response
  return addSecurityHeaders(NextResponse.next());
}

/**
 * Cek rate limit untuk IP tertentu.
 * Mengembalikan true jika IP telah melebihi batas.
 */
function checkRateLimit(
  ip: string,
  map: Map<string, { count: number; timestamp: number }>,
  windowMs: number,
  maxRequests: number
): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;
  const record = map.get(ip);

  if (record) {
    if (record.timestamp < windowStart) {
      // Reset window
      map.set(ip, { count: 1, timestamp: now });
      return false;
    } else {
      record.count++;
      return record.count > maxRequests;
    }
  } else {
    map.set(ip, { count: 1, timestamp: now });
    return false;
  }
}

/**
 * Menambahkan security headers standar ke response.
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: [
    /*
     * Match seluruh request path KECUALI yang diawali dengan:
     * - _next/static (file statis Next.js)
     * - _next/image (optimasi gambar Next.js)
     * - favicon.ico (ikon website)
     * - public assets (gambar, dll)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
