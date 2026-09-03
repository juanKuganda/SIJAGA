import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs"; // Prisma requires nodejs runtime, not edge
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * OG Image untuk halaman ijazah
 * 
 * PRIVASI: TIDAK menampilkan Nama atau NIM di OG image.
 * Hanya menampilkan informasi non-PII: Prodi, Tahun Lulus, Status.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const certificate = await prisma.certificate.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          prodi: true,
          angkatan: true,
        },
      },
    },
  });

  const cluster = process.env.SOLANA_CLUSTER ?? "devnet";
  const prodi = certificate?.user?.prodi ?? "Informatika";
  const tahunLulus = certificate?.user?.angkatan ?? "-";
  const status = certificate?.status === "REVOKED" ? "DICABUT" : "Terverifikasi";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0B1F17",
          color: "white",
          padding: "64px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 8, fontWeight: 700 }}>SIJAGA · UNTAD</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 56, fontWeight: 800 }}>
            Ijazah S1 — {prodi}
          </div>
          <div style={{ fontSize: 28, opacity: 0.85 }}>
            Tahun Lulus {tahunLulus} · Status: {status}
          </div>
        </div>
        <div style={{ fontSize: 22, opacity: 0.7 }}>
          Soulbound NFT · Solana {cluster}
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
