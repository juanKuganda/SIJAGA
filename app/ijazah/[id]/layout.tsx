import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

/**
 * Layout metadata untuk halaman ijazah
 * 
 * PRIVASI: Menggunakan certificateId (CUID) sebagai slug, bukan NIM.
 * OG metadata TIDAK menampilkan nama mahasiswa.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
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

  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://sijaga-seven.vercel.app";
  
  const title = certificate
    ? `Ijazah S1 ${certificate.user?.prodi || "Informatika"} — SIJAGA Untad`
    : `Ijazah — SIJAGA Untad`;
    
  const description = certificate
    ? `${certificate.user?.prodi || 'Informatika'} · Universitas Tadulako · Soulbound NFT di Solana`
    : "Verifikasi ijazah digital Universitas Tadulako di jaringan Solana.";
    
  const image = `${origin}/api/og/ijazah/${encodeURIComponent(id)}`;
  const url = `${origin}/ijazah/${encodeURIComponent(id)}`;

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
