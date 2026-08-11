"use client";

import { useEffect, useState } from "react";
import { FileText, CheckCircle2, Clock, XCircle, User, Info, ExternalLink, ShieldAlert, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
        return <Badge variant="secondary" className="bg-slate-100 text-slate-700">Belum Diterbitkan</Badge>;
      case "MINTED":
        return <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">Sudah Diterbitkan</Badge>;
      case "CLAIMED":
        return <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">Sudah Diklaim</Badge>;
      case "REVOKED":
        return <Badge variant="destructive">DIREVOKE</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
          <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
          <div className="h-4 w-72 bg-muted rounded-lg animate-pulse mt-2" />
        </div>
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="h-24 bg-muted rounded-lg animate-pulse" />
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="h-32 bg-muted rounded-lg animate-pulse" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="h-32 bg-muted rounded-lg animate-pulse" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <XCircle className="w-12 h-12 text-red-600 mb-4" />
        <p className="text-red-600 font-semibold mb-4">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Coba Lagi
        </Button>
      </div>
    );
  }

  const status = certificate?.status || "NOT_ISSUED";
  const appUrl = typeof window !== 'undefined' ? window.location.origin : "http://localhost:3000";
  const actionUrl = `${appUrl}/api/actions/claim?nim=${user?.nim}`;
  const blinksClaimUrl = user?.nim
    ? `https://dial.to/?action=solana-action:${encodeURIComponent(actionUrl)}`
    : "#";

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Detail Ijazah</h1>
        <p className="text-muted-foreground mt-1">
          Informasi lengkap ijazah digital dan status klaim NFT Anda
        </p>
      </div>

      <div className="space-y-6">
        {/* Status Card */}
        <Card className={`hover:shadow-md transition-shadow ${status === "MINTED" || status === "CLAIMED" ? "border-emerald-200" : ""}`}>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="flex items-center gap-2">
                <Award className={`w-5 h-5 ${status === "MINTED" || status === "CLAIMED" ? "text-emerald-600" : "text-foreground"}`} />
                Status Ijazah
              </CardTitle>
              {getStatusBadge(status)}
            </div>
          </CardHeader>
          <CardContent>
            {status === "NOT_ISSUED" && (
              <div className="text-center py-10">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-foreground font-bold">
                  Ijazah Belum Diterbitkan
                </p>
                <p className="text-muted-foreground text-sm mt-1 max-w-md mx-auto">
                  Ijazah digital Anda belum diterbitkan oleh admin. Silakan
                  hubungi bagian akademik untuk informasi lebih lanjut.
                </p>
              </div>
            )}

            {status === "MINTED" && (
              <div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6 flex gap-3">
                  <Info className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <p className="text-blue-900 font-bold text-sm mb-1">
                      Ijazah Anda Sudah Diterbitkan
                    </p>
                    <p className="text-blue-800 text-sm">
                      Ijazah digital sudah siap diklaim. Klik tombol di bawah
                      untuk mengklaim NFT ijazah ke wallet Anda melalui Solana
                      Blinks.
                    </p>
                  </div>
                </div>
                <a
                  href={blinksClaimUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors shadow-sm"
                >
                  <Award className="w-5 h-5" />
                  Klaim Ijazah
                </a>
              </div>
            )}

            {status === "CLAIMED" && (
              <div>
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg mb-6 flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-emerald-900 font-bold text-sm mb-1">
                      Ijazah Sudah Diklaim
                    </p>
                    <p className="text-emerald-800 text-sm">
                      NFT ijazah sudah berhasil diklaim ke wallet Anda. Anda dapat
                      melihat detailnya di Solana Explorer.
                    </p>
                  </div>
                </div>
                {certificate?.nftAddress && (
                  <a
                    href={`https://explorer.solana.com/address/${certificate.nftAddress}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-border hover:border-red-600 hover:text-red-600 font-bold rounded-lg transition-colors text-sm shadow-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Lihat di Solana Explorer
                  </a>
                )}
              </div>
            )}

            {status === "REVOKED" && (
              <div className="p-5 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                <ShieldAlert className="w-6 h-6 text-red-600 shrink-0" />
                <div>
                  <p className="text-red-900 font-bold text-base mb-1">
                    Ijazah Telah Direvoke
                  </p>
                  <p className="text-red-800 text-sm mb-3">
                    Sertifikat ijazah Anda telah dicabut oleh pihak universitas.
                  </p>
                  {certificate?.revokeReason && (
                    <div className="mt-3 p-3 bg-white/50 border border-red-100 rounded">
                      <p className="text-xs font-bold text-red-900/60 uppercase tracking-wider mb-1">
                        Alasan
                      </p>
                      <p className="text-red-900 font-medium text-sm">
                        {certificate.revokeReason}
                      </p>
                    </div>
                  )}
                  {certificate?.revokedAt && (
                    <p className="text-red-800/60 font-medium text-xs mt-3">
                      Tanggal Revoke: {formatDate(certificate.revokedAt)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Student Info Card */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Informasi Mahasiswa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {[
                  { label: "Nama Lengkap", value: user?.nama },
                  { label: "NIM", value: user?.nim },
                  { label: "Program Studi", value: user?.prodi || "-" },
                  { label: "Angkatan", value: user?.angkatan || "-" },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                      {item.label}
                    </p>
                    <p className="font-semibold text-foreground text-base">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Blockchain Details Card */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                Detail Blockchain
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {/* Wallet Address */}
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Alamat Wallet
                  </p>
                  {wallet?.walletAddress ? (
                    <div className="font-mono text-sm break-all text-foreground bg-muted p-3 rounded-lg border border-border shadow-inner">
                      {wallet.walletAddress}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm font-medium">
                      Belum terdaftar
                    </p>
                  )}
                </div>

                {/* NFT Address */}
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    NFT Address
                  </p>
                  {certificate?.nftAddress ? (
                    <a
                      href={`https://explorer.solana.com/address/${certificate.nftAddress}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-sm break-all text-red-600 hover:text-red-700 hover:underline transition-colors inline-flex items-center gap-1"
                    >
                      {truncateAddress(certificate.nftAddress, 12)} <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <p className="text-muted-foreground text-sm font-medium">-</p>
                  )}
                </div>

                {/* Transaction Signature */}
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Transaction Signature
                  </p>
                  {certificate?.txSignature ? (
                    <a
                      href={`https://explorer.solana.com/tx/${certificate.txSignature}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-sm break-all text-red-600 hover:text-red-700 hover:underline transition-colors inline-flex items-center gap-1"
                    >
                      {truncateAddress(certificate.txSignature, 12)} <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <p className="text-muted-foreground text-sm font-medium">-</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Certificate Metadata Card */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-emerald-600" />
              Metadata Sertifikat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Tanggal Diterbitkan
                </p>
                <p className="text-foreground font-semibold">
                  {certificate?.issuedAt
                    ? formatDate(certificate.issuedAt)
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Tanggal Diklaim
                </p>
                <p className="text-foreground font-semibold">
                  {certificate?.claimedAt
                    ? formatDate(certificate.claimedAt)
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  NFT Address Lengkap
                </p>
                <p className="font-mono text-xs break-all text-muted-foreground bg-muted p-2 rounded border border-border shadow-inner">
                  {certificate?.nftAddress
                    ? certificate.nftAddress
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
