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
    const payload = await getAuthUser();
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

    // 5. Visual Revoke Aset Lama di Blockchain Solana (Fail-closed)
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

    if (!revokeResult.success) {
      console.error(
        "[Reissue] Peringatan: Aset baru berhasil dicetak tapi revoke aset lama gagal:",
        revokeResult.error
      );
      // Catatan: Aset baru sudah dicetak, catat error di audit log
    }

    // 6. Simpan riwayat ijazah lama ke CertificateBackup & update Certificate ke ijazah baru
    await prisma.$transaction([
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

      // Update sertifikat aktif dengan link riwayat (replacedById & replacedAt)
      prisma.certificate.update({
        where: { id: currentCert.id },
        data: {
          nftAddress: newMintAddress,
          txSignature: mintResult.signature,
          metadataUri: newMetadataUri,
          status: "MINTED",
          dataHash: newDataHash,
          dataSalt: newDataSalt,
          issuedAt: new Date(),
          issuedBy: payload.userId,
          claimedAt: null,
          revokedAt: null,
          revokedBy: null,
          revokeReason: null,
          replacedById: oldCertId,
          replacedAt: new Date(),
          onChainOwner: newWalletAddress,
          onChainFrozen: true,
          onChainHash: newDataHash,
          onChainCheckedAt: new Date(),
          onChainError: null,
        },
      }),
    ]);

    // 7. Catat Audit Log
    await createAuditLog(
      user.id,
      "NFT_REISSUE",
      `Ijazah diterbitkan ulang ke wallet baru ${newWalletAddress} oleh admin ${payload.userId}. Aset lama: ${oldNftAddress}. Alasan: ${reason}`,
      request.headers.get("x-forwarded-for") || "unknown"
    );

    return NextResponse.json({
      success: true,
      message: "Ijazah berhasil diterbitkan ulang ke wallet baru",
      newCertificate: {
        nftAddress: newMintAddress,
        txSignature: mintResult.signature,
        walletAddress: newWalletAddress,
        status: "MINTED",
      },
      oldCertificate: {
        nftAddress: oldNftAddress,
        status: "REVOKED",
        revokeTxSignature: revokeResult.signature || null,
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

