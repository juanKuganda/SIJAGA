import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { mintNftSchema } from "@/lib/validation";
import { generateCertificateMetadata, generateAndUploadCertificateImage, uploadMetadataToPinata } from "@/lib/pinata";
import { mintSoulboundNFT, prepareMintSigner } from "@/lib/metaplex";
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

 

    if (user.certificate) {
      const status = user.certificate.status;

 
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
        } else if (inspection.reason !== "NOT_FOUND") {
          // RPC down / metadata fail — jangan mint ulang, bisa double-mint
          return NextResponse.json(
            { error: `Tidak bisa verifikasi status NFT sebelumnya (${inspection.reason}). Coba lagi nanti.` },
            { status: 502 }
          );
        }

   
      } else if (status === "ISSUING") {
      } else if (status !== "NOT_ISSUED") {
     
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

   

    if (!user.prodi) {
      return NextResponse.json({ error: "Data Program Studi tidak lengkap" }, { status: 400 });
    }

    const { hash: dataHash, salt: dataSalt } = generateDataHash(
      user.nama,
      user.nim,
      user.prodi
    );

 
    const { gatewayUrl: imageUrl } = await generateAndUploadCertificateImage({
      prodi: user.prodi,
      tahunLulus: user.tahunLulus || "2026",
      dataHash,
    }, "MINTED");

    // Generate metadata TANPA PII (Privacy Architecture)
    const metadata = generateCertificateMetadata({
      prodi: user.prodi,
      tahunLulus: user.tahunLulus || "2026",
      dataHash,
      imageUri: imageUrl,
    });

    // Upload metadata ke Pinata
    const { gatewayUrl: metadataUri } = await uploadMetadataToPinata(metadata);


    const { mintSigner, mintAddress } = prepareMintSigner();


    await prisma.certificate.upsert({
      where: { userId },
      update: {
        status: "ISSUING",
        nftAddress: mintAddress,
        metadataUri,
        dataHash,
        dataSalt,
        onChainError: null,
      },
      create: {
        userId,
        status: "ISSUING",
        nftAddress: mintAddress,
        metadataUri,
        dataHash,
        dataSalt,
      },
    });


    const mintResult = await mintSoulboundNFT({
      metadataUri,
      walletTujuan: user.wallet.walletAddress,
      mintSigner,
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
