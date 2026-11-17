import { NextRequest } from "next/server";
import { actionJson, actionOptions, appUrl } from "@/lib/solana-actions";
import { prisma } from "@/lib/prisma";
import { getAdminKeypair } from "@/lib/metaplex";
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
    return actionError("NIM tidak ditemukan di tautan. Buka kembali tautan klaim dari sumber resmi.");
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
      error: { message: "NIM tidak ditemukan dalam sistem. Periksa kembali NIM Anda, atau hubungi admin kampus." },
    });
  }

  const piiDeleted = !!user.dataDeletedAt;
  const maskString = (str: string) => str ? `${str.charAt(0)}***${str.charAt(str.length - 1)}` : "";
  const displayName = piiDeleted ? "[DATA DIHAPUS]" : maskString(user.nama);

  // Kasus: Ijazah sudah diklaim
  if (user.certificate?.status === "CLAIMED") {
    return actionJson({
      type: "completed",
      icon: `${origin}/web-app-manifest-512x512.png`,
      title: `Ijazah Sudah Diklaim — ${displayName}`,
      description: `Ijazah atas nama ${displayName} sudah berhasil diklaim sebelumnya.`,
      label: "Sudah Diklaim",
    });
  }

  // Kasus: Ijazah dicabut (revoked)
  if (user.certificate?.status === "REVOKED") {
    return actionJson({
      type: "action",
      icon: `${origin}/web-app-manifest-512x512.png`,
      title: "Ijazah Telah Dicabut",
      description: `Ijazah atas nama ${displayName} telah dicabut oleh institusi.`,
      label: "Tidak Dapat Diklaim",
      disabled: true,
      error: {
        message: `Alasan pencabutan: ${user.certificate.revokeReason ?? "Tidak disebutkan"}`,
      },
    });
  }

  // Kasus: Belum diterbitkan atau sedang proses
  if (!user.certificate?.nftAddress || user.certificate?.status === "NOT_ISSUED" || user.certificate?.status === "ISSUING") {
    return actionJson({
      type: "action",
      icon: `${origin}/web-app-manifest-512x512.png`,
      title: user.certificate?.status === "ISSUING" ? "Ijazah Sedang Diproses" : "Ijazah Belum Diterbitkan",
      description: user.certificate?.status === "ISSUING"
        ? `Ijazah untuk NIM ${nim} sedang dalam proses penerbitan di blockchain.`
        : `Ijazah untuk NIM ${nim} belum diterbitkan oleh admin.`,
      label: "Belum Tersedia",
      disabled: true,
      error: { message: "Ijazah Anda belum diterbitkan. Hubungi admin kampus untuk menanyakan status penerbitan." },
    });
  }

  // KASUS NORMAL: Ijazah sudah di-mint, siap diklaim
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

  if (!nim) return actionError("NIM tidak ditemukan di tautan. Buka kembali tautan klaim dari sumber resmi.");

  // Parse body: { account } dikirim oleh blink client
  const body = await request.json();
  const userWallet = body.account;

  if (!userWallet) return actionError("Alamat wallet tidak ditemukan. Pastikan dompet Solana Anda terhubung.");

  // Validasi wallet format
  let walletPublicKey: PublicKey;
  try {
    walletPublicKey = new PublicKey(userWallet);
  } catch {
    return actionError("Format alamat wallet tidak valid. Periksa kembali alamat dompet Anda.");
  }

  // Ambil data mahasiswa
  const user = await prisma.user.findUnique({
    where: { nim },
    include: { certificate: true, wallet: true },
  });

  if (!user) return actionError("NIM tidak ditemukan dalam sistem. Periksa kembali NIM Anda, atau hubungi admin kampus.", 404);
  if (!user.certificate?.nftAddress) return actionError("Ijazah belum diterbitkan. Hubungi admin kampus untuk menanyakan status penerbitan.", 400);
  
  // NOTE: If already claimed, action shouldn't be executed again, but if it is, return disabled.
  if (user.certificate?.status === "CLAIMED") return actionError("Ijazah ini sudah diklaim sebelumnya.", 400);
  if (user.certificate?.status === "REVOKED") return actionError("Ijazah ini telah dicabut oleh institusi dan tidak dapat diklaim.", 400);

  // Validasi: wallet yang klaim harus cocok dengan wallet terdaftar
  if (user.wallet?.walletAddress !== userWallet) {
    return actionError(
      "Wallet address tidak cocok dengan yang terdaftar di sistem. " +
      "Pastikan Anda menggunakan wallet yang didaftarkan ke SIJAGA.",
      403
    );
  }

  // Buat transaksi Memo sebagai bukti klaim
  // SPONSORSHIP (DG-1 Opsi A): Institusi (admin) menjadi feePayer sehingga mahasiswa tidak perlu saldo SOL
  const adminKeypair = getAdminKeypair();
  const rpcUrl = process.env.SOLANA_RPC_URL || clusterApiUrl("devnet");
  const connection = new Connection(rpcUrl, "confirmed");
  const { blockhash } = await connection.getLatestBlockhash("finalized");

  const transaction = new Transaction({
    feePayer: adminKeypair.publicKey,
    recentBlockhash: blockhash,
  });

  // Tambah Memo instruction sebagai bukti on-chain yang diotorisasi wallet mahasiswa
  // PRIVACY: Jangan taruh dataHash di plaintext memo
  const memoMessage = JSON.stringify({
    type: "SIJAGA_CLAIM",
    certId: user.certificate.id,
    mint: user.certificate.nftAddress,
  });
  
  transaction.add(
    createMemoInstruction(memoMessage, [walletPublicKey])
  );

  // Admin melakukan partial sign sebagai sponsor feePayer
  transaction.partialSign(adminKeypair);

  // Serialize transaksi ke base64 (akan ditandatangani wallet mahasiswa berikutnya)
  const serializedTransaction = transaction
    .serialize({ requireAllSignatures: false })
    .toString("base64");

  // ACTION CHAINING: setup callback URL
  const callbackUrl = `${origin}/api/actions/claim-callback?nim=${encodeURIComponent(nim)}`;

  const piiDeleted = !!user.dataDeletedAt;
  const maskString = (str: string) => str ? `${str.charAt(0)}***${str.charAt(str.length - 1)}` : "";
  return actionJson({
    transaction: serializedTransaction,
    message: `Klaim ijazah atas nama ${piiDeleted ? "[DATA DIHAPUS]" : maskString(user.nama)} dari Universitas Tadulako`,
    links: {
      next: {
        type: "post",
        href: callbackUrl,
      },
    },
  });
}
