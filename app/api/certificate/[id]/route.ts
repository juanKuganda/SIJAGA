import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

/**
 * GET — Ambil data ijazah berdasarkan certificateId (CUID) untuk preview
 * 
 * PRIVASI: Parameter route menggunakan certificateId (random CUID) 
 * bukan NIM, sehingga URL tidak mengekspos PII.
 * 
 * AUTENTIKASI: Hanya pemilik sertifikat atau admin yang boleh akses.
 * Jika user tidak terautentikasi, PII (nama, NIM) di-mask.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const certificate = await prisma.certificate.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            wallet: true,
          },
        },
      },
    });

    if (!certificate || !certificate.user) {
      return NextResponse.json(
        { error: "Sertifikat tidak ditemukan" },
        { status: 404 }
      );
    }

    if (certificate.status === "NOT_ISSUED") {
      return NextResponse.json(
        { error: "Ijazah belum diterbitkan" },
        { status: 400 }
      );
    }

    const user = certificate.user;

    // SECURITY: Cek autentikasi untuk PII
    const authUser = await getAuthUser();
    const isOwner = authUser?.userId === user.id;
    const isAdmin = authUser?.role === "ADMIN";
    const canSeePII = isOwner || isAdmin;

    // SECURITY: Hormati Right to be Forgotten (UU PDP)
    const piiDeleted = !!user.dataDeletedAt;

    // Tentukan apakah PII boleh ditampilkan
    const showPII = canSeePII && !piiDeleted;

    return NextResponse.json({
      certificate: {
        nama: showPII ? user.nama : (piiDeleted ? "[DATA DIHAPUS]" : "[TERSEMBUNYI]"),
        nim: showPII ? user.nim : (piiDeleted ? "[DIHAPUS]" : "[TERSEMBUNYI]"),
        prodi: user.prodi || "Informatika",
        angkatan: user.angkatan || "-",
        status: certificate.status,
        nftAddress: certificate.nftAddress,
        txSignature: certificate.txSignature,
        metadataUri: certificate.metadataUri,
        issuedAt: certificate.issuedAt,
        claimedAt: certificate.claimedAt,
        revokedAt: certificate.revokedAt,
        revokeReason: certificate.revokeReason,
        walletAddress: user.wallet?.walletAddress || null,
        dataHash: canSeePII ? certificate.dataHash : null,
        piiDeleted,
        viewerRole: authUser?.role || "PUBLIC",
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
