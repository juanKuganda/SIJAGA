import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * proxy.ts — SIJAGA Security Proxy (Next.js 16)
 *
 * Lapisan keamanan terpusat yang menangani:
 * 1. Rate Limiting — Sliding-window per IP untuk endpoint sensitif
 * 2. Route Protection — Redirect unauthenticated users dari halaman protected
 * 3. Session Expiry — Enforce max 1 hari sesi login (via marker cookie)
 * 4. Security Headers — Ditambahkan pada setiap response
 */

// ═══════════════════════════════════════════════════════════
// KONFIGURASI
// ═══════════════════════════════════════════════════════════

/** Cookie marker yang di-set setelah login sukses (maxAge=86400 = 1 hari) */
const SESSION_MARKER = '__sijaga_session';

/** Prefix halaman yang butuh autentikasi ADMIN */
const ADMIN_ROUTES = ['/dashboard', '/mahasiswa', '/terbitkan', '/ocr-scan', '/revoke', '/audit'];

/** Prefix halaman yang butuh autentikasi MAHASISWA */
const MAHASISWA_ROUTES = ['/profil', '/wallet', '/consent'];

/** Halaman auth (login/register) — redirect jika sudah login */
const AUTH_ROUTES = ['/login', '/register'];

/**
 * Security headers standar industri.
 * CSP dan HSTS didefinisikan di next.config.ts headers() agar cakupannya menyeluruh.
 */
const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
};

// ═══════════════════════════════════════════════════════════
// RATE LIMITER (In-Memory Sliding Window)
// ═══════════════════════════════════════════════════════════

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Cek apakah request terkena rate limit.
 * Menggunakan sliding-window algorithm untuk akurasi lebih baik
 * dibanding fixed-window.
 *
 * @returns true jika TERBLOKIR (sudah melebihi limit)
 */
function isRateLimited(ip: string, bucket: string, limit: number, windowMs: number): boolean {
  const key = `${bucket}:${ip}`;
  const now = Date.now();

  const entry = rateLimitStore.get(key);
  if (!entry) {
    rateLimitStore.set(key, { timestamps: [now] });
    return false;
  }

  // Filter hanya timestamp dalam window
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= limit) {
    return true; // BLOCKED
  }

  entry.timestamps.push(now);
  return false;
}

/** Lazy cleanup — dijalankan secara probabilistik setiap ~1% request */
function maybePurgeExpiredEntries(): void {
  if (Math.random() > 0.01) return;
  const now = Date.now();
  const MAX_WINDOW = 15 * 60 * 1000; // window terbesar (15 menit)
  for (const [key, entry] of rateLimitStore) {
    const valid = entry.timestamps.filter((t) => now - t < MAX_WINDOW);
    if (valid.length === 0) {
      rateLimitStore.delete(key);
    } else {
      entry.timestamps = valid;
    }
  }
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

// ═══════════════════════════════════════════════════════════
// PROXY UTAMA
// ═══════════════════════════════════════════════════════════

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIp(request);

  // Purge expired entries (probabilistic)
  maybePurgeExpiredEntries();

  // ─── 1. RATE LIMITING ───────────────────────────────────

  // Login/Register: 10 percobaan per 15 menit per IP
  if (pathname.startsWith('/api/auth') && request.method === 'POST') {
    if (isRateLimited(ip, 'auth', 10, 15 * 60 * 1000)) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.' },
          { status: 429, headers: { 'Retry-After': '900' } }
        )
      );
    }
  }

  // AI Ask: 10 query per menit per IP
  if (pathname === '/api/ask' && request.method === 'POST') {
    if (isRateLimited(ip, 'ask', 10, 60 * 1000)) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: 'Terlalu banyak pertanyaan. Silakan coba lagi dalam 1 menit.' },
          { status: 429, headers: { 'Retry-After': '60' } }
        )
      );
    }
  }

  // Verifikasi publik: 30 per menit per IP
  if (pathname === '/api/verify' && request.method === 'GET') {
    if (isRateLimited(ip, 'verify', 30, 60 * 1000)) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: 'Terlalu banyak permintaan verifikasi. Silakan coba lagi nanti.' },
          { status: 429, headers: { 'Retry-After': '60' } }
        )
      );
    }
  }

  // Solana Actions: 20 per menit per IP
  if (pathname.startsWith('/api/actions/') && request.method === 'POST') {
    if (isRateLimited(ip, 'actions', 20, 60 * 1000)) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: 'Rate limit exceeded. Try again later.' },
          { status: 429, headers: { 'Retry-After': '60' } }
        )
      );
    }
  }

  // ─── 2. ROUTE PROTECTION ────────────────────────────────

  // Skip API routes dari auth check (sudah punya getAuthUser per-route)
  if (pathname.startsWith('/api')) {
    return addSecurityHeaders(NextResponse.next());
  }

  const isProtectedAdmin = ADMIN_ROUTES.some((r) => pathname.startsWith(r));
  const isProtectedMahasiswa = MAHASISWA_ROUTES.some((r) => pathname.startsWith(r));
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  if (isProtectedAdmin || isProtectedMahasiswa) {
    // ─── Cek session marker cookie (1 hari TTL, di-set saat login) ───
    const sessionMarker = request.cookies.get(SESSION_MARKER);

    if (!sessionMarker) {
      // Cookie expired atau belum login → redirect ke login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('expired', 'true');
      return addSecurityHeaders(NextResponse.redirect(loginUrl));
    }

    // Fallback: Cek juga session cookie Neon Auth
    // Jika session marker ada tapi Neon Auth session hilang,
    // biarkan API routes yang handle (getAuthUser → 401)
    const cookies = request.cookies.getAll();
    const hasNeonSession = cookies.some(
      (c) =>
        c.name.includes('neon-auth.session_token') ||
        c.name.includes('better-auth.session_token')
    );

    if (!hasNeonSession) {
      // Neon Auth session hilang → clear marker & redirect
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('expired', 'true');
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete(SESSION_MARKER);
      return addSecurityHeaders(response);
    }
  }

  // ─── Auth routes: redirect jika sudah login ───
  if (isAuthRoute) {
    const sessionMarker = request.cookies.get(SESSION_MARKER);
    if (sessionMarker) {
      return addSecurityHeaders(
        NextResponse.redirect(new URL('/profil', request.url))
      );
    }
  }

  // Tambahkan security headers ke semua response
  return addSecurityHeaders(NextResponse.next());
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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot|css|js|map)$).*)',
  ],
};
