import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// In-memory rate limiting map
// Catatan: Ini berjalan di Edge runtime sehingga state bersifat ephemeral per instance,
// namun sudah cukup untuk memberikan proteksi dasar terhadap spam/DDoS.
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();

const RATE_LIMIT_WINDOW_MS = 10000; // 10 detik
const MAX_REQUESTS_PER_WINDOW = 20; // Maksimal 20 request per 10 detik

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 1. Rate Limiting untuk Endpoint Autentikasi
  if (pathname.startsWith('/api/auth') || pathname === '/login' || pathname === '/register') {
    const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? 'unknown-ip';
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;
    
    const record = rateLimitMap.get(ip);
    
    if (record) {
      if (record.timestamp < windowStart) {
        // Reset window jika sudah lewat 10 detik
        rateLimitMap.set(ip, { count: 1, timestamp: now });
      } else {
        // Increment count
        record.count++;
        if (record.count > MAX_REQUESTS_PER_WINDOW) {
          // Jika ini request API, kembalikan JSON
          if (pathname.startsWith('/api')) {
            return NextResponse.json(
              { error: "Terlalu banyak permintaan. Silakan coba lagi nanti." },
              { status: 429, headers: { 'Retry-After': '10' } }
            );
          }
          // Jika ini akses halaman (login/register), redirect ke halaman error atau beri pesan
          const url = new URL('/?error=rate_limit', request.url);
          return NextResponse.redirect(url);
        }
      }
    } else {
      rateLimitMap.set(ip, { count: 1, timestamp: now });
    }
  }

  // 2. Proteksi Halaman / Route Protection
  const protectedRoutes = [
    '/dashboard',
    '/profil',
    '/wallet',
    '/ijazah',
    '/consent',
    '/admin',
    '/mahasiswa',
    '/terbitkan',
    '/ocr-scan',
    '/revoke'
  ];

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  if (isProtectedRoute) {
    // Periksa keberadaan token sesi auth di cookies.
    // Neon Auth (Better Auth) secara default menggunakan session_token
    const hasSessionToken = request.cookies.getAll().some(c => 
      c.name.includes('session_token') || c.name.includes('neon_auth')
    );
    
    if (!hasSessionToken) {
      // Jika tidak ada sesi aktif, paksa login kembali
      const url = new URL('/login', request.url);
      return NextResponse.redirect(url);
    }
  }
  
  return NextResponse.next();
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
