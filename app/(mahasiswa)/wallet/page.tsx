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

  const isValidSolanaAddress = (addr: string): boolean => {
    // Base58 format, 32-44 characters
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!isValidSolanaAddress(walletAddress)) {
      setError("Format wallet address tidak valid. Gunakan alamat Solana (base58, 32-44 karakter).");
      return;
    }

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
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#27272A] border-t-red-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Wallet Saya</h1>
        <p className="text-[#71717A] mt-1">
          Daftarkan alamat wallet Phantom Anda untuk menerima ijazah digital
        </p>
      </div>

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-white">
              {wallet ? "Status Wallet" : "Daftarkan Wallet"}
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
                  <div className="mt-1">{getStatusBadge(wallet.status)}</div>
                </div>

                {wallet.status === "PENDING" && (
                  <div className="p-4 bg-amber-900/10 border border-amber-600/20 rounded-lg">
                    <p className="text-amber-400 font-medium text-sm">
                      Menunggu Verifikasi
                    </p>
                    <p className="text-amber-400/70 text-sm mt-1">
                      Wallet Anda sedang diverifikasi oleh admin. Proses ini
                      biasanya memakan waktu 1-2 hari kerja.
                    </p>
                  </div>
                )}

                {wallet.status === "VERIFIED" && (
                  <div className="p-4 bg-emerald-900/10 border border-emerald-600/20 rounded-lg">
                    <p className="text-emerald-400 font-medium text-sm">
                      Wallet Terverifikasi
                    </p>
                    <p className="text-emerald-400/70 text-sm mt-1">
                      Wallet Anda sudah terverifikasi. Admin dapat menerbitkan
                      NFT ijazah ke wallet ini.
                    </p>
                  </div>
                )}

                {wallet.status === "REJECTED" && (
                  <div className="p-4 bg-red-900/10 border border-red-600/20 rounded-lg">
                    <p className="text-red-400 font-medium text-sm">Wallet Ditolak</p>
                    <p className="text-red-400/70 text-sm mt-1">
                      Wallet Anda ditolak oleh admin. Anda bisa mendaftarkan wallet baru.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        setWallet(null);
                        setWalletAddress("");
                        setError("");
                        setSuccess("");
                      }}
                    >
                      Daftarkan Wallet Baru
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="p-4 bg-sky-900/10 border border-sky-600/20 rounded-lg">
                  <p className="text-sky-400 font-medium text-sm">
                    Cara Mendapatkan Alamat Wallet
                  </p>
                  <ol className="text-sky-400/70 text-sm mt-2 space-y-1 list-decimal list-inside">
                    <li>Install ekstensi Phantom Wallet di browser Anda</li>
                    <li>Buat wallet baru atau import wallet yang sudah ada</li>
                    <li>Klik ikon wallet dan copy alamat wallet Anda</li>
                    <li>Paste alamat wallet di form di bawah ini</li>
                  </ol>
                </div>

                {error && (
                  <div className="p-3 bg-red-900/20 border border-red-600/30 rounded-lg text-sm text-red-400">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="p-3 bg-emerald-900/20 border border-emerald-600/30 rounded-lg text-sm text-emerald-400">
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

                <Button type="submit" className="w-full" loading={submitting} size="lg">
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
