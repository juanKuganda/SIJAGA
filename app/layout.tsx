import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-main",
});

export const metadata: Metadata = {
  title: "SIJAGA — Sistem Jaminan Autentikasi Gelar Akademik",
  description:
    "Verifikasi ijazah anti-pemalsuan berbasis NFT Soulbound pada blockchain Solana. Universitas Tadulako.",
  keywords: ["SIJAGA", "blockchain", "NFT", "Soulbound", "ijazah", "verifikasi", "Solana", "Universitas Tadulako"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark">
      <body className={`${spaceGrotesk.className} antialiased`}>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
