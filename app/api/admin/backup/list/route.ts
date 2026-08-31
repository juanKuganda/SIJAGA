import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

/**
 * GET — List semua backup sertifikat
 */
export async function GET(_request: NextRequest) {
  try {
    const payload = await getAuthUser();
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const backups = await prisma.certificateBackup.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // Parse backupData JSON for each backup
    const parsedBackups = backups.map((b) => {
      let parsedData = null;
      try {
        parsedData = JSON.parse(b.backupData);
      } catch {
        parsedData = null;
      }

      return {
        id: b.id,
        certificateId: b.certificateId,
        userId: b.userId,
        nftAddress: b.nftAddress,
        metadataUri: b.metadataUri,
        txSignature: b.txSignature,
        reason: b.reason,
        createdAt: b.createdAt,
        createdBy: b.createdBy,
        usedAt: b.usedAt,
        usedBy: b.usedBy,
        userData: parsedData?.user || null,
        certStatus: parsedData?.certificate?.status || null,
      };
    });

    return NextResponse.json({ backups: parsedBackups });
  } catch (error) {
    console.error("Backup list error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
