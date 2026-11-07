import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import {
  generateCertificateMetadata,
  generateAndUploadCertificateImage,
  uploadMetadataToPinata,
  generateRevokedMetadata,
} from "@/lib/pinata";
import {
  mintSoulboundNFT,
  revokeSoulboundNFT,
  prepareMintSigner,
} from "@/lib/metaplex";
import { generateDataHash } from "@/lib/crypto";
import { createAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    // 1. Guard: Hanya admin yang berhak melakukan re-issuance
    const payload = await getAuthUser(request);
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized - hanya admin yang bisa melakukan penerbitan ulang" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userId, newWalletAddress, reason } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId wajib diisi" }, { status: 400 });
    }

    if (!newWalletAddress || typeof newWalletAddress !== "string") {
      return NextResponse.json({ error: "newWalletAddress wajib diisi" }, { status: 400 });
    }

    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(newWalletAddress)) {
      return NextResponse.json(
        { error: "Format newWalletAddress Solana tidak valid" },
        { status: 400 }
      );
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: "Alasan penerbitan ulang (reason) wajib diisi" },
        { status: 400 }
      );
    }

    // 2. Verifikasi Identitas Ketat (Setidaknya sekuat penerbitan awal)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallet: true,
        certificate: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    if (user.role !== "MAHASISWA") {
      return NextResponse.json(
        { error: "Penerbitan ulang hanya berlaku untuk mahasiswa" },
        { status: 403 }
      );
    }

    if (!user.prodi) {
      return NextResponse.json(
        { error: "Data Program Studi mahasiswa tidak lengkap" },
        { status: 400 }
      );
    }

    // UU PDP Compliance: Explicit consent wajib aktif
    if (!user.dataConsent) {
      return NextResponse.json(
        {
          error: "CONSENT_REQUIRED",
          message:
            "Mahasiswa belum memberikan persetujuan publikasi data (consent tidak aktif).",
        },
        { status: 403 }
      );
    }

    // Mahasiswa wajib memiliki sertifikat aktif (MINTED atau CLAIMED)
    if (!user.certificate || !user.certificate.nftAddress) {
      return NextResponse.json(
        { error: "Mahasiswa belum memiliki ijazah terbit untuk diterbitkan ulang" },
        { status: 400 }
      );
    }

    const currentCert = user.certificate;
    if (currentCert.status !== "MINTED" && currentCert.status !== "CLAIMED") {
      return NextResponse.json(
        {
          error: `Ijazah saat ini berstatus ${currentCert.status}. Hanya ijazah MINTED atau CLAIMED yang dapat diterbitkan ulang.`,
        },
        { status: 400 }
      );
    }

    if (user.wallet?.walletAddress === newWalletAddress) {
      return NextResponse.json(
        { error: "Alamat wallet baru tidak boleh sama dengan wallet terdaftar saat ini" },
        { status: 400 }
      );
    }

    const oldNftAddress = currentCert.nftAddress;
    if (!oldNftAddress) {
      return NextResponse.json(
        { error: "Alamat NFT sertifikat lama tidak ditemukan" },
        { status: 400 }
      );
    }
    const oldCertId = currentCert.id;

    // 3. Siapkan data & metadata untuk aset baru
    const { hash: newDataHash, salt: newDataSalt } = generateDataHash(
      user.nama,
      user.nim,
      user.prodi
    );

    const { gatewayUrl: newImageUrl } = await generateAndUploadCertificateImage(
      {
        prodi: user.prodi,
        tahunLulus: user.tahunLulus || "2026",
        dataHash: newDataHash,
      },
      "MINTED"
    );

    const newMetadata = generateCertificateMetadata({
      prodi: user.prodi,
      tahunLulus: user.tahunLulus || "2026",
      dataHash: newDataHash,
      imageUri: newImageUrl,
    });

    const { gatewayUrl: newMetadataUri } = await uploadMetadataToPinata(newMetadata);

    // 4. Mint Aset Baru ke Wallet Baru (PermanentFreezeDelegate, frozen: true)
    const { mintSigner, mintAddress: newMintAddress } = prepareMintSigner();

    const mintResult = await mintSoulboundNFT({
      metadataUri: newMetadataUri,
      walletTujuan: newWalletAddress,
      mintSigner,
    });

    if (!mintResult.success) {
      return NextResponse.json(
        {
          error: `Gagal mencetak aset ijazah baru: ${mintResult.error}. Aset lama tetap aman.`,
        },
        { status: 502 }
      );
    }

    // 5. Visual Revoke Aset Lama di Blockchain Solana (FAIL LOUD per Review Point 2)
    const { gatewayUrl: revokedImageUrl } = await generateAndUploadCertificateImage(
      {
        prodi: user.prodi,
        tahunLulus: user.tahunLulus || "2026",
      },
      "REVOKED"
    );

    const revokedMetadata = generateRevokedMetadata({
      prodi: user.prodi,
      tahunLulus: user.tahunLulus || "2026",
    });
    revokedMetadata.image = revokedImageUrl;
    revokedMetadata.properties.files[0].uri = revokedImageUrl;

    const { gatewayUrl: revokedMetadataUri } = await uploadMetadataToPinata(revokedMetadata);

    const revokeResult = await revokeSoulboundNFT({
      mintAddress: oldNftAddress,
      metadataUri: revokedMetadataUri,
    });

    // FAIL LOUD: Jika revoke aset lama gagal, JANGAN tandai sukses, catat orphaned asset!
    if (!revokeResult.success) {
      console.error(
        "[Reissue FAIL LOUD] Revoke aset lama gagal! Orphaned asset terdeteksi:",
        newMintAddress,
        revokeResult.error
      );

      await createAuditLog(
        user.id,
        "ORPHANED_ASSET_ALERT",
        `Penerbitan ulang GAGAL pada tahap revoke aset lama ${oldNftAddress}. Aset baru ${newMintAddress} telah terlanjur tercetak di Solana dan harus dibersihkan secara manual. Error revoke: ${revokeResult.error}`,
        request.headers.get("x-forwarded-for") || "unknown"
      );

      return NextResponse.json(
        {
          error: `Gagal mencabut ijazah lama di blockchain: ${revokeResult.error}. Aset baru (${newMintAddress}) dicatat sebagai orphaned asset di audit log untuk pembersihan.`,
          orphanedAsset: newMintAddress,
          oldNftAddress,
        },
        { status: 502 }
      );
    }

    // 6. Database Update (Review Point 1):
    // Baris lama TETAP dengan nftAddress lama, status REVOKED, dan replacedById -> id baris baru.
    // Baris baru dibuat untuk aset baru dengan status MINTED.
    const [_, newCert] = await prisma.$transaction([
      // Backup & riwayat ijazah lama
      prisma.certificateBackup.create({
        data: {
          certificateId: oldCertId,
          userId: user.id,
          backupData: JSON.stringify({
            certificate: currentCert,
            user: {
              nama: user.nama,
              nim: user.nim,
              prodi: user.prodi,
              tahunLulus: user.tahunLulus,
            },
            oldWallet: user.wallet?.walletAddress,
            replacedBy: newMintAddress,
          }),
          nftAddress: oldNftAddress,
          metadataUri: currentCert.metadataUri,
          txSignature: currentCert.txSignature,
          reason: `REISSUE: ${reason} (Digantikan oleh NFT ${newMintAddress})`,
          createdBy: payload.userId,
        },
      }),

      // Buat baris Certificate BARU untuk aset baru
      prisma.certificate.create({
        data: {
          userId: user.id,
          nftAddress: newMintAddress,
          txSignature: mintResult.signature,
          metadataUri: newMetadataUri,
          status: "MINTED",
          dataHash: newDataHash,
          dataSalt: newDataSalt,
          issuedAt: new Date(),
          issuedBy: payload.userId,
          onChainOwner: newWalletAddress,
          onChainFrozen: true,
          onChainHash: newDataHash,
          onChainCheckedAt: new Date(),
        },
      }),

      // Update wallet mahasiswa ke wallet baru
      prisma.wallet.upsert({
        where: { userId: user.id },
        update: {
          walletAddress: newWalletAddress,
          status: "VERIFIED",
          verifiedAt: new Date(),
          verifiedBy: payload.userId,
        },
        create: {
          userId: user.id,
          walletAddress: newWalletAddress,
          status: "VERIFIED",
          verifiedAt: new Date(),
          verifiedBy: payload.userId,
        },
      }),
    ]);

    // Update baris Certificate LAMA: tetap simpan nftAddress lama, status REVOKED, replacedById -> newCert.id
    await prisma.certificate.update({
      where: { id: oldCertId },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
        revokedBy: payload.userId,
        revokeReason: `REISSUED to wallet ${newWalletAddress}: ${reason}`,
        replacedById: newCert.id,
        replacedAt: new Date(),
      },
    });

    // Update active certificateId pada model User
    await prisma.user.update({
      where: { id: user.id },
      data: {
        certificateId: newCert.id,
      },
    });

    // 7. Catat Audit Log
    await createAuditLog(
      user.id,
      "NFT_REISSUE",
      `Ijazah diterbitkan ulang ke wallet baru ${newWalletAddress} oleh admin ${payload.userId}. Aset lama: ${oldNftAddress} (ID: ${oldCertId}) -> Aset baru: ${newMintAddress} (ID: ${newCert.id}). Alasan: ${reason}`,
      request.headers.get("x-forwarded-for") || "unknown"
    );

    return NextResponse.json({
      success: true,
      message: "Ijazah berhasil diterbitkan ulang ke wallet baru",
      data: {
        certificateId: newCert.id,
        newNftAddress: newMintAddress,
        oldNftAddress: oldNftAddress,
        replacedById: newCert.id,
        newOwner: newWalletAddress,
      },
      newCertificate: {
        id: newCert.id,
        nftAddress: newMintAddress,
        txSignature: mintResult.signature,
        walletAddress: newWalletAddress,
        status: "MINTED",
      },
      oldCertificate: {
        id: oldCertId,
        nftAddress: oldNftAddress,
        status: "REVOKED",
        revokeTxSignature: revokeResult.signature || null,
        replacedById: newCert.id,
      },
    });
  } catch (error) {
    console.error("Reissue endpoint error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server saat memproses penerbitan ulang" },
      { status: 500 }
    );
  }
}
