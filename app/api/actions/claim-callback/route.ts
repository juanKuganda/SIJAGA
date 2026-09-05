import { NextRequest } from "next/server";
import { Connection, clusterApiUrl, PublicKey } from "@solana/web3.js";
import { actionJson, actionOptions, appUrl } from "@/lib/solana-actions";
import { prisma } from "@/lib/prisma";

export const OPTIONS = actionOptions;

// Memo program ID (SPL Memo)
const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

function actionError(message: string, status = 400) {
  return actionJson({ message }, status);
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const nim = searchParams.get("nim");
  const origin = appUrl(request);

  if (!nim) return actionError("NIM tidak ditemukan");

  // Blink client mengirim: { signature, account }
  const body = await request.json();
  const { signature, account } = body;

  if (!signature) return actionError("Transaction signature tidak ditemukan");

  // VERIFIKASI: cek transaksi benar-benar ada di blockchain
  const rpcUrl = process.env.SOLANA_RPC_URL || clusterApiUrl("devnet");
  const connection = new Connection(rpcUrl, "confirmed");

  // Ambil data user dahulu untuk validasi
  const user = await prisma.user.findUnique({
    where: { nim },
    include: { certificate: true, wallet: true },
  });

  if (!user) return actionError("User tidak ditemukan", 404);
  if (!user.certificate?.nftAddress) return actionError("NFT belum diterbitkan", 400);

  // Idempoten: jika sudah CLAIMED, langsung return sukses
  if (user.certificate?.status === "CLAIMED") {
    return respondCompleted(origin);
  }

  // Status guard
  if (user.certificate?.status === "REVOKED") return actionError("Ijazah telah dicabut", 400);
  if (user.certificate?.status === "ISSUING") return actionError("Ijazah masih dalam proses penerbitan", 400);

  try {
    const txInfo = await connection.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    // 1. Transaksi tidak ditemukan di blockchain
    if (!txInfo) {
      return actionError("Transaksi tidak ditemukan di blockchain", 404);
    }

    // 2. Transaksi gagal di blockchain (meta.err harus null)
    if (txInfo.meta?.err) {
      return actionError("Transaksi gagal di blockchain", 400);
    }

    // 3. Validasi signer = wallet terdaftar user
    if (user.wallet?.walletAddress) {
      const accountKeys = txInfo.transaction.message.getAccountKeys();
      const signers: string[] = [];

      // First account is always fee payer/signer in a transaction
      if (accountKeys.length > 0) {
        signers.push(accountKeys.get(0)?.toBase58() || "");
      }

      const walletIsSigner = signers.some(
        (s) => s === user.wallet?.walletAddress
      );

      if (!walletIsSigner) {
        return actionError(
          "Fee payer/signer bukan wallet terdaftar mahasiswa",
          403
        );
      }
    }

    // 4. Cari instruction Memo dan validasi payload
    let memoFound = false;
    let memoPayloadValid = false;

    const compiledInstructions =
      "compiledInstructions" in txInfo.transaction.message
        ? (txInfo.transaction.message as { compiledInstructions: Array<{ programIdIndex: number; data: Uint8Array }> }).compiledInstructions
        : null;

    const accountKeys = txInfo.transaction.message.getAccountKeys();

    if (compiledInstructions) {
      for (const ix of compiledInstructions) {
        const programId = accountKeys.get(ix.programIdIndex)?.toBase58();

        if (programId === MEMO_PROGRAM_ID) {
          memoFound = true;

          // Decode memo data
          const memoText = new TextDecoder().decode(ix.data);

          try {
            const memoJson = JSON.parse(memoText) as {
              type?: string;
              mint?: string;
              certId?: string;
            };

            // Validasi: type === SIJAGA_CLAIM dan mint === nftAddress
            if (
              memoJson.type === "SIJAGA_CLAIM" &&
              memoJson.mint === user.certificate?.nftAddress
            ) {
              memoPayloadValid = true;
            }
          } catch {
            // Memo bukan JSON yang valid — skip
          }
        }
      }
    } else {
      // Legacy transaction format — try instructions array
      const legacyMessage = txInfo.transaction.message as unknown as {
        instructions?: Array<{
          programId: PublicKey;
          data: Buffer;
        }>;
      };

      if (legacyMessage.instructions) {
        for (const ix of legacyMessage.instructions) {
          if (ix.programId.toBase58() === MEMO_PROGRAM_ID) {
            memoFound = true;

            const memoText = ix.data.toString("utf-8");
            try {
              const memoJson = JSON.parse(memoText) as {
                type?: string;
                mint?: string;
              };
              if (
                memoJson.type === "SIJAGA_CLAIM" &&
                memoJson.mint === user.certificate?.nftAddress
              ) {
                memoPayloadValid = true;
              }
            } catch {
              // Not valid JSON
            }
          }
        }
      }
    }

    if (!memoFound) {
      return actionError("Transaksi tidak mengandung instruction Memo", 400);
    }

    if (!memoPayloadValid) {
      return actionError(
        "Payload memo tidak valid: harus berisi type SIJAGA_CLAIM dan mint yang sesuai",
        400
      );
    }
  } catch (error) {
    console.error("Callback Verify Error:", error);
    return actionError("Gagal memverifikasi transaksi", 500);
  }

  // ═══════════════════════════════════════════════════════════
  // Semua validasi lolos — update database
  // ═══════════════════════════════════════════════════════════

  await prisma.$transaction(async (tx) => {
    await tx.certificate.update({
      where: { userId: user.id },
      data: {
        status: "CLAIMED",
        claimedAt: new Date(),
        txSignature: user.certificate?.txSignature ?? signature,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "CERT_CLAIMED",
        detail: `Ijazah diklaim via Blinks. Tx: ${signature}`,
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      },
    });
  });

  return respondCompleted(origin);
}

function respondCompleted(origin: string) {
  const solanaCluster = process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet";
  return actionJson({
    type: "completed",
    icon: `${origin}/web-app-manifest-512x512.png`,
    title: "Ijazah Berhasil Diklaim! 🎓",
    description: `Selamat! Ijazah digital Anda tercatat di Solana (${solanaCluster}).`,
    label: "Klaim Berhasil",
  });
}
