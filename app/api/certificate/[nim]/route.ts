import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET — Ambil data ijazah berdasarkan NIM untuk preview
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ nim: string }> }
) {
  try {
    const { nim } = await params;

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
        { status: 404 }
      );
    }

    if (!user.certificate || user.certificate.status === "NOT_ISSUED") {
      return NextResponse.json(
        { error: "Ijazah belum diterbitkan" },
        { status: 400 }
      );
    }

    // SECURITY: Hormati Right to be Forgotten (UU PDP)
    // Jika PII sudah dihapus, masking data sensitif
    const piiDeleted = !!user.dataDeletedAt;

    return NextResponse.json({
      certificate: {
        nama: piiDeleted ? "[DATA DIHAPUS]" : user.nama,
        nim: piiDeleted ? "[DIHAPUS]" : user.nim,
        prodi: user.prodi || "Informatika",
        angkatan: user.angkatan || "-",
        status: user.certificate.status,
        nftAddress: user.certificate.nftAddress,
        txSignature: user.certificate.txSignature,
        metadataUri: user.certificate.metadataUri,
        issuedAt: user.certificate.issuedAt,
        claimedAt: user.certificate.claimedAt,
        revokedAt: user.certificate.revokedAt,
        revokeReason: user.certificate.revokeReason,
        walletAddress: user.wallet?.walletAddress || null,
        piiDeleted,
      },
    });
  } catch (error) {
    console.error("Certificate preview error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
