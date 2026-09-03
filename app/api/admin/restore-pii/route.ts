import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

/**
 * POST — Restore PII (Personally Identifiable Information) dari database backup.
 * Hanya admin yang bisa menjalankan endpoint ini.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await getAuthUser();
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized - hanya admin" }, { status: 401 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID wajib diisi" }, { status: 400 });
    }

    // Cek apakah user ada dan dalam status terhapus
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    if (!user.dataDeletedAt) {
      return NextResponse.json({
        error: "Data pengguna ini tidak dalam status anonim",
      }, { status: 400 });
    }

    // Cari backup terbaru untuk user ini
    const backup = await prisma.certificateBackup.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    if (!backup) {
      return NextResponse.json({ error: "Tidak ada data backup yang ditemukan untuk user ini" }, { status: 404 });
    }

    const backupData = JSON.parse(backup.backupData);
    const originalUser = backupData.user;

    if (!originalUser || !originalUser.nama || !originalUser.nim) {
      return NextResponse.json({ error: "Data backup tidak memiliki informasi nama/NIM yang valid" }, { status: 400 });
    }

    const ipAddress = request.headers.get("x-forwarded-for") || "unknown";

    // Eksekusi pemulihan PII dalam satu transaksi
    await prisma.$transaction([
      // 1. Pulihkan PII ke tabel User
      prisma.user.update({
        where: { id: userId },
        data: {
          nama: originalUser.nama,
          nim: originalUser.nim,
          email: originalUser.email || user.email,
          dataDeletedAt: null,
          dataDeleteNote: null,
          // Kita mengembalikan status consent, bisa jadi null atau false
          // Tergantung kebijakan, kita set ulang consent agar mahasiswa harus klik ulang
          dataConsent: false,
          consentGivenAt: null,
          consentIpAddress: null,
        },
      }),

      // 1.5. Pulihkan dataSalt ke tabel Certificate agar verifikasi hash kembali berfungsi
      ...(backupData.certificate && backupData.certificate.dataSalt
        ? [
            prisma.certificate.update({
              where: { userId },
              data: { dataSalt: backupData.certificate.dataSalt },
            }),
          ]
        : []),

      // 2. Audit log
      prisma.auditLog.create({
        data: {
          userId,
          action: "PII_RESTORED",
          detail: `PII dipulihkan oleh admin ${payload.userId} menggunakan backup ${backup.id}.`,
          ipAddress,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Data pribadi berhasil dipulihkan dari backup",
    });
  } catch (error) {
    console.error("Restore PII error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server saat memulihkan data" },
      { status: 500 }
    );
  }
}
