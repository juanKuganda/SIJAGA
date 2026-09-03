import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { updateMahasiswaSchema } from "@/lib/validation";

export async function GET(_request: NextRequest) {
  try {
    const payload = await getAuthUser();
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ambil semua mahasiswa dengan wallet dan certificate
    const mahasiswa = await prisma.user.findMany({
      where: { role: "MAHASISWA" },
      select: {
        id: true,
        nama: true,
        nim: true,
        email: true,
        prodi: true,
        angkatan: true,
        dataConsent: true,
        consentGivenAt: true,
        dataDeletedAt: true,
        createdAt: true,
        wallet: {
          select: {
            id: true,
            walletAddress: true,
            status: true,
          },
        },
        certificate: {
          select: {
            id: true,
            status: true,
            nftAddress: true,
            txSignature: true,
            issuedAt: true,
            revokedAt: true,
            revokeReason: true,
            dataHash: true,
          },
        },
      },
      orderBy: { nama: "asc" },
    });

    // Ambil tanggal backup terakhir untuk masing-masing mahasiswa
    const latestBackups = await prisma.certificateBackup.groupBy({
      by: ['userId'],
      _max: {
        createdAt: true,
      },
    });

    const backupMap = new Map(latestBackups.map(b => [b.userId, b._max.createdAt]));

    const mahasiswaWithBackup = mahasiswa.map(m => ({
      ...m,
      lastBackupAt: backupMap.get(m.id) || null,
    }));

    return NextResponse.json({ mahasiswa: mahasiswaWithBackup });
  } catch (error) {
    console.error("Mahasiswa list error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

/**
 * PUT — Update data mahasiswa oleh admin
 */
export async function PUT(request: NextRequest) {
  try {
    const payload = await getAuthUser();
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validasi input
    const result = updateMahasiswaSchema.safeParse(body);
    if (!result.success) {
      const errorMessage = result.error.issues[0]?.message || "Validasi gagal";
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    const { userId, nama, email, nim, prodi, angkatan } = result.data;

    // Cek apakah user ada
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "Mahasiswa tidak ditemukan" },
        { status: 404 }
      );
    }

    // Hanya boleh edit data mahasiswa, bukan admin lain
    if (existingUser.role !== "MAHASISWA") {
      return NextResponse.json(
        { error: "Hanya bisa mengedit data mahasiswa" },
        { status: 403 }
      );
    }

    // Cek duplikasi email jika diubah
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      });

      if (emailExists) {
        return NextResponse.json(
          { error: "Email sudah digunakan oleh user lain" },
          { status: 400 }
        );
      }
    }

    // Cek duplikasi NIM jika diubah
    if (nim && nim !== existingUser.nim) {
      const nimExists = await prisma.user.findUnique({
        where: { nim },
      });

      if (nimExists) {
        return NextResponse.json(
          { error: "NIM sudah terdaftar pada mahasiswa lain" },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, string> = {};
    if (nama) updateData.nama = nama;
    if (email) updateData.email = email;
    if (nim) updateData.nim = nim;
    if (prodi) updateData.prodi = prodi;
    if (angkatan) updateData.angkatan = angkatan;

    // Jika tidak ada data yang diubah, tolak
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "Tidak ada data yang diubah" },
        { status: 400 }
      );
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        nama: true,
        nim: true,
        email: true,
        prodi: true,
        angkatan: true,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: payload.userId,
        action: "MAHASISWA_EDIT",
        detail: `Data mahasiswa ${updatedUser.nama} (${updatedUser.nim}) diperbarui oleh admin. Fields: ${Object.keys(updateData).join(", ")}`,
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      },
    });

    return NextResponse.json({
      success: true,
      message: `Data ${updatedUser.nama} berhasil diperbarui`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Mahasiswa update error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
