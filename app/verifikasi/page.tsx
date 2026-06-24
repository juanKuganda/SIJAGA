"use client";

import { useState } from "react";
import Link from "next/link";
import Card, { CardContent, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";

interface VerificationResult {
  verified: boolean;
  revoked?: boolean;
  message?: string;
  revokeReason?: string;
  revokedAt?: string;
  data?: {
    nama: string;
    nim: string;
    prodi: string;
    tahunLulus: string;
    status: string;
    nftAddress: string;
    issuedAt: string;
    penerbit: string;
  };
  explorerUrl?: string;
}

export default function VerifikasiPage() {
  const [wallet, setWallet] = useState("");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);

    try {
      const response = await fetch(`/api/verify?wallet=${wallet}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Verifikasi gagal");
        return;
      }

      setResult(data);
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] relative">
      {/* Background */}
      <div className="absolute inset-0 gradient-bg-hero" />
      <div className="absolute inset-0 grid-pattern opacity-30" />

      <div className="relative max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <Link href="/" className="inline-flex items-center gap-2 mb-6 text-[#71717A] hover:text-red-400 transition-colors text-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            Kembali ke beranda
          </Link>
          <h1 className="text-4xl font-bold text-white mb-4">
            <span className="gradient-text">Verifikasi</span> Ijazah
          </h1>
          <p className="text-lg text-[#A1A1AA]">
            SIJAGA — Sistem Jaminan Autentikasi Gelar Akademik
          </p>
          <p className="text-[#71717A] mt-1">
            Universitas Tadulako
          </p>
        </div>

        {/* Form Verifikasi */}
        <Card className="mb-8 glass-card animate-pulse-glow">
          <CardHeader>
            <h2 className="text-xl font-semibold text-white">
              Cek Keaslian Ijazah
            </h2>
            <p className="text-[#71717A] mt-1">
              Masukkan alamat wallet untuk memverifikasi keaslian ijazah
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify} className="space-y-4">
              <Input
                label="Alamat Wallet"
                placeholder="Contoh: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                required
                helperText="Masukkan alamat wallet Solana yang ingin diverifikasi"
              />

              <Button type="submit" className="w-full" loading={loading} size="lg">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                Verifikasi
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Hasil Verifikasi */}
        {error && (
          <Card className="mb-8 border-red-600/30 animate-fade-in">
            <CardContent>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center flex-shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-red-400">Verifikasi Gagal</p>
                  <p className="text-red-400/70 text-sm">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {result && (
          <div className="animate-fade-in-up">
            {result.revoked ? (
              <Card className="border-red-600/40">
                <CardHeader className="bg-red-900/20">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="15" y1="9" x2="9" y2="15"/>
                        <line x1="9" y1="9" x2="15" y2="15"/>
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-red-400">
                        Ijazah DIREVOKE
                      </h2>
                      <p className="text-red-400/70 text-sm">
                        Ijazah ini telah dicabut oleh pihak universitas
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {result.data && (
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-[#71717A] uppercase tracking-wider">Nama</p>
                        <p className="text-white font-medium">{result.data.nama}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#71717A] uppercase tracking-wider">NIM</p>
                        <p className="text-[#A1A1AA]">{result.data.nim}</p>
                      </div>
                    </div>
                  )}
                  <div className="p-4 bg-red-900/10 border border-red-600/20 rounded-lg">
                    <p className="text-xs text-[#71717A] uppercase tracking-wider mb-1">Alasan</p>
                    <p className="text-red-400">{result.revokeReason}</p>
                  </div>
                  {result.revokedAt && (
                    <p className="text-xs text-[#52525B] mt-3">
                      Direvoke pada: {new Date(result.revokedAt).toLocaleDateString("id-ID", {
                        day: "numeric", month: "long", year: "numeric",
                      })}
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : result.verified && result.data ? (
              <Card className="border-emerald-600/30">
                <CardHeader className="bg-emerald-900/20">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-600/20 flex items-center justify-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-emerald-400">
                        Ijazah Terverifikasi
                      </h2>
                      <p className="text-emerald-400/70 text-sm">
                        Diterbitkan oleh Universitas Tadulako
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      {[
                        { label: "Nama", value: result.data.nama, bold: true },
                        { label: "NIM", value: result.data.nim },
                        { label: "Program Studi", value: result.data.prodi },
                        { label: "Tahun Lulus", value: result.data.tahunLulus },
                      ].map((item) => (
                        <div key={item.label}>
                          <p className="text-xs text-[#71717A] uppercase tracking-wider">{item.label}</p>
                          <p className={`${item.bold ? "font-medium text-lg text-white" : "text-[#A1A1AA]"}`}>
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-[#71717A] uppercase tracking-wider">Penerbit</p>
                        <p className="text-[#A1A1AA]">{result.data.penerbit}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#71717A] uppercase tracking-wider mb-1">Status</p>
                        <Badge variant="success">{result.data.status}</Badge>
                      </div>
                      <div>
                        <p className="text-xs text-[#71717A] uppercase tracking-wider">NFT Address</p>
                        <p className="font-mono text-xs break-all text-[#A1A1AA]">
                          {result.data.nftAddress}
                        </p>
                      </div>
                      {result.data.issuedAt && (
                        <div>
                          <p className="text-xs text-[#71717A] uppercase tracking-wider">Tanggal Terbit</p>
                          <p className="text-[#A1A1AA]">
                            {new Date(result.data.issuedAt).toLocaleDateString("id-ID", {
                              day: "numeric", month: "long", year: "numeric",
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {result.explorerUrl && (
                    <div className="mt-6 pt-6 border-t border-[#27272A]">
                      <a
                        href={result.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-red-400 hover:text-red-300 font-medium transition-colors"
                      >
                        Lihat di Solana Explorer
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                          <polyline points="15 3 21 3 21 9"/>
                          <line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                      </a>
                      <p className="text-xs text-[#52525B] mt-1">
                        Bukti on-chain yang bisa dicek secara independen
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-amber-600/30">
                <CardHeader className="bg-amber-900/20">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-amber-600/20 flex items-center justify-center text-amber-400 text-lg">
                      ⚠
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-amber-400">
                        Tidak Ditemukan
                      </h2>
                      <p className="text-amber-400/70 text-sm">
                        {result.message}
                      </p>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            )}
          </div>
        )}

        {/* Info */}
        <div className="mt-12 text-center text-[#52525B] text-sm">
          <p>
            Sistem ini menggunakan teknologi blockchain Solana untuk memastikan
            keaslian ijazah.
          </p>
          <p className="mt-1">
            Data yang terverifikasi adalah data on-chain yang tidak dapat dimanipulasi.
          </p>
        </div>
      </div>
    </div>
  );
}
