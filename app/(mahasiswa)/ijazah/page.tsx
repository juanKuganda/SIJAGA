"use client";

import { useEffect, useState } from "react";
import Card, { CardContent, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface User {
  id: string;
  nama: string;
  nim: string;
  email: string;
  prodi: string;
  angkatan: string;
}

interface Wallet {
  walletAddress: string;
  status: string;
}

interface Certificate {
  status: string;
  nftAddress: string;
  txSignature: string;
  issuedAt: string;
  claimedAt: string;
  revokedAt: string;
  revokeReason: string;
}

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-[#27272A] rounded ${className}`} />
  );
}

function SkeletonCard() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function IjazahPage() {
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/wallet/status").then((r) => r.json()),
      fetch("/api/nft/status").then((r) => r.json()),
    ])
      .then(([userData, walletData, certData]) => {
        setUser(userData.user);
        setWallet(walletData.wallet);
        setCertificate(certData.certificate);
      })
      .catch(() => setError("Gagal memuat data. Silakan coba lagi."))
      .finally(() => setLoading(false));
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "NOT_ISSUED":
        return <Badge variant="default">Belum Diterbitkan</Badge>;
      case "MINTED":
        return <Badge variant="info">Sudah Diterbitkan</Badge>;
      case "CLAIMED":
        return <Badge variant="success">Sudah Diklaim</Badge>;
      case "REVOKED":
        return <Badge variant="danger">DIREVOKE</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const truncateAddress = (addr: string, chars = 8) => {
    if (!addr) return "-";
    if (addr.length <= chars * 2 + 3) return addr;
    return `${addr.slice(0, chars)}...${addr.slice(-chars)}`;
  };

  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="space-y-6">
          <SkeletonCard />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  const status = certificate?.status || "NOT_ISSUED";
  const blinksClaimUrl = user?.nim
    ? `/api/actions/claim?nim=${user.nim}`
    : "#";

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Detail Ijazah</h1>
        <p className="text-[#71717A] mt-1">
          Informasi lengkap ijazah digital dan status klaim NFT Anda
        </p>
      </div>

      <div className="space-y-6">
        {/* Status Card */}
        <Card
          glow={
            status === "MINTED" || status === "CLAIMED"
          }
        >
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-lg font-semibold text-white">
                Status Ijazah
              </h2>
              {getStatusBadge(status)}
            </div>
          </CardHeader>
          <CardContent>
            {status === "NOT_ISSUED" && (
              <div className="text-center py-8">
                <div className="w-14 h-14 rounded-full bg-[#1A1A24] border border-[#27272A] flex items-center justify-center mx-auto mb-4">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#52525B"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <p className="text-[#A1A1AA] font-medium">
                  Ijazah Belum Diterbitkan
                </p>
                <p className="text-[#71717A] text-sm mt-1">
                  Ijazah digital Anda belum diterbitkan oleh admin. Silakan
                  hubungi bagian akademik untuk informasi lebih lanjut.
                </p>
              </div>
            )}

            {status === "MINTED" && (
              <div>
                <div className="p-4 bg-sky-900/10 border border-sky-600/20 rounded-lg mb-6">
                  <p className="text-sky-400 font-medium text-sm">
                    Ijazah Anda Sudah Diterbitkan
                  </p>
                  <p className="text-sky-400/70 text-sm mt-1">
                    Ijazah digital sudah siap diklaim. Klik tombol di bawah
                    untuk mengklaim NFT ijazah ke wallet Anda melalui Solana
                    Blinks.
                  </p>
                </div>
                <a
                  href={blinksClaimUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Klaim Ijazah
                </a>
              </div>
            )}

            {status === "CLAIMED" && (
              <div>
                <div className="p-4 bg-emerald-900/10 border border-emerald-600/20 rounded-lg mb-6">
                  <p className="text-emerald-400 font-medium text-sm">
                    Ijazah Sudah Diklaim
                  </p>
                  <p className="text-emerald-400/70 text-sm mt-1">
                    NFT ijazah sudah berhasil diklaim ke wallet Anda. Anda dapat
                    melihat detailnya di Solana Explorer.
                  </p>
                </div>
                {certificate?.nftAddress && (
                  <a
                    href={`https://explorer.solana.com/address/${certificate.nftAddress}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1A1A24] border border-[#27272A] hover:border-red-600/30 text-white font-medium rounded-lg transition-colors text-sm"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    Lihat di Solana Explorer
                  </a>
                )}
              </div>
            )}

            {status === "REVOKED" && (
              <div className="p-4 bg-red-900/10 border border-red-600/20 rounded-lg">
                <p className="text-red-400 font-medium text-sm">
                  Ijazah Telah Direvoke
                </p>
                <p className="text-red-400/70 text-sm mt-1">
                  Sertifikat ijazah Anda telah dicabut oleh pihak universitas.
                </p>
                {certificate?.revokeReason && (
                  <div className="mt-3 pt-3 border-t border-red-600/20">
                    <p className="text-xs text-red-400/50 uppercase tracking-wider">
                      Alasan
                    </p>
                    <p className="text-red-400 text-sm mt-1">
                      {certificate.revokeReason}
                    </p>
                  </div>
                )}
                {certificate?.revokedAt && (
                  <p className="text-red-400/50 text-xs mt-2">
                    Tanggal Revoke: {formatDate(certificate.revokedAt)}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Student Info Card */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-white">
                Informasi Mahasiswa
              </h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { label: "Nama", value: user?.nama },
                  { label: "NIM", value: user?.nim },
                  { label: "Program Studi", value: user?.prodi || "-" },
                  { label: "Angkatan", value: user?.angkatan || "-" },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-xs text-[#71717A] uppercase tracking-wider">
                      {item.label}
                    </p>
                    <p className="font-medium text-white mt-0.5">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Blockchain Details Card */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-white">
                Detail Blockchain
              </h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Wallet Address */}
                <div>
                  <p className="text-xs text-[#71717A] uppercase tracking-wider">
                    Alamat Wallet
                  </p>
                  {wallet?.walletAddress ? (
                    <p className="font-mono text-sm break-all text-[#A1A1AA] bg-[#0A0A0F] p-3 rounded-lg mt-1">
                      {wallet.walletAddress}
                    </p>
                  ) : (
                    <p className="text-[#71717A] text-sm mt-0.5">
                      Belum terdaftar
                    </p>
                  )}
                </div>

                {/* NFT Address */}
                <div>
                  <p className="text-xs text-[#71717A] uppercase tracking-wider">
                    NFT Address
                  </p>
                  {certificate?.nftAddress ? (
                    <a
                      href={`https://explorer.solana.com/address/${certificate.nftAddress}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-sm break-all text-red-400 hover:text-red-300 transition-colors mt-0.5 inline-block"
                    >
                      {truncateAddress(certificate.nftAddress, 12)}
                    </a>
                  ) : (
                    <p className="text-[#71717A] text-sm mt-0.5">-</p>
                  )}
                </div>

                {/* Transaction Signature */}
                <div>
                  <p className="text-xs text-[#71717A] uppercase tracking-wider">
                    Transaction Signature
                  </p>
                  {certificate?.txSignature ? (
                    <a
                      href={`https://explorer.solana.com/tx/${certificate.txSignature}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-sm break-all text-red-400 hover:text-red-300 transition-colors mt-0.5 inline-block"
                    >
                      {truncateAddress(certificate.txSignature, 12)}
                    </a>
                  ) : (
                    <p className="text-[#71717A] text-sm mt-0.5">-</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Certificate Metadata Card */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-white">
              Metadata Sertifikat
            </h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-[#71717A] uppercase tracking-wider">
                  Tanggal Diterbitkan
                </p>
                <p className="text-white font-medium mt-0.5">
                  {certificate?.issuedAt
                    ? formatDate(certificate.issuedAt)
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#71717A] uppercase tracking-wider">
                  Tanggal Diklaim
                </p>
                <p className="text-white font-medium mt-0.5">
                  {certificate?.claimedAt
                    ? formatDate(certificate.claimedAt)
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#71717A] uppercase tracking-wider">
                  NFT Address
                </p>
                <p className="font-mono text-sm text-[#A1A1AA] mt-0.5">
                  {certificate?.nftAddress
                    ? truncateAddress(certificate.nftAddress, 12)
                    : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
