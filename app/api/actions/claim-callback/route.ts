import { NextRequest } from "next/server";
import { Connection, clusterApiUrl } from "@solana/web3.js";
import { ACTIONS_CORS_HEADERS, optionsResponse, actionError } from "@/lib/actions-cors";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const nim = searchParams.get("nim");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

  if (!nim) return actionError("NIM tidak ditemukan");

  // Blink client mengirim: { signature, account }
  const body = await request.json();
  const { signature, account } = body;

  if (!signature) return actionError("Transaction signature tidak ditemukan");

  // VERIFIKASI: cek transaksi benar-benar ada di blockchain
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC || clusterApiUrl("devnet");
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
    return respondCompleted(user.nama, appUrl);
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
    
    // We can use createAuditLog since it just inserts to DB or we can insert directly via tx
    // If createAuditLog doesn't use the prisma tx context, we can just use tx.auditLog.create
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
  return respondCompleted(user.nama, appUrl);
}

function respondCompleted(nama: string, appUrl: string) {
  return Response.json(
    {
      type: "completed",
      icon: `${appUrl}/web-app-manifest-512x512.png`,
      title: "Ijazah Berhasil Diklaim! 🎓",
      description: `Selamat ${nama}! Ijazah digital Anda telah berhasil diklaim dan tersimpan di wallet Anda. Ijazah ini tercatat permanen di blockchain Solana.`,
      label: "Klaim Berhasil",
    },
    { headers: ACTIONS_CORS_HEADERS }
  );
}
