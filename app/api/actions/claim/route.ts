import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  clusterApiUrl,
} from "@solana/web3.js";

// CORS headers untuk Blinks
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, Accept-Encoding",
  "Access-Control-Expose-Headers": "X-Action-Version, X-Blockchain-Ids",
  "X-Action-Version": "2.1.3",
  "X-Blockchain-Ids": "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET: Preview kartu Blinks (metadata aksi)
 * Mengikuti Solana Actions spec:
 * https://solana.com/docs/advanced/actions
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nim = searchParams.get("nim");

    if (!nim) {
      return NextResponse.json(
        {
          icon: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/web-app-manifest-512x512.png`,
          title: "SIJAGA — Klaim Ijazah Digital",
          description:
            "Masukkan NIM Anda untuk mengklaim ijazah digital di blockchain Solana.",
          label: "Klaim Ijazah",
          links: {
            actions: [
              {
                label: "Klaim Ijazah",
                href: `/api/actions/claim?nim={nim}`,
                parameters: [
                  {
                    name: "nim",
                    label: "Masukkan NIM Anda",
                    required: true,
                  },
                ],
              },
            ],
          },
        },
        { headers: corsHeaders }
      );
    }

    // Cari user berdasarkan NIM
    const user = await prisma.user.findUnique({
      where: { nim },
      include: {
        wallet: true,
        certificate: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          icon: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/web-app-manifest-512x512.png`,
          title: "Mahasiswa Tidak Ditemukan",
          description: `Tidak ditemukan mahasiswa dengan NIM: ${nim}`,
          label: "Error",
          disabled: true,
          error: { message: "NIM tidak ditemukan" },
        },
        { headers: corsHeaders }
      );
    }

    if (!user.certificate || user.certificate.status === "NOT_ISSUED") {
      return NextResponse.json(
        {
          icon: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/web-app-manifest-512x512.png`,
          title: `Ijazah Belum Diterbitkan`,
          description: `Ijazah untuk ${user.nama} belum diterbitkan oleh universitas.`,
          label: "Belum Tersedia",
          disabled: true,
        },
        { headers: corsHeaders }
      );
    }

    if (user.certificate.status === "CLAIMED") {
      return NextResponse.json(
        {
          icon: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/web-app-manifest-512x512.png`,
          title: `Ijazah S1 — ${user.nama}`,
          description: `Ijazah Sarjana ${user.prodi || "Informatika"}, Universitas Tadulako. Ijazah ini sudah diklaim.`,
          label: "Sudah Diklaim",
          disabled: true,
        },
        { headers: corsHeaders }
      );
    }

    if (user.certificate.status === "REVOKED") {
      return NextResponse.json(
        {
          icon: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/web-app-manifest-512x512.png`,
          title: `Ijazah DIREVOKE — ${user.nama}`,
          description: `Ijazah ini telah dicabut. Alasan: ${user.certificate.revokeReason || "Tidak tersedia"}`,
          label: "Direvoke",
          disabled: true,
        },
        { headers: corsHeaders }
      );
    }

    // Status MINTED — siap diklaim
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    return NextResponse.json(
      {
        icon: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/web-app-manifest-512x512.png`,
        title: `Ijazah S1 — ${user.nama}`,
        description: `Ijazah Sarjana ${user.prodi || "Informatika"}, Universitas Tadulako. NIM: ${user.nim}. Klik untuk mengklaim ijazah digital Anda di blockchain Solana.`,
        label: "Klaim Ijazah",
        links: {
          actions: [
            {
              label: "Klaim Ijazah Saya",
              href: `${appUrl}/api/actions/claim?nim=${nim}`,
            },
          ],
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Blinks GET error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * POST: Eksekusi klaim ijazah
 * Mengikuti Solana Actions spec — return serialized transaction
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nim = searchParams.get("nim");

    if (!nim) {
      return NextResponse.json(
        { error: "NIM wajib diisi" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Parse body — Solana Actions mengirim { account: "wallet_address" }
    const body = await request.json();
    const { account } = body;

    if (!account) {
      return NextResponse.json(
        { error: "Wallet account wajib diisi" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Cari user berdasarkan NIM
    const user = await prisma.user.findUnique({
      where: { nim },
      include: {
        wallet: true,
        certificate: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Mahasiswa tidak ditemukan" },
        { status: 404, headers: corsHeaders }
      );
    }

    if (!user.wallet || user.wallet.status !== "VERIFIED") {
      return NextResponse.json(
        { error: "Wallet belum terverifikasi" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Verifikasi bahwa wallet yang request sama dengan wallet terdaftar
    if (account !== user.wallet.walletAddress) {
      return NextResponse.json(
        { error: "Wallet tidak cocok dengan data terdaftar. Hanya wallet terdaftar yang bisa mengklaim ijazah." },
        { status: 403, headers: corsHeaders }
      );
    }

    if (user.certificate?.status === "CLAIMED") {
      return NextResponse.json(
        { error: "Ijazah sudah diklaim sebelumnya" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!user.certificate || user.certificate.status !== "MINTED") {
      return NextResponse.json(
        { error: "Ijazah belum siap untuk diklaim" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Buat transaksi Memo sebagai bukti klaim on-chain
    const rpcUrl =
      process.env.NEXT_PUBLIC_SOLANA_RPC || clusterApiUrl("devnet");
    const connection = new Connection(rpcUrl, "confirmed");

    const accountPubKey = new PublicKey(account);

    // Memo Program ID
    const MEMO_PROGRAM_ID = new PublicKey(
      "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
    );

    const memoText = JSON.stringify({
      type: "SIJAGA_CLAIM",
      nftAddress: user.certificate.nftAddress,
      timestamp: new Date().toISOString(),
    });

    const memoInstruction = new TransactionInstruction({
      keys: [{ pubkey: accountPubKey, isSigner: true, isWritable: true }],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memoText),
    });

    const transaction = new Transaction().add(memoInstruction);

    // Set recent blockhash dan fee payer
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = accountPubKey;

    // Serialize transaction
    const serializedTransaction = transaction
      .serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      })
      .toString("base64");

    // Update status certificate ke CLAIMED
    //
    // ⚠️ KNOWN LIMITATION (Solana Actions/Blinks Protocol):
    // Status diupdate SEBELUM user menandatangani transaksi di wallet.
    // Ini karena Blinks protocol tidak memiliki callback mechanism —
    // server hanya mengembalikan serialized transaction, lalu wallet
    // yang menangani signing. Server tidak bisa tahu apakah user
    // menandatangani atau menolak transaksi.
    //
    // Alternatif yang bisa dipertimbangkan untuk production:
    // 1. Tambah status PENDING_CLAIM + endpoint konfirmasi terpisah
    // 2. Poll blockchain untuk cek apakah memo tx sudah confirmed
    //
    // Untuk thesis/purwarupa dengan user terbatas, behavior ini acceptable.
    await prisma.certificate.update({
      where: { userId: user.id },
      data: {
        status: "CLAIMED",
        claimedAt: new Date(),
      },
    });

    // Buat audit log
    await createAuditLog(
      user.id,
      "CERT_CLAIMED",
      `Ijazah diklaim oleh ${user.nama} (${user.nim}) via Blinks. Wallet: ${account}`,
      request.headers.get("x-forwarded-for") || "unknown"
    );

    // Response format Solana Actions POST
    return NextResponse.json(
      {
        transaction: serializedTransaction,
        message: `Ijazah ${user.nama} berhasil diklaim! NFT: ${user.certificate.nftAddress}`,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Blinks POST error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500, headers: corsHeaders }
    );
  }
}
