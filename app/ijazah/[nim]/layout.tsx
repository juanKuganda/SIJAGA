import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ nim: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { nim } = await params;
  
  const user = await prisma.user.findUnique({
    where: { nim },
    include: { certificate: true },
  });

  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://sijaga-seven.vercel.app";
  
  const title = user
    ? `Klaim Ijazah S1 — ${user.nama}`
    : `Ijazah ${nim} — SIJAGA Untad`;
    
  const description = user
    ? `${user.prodi || 'Informatika'} · Universitas Tadulako · Soulbound NFT di Solana`
    : "Verifikasi ijazah digital Universitas Tadulako di jaringan Solana.";
    
  const image = `${origin}/api/og/ijazah/${encodeURIComponent(nim)}`;
  const url = `${origin}/ijazah/${encodeURIComponent(nim)}`;

  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      siteName: "SIJAGA Untad",
      locale: "id_ID",
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default function IjazahLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
