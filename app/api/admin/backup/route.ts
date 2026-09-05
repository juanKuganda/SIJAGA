import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { backupSchema } from "@/lib/validation";

/**
 * GET — Download backup semua data sertifikat
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await getAuthUser();
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ambil semua data sertifikat beserta user dan wallet
    const certificates = await prisma.certificate.findMany({
      include: {
        user: {
          select: {
            nama: true,
            nim: true,
            email: true,
            prodi: true,
            angkatan: true,
          },
        },
      },
    });

    // Ambil semua wallet data
    const wallets = await prisma.wallet.findMany({
      select: {
        userId: true,
        walletAddress: true,
        status: true,
      },
    });

    // Ambil riwayat backup
    const backups = await prisma.certificateBackup.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const backupData = {
      exportedAt: new Date().toISOString(),
      exportedBy: payload.userId,
      totalCertificates: certificates.length,
      // SECURITY: dataSalt tidak dikirim ke klien
      certificates: certificates.map((cert) => {
        const { dataSalt: _salt, ...certWithoutSalt } = cert;
        return {
          ...certWithoutSalt,
          walletAddress: wallets.find((w) => w.userId === cert.userId)?.walletAddress || null,
        };
      }),
      backupHistory: backups,
    };

    return NextResponse.json(backupData);
  } catch (error) {
    console.error("Backup error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

/**
 * POST — Backup sertifikat individual
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await getAuthUser();
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validasi input dengan Zod
    const result = backupSchema.safeParse(body);
    if (!result.success) {
      const errorMessage = result.error.issues[0]?.message || "Validasi gagal";
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    const { userId, reason } = result.data;

    // Ambil data user lengkap
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallet: true,
        certificate: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User tidak ditemukan" },
        { status: 404 }
      );
    }

    // Validasi dihapus agar bisa backup semua mahasiswa

    // Buat backup dengan menyaring field opsional yang bernilai null
    const backupInput: {
      userId: string;
      backupData: string;
      reason: string;
      createdBy: string;
      certificateId?: string;
      nftAddress?: string;
      metadataUri?: string;
      txSignature?: string;
    } = {
      userId: userId,
      backupData: JSON.stringify({
        certificate: user.certificate,
        user: {
          nama: user.nama,
          nim: user.nim,
          email: user.email,
          prodi: user.prodi,
          angkatan: user.angkatan,
        },
        wallet: user.wallet,
      }),
      reason: reason || "Manual backup",
      createdBy: payload.userId,
    };

    if (user.certificate?.id) backupInput.certificateId = user.certificate.id;
    if (user.certificate?.nftAddress) backupInput.nftAddress = user.certificate.nftAddress;
    if (user.certificate?.metadataUri) backupInput.metadataUri = user.certificate.metadataUri;
    if (user.certificate?.txSignature) backupInput.txSignature = user.certificate.txSignature;

    const backup = await prisma.certificateBackup.create({
      data: backupInput,
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: payload.userId,
        action: "CERT_BACKUP",
        detail: `Backup sertifikat ${user.nama} (${user.nim})`,
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      },
    });

    return NextResponse.json({
      success: true,
      backup: {
        id: backup.id,
        createdAt: backup.createdAt,
      },
    });
  } catch (error) {
    console.error("Backup error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
