"use client";

import { useState } from "react";
import Link from "next/link";
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

export default function HomePage() {
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
    <div className="min-h-screen bg-[#0A0A0F] text-white overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-[#27272A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold gradient-text">SIJAGA</h1>
              </div>
            </div>
            <div className="flex gap-3">
              <Link href="/login">
                <Button variant="ghost" size="sm">Login</Button>
              </Link>
              <a href="#verifikasi">
                <Button variant="outline" size="sm">Verifikasi Ijazah</Button>
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 gradient-bg-hero">
        {/* Grid Pattern */}
        <div className="absolute inset-0 grid-pattern opacity-50" />

        {/* Floating Orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-red-600/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-red-600/3 rounded-full blur-[120px]" />

        <div className="relative max-w-7xl mx-auto text-center">
          <div className="animate-fade-in-up">
            <Badge variant="red" className="mb-6 px-4 py-1.5 text-sm">
              ⛓️ Powered by Solana Blockchain
            </Badge>
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 animate-fade-in-up delay-100" style={{ animationFillMode: "backwards" }}>
            Verifikasi Ijazah{" "}
            <span className="gradient-text">Anti-Pemalsuan</span>
          </h2>

          <p className="text-lg sm:text-xl text-[#A1A1AA] max-w-3xl mx-auto mb-10 animate-fade-in-up delay-200" style={{ animationFillMode: "backwards" }}>
            Sistem distribusi dan verifikasi ijazah berbasis{" "}
            <span className="text-white font-medium">NFT Soulbound</span> di
            blockchain Solana. Keaslian ijazah yang tidak bisa
            dipalsukan dan terverifikasi dalam hitungan detik.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up delay-300" style={{ animationFillMode: "backwards" }}>
            <a href="#verifikasi">
              <Button size="lg" className="px-8">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                Verifikasi Sekarang
              </Button>
            </a>
            <Link href="/login">
              <Button variant="secondary" size="lg" className="px-8">
                Masuk Portal
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* What is SIJAGA */}
      <section className="py-20 px-4 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl sm:text-4xl font-bold mb-4">
              Apa Itu <span className="gradient-text">SIJAGA</span>?
            </h3>
            <p className="text-[#A1A1AA] max-w-2xl mx-auto text-lg">
              Sistem Jaminan Autentikasi Gelar Akademik — solusi modern untuk
              menjamin keaslian dokumen akademik menggunakan teknologi blockchain.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                ),
                title: "Anti Pemalsuan",
                desc: "NFT Soulbound tidak bisa dipindahtangankan atau dipalsukan. Setiap ijazah tercatat permanen di blockchain Solana.",
              },
              {
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                  </svg>
                ),
                title: "Verifikasi Instan",
                desc: "Verifikasi keaslian ijazah dalam hitungan detik. Tidak perlu proses legalisir manual yang memakan waktu berhari-hari.",
              },
              {
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="2" y1="12" x2="22" y2="12"/>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                  </svg>
                ),
                title: "Akses Global",
                desc: "Siapa pun di dunia bisa memverifikasi ijazah tanpa perlu login, tanpa perlu memahami blockchain.",
              },
            ].map((feature, i) => (
              <div
                key={feature.title}
                className="glass-card rounded-xl p-6 animate-fade-in-up"
                style={{ animationDelay: `${i * 0.1}s`, animationFillMode: "backwards" }}
              >
                <div className="w-12 h-12 rounded-lg bg-red-600/10 border border-red-600/20 flex items-center justify-center text-red-500 mb-4">
                  {feature.icon}
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">
                  {feature.title}
                </h4>
                <p className="text-[#A1A1AA] text-sm leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 relative border-t border-[#27272A]">
        <div className="absolute inset-0 gradient-bg-hero" />
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl sm:text-4xl font-bold mb-4">
              Cara <span className="gradient-text">Kerja</span>
            </h3>
            <p className="text-[#A1A1AA] max-w-2xl mx-auto">
              Proses verifikasi ijazah yang aman dan transparan dalam 4 langkah sederhana
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                title: "Daftar Wallet",
                desc: "Mahasiswa mendaftarkan alamat wallet Phantom untuk menerima NFT ijazah",
              },
              {
                step: "02",
                title: "Verifikasi Admin",
                desc: "Admin kampus memverifikasi identitas dan wallet mahasiswa",
              },
              {
                step: "03",
                title: "Mint NFT Ijazah",
                desc: "Admin menerbitkan NFT Soulbound ijazah ke wallet mahasiswa",
              },
              {
                step: "04",
                title: "Verifikasi Publik",
                desc: "Siapa pun bisa memverifikasi keaslian ijazah secara real-time",
              },
            ].map((item, i) => (
              <div
                key={item.step}
                className="relative glass-card rounded-xl p-6 animate-fade-in-up"
                style={{ animationDelay: `${i * 0.15}s`, animationFillMode: "backwards" }}
              >
                <div className="text-4xl font-bold gradient-text opacity-30 mb-3">
                  {item.step}
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">
                  {item.title}
                </h4>
                <p className="text-[#71717A] text-sm leading-relaxed">
                  {item.desc}
                </p>
                {i < 3 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 text-[#27272A]">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Features */}
      <section className="py-20 px-4 border-t border-[#27272A]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl sm:text-4xl font-bold mb-4">
              Fitur <span className="gradient-text">Unggulan</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                icon: "🔥",
                title: "Revoke & Burn",
                desc: "Admin dapat mencabut/merevoke ijazah yang terindikasi kecurangan. Data di-backup otomatis sebelum revokasi.",
              },
              {
                icon: "💾",
                title: "Backup & Recovery",
                desc: "Sistem backup otomatis untuk melindungi data mahasiswa. Recovery mudah jika terjadi kehilangan data.",
              },
              {
                icon: "📋",
                title: "Audit Trail",
                desc: "Setiap aksi tercatat di audit log. Transparansi penuh atas semua operasi yang dilakukan di sistem.",
              },
              {
                icon: "🔗",
                title: "On-Chain Verification",
                desc: "Bukti keaslian dapat diverifikasi langsung di Solana Explorer. Tidak bergantung pada server kampus.",
              },
            ].map((feature, i) => (
              <div
                key={feature.title}
                className="glass-card rounded-xl p-6 flex gap-4 animate-fade-in-up"
                style={{ animationDelay: `${i * 0.1}s`, animationFillMode: "backwards" }}
              >
                <div className="text-3xl flex-shrink-0">{feature.icon}</div>
                <div>
                  <h4 className="text-lg font-semibold text-white mb-1">
                    {feature.title}
                  </h4>
                  <p className="text-[#A1A1AA] text-sm leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Verification Section */}
      <section id="verifikasi" className="py-20 px-4 border-t border-[#27272A] relative">
        <div className="absolute inset-0 gradient-bg-hero" />
        <div className="relative max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h3 className="text-3xl sm:text-4xl font-bold mb-4">
              <span className="gradient-text">Verifikasi</span> Ijazah
            </h3>
            <p className="text-[#A1A1AA]">
              Masukkan alamat wallet Solana untuk memverifikasi keaslian ijazah
            </p>
          </div>

          {/* Verification Form */}
          <div className="glass-card rounded-xl p-8 animate-pulse-glow">
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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                Verifikasi Sekarang
              </Button>
            </form>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-6 glass-card rounded-xl p-6 border-red-600/30 animate-fade-in">
              <div className="flex items-center space-x-3">
                <div className="text-red-500 text-2xl">✕</div>
                <div>
                  <p className="font-medium text-red-400">Verifikasi Gagal</p>
                  <p className="text-red-400/70 text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="mt-6 animate-fade-in-up">
              {result.revoked ? (
                /* REVOKED */
                <div className="glass-card rounded-xl overflow-hidden border-red-600/40">
                  <div className="px-6 py-4 bg-red-900/20 border-b border-red-600/20">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="15" y1="9" x2="9" y2="15"/>
                          <line x1="9" y1="9" x2="15" y2="15"/>
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-red-400">
                          Ijazah DIREVOKE
                        </h4>
                        <p className="text-red-400/70 text-sm">
                          Ijazah ini telah dicabut oleh pihak universitas
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    {result.data && (
                      <div className="grid grid-cols-2 gap-4">
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
                      <p className="text-xs text-[#71717A] uppercase tracking-wider mb-1">Alasan Revokasi</p>
                      <p className="text-red-400">{result.revokeReason}</p>
                    </div>
                    {result.revokedAt && (
                      <p className="text-xs text-[#52525B]">
                        Direvoke pada: {new Date(result.revokedAt).toLocaleDateString("id-ID", {
                          day: "numeric", month: "long", year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                </div>
              ) : result.verified ? (
                /* VERIFIED */
                <div className="glass-card rounded-xl overflow-hidden border-emerald-600/30">
                  <div className="px-6 py-4 bg-emerald-900/20 border-b border-emerald-600/20">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-600/20 flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-emerald-400">
                          Ijazah Terverifikasi
                        </h4>
                        <p className="text-emerald-400/70 text-sm">
                          Diterbitkan oleh Universitas Tadulako
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    {result.data && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <p className="text-xs text-[#71717A] uppercase tracking-wider">Nama</p>
                            <p className="text-white font-medium text-lg">{result.data.nama}</p>
                          </div>
                          <div>
                            <p className="text-xs text-[#71717A] uppercase tracking-wider">NIM</p>
                            <p className="text-[#A1A1AA]">{result.data.nim}</p>
                          </div>
                          <div>
                            <p className="text-xs text-[#71717A] uppercase tracking-wider">Program Studi</p>
                            <p className="text-[#A1A1AA]">{result.data.prodi}</p>
                          </div>
                          <div>
                            <p className="text-xs text-[#71717A] uppercase tracking-wider">Tahun Lulus</p>
                            <p className="text-[#A1A1AA]">{result.data.tahunLulus}</p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <p className="text-xs text-[#71717A] uppercase tracking-wider">Penerbit</p>
                            <p className="text-[#A1A1AA]">{result.data.penerbit}</p>
                          </div>
                          <div>
                            <p className="text-xs text-[#71717A] uppercase tracking-wider">Status</p>
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
                    )}

                    {result.explorerUrl && (
                      <div className="mt-6 pt-6 border-t border-[#27272A]">
                        <a
                          href={result.explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-red-400 hover:text-red-300 font-medium text-sm transition-colors"
                        >
                          Lihat di Solana Explorer
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                            <polyline points="15 3 21 3 21 9"/>
                            <line x1="10" y1="14" x2="21" y2="3"/>
                          </svg>
                        </a>
                        <p className="text-xs text-[#52525B] mt-1">
                          Bukti on-chain yang bisa diverifikasi secara independen
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* NOT FOUND */
                <div className="glass-card rounded-xl overflow-hidden border-amber-600/30">
                  <div className="px-6 py-4 bg-amber-900/20 border-b border-amber-600/20">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-amber-600/20 flex items-center justify-center text-amber-400 text-lg">
                        ⚠
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-amber-400">
                          Tidak Ditemukan
                        </h4>
                        <p className="text-amber-400/70 text-sm">
                          {result.message}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#27272A] py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                </div>
                <span className="font-bold gradient-text">SIJAGA</span>
              </div>
              <p className="text-[#52525B] text-sm">
                Sistem Jaminan Autentikasi Gelar Akademik
              </p>
            </div>
            <div className="text-center md:text-right text-sm">
              <p className="text-[#71717A]">
                Universitas Tadulako &middot; Tugas Akhir S1 Informatika
              </p>
              <p className="text-[#52525B] mt-1">
                Blockchain Solana &middot; NFT Soulbound &middot; Metaplex
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
