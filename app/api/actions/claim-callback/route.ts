import { NextRequest } from "next/server";
import { Connection, clusterApiUrl, PublicKey } from "@solana/web3.js";
import { actionJson, actionOptions, appUrl } from "@/lib/solana-actions";
import { prisma } from "@/lib/prisma";
import { getAdminWalletAddress } from "@/lib/metaplex";

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

  if (!nim) return actionError("NIM tidak ditemukan di tautan. Buka kembali tautan klaim dari sumber resmi.");

  // Blink client mengirim: { signature }
  const body = await request.json();
  const { signature } = body;

  if (!signature) return actionError("Tanda tangan transaksi tidak ditemukan. Ulangi proses klaim dari awal.");

  // Fee payer check: log if not admin
  const adminAddress = getAdminWalletAddress();

  // VERIFIKASI: cek transaksi benar-benar ada di blockchain
  const rpcUrl = process.env.SOLANA_RPC_URL || clusterApiUrl("devnet");
  const connection = new Connection(rpcUrl, "confirmed");

  // Ambil data user dahulu untuk validasi
  const user = await prisma.user.findUnique({
    where: { nim },
    include: { certificate: true, wallet: true },
  });

  if (!user) return actionError("Data mahasiswa tidak ditemukan. Periksa kembali NIM Anda, atau hubungi admin kampus.", 404);
  if (!user.certificate?.nftAddress) return actionError("Ijazah belum diterbitkan. Hubungi admin kampus untuk menanyakan status penerbitan.", 400);

  // Idempoten: jika sudah CLAIMED, langsung return sukses
  if (user.certificate?.status === "CLAIMED") {
    return respondCompleted(origin);
  }

  // Status guard
  if (user.certificate?.status === "REVOKED") return actionError("Ijazah ini telah dicabut oleh institusi dan tidak dapat diklaim.", 400);
  if (user.certificate?.status === "ISSUING") return actionError("Ijazah masih dalam proses penerbitan. Tunggu hingga selesai, lalu ulangi klaim.", 400);

  try {
    const txInfo = await connection.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    // 1. Transaksi tidak ditemukan di blockchain
    if (!txInfo) {
      return actionError("Transaksi tidak ditemukan di blockchain. Tunggu beberapa detik lalu ulangi proses klaim.", 404);
    }

    // 2. Transaksi gagal di blockchain (meta.err harus null)
    if (txInfo.meta?.err) {
      return actionError("Transaksi gagal di blockchain. Ulangi proses klaim dari awal.", 400);
    }

    // 3. Validasi signer:
    // Sesuai DG-1 Opsi A, fee payer (kunci akun 0) adalah admin (institusi sponsor).
    // Mahasiswa menandatangani transaksi sebagai signer kedua (yang mengotorisasi Memo).
    const accountKeys = txInfo.transaction.message.getAccountKeys();
    const feePayer = accountKeys.get(0)?.toBase58();
    if (feePayer !== adminAddress) {
      console.warn("[ClaimCallback] Fee payer is different from configured admin address:", feePayer);
    }

    const numRequiredSignatures = txInfo.transaction.message.header.numRequiredSignatures;
    const allSigners: string[] = [];

    for (let i = 0; i < numRequiredSignatures && i < accountKeys.length; i++) {
      const pubkey = accountKeys.get(i)?.toBase58();
      if (pubkey) allSigners.push(pubkey);
    }

    if (user.wallet?.walletAddress) {
      const studentWallet = user.wallet.walletAddress;
      const studentIsSigner = allSigners.includes(studentWallet);

      if (!studentIsSigner) {
        return actionError(
          "Transaksi ini tidak ditandatangani oleh wallet mahasiswa yang terdaftar. Pastikan memakai dompet yang terdaftar di SIJAGA.",
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
      return actionError("Transaksi tidak berisi bukti klaim yang valid. Ulangi proses klaim dari awal.", 400);
    }

    if (!memoPayloadValid) {
      return actionError(
        "Bukti klaim dalam transaksi tidak valid. Ulangi proses klaim dari awal.",
        400
      );
    }
  } catch (error) {
    console.error("Callback Verify Error:", error);
    return actionError("Gagal memverifikasi transaksi di blockchain. Periksa koneksi lalu ulangi proses klaim.", 500);
  }

  // ═══════════════════════════════════════════════════════════
  // Semua validasi lolos — update database
  // ═══════════════════════════════════════════════════════════

  await prisma.$transaction(async (tx) => {
    await tx.certificate.update({
      where: { id: user.certificate!.id },
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
