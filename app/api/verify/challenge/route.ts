import { NextRequest, NextResponse } from "next/server";
import {
  createVerificationChallenge,
  verifyVerificationChallenge,
} from "@/lib/challenge";
import { prisma } from "@/lib/prisma";

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
        { error: "Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi." },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Mode A: Verifikasi tanda tangan tantangan
    if (body.action === "verify" || body.signature) {
      const {
        walletAddress,
        nonce,
        signature,
        message,
        expectedOwner,
        certificateId,
      } = body;

      if (!walletAddress || !nonce || !signature || !message) {
        return NextResponse.json(
          {
            error:
              "Data verifikasi tidak lengkap. Minta tantangan baru lalu ulangi proses verifikasi.",
          },
          { status: 400 }
        );
      }

      let targetCertId: string | undefined =
        typeof certificateId === "string" ? certificateId : undefined;

      // Fallback query jika certificateId tidak dikirimkan tapi expectedOwner ada
      if (!targetCertId && expectedOwner && typeof expectedOwner === "string") {
        const ownerUser = await prisma.user.findFirst({
          where: { wallet: { walletAddress: expectedOwner } },
          include: { certificate: true },
        });
        if (ownerUser?.certificate?.status === "REVOKED") {
          return NextResponse.json(
            {
              verified: false,
              error: "CERT_REVOKED",
              message:
                "Ijazah ini telah dicabut oleh Universitas Tadulako. Kepemilikan tidak dapat diverifikasi untuk ijazah yang telah dicabut.",
            },
            { status: 400 }
          );
        }
        if (ownerUser?.certificate?.id) {
          targetCertId = ownerUser.certificate.id;
        }
      }

      const result = await verifyVerificationChallenge({
        walletAddress,
        nonce,
        signature,
        message,
        expectedOwner,
        certificateId: targetCertId,
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
    const { walletAddress, certificateId } = body;

    if (!walletAddress || typeof walletAddress !== "string") {
      return NextResponse.json(
        { error: "Alamat wallet wajib diisi. Masukkan alamat wallet Solana Anda." },
        { status: 400 }
      );
    }

    // Validasi format alamat Solana base58 (32 - 44 karakter)
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: "Format alamat wallet Solana tidak valid. Periksa kembali alamat wallet yang dimasukkan." },
        { status: 400 }
      );
    }

    // Jika certificateId diberikan, tolak penerbitan tantangan bila ijazah telah dicabut
    if (certificateId && typeof certificateId === "string") {
      const cert = await prisma.certificate.findUnique({
        where: { id: certificateId },
        select: { status: true, revokeReason: true },
      });
      if (cert && cert.status === "REVOKED") {
        return NextResponse.json(
          {
            success: false,
            error: "CERT_REVOKED",
            message:
              "Ijazah ini telah dicabut oleh Universitas Tadulako. Tantangan verifikasi tidak dapat diterbitkan untuk ijazah yang telah dicabut.",
            revokeReason: cert.revokeReason || null,
          },
          { status: 400 }
        );
      }
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
      { error: "Terjadi kesalahan server saat memproses tantangan. Silakan coba lagi beberapa saat lagi." },
      { status: 500 }
    );
  }
}

