"use client";

import { useEffect, useState } from "react";
import Card, { CardContent, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

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

export default function ProfilPage() {
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);

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
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getWalletStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="warning">Menunggu Verifikasi</Badge>;
      case "VERIFIED":
        return <Badge variant="success">Terverifikasi</Badge>;
      case "REJECTED":
        return <Badge variant="danger">Ditolak</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getCertStatusBadge = (status: string) => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#27272A] border-t-red-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Profil Saya</h1>
        <p className="text-[#71717A] mt-1">
          Data diri dan status ijazah digital Anda
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Data Diri */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-white">Data Diri</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: "Nama", value: user?.nama },
                { label: "NIM", value: user?.nim },
                { label: "Email", value: user?.email },
                { label: "Program Studi", value: user?.prodi || "-" },
                { label: "Angkatan", value: user?.angkatan || "-" },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-xs text-[#71717A] uppercase tracking-wider">{item.label}</p>
                  <p className="font-medium text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Status Wallet */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-white">
              Status Wallet
            </h2>
          </CardHeader>
          <CardContent>
            {wallet ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-[#71717A] uppercase tracking-wider">Alamat Wallet</p>
                  <p className="font-mono text-sm break-all text-[#A1A1AA] bg-[#0A0A0F] p-3 rounded-lg mt-1">
                    {wallet.walletAddress}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#71717A] uppercase tracking-wider mb-1">Status</p>
                  {getWalletStatusBadge(wallet.status)}
                </div>
                {wallet.status === "PENDING" && (
                  <div className="p-4 bg-amber-900/10 border border-amber-600/20 rounded-lg">
                    <p className="text-amber-400 font-medium text-sm">
                      Wallet Anda sedang menunggu verifikasi oleh admin.
                    </p>
                  </div>
                )}
                {wallet.status === "REJECTED" && (
                  <div className="p-4 bg-red-900/10 border border-red-600/20 rounded-lg">
                    <p className="text-red-400 font-medium text-sm">
                      Wallet Anda ditolak. Silakan daftarkan wallet baru.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-[#1A1A24] border border-[#27272A] flex items-center justify-center mx-auto mb-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#52525B" strokeWidth="2">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                    <line x1="1" y1="10" x2="23" y2="10"/>
                  </svg>
                </div>
                <p className="text-[#71717A] mb-3">
                  Anda belum mendaftarkan wallet
                </p>
                <a
                  href="/wallet"
                  className="text-red-400 hover:text-red-300 font-medium text-sm transition-colors"
                >
                  Daftarkan Wallet →
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Ijazah */}
        <Card className="md:col-span-2">
          <CardHeader>
            <h2 className="text-lg font-semibold text-white">
              Status Ijazah Digital
            </h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-[#71717A] uppercase tracking-wider mb-1">Status</p>
                {certificate ? (
                  getCertStatusBadge(certificate.status)
                ) : (
                  <Badge variant="default">Belum Diterbitkan</Badge>
                )}
              </div>
              {certificate?.nftAddress && (
                <div>
                  <p className="text-xs text-[#71717A] uppercase tracking-wider">NFT Address</p>
                  <p className="font-mono text-sm break-all text-[#A1A1AA]">
                    {certificate.nftAddress}
                  </p>
                </div>
              )}
              {certificate?.txSignature && (
                <div>
                  <p className="text-xs text-[#71717A] uppercase tracking-wider">Transaction</p>
                  <a
                    href={`https://explorer.solana.com/tx/${certificate.txSignature}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-400 hover:text-red-300 font-mono text-sm break-all transition-colors"
                  >
                    {certificate.txSignature.slice(0, 16)}...
                  </a>
                </div>
              )}
            </div>

            {certificate?.status === "MINTED" && (
              <div className="mt-6 p-4 bg-sky-900/10 border border-sky-600/20 rounded-lg">
                <p className="text-sky-400 font-medium text-sm">
                  Ijazah Anda sudah diterbitkan!
                </p>
                <p className="text-sky-400/70 text-sm mt-1">
                  Silakan klaim ijazah Anda melalui link yang dikirimkan oleh admin.
                </p>
                <a
                  href={`/ijazah/${user?.nim}`}
                  className="inline-flex items-center gap-2 mt-3 text-sm font-medium text-sky-400 hover:text-sky-300 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  Lihat Preview Ijazah →
                </a>
              </div>
            )}

            {certificate?.status === "CLAIMED" && (
              <div className="mt-6 p-4 bg-emerald-900/10 border border-emerald-600/20 rounded-lg">
                <p className="text-emerald-400 font-medium text-sm">
                  Ijazah sudah Anda klaim!
                </p>
                <p className="text-emerald-400/70 text-sm mt-1">
                  NFT ijazah sudah ada di wallet Anda. Verifikasi di{" "}
                  <a
                    href={`https://explorer.solana.com/address/${certificate.nftAddress}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-emerald-300"
                  >
                    Solana Explorer
                  </a>
                  .
                </p>
                <a
                  href={`/ijazah/${user?.nim}`}
                  className="inline-flex items-center gap-2 mt-3 text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  Lihat Preview Ijazah →
                </a>
              </div>
            )}

            {certificate?.status === "REVOKED" && (
              <div className="mt-6 p-4 bg-red-900/10 border border-red-600/20 rounded-lg">
                <p className="text-red-400 font-medium text-sm">
                  ⚠ Ijazah Anda Telah Direvoke
                </p>
                <p className="text-red-400/70 text-sm mt-1">
                  Sertifikat ijazah Anda telah dicabut oleh pihak universitas.
                </p>
                {certificate.revokeReason && (
                  <p className="text-red-400/50 text-sm mt-2">
                    Alasan: {certificate.revokeReason}
                  </p>
                )}
                {certificate.revokedAt && (
                  <p className="text-red-400/50 text-xs mt-1">
                    Tanggal: {new Date(certificate.revokedAt).toLocaleDateString("id-ID", {
                      day: "numeric", month: "long", year: "numeric",
                    })}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
