import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { GlobalLoadingWrapper } from "@/components/LoadingContext";
import { LenisProvider } from "@/components/LenisProvider";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-main",
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sijaga-seven.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "SIJAGA | Sistem Jaminan Autentikasi Gelar Akademik Universitas Tadulako",
    template: "%s | SIJAGA Universitas Tadulako"
  },
  description: "Platform resmi verifikasi ijazah anti-pemalsuan berbasis NFT Soulbound (SBT) pada jaringan Solana untuk alumni Universitas Tadulako.",
  keywords: [
    "SIJAGA", 
    "Universitas Tadulako", 
    "Untad", 
    "Blockchain", 
    "NFT", 
    "Soulbound Token", 
    "SBT", 
    "Ijazah Digital", 
    "Verifikasi Ijazah", 
    "Solana"
  ],
  authors: [{ name: "Universitas Tadulako" }],
  creator: "Universitas Tadulako",
  publisher: "Universitas Tadulako",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "SIJAGA | Universitas Tadulako",
    description: "Sistem Jaminan Autentikasi Gelar Akademik berbasis NFT di jaringan Solana.",
    url: appUrl,
    siteName: "SIJAGA Untad",
    images: [
      {
        url: `${appUrl}/web-app-manifest-512x512.png`,
        width: 512,
        height: 512,
        alt: "Logo SIJAGA Universitas Tadulako",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SIJAGA | Universitas Tadulako",
    description: "Sistem Jaminan Autentikasi Gelar Akademik berbasis NFT di Solana.",
    images: [`${appUrl}/web-app-manifest-512x512.png`],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${spaceGrotesk.className} antialiased`}>
        <LenisProvider>
          <GlobalLoadingWrapper>
            {children}
            <Toaster position="top-right" richColors />
          </GlobalLoadingWrapper>
        </LenisProvider>
      </body>
    </html>
  );
}
