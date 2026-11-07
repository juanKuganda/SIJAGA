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
        | "MALFORMED_INPUT";
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
 */
export async function verifyVerificationChallenge(params: {
  walletAddress: string;
  nonce: string;
  signature: string; // base58 string
  message: string;
  expectedOwner?: string; // Optional: jika ingin langsung mencocokkan dengan on-chain owner
}): Promise<ChallengeVerificationResult> {
  const { walletAddress, nonce, signature, message, expectedOwner } = params;

  if (!walletAddress || !nonce || !signature || !message) {
    return {
      success: false,
      error: "MALFORMED_INPUT",
      message: "Parameter verifikasi tidak lengkap",
    };
  }

  // 1. Cari record nonce di DB
  const storedNonce = await prisma.verificationNonce.findUnique({
    where: { nonce },
  });

  if (!storedNonce) {
    return {
      success: false,
      error: "NONCE_NOT_FOUND",
      message: "Nonce tidak ditemukan atau tidak valid",
    };
  }

  // 2. Cek apakah sudah pernah dipakai (replay prevention)
  if (storedNonce.usedAt !== null) {
    return {
      success: false,
      error: "NONCE_ALREADY_USED",
      message: "Tantangan verifikasi telah digunakan (replay attack detected)",
    };
  }

  // 3. Cek kadaluwarsa
  const now = new Date();
  if (now > storedNonce.expiresAt) {
    return {
      success: false,
      error: "NONCE_EXPIRED",
      message: "Tantangan verifikasi telah kadaluwarsa",
    };
  }

  // 4. Cek kesesuaian wallet address
  if (storedNonce.walletAddress !== walletAddress) {
    return {
      success: false,
      error: "WALLET_MISMATCH",
      message: "Wallet address tidak cocok dengan yang meminta tantangan",
    };
  }

  // 5. Cek kecocokan pemilik aset (jika diberikan)
  if (expectedOwner && expectedOwner !== walletAddress) {
    return {
      success: false,
      error: "OWNER_MISMATCH",
      message: "Signer bukan pemilik sah atas aset ijazah",
    };
  }

  // 6. Cek byte-for-byte message integrity
  if (storedNonce.message !== message) {
    return {
      success: false,
      error: "MESSAGE_MISMATCH",
      message: "Isi pesan tantangan telah dimodifikasi (tampered message)",
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
        message: "Panjang public key tidak valid (harus 32 bytes)",
      };
    }

    if (sigBytes.length !== 64) {
      return {
        success: false,
        error: "MALFORMED_INPUT",
        message: "Panjang signature tidak valid (harus 64 bytes)",
      };
    }

    const isValid = nacl.sign.detached.verify(msgBytes, sigBytes, pubkeyBytes);

    if (!isValid) {
      return {
        success: false,
        error: "INVALID_SIGNATURE",
        message: "Tanda tangan kriptografis tidak valid untuk pesan ini",
      };
    }
  } catch (err) {
    return {
      success: false,
      error: "INVALID_SIGNATURE",
      message: `Gagal memverifikasi signature: ${err instanceof Error ? err.message : String(err)}`,
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

