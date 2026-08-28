import { NextRequest } from "next/server";
import { Connection, clusterApiUrl } from "@solana/web3.js";
import { actionJson, actionOptions, appUrl } from "@/lib/solana-actions";
import { prisma } from "@/lib/prisma";

export const OPTIONS = actionOptions;

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

  try {
    const txInfo = await connection.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    // Transaksi tidak ditemukan di blockchain
    if (!txInfo) {
      return actionError("Transaksi tidak ditemukan di blockchain", 404);
    }

    // Transaksi gagal di blockchain
    if (txInfo.meta?.err) {
      return actionError("Transaksi gagal di blockchain", 400);
    }
  } catch (error) {
    console.error("Callback Verify Error:", error);
    return actionError("Gagal memverifikasi transaksi", 500);
  }

  // Transaksi valid — sekarang update database
  const user = await prisma.user.findUnique({
    where: { nim },
    include: { certificate: true },
  });

  if (!user) return actionError("User tidak ditemukan", 404);
  if (user.certificate?.status === "CLAIMED") {
    // Sudah diklaim sebelumnya (idempotent — tidak error)
    return respondCompleted(user.nama, origin);
  }

  // Update status di database
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

  // Return: CompletedAction — state final di blink UI
  return respondCompleted(user.nama, origin);
}

function respondCompleted(nama: string, origin: string) {
  return actionJson({
    type: "completed",
    icon: `${origin}/web-app-manifest-512x512.png`,
    title: "Ijazah Berhasil Diklaim! 🎓",
    description: `Selamat ${nama}! Ijazah digital Anda tercatat di Solana (${process.env.SOLANA_CLUSTER ?? "devnet"}).`,
    label: "Klaim Berhasil",
  });
}
