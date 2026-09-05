import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySchema } from "@/lib/validation";
import { verifyDataHash } from "@/lib/crypto";
import { getAuthUser } from "@/lib/auth";
import { inspectCertificate } from "@/lib/onchain";

/**
 * GET /api/verify — Verifikasi publik ijazah (3 lapisan)
 *
 * ARSITEKTUR VERIFIKASI:
 * Lapisan A — Database: Certificate ada, bukan NOT_ISSUED / ISSUING
 * Lapisan B — Hash lokal: verifyDataHash(nama, nim, prodi, salt, dataHash)
 * Lapisan C — On-chain: inspectCertificate(nftAddress) via Metaplex Core
 *
 * `verified: true` HANYA JIKA semua lapisan lolos.
 * RPC down / gagal = verified: false (fail-closed, BUKAN sah).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParam = searchParams.get("query") || searchParams.get("wallet");

    // Validasi input
    const result = verifySchema.safeParse({ query: queryParam });
    if (!result.success) {
      const errorMessage = result.error.issues[0]?.message || "Validasi gagal";
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    const { query } = result.data;
    const isSolanaAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(query);

    // ─── Cari di database ────────────────────────────────────
    let userWithWallet: {
      nama: string;
      nim: string;
      prodi: string | null;
      angkatan: string | null;
      userId: string;
      dataDeletedAt: Date | null;
      walletAddress: string | null;
    } | null = null;

    if (isSolanaAddress) {
      const walletData = await prisma.wallet.findUnique({
        where: { walletAddress: query },
        include: {
          user: {
            select: {
              nama: true,
              nim: true,
              prodi: true,
              angkatan: true,
              dataDeletedAt: true,
            },
          },
        },
      });
      if (walletData) {
        userWithWallet = {
          ...walletData.user,
          userId: walletData.userId,
          walletAddress: walletData.walletAddress,
        };
      }
    } else {
      const user = await prisma.user.findUnique({
        where: { nim: query },
        include: { wallet: true },
      });
      if (user) {
        userWithWallet = {
          nama: user.nama,
          nim: user.nim,
          prodi: user.prodi,
          angkatan: user.angkatan,
          userId: user.id,
          dataDeletedAt: user.dataDeletedAt,
          walletAddress: user.wallet?.walletAddress ?? null,
        };
      }
    }

    if (!userWithWallet) {
      return NextResponse.json(
        { error: isSolanaAddress ? "Wallet tidak ditemukan" : "NIM tidak ditemukan" },
        { status: 404 }
      );
    }

    // Cek Autentikasi untuk menentukan level akses PII
    const authUser = await getAuthUser();
    const isOwner = authUser?.userId === userWithWallet.userId;
    const isAdmin = authUser?.role === "ADMIN";
    const canSeePII = isOwner || isAdmin;

    // Cari certificate
    const certificate = await prisma.certificate.findUnique({
      where: { userId: userWithWallet.userId },
    });

    // ═══════════════════════════════════════════════════════════
    // LAPISAN A — Database: certificate ada & status valid
    // ═══════════════════════════════════════════════════════════

    if (!certificate || certificate.status === "NOT_ISSUED" || certificate.status === "ISSUING") {
      return NextResponse.json({
        verified: false,
        message: certificate?.status === "ISSUING"
          ? "Ijazah sedang dalam proses penerbitan"
          : "Tidak ditemukan ijazah untuk query ini",
      });
    }

    // PII masking helpers
    const piiDeleted = !!userWithWallet.dataDeletedAt;
    const maskString = (str: string) => str ? `${str.charAt(0)}***${str.charAt(str.length - 1)}` : "";
    const maskNim = (nim: string) => nim ? `${nim.substring(0, 3)}***${nim.substring(nim.length - 3)}` : "";
    const formatNama = () => piiDeleted ? "[DATA DIHAPUS]" : (canSeePII ? userWithWallet.nama : maskString(userWithWallet.nama));
    const formatNim = () => piiDeleted ? "[DIHAPUS]" : (canSeePII ? userWithWallet.nim : maskNim(userWithWallet.nim));

    const solanaNetwork = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet";

    // ═══════════════════════════════════════════════════════════
    // LAPISAN B — Hash lokal: verifyDataHash
    // ═══════════════════════════════════════════════════════════

    let hashVerified: boolean | null = null;
    if (!piiDeleted && certificate.dataSalt && certificate.dataHash) {
      hashVerified = verifyDataHash(
        userWithWallet.nama,
        userWithWallet.nim,
        userWithWallet.prodi || "Informatika",
        certificate.dataSalt,
        certificate.dataHash
      );
    }

    // ═══════════════════════════════════════════════════════════
    // Cek status REVOKED (sebelum on-chain — bisa return cepat)
    // ═══════════════════════════════════════════════════════════

    if (certificate.status === "REVOKED") {
      // Masih lakukan on-chain inspect untuk konsistensi
      let onChainStatus: "VALID" | "UNAVAILABLE" | "NOT_FOUND" | "MISMATCH" = "UNAVAILABLE";
      if (certificate.nftAddress) {
        const inspection = await inspectCertificate(certificate.nftAddress);
        if (inspection.ok) {
          // Cek apakah on-chain sudah menunjukkan [DIBATALKAN]
          const nameShowsRevoked = inspection.name.includes("[DIBATALKAN]");
          onChainStatus = nameShowsRevoked ? "VALID" : "MISMATCH";
        } else {
          onChainStatus = inspection.reason === "NOT_FOUND" ? "NOT_FOUND" : "UNAVAILABLE";
        }
      }

      return NextResponse.json({
        verified: false,
        revoked: true,
        message: "Ijazah ini telah DIREVOKE / DICABUT",
        revokeReason: certificate.revokeReason || "Tidak ada alasan yang diberikan",
        revokedAt: certificate.revokedAt,
        data: {
          nama: formatNama(),
          nim: formatNim(),
          prodi: userWithWallet.prodi,
          tahunLulus: userWithWallet.angkatan,
          nftAddress: certificate.nftAddress,
        },
        onChain: {
          status: onChainStatus,
        },
        piiDeleted,
        explorerUrl: certificate.nftAddress
          ? `https://explorer.solana.com/address/${certificate.nftAddress}?cluster=${solanaNetwork}`
          : null,
      });
    }

    // ═══════════════════════════════════════════════════════════
    // LAPISAN C — On-chain: inspectCertificate
    // ═══════════════════════════════════════════════════════════

    if (!certificate.nftAddress) {
      // Seharusnya tidak terjadi jika status MINTED/CLAIMED, tapi fail-closed
      return NextResponse.json({
        verified: false,
        message: "NFT address tidak ditemukan di database",
        hashVerified,
      });
    }

    const inspection = await inspectCertificate(certificate.nftAddress);

    // RPC down / timeout → JANGAN loloskan sebagai sah
    if (!inspection.ok) {
      return NextResponse.json({
        verified: false,
        hashVerified,
        data: {
          nama: formatNama(),
          nim: formatNim(),
          prodi: userWithWallet.prodi,
          tahunLulus: userWithWallet.angkatan,
          status: certificate.status,
          nftAddress: certificate.nftAddress,
          issuedAt: certificate.issuedAt,
          penerbit: "Universitas Tadulako",
        },
        onChain: {
          status: inspection.reason === "NOT_FOUND" ? "NOT_FOUND" : "UNAVAILABLE",
        },
        piiDeleted,
        explorerUrl: `https://explorer.solana.com/address/${certificate.nftAddress}?cluster=${solanaNetwork}`,
      });
    }

    // ─── On-chain checks ──────────────────────────────────────

    // Check 4: dataHash on-chain === dataHash DB
    const hashMatch =
      inspection.dataHash !== null &&
      certificate.dataHash !== null &&
      inspection.dataHash === certificate.dataHash;

    // Check 5: Owner on-chain = wallet terdaftar
    const ownerMatch =
      userWithWallet.walletAddress !== null &&
      inspection.owner === userWithWallet.walletAddress;

    // Check 6: frozen === true
    const frozenCheck = inspection.frozen === true;

    // Check 7: Nama on-chain tidak mengandung [DIBATALKAN] (kecuali memang REVOKED)
    const nameShowsRevoked = inspection.name.includes("[DIBATALKAN]");
    const nameConsistent = !nameShowsRevoked; // Karena sudah filter REVOKED di atas

    // ─── Determine mismatch ───────────────────────────────────

    let mismatch: string | null = null;
    if (!hashMatch && inspection.dataHash !== null) {
      mismatch = "HASH";
    } else if (!ownerMatch) {
      mismatch = "OWNER";
    } else if (nameShowsRevoked) {
      mismatch = "STATUS"; // On-chain revoked tapi DB belum
    }

    // ─── Final decision ───────────────────────────────────────

    const onChainValid =
      hashMatch && ownerMatch && frozenCheck && nameConsistent;

    // Hash lokal harus valid (atau PII dihapus → null → acceptable)
    const localHashOk =
      hashVerified === true || piiDeleted;

    const verified = onChainValid && localHashOk;

    // Update on-chain snapshot di DB (fire-and-forget)
    prisma.certificate
      .update({
        where: { id: certificate.id },
        data: {
          onChainOwner: inspection.owner,
          onChainFrozen: inspection.frozen,
          onChainHash: inspection.dataHash,
          onChainCheckedAt: new Date(),
          onChainError: null,
        },
      })
      .catch((err) => {
        console.warn("[Verify] Failed to update on-chain snapshot:", err);
      });

    return NextResponse.json({
      verified,
      hashVerified,
      mismatch,
      data: {
        nama: formatNama(),
        nim: formatNim(),
        prodi: userWithWallet.prodi,
        tahunLulus: userWithWallet.angkatan,
        status: certificate.status,
        nftAddress: certificate.nftAddress,
        issuedAt: certificate.issuedAt,
        penerbit: "Universitas Tadulako",
        // SECURITY: dataHash / dataSalt TIDAK dikirim ke klien publik
      },
      onChain: {
        status: verified ? "VALID" : (mismatch ? "MISMATCH" : "VALID"),
        frozen: inspection.frozen,
        owner: inspection.owner,
      },
      piiDeleted,
      explorerUrl: `https://explorer.solana.com/address/${certificate.nftAddress}?cluster=${solanaNetwork}`,
    });
  } catch (error) {
    console.error("Verify error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
