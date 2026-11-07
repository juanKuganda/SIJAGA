import { NextRequest, NextResponse } from "next/server";
import {
  createVerificationChallenge,
  verifyVerificationChallenge,
} from "@/lib/challenge";

// In-memory rate limiter per IP: max 20 requests per minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60 * 1000 });
    return true;
  }

  if (entry.count >= 20) {
    return false;
  }

  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "anonymous";

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Silakan coba lagi sebentar." },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Mode A: Verifikasi tanda tangan tantangan
    if (body.action === "verify" || body.signature) {
      const { walletAddress, nonce, signature, message, expectedOwner } = body;

      if (!walletAddress || !nonce || !signature || !message) {
        return NextResponse.json(
          {
            error:
              "Parameter verifikasi wajib diisi: walletAddress, nonce, signature, message",
          },
          { status: 400 }
        );
      }

      const result = await verifyVerificationChallenge({
        walletAddress,
        nonce,
        signature,
        message,
        expectedOwner,
      });

      if (!result.success) {
        return NextResponse.json(
          {
            verified: false,
            error: result.error,
            message: result.message,
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        verified: true,
        walletAddress: result.walletAddress,
        nonce: result.nonce,
        message: "Tanda tangan tantangan berhasil diverifikasi secara kriptografis.",
      });
    }

    // Mode B: Minta tantangan baru (Challenge Issue)
    const { walletAddress } = body;

    if (!walletAddress || typeof walletAddress !== "string") {
      return NextResponse.json(
        { error: "walletAddress wajib diisi" },
        { status: 400 }
      );
    }

    // Validasi format alamat Solana base58 (32 - 44 karakter)
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: "Format walletAddress Solana tidak valid" },
        { status: 400 }
      );
    }

    const challenge = await createVerificationChallenge(walletAddress);

    return NextResponse.json({
      success: true,
      nonce: challenge.nonce,
      walletAddress: challenge.walletAddress,
      message: challenge.message,
      expiresAt: challenge.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Challenge endpoint error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server saat memproses tantangan" },
      { status: 500 }
    );
  }
}

