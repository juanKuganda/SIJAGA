import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// CORS headers untuk Blinks
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET: Preview kartu Blinks (metadata aksi)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nim = searchParams.get("nim");

    if (!nim) {
      return NextResponse.json(
        { error: "NIM wajib diisi" },
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

    if (!user.certificate || user.certificate.status !== "MINTED") {
      return NextResponse.json(
        { error: "Ijazah belum diterbitkan" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Response format Blinks GET
    return NextResponse.json(
      {
        title: `Ijazah S1 - ${user.nama}`,
        icon: user.certificate.metadataUri
          ? `https://gateway.pinata.cloud/ipfs/${user.certificate.metadataUri.replace("ipfs://", "")}`
          : "https://via.placeholder.com/200",
        description: `Ijazah Sarjana ${user.prodi || "Informatika"}, Universitas Tadulako. Klik untuk mengklaim ijazah digital Anda.`,
        label: "Klaim Ijazah",
        links: {
          actions: [
            {
              label: "Klaim Ijazah",
              href: `/api/actions/claim?nim=${nim}`,
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
 * POST: Eksekusi klaim ijazah (mint NFT ke wallet mahasiswa)
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

    if (!user.certificate || user.certificate.status !== "MINTED") {
      return NextResponse.json(
        { error: "Ijazah belum siap untuk diklaim" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Update status certificate ke CLAIMED
    const certificate = await prisma.certificate.update({
      where: { userId: user.id },
      data: {
        status: "CLAIMED",
        claimedAt: new Date(),
      },
    });

    // Buat audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CERT_CLAIMED",
        detail: `Ijazah diklaim oleh ${user.nama} (${user.nim})`,
      },
    });

    // Response format Blinks POST
    // Note: Untuk production, perlu generate transaksi Solana yang sebenarnya
    return NextResponse.json(
      {
        transaction: "", // Base64 encoded Solana transaction
        message: `Ijazah berhasil diklaim! Transaction: ${certificate.txSignature}`,
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
