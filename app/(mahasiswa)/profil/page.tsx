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
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Profil Saya</h1>
        <p className="text-gray-600 mt-1">
          Data diri dan status ijazah digital Anda
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Data Diri */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Data Diri</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Nama</p>
                <p className="font-medium">{user?.nama}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">NIM</p>
                <p className="font-medium">{user?.nim}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium">{user?.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Program Studi</p>
                <p className="font-medium">{user?.prodi || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Angkatan</p>
                <p className="font-medium">{user?.angkatan || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Wallet */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">
              Status Wallet
            </h2>
          </CardHeader>
          <CardContent>
            {wallet ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Alamat Wallet</p>
                  <p className="font-mono text-sm break-all">
                    {wallet.walletAddress}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  {getWalletStatusBadge(wallet.status)}
                </div>
                {wallet.status === "PENDING" && (
                  <p className="text-sm text-yellow-600">
                    Wallet Anda sedang menunggu verifikasi oleh admin.
                  </p>
                )}
                {wallet.status === "REJECTED" && (
                  <p className="text-sm text-red-600">
                    Wallet Anda ditolak. Silakan daftarkan wallet baru.
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 mb-4">
                  Anda belum mendaftarkan wallet
                </p>
                <a
                  href="/wallet"
                  className="text-blue-600 hover:text-blue-700 font-medium"
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
            <h2 className="text-lg font-semibold text-gray-900">
              Status Ijazah Digital
            </h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-600">Status</p>
                {certificate ? (
                  getCertStatusBadge(certificate.status)
                ) : (
                  <Badge variant="default">Belum Diterbitkan</Badge>
                )}
              </div>
              {certificate?.nftAddress && (
                <div>
                  <p className="text-sm text-gray-600">NFT Address</p>
                  <p className="font-mono text-sm break-all">
                    {certificate.nftAddress}
                  </p>
                </div>
              )}
              {certificate?.txSignature && (
                <div>
                  <p className="text-sm text-gray-600">Transaction</p>
                  <a
                    href={`https://explorer.solana.com/tx/${certificate.txSignature}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 font-mono text-sm break-all"
                  >
                    {certificate.txSignature.slice(0, 16)}...
                  </a>
                </div>
              )}
            </div>

            {certificate?.status === "MINTED" && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-blue-800 font-medium">
                  Ijazah Anda sudah diterbitkan!
                </p>
                <p className="text-blue-600 text-sm mt-1">
                  Silakan klaim ijazah Anda melalui link yang dikirimkan oleh
                  admin.
                </p>
              </div>
            )}

            {certificate?.status === "CLAIMED" && (
              <div className="mt-6 p-4 bg-green-50 rounded-lg">
                <p className="text-green-800 font-medium">
                  Ijazah sudah Anda klaim!
                </p>
                <p className="text-green-600 text-sm mt-1">
                  NFT ijazah sudah ada di wallet Anda. Anda bisa
                  memverifikasinya di{" "}
                  <a
                    href={`https://explorer.solana.com/address/${certificate.nftAddress}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Solana Explorer
                  </a>
                  .
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
