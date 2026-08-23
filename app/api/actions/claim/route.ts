import { NextRequest, NextResponse } from "next/server";
import { ACTIONS_CORS_HEADERS, optionsResponse, actionError } from "@/lib/actions-cors";
import { prisma } from "@/lib/prisma";
import {
  Connection,
  PublicKey,
  Transaction,
  clusterApiUrl,
} from "@solana/web3.js";
import { createMemoInstruction } from "@solana/spl-memo";

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const nim = searchParams.get("nim");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const iconUrl = `${appUrl}/assets/sijaga-logo.png`; // Fallback to manifest if not exist

  if (!nim) {
    return actionError("Parameter NIM tidak ditemukan");
  }

  // Cari data mahasiswa berdasarkan NIM
  const user = await prisma.user.findUnique({
    where: { nim },
    include: {
      certificate: true,
      wallet: true,
    },
  });

  // Kasus: NIM tidak ditemukan
  if (!user) {
    return Response.json(
      {
        type: "action",
        icon: `${appUrl}/web-app-manifest-512x512.png`,
        title: "Ijazah Tidak Ditemukan",
        description: `NIM ${nim} tidak terdaftar dalam sistem SIJAGA.`,
        label: "Tidak Tersedia",
        disabled: true,
        error: { message: "NIM tidak ditemukan dalam sistem." },
      },
      { headers: ACTIONS_CORS_HEADERS }
    );
  }

  // Kasus: Ijazah sudah diklaim
  if (user.certificate?.status === "CLAIMED") {
    return Response.json(
      {
        type: "completed",
        icon: `${appUrl}/web-app-manifest-512x512.png`,
        title: "Ijazah Sudah Diklaim",
        description: `Ijazah atas nama ${user.nama} sudah berhasil diklaim sebelumnya.`,
        label: "Sudah Diklaim",
      },
      { headers: ACTIONS_CORS_HEADERS } // fixed typo
    );
  }

  // Kasus: Ijazah dicabut (revoked)
  if (user.certificate?.status === "REVOKED") {
    return Response.json(
      {
        type: "action",
        icon: `${appUrl}/web-app-manifest-512x512.png`,
        title: "Ijazah Telah Dicabut",
        description: `Ijazah atas nama ${user.nama} telah dicabut oleh institusi.`,
        label: "Tidak Dapat Diklaim",
        disabled: true,
        error: {
          message: `Alasan pencabutan: ${user.certificate.revokeReason ?? "Tidak disebutkan"}`,
        },
      },
      { headers: ACTIONS_CORS_HEADERS }
    );
  }

  // Kasus: Belum diterbitkan
  if (!user.certificate?.nftAddress || user.certificate?.status === "NOT_ISSUED") {
    return Response.json(
      {
        type: "action",
        icon: `${appUrl}/web-app-manifest-512x512.png`,
        title: "Ijazah Belum Diterbitkan",
        description: `Ijazah untuk NIM ${nim} belum diterbitkan oleh admin.`,
        label: "Belum Tersedia",
        disabled: true,
        error: { message: "Hubungi admin kampus untuk informasi lebih lanjut." },
      },
      { headers: ACTIONS_CORS_HEADERS }
    );
  }

  // KASUS NORMAL: Ijazah sudah di-mint, siap diklaim
  return Response.json(
    {
      type: "action",
      icon: `${appUrl}/web-app-manifest-512x512.png`,
      title: `Klaim Ijazah S1 — ${user.nama}`,
      description: `Program Studi ${user.prodi ?? "-"} · Universitas Tadulako · ${user.certificate.issuedAt ? new Date(user.certificate.issuedAt).getFullYear() : "-"}`,
      label: "Klaim Ijazah",
      links: {
        actions: [
          {
            type: "transaction",
            label: "Klaim Ijazah Digital",
            href: `/api/actions/claim?nim=${nim}`,
          },
        ],
      },
    },
    { headers: ACTIONS_CORS_HEADERS }
  );
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const nim = searchParams.get("nim");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

  if (!nim) return actionError("Parameter NIM tidak ditemukan");

  // Parse body: { account } dikirim oleh blink client
  const body = await request.json();
  const userWallet = body.account;

  if (!userWallet) return actionError("Wallet address tidak ditemukan");

  // Validasi wallet format
  let walletPublicKey: PublicKey;
  try {
    walletPublicKey = new PublicKey(userWallet);
  } catch {
    return actionError("Format wallet address tidak valid");
  }

  // Ambil data mahasiswa
  const user = await prisma.user.findUnique({
    where: { nim },
    include: { certificate: true, wallet: true },
  });

  if (!user) return actionError("NIM tidak ditemukan", 404);
  if (!user.certificate?.nftAddress) return actionError("NFT belum diterbitkan", 400);
  if (user.certificate?.status === "CLAIMED") return actionError("Ijazah sudah diklaim", 400);
  if (user.certificate?.status === "REVOKED") return actionError("Ijazah telah dicabut", 400);

  // Validasi: wallet yang klaim harus cocok dengan wallet terdaftar
  if (user.wallet?.walletAddress !== userWallet) {
    return actionError(
      "Wallet address tidak cocok dengan yang terdaftar di sistem. " +
      "Pastikan Anda menggunakan wallet yang didaftarkan ke SIJAGA.",
      403
    );
  }

  // Buat transaksi Memo sebagai bukti klaim
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC || clusterApiUrl("devnet");
  const connection = new Connection(rpcUrl, "confirmed");
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

  const transaction = new Transaction({
    feePayer: walletPublicKey,
    recentBlockhash: blockhash,
  });

  // Tambah Memo instruction sebagai bukti on-chain
  const memoMessage = JSON.stringify({
    type: "SIJAGA_CLAIM",
    nftAddress: user.certificate.nftAddress,
    nim: user.nim,
    timestamp: new Date().toISOString(),
  });
  
  transaction.add(
    createMemoInstruction(memoMessage, [walletPublicKey])
  );

  // Serialize transaksi ke base64 (belum signed)
  const serializedTransaction = transaction
    .serialize({ requireAllSignatures: false })
    .toString("base64");

  // ACTION CHAINING: setup callback URL
  const callbackUrl = `${appUrl}/api/actions/claim-callback?nim=${nim}`;

  return Response.json(
    {
      transaction: serializedTransaction,
      message: `Klaim ijazah atas nama ${user.nama} dari Universitas Tadulako`,
      links: {
        next: {
          type: "post",
          href: callbackUrl,
        },
      },
    },
    { headers: ACTIONS_CORS_HEADERS }
  );
}
