"use client";

import { useEffect, useState } from "react";
import Card, { CardContent, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";

interface Wallet {
  walletAddress: string;
  status: string;
}

export default function WalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/wallet/status")
      .then((r) => r.json())
      .then((data) => {
        setWallet(data.wallet);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/wallet/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Gagal mendaftarkan wallet");
        return;
      }

      setSuccess("Wallet berhasil didaftarkan! Menunggu verifikasi admin.");
      setWallet(data.wallet);
      setWalletAddress("");
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
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
        <h1 className="text-2xl font-bold text-gray-900">Wallet Saya</h1>
        <p className="text-gray-600 mt-1">
          Daftarkan alamat wallet Phantom Anda untuk menerima ijazah digital
        </p>
      </div>

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">
              {wallet ? "Status Wallet" : "Daftarkan Wallet"}
            </h2>
          </CardHeader>
          <CardContent>
            {wallet ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Alamat Wallet</p>
                  <p className="font-mono text-sm break-all bg-gray-50 p-3 rounded-lg">
                    {wallet.walletAddress}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <div className="mt-1">{getStatusBadge(wallet.status)}</div>
                </div>

                {wallet.status === "PENDING" && (
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <p className="text-yellow-800 font-medium">
                      Menunggu Verifikasi
                    </p>
                    <p className="text-yellow-600 text-sm mt-1">
                      Wallet Anda sedang diverifikasi oleh admin. Proses ini
                      biasanya memakan waktu 1-2 hari kerja.
                    </p>
                  </div>
                )}

                {wallet.status === "VERIFIED" && (
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-green-800 font-medium">
                      Wallet Terverifikasi
                    </p>
                    <p className="text-green-600 text-sm mt-1">
                      Wallet Anda sudah terverifikasi. Admin dapat menerbitkan
                      NFT ijazah ke wallet ini.
                    </p>
                  </div>
                )}

                {wallet.status === "REJECTED" && (
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-red-800 font-medium">Wallet Ditolak</p>
                    <p className="text-red-600 text-sm mt-1">
                      Wallet Anda ditolak oleh admin. Silakan hubungi admin
                      untuk informasi lebih lanjut.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg mb-4">
                  <p className="text-blue-800 font-medium">
                    Cara Mendapatkan Alamat Wallet
                  </p>
                  <ol className="text-blue-600 text-sm mt-2 space-y-1 list-decimal list-inside">
                    <li>Install ekstensi Phantom Wallet di browser Anda</li>
                    <li>Buat wallet baru atau import wallet yang sudah ada</li>
                    <li>Klik ikon wallet dan copy alamat wallet Anda</li>
                    <li>Paste alamat wallet di form di bawah ini</li>
                  </ol>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">
                    {success}
                  </div>
                )}

                <Input
                  label="Alamat Wallet Phantom"
                  placeholder="Contoh: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  required
                  helperText="Alamat wallet Solana (base58 format, 32-44 karakter)"
                />

                <Button type="submit" className="w-full" loading={submitting}>
                  Daftarkan Wallet
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
