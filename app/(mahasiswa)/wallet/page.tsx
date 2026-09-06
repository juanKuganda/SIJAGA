"use client";

import { useEffect, useState } from "react";
import { Wallet as WalletIcon, CheckCircle2, Clock, XCircle, Info, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

interface Wallet {
  walletAddress: string;
  status: string;
}


// Typing for third-party injected wallets
interface PhantomProvider {
  isPhantom?: boolean;
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  signTransaction: (tx: any) => Promise<any>;
  signMessage: (msg: Uint8Array) => Promise<{ signature: Uint8Array }>;
}

interface SolflareProvider {
  isSolflare?: boolean;
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  signTransaction: (tx: any) => Promise<any>;
  signMessage: (msg: Uint8Array) => Promise<{ signature: Uint8Array }>;
}

interface CustomWindow extends Window {
  phantom?: { solana?: PhantomProvider };
  solflare?: SolflareProvider;
  solana?: PhantomProvider;
}

function getWalletProvider(): PhantomProvider | SolflareProvider | null {
  if (typeof window === "undefined") return null;
  const customWindow = window as unknown as CustomWindow;

  if (customWindow.phantom?.solana?.isPhantom) {
    return customWindow.phantom.solana;
  }
  if (customWindow.solflare?.isSolflare) {
    return customWindow.solflare;
  }
  if (customWindow.solana?.isPhantom) {
    return customWindow.solana;
  }
  return null;
}

export default function WalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
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

  
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">Menunggu Verifikasi</Badge>;
      case "VERIFIED":
        return <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">Terverifikasi</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">Ditolak</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
          <div className="h-4 w-72 bg-muted rounded-lg animate-pulse mt-2" />
        </div>
        <div className="w-full">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Wallet Saya</h1>
        <p className="text-muted-foreground mt-1">
          Daftarkan alamat wallet Phantom Anda untuk menerima ijazah digital
        </p>
      </div>

      <div className="w-full">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <WalletIcon className="w-5 h-5 text-red-600" />
              {wallet ? "Status Wallet" : "Daftarkan Wallet"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {wallet ? (
              <div className="space-y-6">
                <div>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Alamat Wallet</span>
                  <div className="font-mono text-sm break-all text-foreground bg-muted p-4 rounded-lg border border-border shadow-inner">
                    {wallet.walletAddress}
                  </div>
                </div>
                <div>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Status Verifikasi</span>
                  {getStatusBadge(wallet.status)}
                </div>

                {wallet.status === "PENDING" && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
                    <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <p className="text-amber-800 font-bold text-sm mb-1">
                        Menunggu Verifikasi
                      </p>
                      <p className="text-amber-700 text-sm mb-3">
                        Wallet Anda sedang diverifikasi oleh admin fakultas. Proses ini
                        biasanya memakan waktu 1-2 hari kerja.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-amber-300 text-amber-800 hover:bg-amber-100"
                        onClick={() => {
                          setWallet(null);
                          setError("");
                          setSuccess("");
                        }}
                      >
                        Batalkan & Ganti Wallet <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}

                {wallet.status === "VERIFIED" && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-emerald-800 font-bold text-sm mb-1">
                        Wallet Terverifikasi
                      </p>
                      <p className="text-emerald-700 text-sm">
                        Wallet Anda sudah diverifikasi dan terhubung ke profil Anda. Anda sudah bisa menerima NFT Ijazah.
                      </p>
                    </div>
                  </div>
                )}

                {wallet.status === "REJECTED" && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                    <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                    <div>
                      <p className="text-red-800 font-bold text-sm mb-1">Wallet Ditolak</p>
                      <p className="text-red-700 text-sm mb-3">
                        Wallet Anda ditolak oleh admin. Anda bisa mendaftarkan wallet baru.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setWallet(null);
                          setError("");
                          setSuccess("");
                        }}
                      >
                        Daftarkan Wallet Baru <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-blue-600" />
                  <p className="text-blue-800 font-bold text-sm">
                    Cara Menghubungkan Wallet
                  </p>
                </div>
                <p className="text-blue-700 text-sm mt-2 font-medium">
                  Klik tombol di bawah untuk menghubungkan Phantom Wallet yang sudah terinstall di browser Anda secara otomatis.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
                  <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800 font-medium">{error}</p>
                </div>
              )}

              {success && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-emerald-800 font-medium">{success}</p>
                </div>
              )}

              <Button 
                onClick={async () => {
                  setError("");
                  setSuccess("");
                  setSubmitting(true);
                  try {
                    const provider = getWalletProvider();
                    if (!provider) {
                      setError("Wallet tidak ditemukan. Silakan install Phantom Wallet.");
                      setSubmitting(false);
                      return;
                    }
                    const response = await provider.connect();
                    const address = response.publicKey.toString();
                    
                    const res = await fetch("/api/wallet/register", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ walletAddress: address }),
                    });
              
                    const data = await res.json();
              
                    if (!res.ok) {
                      setError(data.error || "Gagal mendaftarkan wallet");
                      return;
                    }
              
                    setSuccess("Wallet berhasil dihubungkan! Menunggu verifikasi admin.");
                    setWallet(data.wallet);
                  } catch (err: any) {
                    setError(err.message || "Terjadi kesalahan saat menghubungkan wallet.");
                  } finally {
                    setSubmitting(false);
                  }
                }} 
                className="w-full font-bold bg-[#AB9FF2] hover:bg-[#9B8FE2] text-white" 
                disabled={submitting} 
                size="lg"
              >
                {submitting ? "Memproses..." : "Hubungkan Phantom Wallet"}
              </Button>
            </div>

            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
