import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import CopyBlinkLink from "./CopyBlinkLink";
import EditButton from "./EditButton";
import { headers } from "next/headers";
import { CertificateUI } from "@/components/certificate-ui";
import { logoBase64 } from "@/lib/logo-base64";

export default async function DetailIjazahPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      wallet: true,
      certificate: true,
    },
  });

  if (!user) {
    notFound();
  }

  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
  const actionUrl = `${appUrl}/api/actions/claim?nim=${user.nim}`;
  const blinkLink = `https://dial.to/?action=solana-action:${encodeURIComponent(
    actionUrl
  )}`;



  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/mahasiswa"
            className="p-2.5 rounded-xl bg-white border border-border text-muted-foreground hover:text-foreground hover:bg-zinc-50 transition-colors shadow-sm"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </Link>
          <div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Detail Ijazah</h1>
            <p className="text-muted-foreground mt-1">
              Data ijazah untuk NIM: {user.dataDeletedAt ? <span className="text-red-500 font-semibold">[DATA ANONIM]</span> : user.nim}
            </p>
          </div>
        </div>
        <EditButton user={user} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kolom Kiri: Detail Data & Blinks */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-foreground">Data Mahasiswa</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 border-b border-border pb-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Nama Lengkap</p>
                    <p className="text-foreground font-medium">{user.nama}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Program Studi</p>
                    <p className="text-foreground font-medium">{user.prodi || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Angkatan</p>
                    <p className="text-foreground font-medium">{user.angkatan || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Email</p>
                    <p className="text-foreground font-medium">{user.email}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Informasi Wallet & NFT</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Status Wallet</span>
                      <StatusBadge status={user.wallet?.status} type="wallet" />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Wallet Address</span>
                      {user.wallet ? (
                        <span className="text-xs font-mono text-muted-foreground">
                          {user.wallet.walletAddress.slice(0, 8)}...
                          {user.wallet.walletAddress.slice(-6)}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Belum daftar</span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Status Ijazah</span>
                      <StatusBadge status={user.certificate?.status || "NOT_ISSUED"} type="certificate" />
                    </div>
                    
                    {user.certificate && user.certificate.status !== "NOT_ISSUED" && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Tanggal Terbit</span>
                          <span className="text-sm text-foreground">
                            {user.certificate.issuedAt
                              ? new Date(user.certificate.issuedAt).toLocaleDateString("id-ID")
                              : "-"}
                          </span>
                        </div>
                        {user.certificate.nftAddress && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">NFT Address</span>
                            <a
                              href={`https://explorer.solana.com/address/${user.certificate.nftAddress}?cluster=devnet`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-mono text-red-600 hover:text-red-500 transition-colors truncate max-w-[150px] sm:max-w-xs"
                            >
                              {user.certificate.nftAddress}
                            </a>
                          </div>
                        )}
                        {user.certificate.txSignature && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Tx Hash</span>
                            <a
                              href={`https://explorer.solana.com/tx/${user.certificate.txSignature}?cluster=devnet`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-mono text-red-600 hover:text-red-500 transition-colors truncate max-w-[150px] sm:max-w-xs"
                            >
                              {user.certificate.txSignature.slice(0, 16)}...
                            </a>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {user.certificate && user.certificate.status !== "NOT_ISSUED" && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0284C7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">Solana Blinks Link</h2>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Bagikan link di bawah ini kepada mahasiswa. Mereka bisa mengklaim Ijazah NFT secara langsung melalui aplikasi yang mendukung Blinks (X/Twitter, Dial.to, Phantom, dll).
                </p>
                <CopyBlinkLink blinkUrl={blinkLink} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Kolom Kanan: Preview Ijazah */}
        <div>
          <Card className="h-full">
            <CardHeader>
              <h2 className="text-lg font-semibold text-foreground">Preview Ijazah</h2>
              <p className="text-sm text-muted-foreground">
                Visualisasi desain Ijazah Digital
              </p>
            </CardHeader>
            <CardContent>
              {/* Sertifikat Component */}
              <div className="w-full aspect-[1.414] overflow-hidden rounded-md border border-zinc-200">
                <CertificateUI
                  prodi={user.prodi || ""}
                  tahunLulus={user.angkatan || ""}
                  dataHash={user.certificate?.dataHash || undefined}
                  isRevoked={user.certificate?.status === 'REVOKED'}
                  logoBase64={logoBase64}
                />
              </div>
              
              <div className="mt-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Ini adalah representasi visual Ijazah. Metadata asli tersimpan di jaringan IPFS dan NFT Soulbound di blockchain Solana.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
