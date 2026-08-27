import { NextRequest } from "next/server";
import { ACTIONS_CORS_HEADERS, optionsResponse, actionError } from "@/lib/actions-cors";
import { prisma } from "@/lib/prisma";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const walletAddress = searchParams.get("wallet");
  const nim = searchParams.get("nim");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

  // Bisa dicari via wallet atau NIM
  const where = walletAddress
    ? { wallet: { walletAddress } }
    : nim
      ? { nim }
      : null;

  if (!where) {
    // Jika tidak ada parameter — tampilkan form input
    return Response.json(
      {
        type: "action",
        icon: `${appUrl}/web-app-manifest-512x512.png`,
        title: "Verifikasi Ijazah SIJAGA",
        description: "Masukkan NIM mahasiswa untuk memverifikasi keaslian ijazah.",
        label: "Verifikasi",
        links: {
          actions: [
            {
              type: "transaction", // technically GET doesn't use transaction here but we can use external-link or simple post
              // Using external-link is deprecated in actions in favor of inline GETs or just simple actions
              // For inputs we use a POST back or just GET with params. The blinks spec says we just need parameters array.
              label: "Verifikasi Ijazah",
              href: `/api/actions/verify?nim={nim}`,
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
      },
      { headers: ACTIONS_CORS_HEADERS }
    );
  }

  // Cari data ijazah
  const user = await prisma.user.findFirst({
    where,
    include: { certificate: true, wallet: true },
  });

  if (!user || !user.certificate) {
    return Response.json(
      {
        type: "action",
        icon: `${appUrl}/web-app-manifest-512x512.png`,
        title: "Ijazah Tidak Ditemukan",
        description: "Data ijazah tidak ditemukan dalam sistem SIJAGA.",
        label: "Tidak Ditemukan",
        disabled: true,
        error: { message: "Pastikan NIM atau wallet address sudah benar." },
      },
      { headers: ACTIONS_CORS_HEADERS }
    );
  }

  const cert = user.certificate;
  const isRevoked = cert.status === "REVOKED";
  const isClaimed = cert.status === "CLAIMED";
  const isMinted = cert.status === "MINTED";

  // Verifikasi on-chain: cek NFT masih ada di blockchain
  let onChainValid = false;
  if (cert.nftAddress) {
    try {
      const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC || clusterApiUrl("devnet");
      const connection = new Connection(rpcUrl, "confirmed");
      const info = await connection.getAccountInfo(new PublicKey(cert.nftAddress));
      onChainValid = info !== null;
    } catch {
      onChainValid = false;
    }
  }

  const explorerUrl = cert.txSignature
    ? `https://solscan.io/tx/${cert.txSignature}?cluster=devnet`
    : null;

  const piiDeleted = !!user.dataDeletedAt;
  const displayName = piiDeleted ? "[DATA DIHAPUS]" : user.nama;
  const displayNim = piiDeleted ? "[DIHAPUS]" : user.nim;

  if (isRevoked) {
    return Response.json(
      {
        type: "action",
        icon: `${appUrl}/web-app-manifest-512x512.png`,
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
      },
      { headers: ACTIONS_CORS_HEADERS }
    );
  }

  const statusEmoji = isClaimed ? "✅" : isMinted ? "🎓" : "⏳";
  const statusText = isClaimed ? "Diklaim" : isMinted ? "Diterbitkan" : "Dalam proses";

  return Response.json(
    {
      type: "completed",
      icon: `${appUrl}/web-app-manifest-512x512.png`,
      title: `${statusEmoji} Ijazah Terverifikasi`,
      description: [
        `Nama: ${displayName}`,
        `NIM: ${displayNim}`,
        `Program Studi: ${user.prodi ?? "-"}`,
        `Institusi: Universitas Tadulako`,
        `Status: ${statusText}`,
        onChainValid ? "✅ Terkonfirmasi di Solana Blockchain" : "⚠️ Status blockchain tidak dapat dikonfirmasi",
        explorerUrl ? `Explorer: ${explorerUrl}` : "",
      ].filter(Boolean).join("\n"),
      label: "Terverifikasi",
    },
    { headers: ACTIONS_CORS_HEADERS }
  );
}

// Verify tidak butuh POST — tapi wajib ada untuk CORS compliance
export async function POST() {
  return actionError("Endpoint ini hanya mendukung GET", 405);
}
