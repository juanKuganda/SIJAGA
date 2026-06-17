import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SIJAGA - Sistem Jaminan Autentikasi Gelar Akademik",
  description:
    "Verifikasi ijazah anti-pemalsuan berbasis NFT Soulbound pada blockchain Solana",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
