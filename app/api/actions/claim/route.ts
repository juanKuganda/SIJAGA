import { NextRequest } from "next/server";
import { actionJson, actionOptions, appUrl } from "@/lib/solana-actions";
import { prisma } from "@/lib/prisma";
import {
  Connection,
  PublicKey,
  Transaction,
  clusterApiUrl,
} from "@solana/web3.js";
import { createMemoInstruction } from "@solana/spl-memo";

export const OPTIONS = actionOptions;

function actionError(message: string, status = 400) {
  return actionJson({ message }, status);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const nim = searchParams.get("nim");

  const origin = appUrl(request);

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
    return actionJson({
      type: "action",
      icon: `${origin}/web-app-manifest-512x512.png`,
      title: "Ijazah Tidak Ditemukan",
      description: `NIM ${nim} tidak terdaftar dalam sistem SIJAGA.`,
      label: "Tidak Tersedia",
      disabled: true,
      error: { message: "NIM tidak ditemukan dalam sistem." },
    });
  }

  // Kasus: Ijazah sudah diklaim
  if (user.certificate?.status === "CLAIMED") {
    return actionJson({
      type: "completed",
      icon: `${origin}/web-app-manifest-512x512.png`,
      title: `Ijazah Sudah Diklaim — ${user.nama}`,
      description: `Ijazah atas nama ${user.nama} sudah berhasil diklaim sebelumnya.`,
      label: "Sudah Diklaim",
    });
  }

  // Kasus: Ijazah dicabut (revoked)
  if (user.certificate?.status === "REVOKED") {
    return actionJson({
      type: "action",
      icon: `${origin}/web-app-manifest-512x512.png`,
      title: "Ijazah Telah Dicabut",
      description: `Ijazah atas nama ${user.nama} telah dicabut oleh institusi.`,
      label: "Tidak Dapat Diklaim",
      disabled: true,
      error: {
        message: `Alasan pencabutan: ${user.certificate.revokeReason ?? "Tidak disebutkan"}`,
      },
    });
  }

  // Kasus: Belum diterbitkan
  if (!user.certificate?.nftAddress || user.certificate?.status === "NOT_ISSUED") {
    return actionJson({
      type: "action",
      icon: `${origin}/web-app-manifest-512x512.png`,
      title: "Ijazah Belum Diterbitkan",
      description: `Ijazah untuk NIM ${nim} belum diterbitkan oleh admin.`,
      label: "Belum Tersedia",
      disabled: true,
      error: { message: "Hubungi admin kampus untuk informasi lebih lanjut." },
    });
  }

  // KASUS NORMAL: Ijazah sudah di-mint, siap diklaim
  const piiDeleted = !!user.dataDeletedAt;
  const displayName = piiDeleted ? "[DATA DIHAPUS]" : user.nama;
  const displayProdi = user.prodi ?? "-";

  return actionJson({
    type: "action",
    icon: `${origin}/web-app-manifest-512x512.png`,
    title: `Klaim Ijazah S1 — ${displayName}`,
    description: `Program Studi ${displayProdi} · Universitas Tadulako · ${user.certificate.issuedAt ? new Date(user.certificate.issuedAt).getFullYear() : "-"}`,
    label: "Klaim Ijazah",
    links: {
      actions: [
        {
          type: "transaction",
          label: "Klaim Ijazah Digital",
          href: `${origin}/api/actions/claim?nim=${nim}`,
        },
      ],
    },
  });
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const nim = searchParams.get("nim");
  const origin = appUrl(request);

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
  
  // NOTE: If already claimed, action shouldn't be executed again, but if it is, return disabled.
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
  const rpcUrl = process.env.SOLANA_RPC_URL || clusterApiUrl("devnet");
  const connection = new Connection(rpcUrl, "confirmed");
  const { blockhash } = await connection.getLatestBlockhash();

  const transaction = new Transaction({
    feePayer: walletPublicKey,
    recentBlockhash: blockhash,
  });

  // Tambah Memo instruction sebagai bukti on-chain
  const memoMessage = JSON.stringify({
    type: "SIJAGA_CLAIM",
    nftAddress: user.certificate.nftAddress,
    dataHash: user.certificate.dataHash,
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
  const callbackUrl = `${origin}/api/actions/claim-callback?nim=${encodeURIComponent(nim)}`;

  return actionJson({
    transaction: serializedTransaction,
    message: `Klaim ijazah atas nama ${user.nama} dari Universitas Tadulako`,
    links: {
      next: {
        type: "post",
        href: callbackUrl,
      },
    },
  });
}
