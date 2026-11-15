import { NextRequest, NextResponse } from "next/server";
import { inspectCertificate } from "@/lib/onchain";

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
    return NextResponse.json(
      {
        success: false,
        error: "Invalid JSON body",
        detail: error instanceof Error ? error.message : String(error),
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
    let statusCode = 502;
    let errorMessage = "Gagal memverifikasi aset di blockchain";

    if (result.reason === "NOT_FOUND") {
      statusCode = 404;
      errorMessage = "Aset tidak ditemukan di blockchain Solana";
    } else if (result.reason === "METADATA") {
      statusCode = 502;
      errorMessage = "Aset ditemukan, namun metadata IPFS tidak dapat diakses";
    } else if (result.reason === "RPC") {
      statusCode = 503;
      errorMessage = "Koneksi ke Solana RPC mengalami kegagalan / rate limit";
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        reason: result.reason,
        asset,
        timings: result.timings,
      },
      { status: statusCode }
    );
  }

  return NextResponse.json({
    success: true,
    level: "TINGKAT 1",
    verdict: "DAPAT DIPERIKSA",
    asset,
    owner: result.owner,
    name: result.name,
    uri: result.uri,
    frozen: result.frozen,
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
        status: "DAPAT DIPERIKSA",
        detail: result.updateAuthority,
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
