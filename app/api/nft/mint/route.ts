import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { mintNftSchema } from "@/lib/validation";
import { uploadMetadataToPinata, generateCertificateMetadata, generateAndUploadCertificateImage } from "@/lib/pinata";
import { mintSoulboundNFT } from "@/lib/metaplex";
import { generateDataHash } from "@/lib/crypto";
import { createAuditLog } from "@/lib/audit";
import { inspectCertificate } from "@/lib/onchain";

export async function POST(request: NextRequest) {
  try {
    const payload = await getAuthUser();
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validasi input
    const result = mintNftSchema.safeParse(body);
    if (!result.success) {
      const errorMessage = result.error.issues[0]?.message || "Validasi gagal";
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    const { userId } = result.data;

    // Ambil data user dan wallet
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

    // GATE: cek consent sebelum apapun (UU PDP compliance)
    if (!user.dataConsent) {
      return NextResponse.json({
        error: "CONSENT_REQUIRED",
        message: "Mahasiswa belum memberikan persetujuan publikasi data. Minting tidak dapat dilakukan."
      }, { status: 403 });
    }

    if (!user.wallet || user.wallet.status !== "VERIFIED") {
      return NextResponse.json(
        { error: "Wallet belum terverifikasi" },
        { status: 400 }
      );
    }

    // ═══════════════════════════════════════════════════════════
    // Status machine gate
    // ═══════════════════════════════════════════════════════════

    if (user.certificate) {
      const status = user.certificate.status;

      // ISSUING = ada proses sebelumnya yang belum selesai
      // Cek apakah NFT sudah ada di rantai (rekonsiliasi)
      if (status === "ISSUING" && user.certificate.nftAddress) {
        const inspection = await inspectCertificate(user.certificate.nftAddress);

        if (inspection.ok) {
          // NFT sudah ada di rantai! Promote ke MINTED (rekonsiliasi)
          const promotedCert = await prisma.certificate.update({
            where: { id: user.certificate.id },
            data: {
              status: "MINTED",
              onChainOwner: inspection.owner,
              onChainFrozen: inspection.frozen,
              onChainHash: inspection.dataHash,
              onChainCheckedAt: new Date(),
              onChainError: null,
            },
          });

          await createAuditLog(
            userId,
            "NFT_MINT_RECONCILE",
            `NFT ijazah di-reconcile (sudah ada on-chain) untuk user ${userId} oleh admin ${payload.userId}`,
            request.headers.get("x-forwarded-for") || "unknown"
          );

          return NextResponse.json({
            certificate: {
              id: promotedCert.id,
              nftAddress: promotedCert.nftAddress,
              txSignature: promotedCert.txSignature,
              status: promotedCert.status,
            },
            reconciled: true,
          });
        }

        // NFT belum ada di rantai — lanjutkan mint (retry)
        // Jatuh ke flow mint di bawah
      } else if (status === "ISSUING") {
        // ISSUING tanpa nftAddress — lanjutkan mint dari awal
        // Jatuh ke flow mint di bawah
      } else if (status !== "NOT_ISSUED") {
        // MINTED, CLAIMED, REVOKED — tidak bisa mint lagi
        const statusMsg: Record<string, string> = {
          MINTED: "Ijazah sudah diterbitkan dan menunggu klaim",
          CLAIMED: "Ijazah sudah diklaim oleh mahasiswa",
          REVOKED: "Ijazah sudah direvoke. Gunakan fitur Recovery untuk mengembalikan",
        };
        return NextResponse.json(
          { error: statusMsg[status] || "Ijazah sudah diterbitkan" },
          { status: 400 }
        );
      }
    }

    // ═══════════════════════════════════════════════════════════
    // Step 1: Generate dataHash dan salt
    // ═══════════════════════════════════════════════════════════

    const { hash: dataHash, salt: dataSalt } = generateDataHash(
      user.nama,
      user.nim,
      user.prodi || "Informatika"
    );

    // ═══════════════════════════════════════════════════════════
    // Step 2: Upload ke IPFS (image + metadata)
    // ═══════════════════════════════════════════════════════════

    // Generate & upload PNG certificate image to IPFS (TANPA PII)
    const { gatewayUrl: imageUrl } = await generateAndUploadCertificateImage({
      prodi: user.prodi || "Informatika",
      tahunLulus: user.angkatan || "2026",
      dataHash,
    }, "MINTED");

    // Generate metadata TANPA PII (Privacy Architecture)
    const metadata = generateCertificateMetadata({
      prodi: user.prodi || "Informatika",
      tahunLulus: user.angkatan || "2026",
      dataHash,
      imageUri: imageUrl,
    });

    // Upload metadata ke Pinata
    const { gatewayUrl: metadataUri } = await uploadMetadataToPinata(metadata);

    // ═══════════════════════════════════════════════════════════
    // Step 3: Upsert certificate ke ISSUING SEBELUM mint on-chain
    // Ini mencegah NFT yatim jika crash setelah mint berhasil
    // ═══════════════════════════════════════════════════════════

    await prisma.certificate.upsert({
      where: { userId },
      update: {
        status: "ISSUING",
        metadataUri,
        dataHash,
        dataSalt,
        onChainError: null,
      },
      create: {
        userId,
        status: "ISSUING",
        metadataUri,
        dataHash,
        dataSalt,
      },
    });

    // ═══════════════════════════════════════════════════════════
    // Step 4: Mint NFT Soulbound (on-chain)
    // ═══════════════════════════════════════════════════════════

    const mintResult = await mintSoulboundNFT({
      metadataUri,
      walletTujuan: user.wallet.walletAddress,
    });

    if (!mintResult.success) {
      // Mint gagal — JANGAN hapus certificate row.
      // Set onChainError agar admin bisa retry.
      await prisma.certificate.update({
        where: { userId },
        data: {
          onChainError: mintResult.error || "Unknown mint error",
        },
      });

      return NextResponse.json(
        { error: mintResult.error || "Gagal mint NFT. Status ISSUING — silakan retry." },
        { status: 500 }
      );
    }

    // ═══════════════════════════════════════════════════════════
    // Step 5: Promote ke MINTED + snapshot on-chain
    // ═══════════════════════════════════════════════════════════

    const certificate = await prisma.certificate.update({
      where: { userId },
      data: {
        nftAddress: mintResult.mintAddress,
        txSignature: mintResult.signature,
        status: "MINTED",
        issuedAt: new Date(),
        issuedBy: payload.userId,
        onChainOwner: user.wallet.walletAddress,
        onChainFrozen: true, // PermanentFreezeDelegate set saat mint
        onChainCheckedAt: new Date(),
        onChainError: null,
      },
    });

    // Buat audit log — userId merujuk ke mahasiswa, bukan admin
    await createAuditLog(
      userId,
      "NFT_MINT",
      `NFT ijazah di-mint untuk user ${userId} oleh admin ${payload.userId}`,
      request.headers.get("x-forwarded-for") || "unknown"
    );

    return NextResponse.json({
      certificate: {
        id: certificate.id,
        nftAddress: certificate.nftAddress,
        txSignature: certificate.txSignature,
        status: certificate.status,
      },
    });
  } catch (error) {
    console.error("NFT mint error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
