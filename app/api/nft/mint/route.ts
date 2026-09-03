import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { mintNftSchema } from "@/lib/validation";
import { uploadMetadataToPinata, generateCertificateMetadata, generateAndUploadCertificateImage } from "@/lib/pinata";
import { mintSoulboundNFT } from "@/lib/metaplex";
import { generateDataHash } from "@/lib/crypto";
import { createAuditLog } from "@/lib/audit";

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

    // GATE BARU: cek consent sebelum apapun (UU PDP compliance)
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

    if (user.certificate && user.certificate.status !== "NOT_ISSUED") {
      const statusMsg: Record<string, string> = {
        MINTED: "Ijazah sudah diterbitkan dan menunggu klaim",
        CLAIMED: "Ijazah sudah diklaim oleh mahasiswa",
        REVOKED: "Ijazah sudah direvoke. Gunakan fitur Recovery untuk mengembalikan",
      };
      return NextResponse.json(
        { error: statusMsg[user.certificate.status] || "Ijazah sudah diterbitkan" },
        { status: 400 }
      );
    }

    // Generate dataHash dan salt untuk 2-tier verification
    const { hash: dataHash, salt: dataSalt } = generateDataHash(
      user.nama,
      user.nim,
      user.prodi || "Informatika"
    );

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

    // Mint NFT Soulbound
    const mintResult = await mintSoulboundNFT({
      nama: user.nama,
      nim: user.nim,
      prodi: user.prodi || "Informatika",
      tahunLulus: user.angkatan || "2026",
      metadataUri,
      walletTujuan: user.wallet.walletAddress,
    });

    if (!mintResult.success) {
      return NextResponse.json(
        { error: mintResult.error || "Gagal mint NFT" },
        { status: 500 }
      );
    }

    // Update atau buat certificate — simpan dataHash dan dataSalt
    const certificate = await prisma.certificate.upsert({
      where: { userId },
      update: {
        nftAddress: mintResult.mintAddress || mintResult.signature,
        metadataUri,
        txSignature: mintResult.signature,
        status: "MINTED",
        issuedAt: new Date(),
        issuedBy: payload.userId,
        dataHash,
        dataSalt,
      },
      create: {
        userId,
        nftAddress: mintResult.mintAddress || mintResult.signature,
        metadataUri,
        txSignature: mintResult.signature,
        status: "MINTED",
        issuedAt: new Date(),
        issuedBy: payload.userId,
        dataHash,
        dataSalt,
      },
    });

    // Buat audit log — userId merujuk ke mahasiswa, bukan admin
    await createAuditLog(
      userId,
      "NFT_MINT",
      `NFT ijazah di-mint untuk ${user.nama} (${user.nim}) oleh admin ${payload.userId}`,
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

