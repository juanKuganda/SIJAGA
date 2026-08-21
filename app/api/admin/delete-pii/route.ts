import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

/**
 * POST — Hapus PII (Personally Identifiable Information) dari database.
 * Implementasi "Hak untuk Dilupakan" sesuai UU PDP No. 27 Tahun 2022.
 *
 * Yang dihapus: nama, NIM, email (diganti placeholder).
 * Yang dihapus: dataSalt di Certificate (agar hash tidak bisa diverifikasi).
 * Yang tetap: data non-PII di blockchain/IPFS (prodi, tahun lulus, dataHash).
 *
 * Hanya admin yang bisa menjalankan endpoint ini.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await getAuthUser();
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized - hanya admin" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, reason } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID wajib diisi" }, { status: 400 });
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: "Alasan penghapusan wajib diisi" }, { status: 400 });
    }

    // Cek apakah user ada
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { certificate: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    if (user.role !== "MAHASISWA") {
      return NextResponse.json({ error: "Hanya bisa menghapus PII mahasiswa" }, { status: 403 });
    }

    // Cek apakah sudah dihapus sebelumnya
    if (user.dataDeletedAt) {
      return NextResponse.json({
        error: "PII sudah dihapus sebelumnya",
        deletedAt: user.dataDeletedAt,
      }, { status: 400 });
    }

    const ipAddress = request.headers.get("x-forwarded-for") || "unknown";

    // Eksekusi penghapusan PII dalam satu transaksi
    await prisma.$transaction([
      // 1. Hapus PII dari User
      prisma.user.update({
        where: { id: userId },
        data: {
          nama: "[DATA DIHAPUS]",
          nim: `DEL-${Date.now()}`, // NIM unik agar tidak melanggar constraint @unique
          email: `deleted-${Date.now()}@sijaga.removed`,
          dataDeletedAt: new Date(),
          dataDeleteNote: reason,
          dataConsent: false,
          consentGivenAt: null,
          consentIpAddress: null,
        },
      }),
      // 2. Hapus dataSalt dari Certificate (hash di IPFS tetap ada tapi tidak berguna tanpa salt)
      ...(user.certificate
        ? [
            prisma.certificate.update({
              where: { userId },
              data: { dataSalt: null },
            }),
          ]
        : []),
      // 3. Audit log
      prisma.auditLog.create({
        data: {
          userId,
          action: "PII_DELETED",
          detail: `PII dihapus oleh admin ${payload.userId}. Alasan: ${reason}`,
          ipAddress,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Data pribadi berhasil dihapus sesuai UU PDP",
    });
  } catch (error) {
    console.error("Delete PII error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
