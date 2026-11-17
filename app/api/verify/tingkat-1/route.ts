import { NextRequest, NextResponse } from "next/server";
import { inspectCertificate } from "@/lib/onchain";
import { getAdminWalletAddress } from "@/lib/metaplex";

/**
 * Endpoint Verifikasi Tingkat-1 Mandiri (On-Chain + IPFS)
 *
 * Sesuai arsitektur TC-15 & UU PDP:
 * - 100% Bebas Dependensi Database (TIDAK query Prisma / Tier 1).
 * - Menerima alamat aset Solana (mint address).
 * - Membaca langsung dari RPC Solana publik & IPFS Gateway via inspectCertificate.
 * - Memberi label jujur:
 *     Tingkat 1: "DAPAT DIPERIKSA"
 *     Tingkat 2: "TIDAK DAPAT DIPASTIKAN" (bukan "tidak valid")
 *
 * Tiga klaim draf yang diperiksa di sini (tanpa Tier 1):
 * - Penerbit adalah alamat resmi institusi: updateAuthority on-chain
 *   dibandingkan dengan alamat wallet admin (fail-closed bila alamat
 *   admin tidak terkonfigurasi — vonis TIDAK PERNAH bersih).
 * - Metadata terkini tidak menyatakan dicabut: penanda "[DIBATALKAN]"
 *   pada nama/metadata atau atribut Status = "Dibatalkan" → vonis "DICABUT".
 * - (Tanda tangan tantangan valid diperiksa endpoint challenge terpisah.)
 */

function isValidSolanaAddress(address: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const asset = searchParams.get("asset") || searchParams.get("query") || searchParams.get("mint");

  if (!asset) {
    return NextResponse.json(
      {
        success: false,
        error: "Parameter 'asset' (alamat mint Solana) wajib disertakan",
      },
      { status: 400 }
    );
  }

  return handleInspection(asset.trim());
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const asset = body.asset || body.query || body.mint;

    if (!asset || typeof asset !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Field 'asset' (alamat mint Solana) wajib disertakan dalam request body",
        },
        { status: 400 }
      );
    }

    return handleInspection(asset.trim());
  } catch (error) {
    // Detail mentah TIDAK dikembalikan ke klien (bisa memuat isi body /
    // detail konfigurasi); simpan di log server untuk debugging.
    console.error(
      "[Tingkat-1] Invalid JSON body:",
      error instanceof Error ? error.message : String(error)
    );
    return NextResponse.json(
      {
        success: false,
        error: "Invalid JSON body",
      },
      { status: 400 }
    );
  }
}

async function handleInspection(asset: string) {
  if (!isValidSolanaAddress(asset)) {
    return NextResponse.json(
      {
        success: false,
        error: "Alamat aset Solana (Base58) tidak valid",
        asset,
      },
      { status: 400 }
    );
  }

  const result = await inspectCertificate(asset);

  if (!result.ok) {
    if (result.reason === "NOT_FOUND") {
      return NextResponse.json(
        {
          success: false,
          error: "Aset tidak ditemukan di blockchain Solana",
          reason: result.reason,
          asset,
          timings: result.timings,
        },
        { status: 404 }
      );
    }

    if (result.reason === "NOT_ASSET") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Alamat ini bukan aset NFT (kemungkinan alamat dompet, bukan alamat mint). Masukkan alamat mint aset Solana.",
          reason: result.reason,
          asset,
          timings: result.timings,
        },
        { status: 400 }
      );
    }

    if (result.reason === "RPC" || result.reason === "METADATA") {
      const isRpc = result.reason === "RPC";
      const statusCode = isRpc ? 503 : 502;
      const errorMsg = isRpc
        ? "Koneksi ke Solana RPC mengalami kegagalan / tidak dapat dijangkau"
        : "Aset ditemukan di blockchain, namun metadata IPFS tidak dapat diakses";

      return NextResponse.json(
        {
          success: false,
          level: "TINGKAT 1",
          verdict: "TIDAK DAPAT DIPASTIKAN",
          asset,
          reason: result.reason,
          error: errorMsg,
          timings: result.timings,
          checks: {
            tokenExists: {
              status: isRpc ? "TIDAK DAPAT DIPASTIKAN" : "DAPAT DIPERIKSA",
              detail: isRpc
                ? "Koneksi ke node Solana RPC terganggu / tidak dapat dijangkau"
                : "Aset terdaftar di blockchain Solana (Metaplex Core)",
            },
            issuerAuthority: {
              status: "TIDAK DAPAT DIPASTIKAN",
              detail: isRpc
                ? "Pemeriksaan otoritas penerbit memerlukan pembacaan token on-chain"
                : "Metadata IPFS tidak dapat diakses untuk memeriksa identitas institusi penerbit",
            },
            statusPencabutan: {
              status: "TIDAK DAPAT DIPASTIKAN",
              detail: isRpc
                ? "Pemeriksaan status pencabutan memerlukan koneksi ke blockchain Solana"
                : "Gateway IPFS tidak dapat dijangkau untuk membaca metadata pembatalan",
            },
            tokenFrozen: {
              status: "TIDAK DAPAT DIPASTIKAN",
              detail: isRpc
                ? "Pemeriksaan status pembekuan token memerlukan pembacaan on-chain"
                : "Pemeriksaan pembekuan token memerlukan validasi metadata terpadu",
            },
            dataHashOnChain: {
              status: "TIDAK DAPAT DIPASTIKAN",
              detail: isRpc
                ? "Pembacaan data hash memerlukan pembacaan token on-chain"
                : "Gateway IPFS tidak dapat dijangkau untuk membaca atribut Data Hash",
            },
            nominatifMatch: {
              status: "TIDAK DAPAT DIPASTIKAN",
              detail:
                "Hitung-ulang dataHash membutuhkan salt institusi yang hanya tersimpan di database Tier 1",
            },
            identityBinding: {
              status: "TIDAK DAPAT DIPASTIKAN",
              detail:
                "Pencocokan ikatan dompet dengan identitas nama/NIM mahasiswa memerlukan database Tier 1",
            },
          },
          warning:
            "Koneksi ke infrastruktur desentralisasi (Solana RPC / IPFS Gateway) terganggu sehingga keabsahan aset TIDAK DAPAT DIPASTIKAN. Ini BUKAN vonis 'tidak valid' atau 'dicabut'.",
        },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Gagal memverifikasi aset di blockchain",
        reason: result.reason,
        asset,
        timings: result.timings,
      },
      { status: 502 }
    );
  }

  // ─── Cek penerbit: updateAuthority harus = alamat wallet admin ───
  // Fail-closed: bila alamat admin tidak terkonfigurasi (getAdminWalletAddress
  // melempar), cek dinyatakan TIDAK DAPAT DIPASTIKAN dan vonis TIDAK BOLEH
  // bersih — jangan pernah lolos diam-diam. Berbeda dengan
  // app/api/verify/route.ts yang gagalkan cek tanpa log dan tanpa membedakan
  // "tidak terkonfigurasi" dari "tidak sesuai": di sini keduanya dibedakan
  // lewat status cek dan dicatat di log server.
  let adminAddress = "";
  let adminConfigError = false;
  try {
    adminAddress = getAdminWalletAddress();
  } catch (error) {
    adminConfigError = true;
    console.error(
      "[Tingkat-1] Alamat wallet admin tidak terkonfigurasi — cek penerbit gagal tertutup:",
      error instanceof Error ? error.message : String(error)
    );
  }
  const issuerMatch =
    !adminConfigError &&
    adminAddress !== "" &&
    result.updateAuthority === adminAddress;

  // ─── Vonis ──────────────────────────────────────────────────────
  // Prioritas: DICABUT dulu — pencabutan adalah status terminal aset itu
  // sendiri; cek penerbit atas aset yang sudah dicabut tidak relevan lagi,
  // dan aset dicabut TIDAK BOLEH terbaca sebagai sekadar "penerbit salah".
  // Lalu penerbit tidak sesuai / tidak dapat dipastikan → TIDAK DAPAT
  // DIPERIKSA (ditentukan positif salah, atau tidak dapat ditentukan —
  // keduanya bukan vonis bersih). "TIDAK DAPAT DIPASTIKAN" TIDAK dipakai
  // untuk vonis di sini: frasa itu sudah bermakna khusus tingkat-2
  // ("tidak dapat dipastikan tanpa Tier 1"), sedangkan di sini kegagalan
  // ditentukan dari data tingkat-1 sendiri.
  let verdict = "DAPAT DIPERIKSA";
  if (result.revoked) {
    verdict = "DICABUT";
  } else if (!issuerMatch) {
    verdict = "TIDAK DAPAT DIPERIKSA";
  }

  return NextResponse.json({
    success: true,
    level: "TINGKAT 1",
    verdict,
    asset,
    owner: result.owner,
    name: result.name,
    uri: result.uri,
    frozen: result.frozen,
    revoked: result.revoked,
    updateAuthority: result.updateAuthority,
    dataHash: result.dataHash,
    prodi: result.prodi || null,
    tahunLulus: result.tahunLulus || null,
    image: result.image || null,
    attributes: result.attributes || [],
    timings: result.timings,
    checks: {
      tokenExists: {
        status: "DAPAT DIPERIKSA",
        detail: "Aset terdaftar aktif di blockchain Solana (Metaplex Core)",
      },
      issuerAuthority: {
        status: adminConfigError
          ? "TIDAK DAPAT DIPASTIKAN"
          : issuerMatch
            ? "DAPAT DIPERIKSA"
            : "TIDAK SESUAI",
        detail: adminConfigError
          ? "Alamat wallet admin tidak terkonfigurasi di server — pemeriksaan penerbit tidak dapat dilakukan"
          : issuerMatch
            ? `Penerbit cocok dengan alamat resmi institusi: ${result.updateAuthority}`
            : `Penerbit aset (${result.updateAuthority}) bukan alamat resmi institusi`,
      },
      statusPencabutan: {
        status: result.revoked ? "DICABUT" : "DAPAT DIPERIKSA",
        detail: result.revoked
          ? "Metadata terkini menyatakan aset ini dicabut ([DIBATALKAN])"
          : "Metadata terkini tidak menyatakan aset dicabut",
      },
      tokenFrozen: {
        status: result.frozen ? "DAPAT DIPERIKSA" : "TIDAK BEKU",
        detail: result.frozen
          ? "Aset dibekukan permanen oleh plugin PermanentFreezeDelegate (Soulbound NFT non-transferable)"
          : "Aset tidak dalam status beku",
      },
      dataHashOnChain: {
        status: result.dataHash ? "DAPAT DIPERIKSA" : "TIDAK DITEMUKAN",
        detail: result.dataHash,
      },
      nominatifMatch: {
        status: "TIDAK DAPAT DIPASTIKAN",
        detail:
          "Hitung-ulang dataHash membutuhkan salt institusi yang hanya tersimpan di database Tier 1",
      },
      identityBinding: {
        status: "TIDAK DAPAT DIPASTIKAN",
        detail:
          "Pencocokan ikatan dompet dengan identitas nama/NIM mahasiswa memerlukan database Tier 1",
      },
    },
    warning:
      "Tingkat 2 (nominatif: mencocokkan nama/NIM/prodi) TIDAK DAPAT DIPASTIKAN tanpa Tier 1 — ini BUKAN vonis 'tidak valid'.",
  });
}
