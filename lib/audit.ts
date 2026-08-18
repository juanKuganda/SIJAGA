import { prisma } from "./prisma";

/**
 * Membuat catatan log audit untuk tindakan yang dilakukan di sistem SIJAGA.
 * 
 * @param userId ID user yang dikenai tindakan (atau yang melakukan tindakan, tergantung konteks)
 * @param action Nama aksi (contoh: "NFT_MINT", "NFT_REVOKE", "CERT_CLAIMED")
 * @param detail Detail deskripsi tindakan
 * @param ipAddress IP address asal request
 */
export async function createAuditLog(
  userId: string,
  action: string,
  detail: string,
  ipAddress: string
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        detail,
        ipAddress,
      },
    });
  } catch (error) {
    // Kami hanya log error di konsol agar kegagalan log 
    // tidak membatalkan transaksi bisnis utama.
    console.error("[AuditLog] Failed to create audit log:", error);
  }
}
