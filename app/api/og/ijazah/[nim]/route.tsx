import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs"; // Prisma requires nodejs runtime, not edge
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export async function GET(_req: Request, { params }: { params: Promise<{ nim: string }> }) {
  const { nim } = await params;
  
  const user = await prisma.user.findUnique({
    where: { nim },
    include: { certificate: true },
  });

  const cluster = process.env.SOLANA_CLUSTER ?? "devnet";
  const piiDeleted = !!user?.dataDeletedAt;
  const displayName = piiDeleted ? "[DATA DIHAPUS]" : (user?.nama ?? "Ijazah Digital");
  const displayNim = piiDeleted ? "[DIHAPUS]" : nim;

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
            {displayName}
          </div>
          <div style={{ fontSize: 28, opacity: 0.85 }}>
            {user?.prodi ?? "Informatika"} · NIM {displayNim}
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
