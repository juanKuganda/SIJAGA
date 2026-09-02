import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

/**
 * GET — Ambil status consent mahasiswa saat ini
 */
export async function GET(_request: NextRequest) {
  try {
    const payload = await getAuthUser();
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        dataConsent: true,
        consentGivenAt: true,
        consentVersion: true,
        certificate: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({
      dataConsent: user.dataConsent,
      consentGivenAt: user.consentGivenAt,
      consentVersion: user.consentVersion,
      certificateStatus: user.certificate?.status || "NOT_ISSUED",
    });
  } catch (error) {
    console.error("Consent GET error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

/**
 * POST — Mahasiswa memberikan consent (persetujuan publikasi data)
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await getAuthUser();
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ipAddress = request.headers.get("x-forwarded-for") || "unknown";

    await prisma.user.update({
      where: { id: payload.userId },
      data: {
        dataConsent: true,
        consentGivenAt: new Date(),
        consentIpAddress: ipAddress,
        consentVersion: "v1.0",
      },
    });

    // Catat di audit log
    await prisma.auditLog.create({
      data: {
        userId: payload.userId,
        action: "DATA_CONSENT_GIVEN",
        detail: `Consent v1.0 diberikan dari IP: ${ipAddress}`,
        ipAddress,
      },
    });

    return NextResponse.json({ success: true, message: "Persetujuan berhasil diberikan" });
  } catch (error) {
    console.error("Consent POST error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

/**
 * DELETE — Mahasiswa menarik kembali consent (hanya jika ijazah belum di-mint)
 */
export async function DELETE(request: NextRequest) {
  try {
    const payload = await getAuthUser();
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Cek apakah user dan ijazah sudah di-mint
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { certificate: true, wallet: true }
    });
    const cert = user?.certificate;

    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    const updateData: import("@prisma/client").Prisma.UserUpdateInput = {
      dataConsent: false,
      consentGivenAt: null,
      consentIpAddress: null,
      consentVersion: null,
    };

    if (cert && cert.status !== "NOT_ISSUED") {
      // Jika NFT sudah terbit, hapus/anonimkan PII dari DB Lokal.
      // Metadata di blockchain tetap utuh karena sudah anonim (hanya DataHash).
      updateData.nama = "[DATA ANONIM]";
      updateData.nim = `ANON-${Date.now()}`;
      updateData.email = `deleted_${Date.now()}@sijaga.local`;
      updateData.dataDeletedAt = new Date();
      updateData.dataDeleteNote = "Dihapus oleh mahasiswa (Withdraw Consent)";

      await prisma.$transaction([
        prisma.certificateBackup.create({
          data: {
            certificateId: cert.id,
            userId: user.id,
            backupData: JSON.stringify({
              certificate: cert,
              user: {
                nama: user.nama,
                nim: user.nim,
                email: user.email,
                prodi: user.prodi,
                angkatan: user.angkatan,
              },
              wallet: user.wallet,
            }),
            nftAddress: cert.nftAddress,
            metadataUri: cert.metadataUri,
            txSignature: cert.txSignature,
            reason: `Auto-backup before Withdraw Consent (Student)`,
            createdBy: user.id,
          }
        }),
        prisma.user.update({
          where: { id: payload.userId },
          data: updateData,
        }),
        prisma.certificate.update({
          where: { userId: payload.userId },
          data: { dataSalt: null },
        }),
      ]);
    } else {
      await prisma.user.update({
        where: { id: payload.userId },
        data: updateData,
      });
    }

    const ipAddress = request.headers.get("x-forwarded-for") || "unknown";

    // Catat di audit log
    await prisma.auditLog.create({
      data: {
        userId: payload.userId,
        action: "DATA_CONSENT_WITHDRAWN",
        detail: `Consent ditarik kembali dari IP: ${ipAddress}`,
        ipAddress,
      },
    });

    return NextResponse.json({ success: true, message: "Persetujuan berhasil ditarik kembali" });
  } catch (error) {
    console.error("Consent DELETE error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
