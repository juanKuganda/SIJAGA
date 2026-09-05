import { NextRequest } from "next/server";
import { actionJson, actionOptions, appUrl } from "@/lib/solana-actions";
import { actionError } from "@/lib/actions-cors";
import { prisma } from "@/lib/prisma";
import { inspectCertificate } from "@/lib/onchain";

export async function OPTIONS() {
  return actionOptions();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const walletAddress = searchParams.get("wallet");
  const nim = searchParams.get("nim");
  const appUrlVar = appUrl(request);

  // Bisa dicari via wallet atau NIM
  const where = walletAddress
    ? { wallet: { walletAddress } }
    : nim
      ? { nim }
      : null;

  if (!where) {
    // Jika tidak ada parameter — tampilkan form input
    return actionJson({
      type: "action",
      icon: `${appUrlVar}/web-app-manifest-512x512.png`,
      title: "Verifikasi Ijazah SIJAGA",
      description: "Masukkan NIM mahasiswa untuk memverifikasi keaslian ijazah.",
      label: "Verifikasi",
      links: {
        actions: [
          {
            type: "transaction",
            label: "Verifikasi Ijazah",
            href: `${appUrlVar}/api/actions/verify?nim={nim}`,
            parameters: [
              {
                type: "text",
                name: "nim",
                label: "NIM Mahasiswa (contoh: F55123061)",
                required: true,
              },
            ],
          },
        ],
      },
    });
  }

  // Cari data ijazah
  const user = await prisma.user.findFirst({
    where,
    include: { certificate: true, wallet: true },
  });

  if (!user || !user.certificate) {
    return actionJson({
      type: "action",
      icon: `${appUrlVar}/web-app-manifest-512x512.png`,
      title: "Ijazah Tidak Ditemukan",
      description: "Data ijazah tidak ditemukan dalam sistem SIJAGA.",
      label: "Tidak Ditemukan",
      disabled: true,
      error: { message: "Pastikan NIM atau wallet address sudah benar." },
    });
  }

  const cert = user.certificate;
  const isRevoked = cert.status === "REVOKED";
  const isClaimed = cert.status === "CLAIMED";
  const isMinted = cert.status === "MINTED";
  const isIssuing = cert.status === "ISSUING";

  // ISSUING = belum selesai mint
  if (isIssuing) {
    return actionJson({
      type: "action",
      icon: `${appUrlVar}/web-app-manifest-512x512.png`,
      title: "⏳ Ijazah Sedang Diproses",
      description: "Ijazah sedang dalam proses penerbitan di blockchain.",
      label: "Dalam Proses",
      disabled: true,
    });
  }

  const solanaNetwork = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet";

  // ═══════════════════════════════════════════════════════════
  // Verifikasi on-chain: pakai inspectCertificate (bukan getAccountInfo)
  // ═══════════════════════════════════════════════════════════

  let onChainLabel = "⚠️ Status blockchain tidak dapat dikonfirmasi";
  let onChainValid = false;

  if (cert.nftAddress) {
    const inspection = await inspectCertificate(cert.nftAddress);

    if (inspection.ok) {
      const nameShowsRevoked = inspection.name.includes("[DIBATALKAN]");

      if (nameShowsRevoked) {
        onChainLabel = "❌ Dicabut di blockchain";
        onChainValid = false;
      } else if (inspection.frozen) {
        onChainLabel = "✅ Valid dan frozen di Solana Blockchain";
        onChainValid = true;
      } else {
        onChainLabel = "⚠️ Aset ditemukan tapi tidak frozen";
        onChainValid = false;
      }
    } else {
      // inspectCertificate gagal (RPC down, not found)
      onChainLabel =
        inspection.reason === "NOT_FOUND"
          ? "❌ Aset tidak ditemukan di blockchain"
          : "⚠️ Tidak bisa konfirmasi rantai (RPC tidak tersedia)";
      onChainValid = false;
    }
  }

  const explorerUrl = cert.nftAddress
    ? `https://explorer.solana.com/address/${cert.nftAddress}?cluster=${solanaNetwork}`
    : null;

  const piiDeleted = !!user.dataDeletedAt;

  // Masking PII for Blinks response (public endpoint)
  const maskString = (str: string) => str ? `${str.charAt(0)}***${str.charAt(str.length - 1)}` : "";
  const maskNim = (nimStr: string) => nimStr ? `${nimStr.substring(0, 3)}***${nimStr.substring(nimStr.length - 3)}` : "";

  const displayName = piiDeleted ? "[DATA DIHAPUS]" : maskString(user.nama);
  const displayNim = piiDeleted ? "[DIHAPUS]" : maskNim(user.nim);

  if (isRevoked) {
    return actionJson({
      type: "action",
      icon: `${appUrlVar}/web-app-manifest-512x512.png`,
      title: "⚠️ Ijazah Telah Dicabut",
      description: [
        `Nama: ${displayName}`,
        `NIM: ${displayNim}`,
        `Program Studi: ${user.prodi}`,
        `Dicabut: ${cert.revokedAt ? new Date(cert.revokedAt).toLocaleDateString("id-ID") : "-"}`,
        `Alasan: ${cert.revokeReason ?? "Tidak disebutkan"}`,
      ].join("\n"),
      label: "Ijazah Tidak Valid",
      disabled: true,
      error: { message: "Ijazah ini telah dicabut oleh Universitas Tadulako." },
    });
  }

  const statusEmoji = isClaimed ? "✅" : isMinted ? "🎓" : "⏳";
  const statusText = isClaimed ? "Diklaim" : isMinted ? "Diterbitkan" : "Dalam proses";

  return actionJson({
    type: "completed",
    icon: `${appUrlVar}/web-app-manifest-512x512.png`,
    title: onChainValid
      ? `${statusEmoji} Ijazah Terverifikasi`
      : `⚠️ Ijazah — Verifikasi On-Chain Gagal`,
    description: [
      `Nama: ${displayName}`,
      `NIM: ${displayNim}`,
      `Program Studi: ${user.prodi ?? "-"}`,
      `Institusi: Universitas Tadulako`,
      `Status: ${statusText}`,
      onChainLabel,
      explorerUrl ? `Explorer: ${explorerUrl}` : "",
    ].filter(Boolean).join("\n"),
    label: onChainValid ? "Terverifikasi" : "Verifikasi Gagal",
  });
}

// Verify tidak butuh POST — tapi wajib ada untuk CORS compliance
export async function POST() {
  return actionError("Endpoint ini hanya mendukung GET", 405);
}
