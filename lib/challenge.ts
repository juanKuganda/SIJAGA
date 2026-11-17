import crypto from "crypto";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { prisma } from "@/lib/prisma";

export const CHALLENGE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export interface ChallengePayload {
  nonce: string;
  walletAddress: string;
  message: string;
  expiresAt: Date;
}

/**
 * Buat template pesan tantangan verifikasi standar SIJAGA.
 * Pesan ini harus byte-exact match saat diverifikasi.
 */
export function buildChallengeMessage(params: {
  walletAddress: string;
  nonce: string;
  issuedAt: Date;
  expiresAt: Date;
}): string {
  return [
    "SIJAGA Verification Challenge",
    "Context: Academic Credential Verification (Universitas Tadulako)",
    `Wallet: ${params.walletAddress}`,
    `Nonce: ${params.nonce}`,
    `IssuedAt: ${params.issuedAt.toISOString()}`,
    `ExpiresAt: ${params.expiresAt.toISOString()}`,
  ].join("\n");
}

/**
 * Generate tantangan baru dan simpan ke database (VerificationNonce).
 * Nonce berukuran 128-bit (16 bytes random hex).
 */
export async function createVerificationChallenge(
  walletAddress: string
): Promise<ChallengePayload> {
  const nonce = crypto.randomBytes(16).toString("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CHALLENGE_EXPIRY_MS);

  const message = buildChallengeMessage({
    walletAddress,
    nonce,
    issuedAt: now,
    expiresAt,
  });

  await prisma.verificationNonce.create({
    data: {
      nonce,
      walletAddress,
      message,
      expiresAt,
      usedAt: null,
    },
  });

  return {
    nonce,
    walletAddress,
    message,
    expiresAt,
  };
}

export type ChallengeVerificationResult =
  | { success: true; walletAddress: string; nonce: string }
  | {
      success: false;
      error:
        | "NONCE_NOT_FOUND"
        | "NONCE_EXPIRED"
        | "NONCE_ALREADY_USED"
        | "MESSAGE_MISMATCH"
        | "WALLET_MISMATCH"
        | "OWNER_MISMATCH"
        | "INVALID_SIGNATURE"
        | "MALFORMED_INPUT"
        | "CERT_REVOKED";
      message: string;
    };

/**
 * Verifikasi tanda tangan kriptografis Ed25519 terhadap pesan tantangan.
 * Menegakkan aturan:
 * 1. Nonce ada dan belum pernah dipakai (single-use / anti-replay)
 * 2. Nonce belum kadaluwarsa (<= 5 menit)
 * 3. Pesan persis sama byte-for-byte (anti-tamper)
 * 4. Tanda tangan valid ditandatangani oleh private key milik walletAddress (Ed25519 via tweetnacl)
 * 5. Signer sama dengan pemilik aset (owner) jika expectedOwner disediakan
 * 6. Status ijazah tidak REVOKED jika certificateId disediakan
 */
export async function verifyVerificationChallenge(params: {
  walletAddress: string;
  nonce: string;
  signature: string; // base58 string
  message: string;
  expectedOwner?: string; // Optional: jika ingin langsung mencocokkan dengan on-chain owner
  certificateId?: string; // Optional: jika disediakan, tolak ijazah yang berstatus REVOKED
}): Promise<ChallengeVerificationResult> {
  const { walletAddress, nonce, signature, message, expectedOwner, certificateId } = params;

  if (!walletAddress || !nonce || !signature || !message) {
    return {
      success: false,
      error: "MALFORMED_INPUT",
      message: "Data verifikasi tidak lengkap. Minta tantangan baru lalu ulangi prosesnya.",
    };
  }

  // 0. Cek status pencabutan ijazah jika certificateId diberikan
  if (certificateId) {
    const cert = await prisma.certificate.findUnique({
      where: { id: certificateId },
      select: { status: true },
    });
    if (cert && cert.status === "REVOKED") {
      return {
        success: false,
        error: "CERT_REVOKED",
        message:
          "Ijazah ini telah dicabut oleh Universitas Tadulako. Kepemilikan tidak dapat diverifikasi untuk ijazah yang telah dicabut.",
      };
    }
  }

  // 1. Cari record nonce di DB
  const storedNonce = await prisma.verificationNonce.findUnique({
    where: { nonce },
  });

  if (!storedNonce) {
    return {
      success: false,
      error: "NONCE_NOT_FOUND",
      message: "Tantangan tidak ditemukan atau sudah tidak berlaku. Minta tantangan baru dan coba lagi.",
    };
  }

  // 2. Cek apakah sudah pernah dipakai (replay prevention)
  if (storedNonce.usedAt !== null) {
    return {
      success: false,
      error: "NONCE_ALREADY_USED",
      message: "Tantangan ini sudah pernah dipakai dan tidak bisa dipakai lagi. Minta tantangan baru.",
    };
  }

  // 3. Cek kadaluwarsa
  const now = new Date();
  if (now > storedNonce.expiresAt) {
    return {
      success: false,
      error: "NONCE_EXPIRED",
      message: "Tantangan sudah kedaluwarsa (batas waktu 5 menit). Minta tantangan baru dan tanda tangani segera.",
    };
  }

  // 4. Cek kesesuaian wallet address
  if (storedNonce.walletAddress !== walletAddress) {
    return {
      success: false,
      error: "WALLET_MISMATCH",
      message: "Alamat dompet tidak cocok dengan dompet yang meminta tantangan. Gunakan dompet yang sama seperti saat meminta tantangan.",
    };
  }

  // 5. Cek kecocokan pemilik aset (jika diberikan)
  if (expectedOwner && expectedOwner !== walletAddress) {
    return {
      success: false,
      error: "OWNER_MISMATCH",
      message: "Dompet ini bukan pemilik ijazah. Gunakan dompet pemilik ijazah untuk menandatangani.",
    };
  }

  // 6. Cek byte-for-byte message integrity
  if (storedNonce.message !== message) {
    return {
      success: false,
      error: "MESSAGE_MISMATCH",
      message: "Isi pesan tantangan berubah sehingga tidak lagi sesuai. Minta tantangan baru dan jangan ubah isi pesannya.",
    };
  }

  // 7. Verifikasi tanda tangan kriptografis Ed25519 dengan tweetnacl
  try {
    const pubkeyBytes = bs58.decode(walletAddress);
    const sigBytes = bs58.decode(signature);
    const msgBytes = Buffer.from(message, "utf-8");

    if (pubkeyBytes.length !== 32) {
      return {
        success: false,
        error: "MALFORMED_INPUT",
        message: "Alamat dompet tidak valid. Pastikan memakai alamat dompet Solana yang benar.",
      };
    }

    if (sigBytes.length !== 64) {
      return {
        success: false,
        error: "MALFORMED_INPUT",
        message: "Tanda tangan dari dompet tidak valid. Coba tanda tangani ulang dengan dompet yang sama.",
      };
    }

    const isValid = nacl.sign.detached.verify(msgBytes, sigBytes, pubkeyBytes);

    if (!isValid) {
      return {
        success: false,
        error: "INVALID_SIGNATURE",
        message: "Tanda tangan tidak cocok dengan pesan tantangan ini. Coba tanda tangani ulang dengan dompet pemilik ijazah.",
      };
    }
  } catch {
    return {
      success: false,
      error: "INVALID_SIGNATURE",
      // Pesan mentah tidak diteruskan ke user; detail lengkap sudah dicatat pemanggil (console.error di route).
        message: "Tanda tangan tidak dapat diverifikasi. Pastikan memakai dompet Solana yang benar dan coba tanda tangani ulang.",
    };
  }

  // 8. Tandai nonce sebagai used (single-use atomik)
  await prisma.verificationNonce.update({
    where: { id: storedNonce.id },
    data: { usedAt: new Date() },
  });

  return {
    success: true,
    walletAddress,
    nonce,
  };
}

