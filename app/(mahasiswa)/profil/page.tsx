"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { User, Wallet as WalletIcon, FileText, CheckCircle2, Clock, XCircle, AlertTriangle, ExternalLink, ArrowRight, ShieldCheck, Zap, Check } from "lucide-react";

interface UserProfile {
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
  const [user, setUser] = useState<UserProfile | null>(null);
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
        return <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 font-semibold text-xs px-2.5 py-1 rounded-full border border-amber-200">Menunggu Verifikasi</div>;
      case "VERIFIED":
        return <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 font-semibold text-xs px-2.5 py-1 rounded-full border border-emerald-200">Terverifikasi</div>;
      case "REJECTED":
        return <div className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 font-semibold text-xs px-2.5 py-1 rounded-full border border-red-200">Ditolak</div>;
      default:
        return <div className="inline-flex items-center gap-1.5 bg-zinc-100 text-zinc-700 font-semibold text-xs px-2.5 py-1 rounded-full border border-zinc-200">{status}</div>;
    }
  };

  const getCertStatusBadge = (status: string) => {
    switch (status) {
      case "NOT_ISSUED":
        return <div className="inline-flex items-center gap-1.5 bg-zinc-100 text-zinc-700 font-semibold text-xs px-3 py-1.5 rounded-full border border-zinc-200">Belum Diterbitkan</div>;
      case "MINTED":
        return <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 font-semibold text-xs px-3 py-1.5 rounded-full border border-blue-200">Sudah Diterbitkan</div>;
      case "CLAIMED":
        return <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 font-semibold text-xs px-3 py-1.5 rounded-full border border-emerald-200">Sudah Diklaim</div>;
      case "REVOKED":
        return <div className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 font-semibold text-xs px-3 py-1.5 rounded-full border border-red-200">DIREVOKE</div>;
      default:
        return <div className="inline-flex items-center gap-1.5 bg-zinc-100 text-zinc-700 font-semibold text-xs px-3 py-1.5 rounded-full border border-zinc-200">{status}</div>;
    }
  };

  const getProgress = () => {
    let currentStep = 1;
    if (wallet?.status === "PENDING") currentStep = 1;
    else if (wallet?.status === "VERIFIED") {
      currentStep = 2;
      if (certificate?.status === "MINTED") currentStep = 3;
      if (certificate?.status === "CLAIMED") currentStep = 4;
    }
    return currentStep;
  };

  const currentStep = getProgress();

  const steps = [
    { title: "Registrasi", description: "Akun dibuat", active: currentStep >= 1, done: true },
    { title: "Verifikasi Wallet", description: wallet?.status === "REJECTED" ? "Ditolak" : "Pengecekan Admin", active: currentStep >= 1, done: currentStep > 1 || wallet?.status === "VERIFIED", error: wallet?.status === "REJECTED" },
    { title: "Penerbitan Ijazah", description: "Proses Minting", active: currentStep >= 2, done: currentStep > 2 },
    { title: "Klaim Aset", description: "Soulbound Token", active: currentStep >= 3, done: currentStep >= 4 },
  ];

  if (loading) {
    return (
      <div className="p-6 md:p-10">
        <div className="h-10 w-48 bg-zinc-200/50 rounded-xl mb-3 animate-pulse"></div>
        <div className="h-5 w-72 bg-zinc-200/50 rounded-lg mb-12 animate-pulse"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <div className="h-80 bg-white rounded-3xl border border-zinc-100 shadow-sm animate-pulse"></div>
           <div className="h-80 bg-white rounded-3xl border border-zinc-100 shadow-sm animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto font-sans selection:bg-red-100 selection:text-red-900">
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">Profil Digital</h1>
        <p className="text-base text-muted-foreground mt-2 font-medium">
          Kelola identitas dan dompet kripto Anda dengan aman.
        </p>
      </div>

      {/* Progress Stepper */}
      <div className="bg-white rounded-[2rem] border border-zinc-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 mb-8 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-[0.02]">
           <ShieldCheck className="w-64 h-64 text-zinc-900" />
        </div>
        <h2 className="text-lg font-bold tracking-tight mb-8 flex items-center gap-2 relative z-10">
          <Clock className="w-5 h-5 text-blue-500" />
          Proses Penerbitan Ijazah
        </h2>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-0">
          {/* Progress Background Line */}
          <div className="hidden md:block absolute top-6 left-10 right-10 h-1 bg-zinc-100 rounded-full -z-10"></div>
          
          {/* Dynamic Progress Line */}
          <div className="hidden md:block absolute top-6 left-10 h-1 bg-blue-600 rounded-full -z-10 transition-all duration-700 ease-in-out" style={{ width: `calc(${(Math.min(currentStep, 4) - 1) / 3 * 100}% - 2rem)` }}></div>

          {steps.map((step, index) => {
            const isLast = index === steps.length - 1;
            const isError = step.error;
            const isDone = step.done;
            const isActive = step.active;

            return (
              <div key={index} className="flex md:flex-col items-center gap-4 md:gap-3 w-full md:w-32 relative">
                {/* Mobile Line */}
                {!isLast && (
                  <div className={`md:hidden absolute left-5 top-12 bottom-[-1rem] w-0.5 ${isDone ? 'bg-blue-600' : 'bg-zinc-100'}`}></div>
                )}
                
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full border-4 flex items-center justify-center shrink-0 z-10 transition-all duration-300 ${
                  isError ? 'bg-red-50 border-red-100 text-red-600 shadow-[0_0_15px_rgba(220,38,38,0.3)]' :
                  isDone ? 'bg-blue-600 border-blue-50 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-110' :
                  isActive ? 'bg-white border-blue-200 text-blue-600 ring-4 ring-blue-50 animate-pulse' :
                  'bg-white border-zinc-100 text-zinc-300'
                }`}>
                  {isError ? <XCircle className="w-5 h-5" /> : 
                   isDone ? <Check className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} /> : 
                   <span className="font-bold">{index + 1}</span>}
                </div>
                <div className="md:text-center pt-1 md:pt-0">
                  <p className={`font-bold text-sm tracking-tight ${isError ? 'text-red-600' : isDone ? 'text-foreground' : isActive ? 'text-foreground' : 'text-zinc-400'}`}>
                    {step.title}
                  </p>
                  <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mt-0.5">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Data Diri - Clean Card */}
        <div className="lg:col-span-7 bg-white rounded-[2rem] border border-zinc-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden relative transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
             <img src="/apple-touch-icon.png" alt="Watermark Untad" className="w-64 h-64 object-contain grayscale" />
          </div>
          <div className="px-8 pt-8 pb-6 border-b border-zinc-50 flex justify-between items-center relative z-10">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              Identitas Resmi
            </h2>
            <div className="px-3 py-1.5 bg-zinc-50 text-zinc-500 font-semibold text-xs rounded-lg border border-zinc-100">
              ID: {user?.id.split('-')[0].toUpperCase()}
            </div>
          </div>
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12 relative z-10">
            {[
              { label: "NAMA LENGKAP", value: user?.nama },
              { label: "NIM", value: user?.nim },
              { label: "PROGRAM STUDI", value: user?.prodi || "-" },
              { label: "ANGKATAN", value: user?.angkatan || "-" },
              { label: "EMAIL INSTITUSI", value: user?.email },
            ].map((item, idx) => (
              <div key={idx} className={item.label === "NAMA LENGKAP" ? "md:col-span-2" : ""}>
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">{item.label}</span>
                <span className={`font-semibold tracking-tight text-foreground ${item.label === "NAMA LENGKAP" ? "text-2xl" : "text-lg"}`}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Status Wallet */}
        <div className="lg:col-span-5 bg-white rounded-[2rem] border border-zinc-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex flex-col">
          <div className="px-8 pt-8 pb-6 border-b border-zinc-50 flex justify-between items-center">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <WalletIcon className="w-5 h-5" />
              </div>
              Koneksi Dompet
            </h2>
          </div>
          <div className="p-8 flex flex-col h-full">
            {wallet ? (
              <div className="space-y-6 flex-1">
                <div>
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2 block">STATUS VERIFIKASI</span>
                  {getWalletStatusBadge(wallet.status)}
                </div>
                <div>
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2 block">ALAMAT WALLET</span>
                  <div className="font-mono text-sm break-all bg-zinc-50 p-4 rounded-xl border border-zinc-100 text-zinc-700">
                    {wallet.walletAddress}
                  </div>
                </div>
                
                {wallet.status === "PENDING" && (
                  <div className="p-4 bg-amber-50/50 border border-amber-100/50 rounded-2xl flex gap-3 mt-auto">
                    <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="font-medium text-sm text-amber-800 leading-relaxed">
                      Wallet Anda sedang dalam antrean verifikasi oleh administrator.
                    </p>
                  </div>
                )}
                {wallet.status === "REJECTED" && (
                  <div className="p-4 bg-red-50/50 border border-red-100/50 rounded-2xl flex gap-3 mt-auto">
                    <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <p className="font-medium text-sm text-red-800 leading-relaxed">
                      Wallet Anda ditolak. Silakan mendaftar ulang menggunakan wallet yang valid.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-10 flex flex-col items-center justify-center flex-1">
                <div className="w-20 h-20 rounded-full bg-zinc-50 flex items-center justify-center mb-6 border border-zinc-100">
                  <WalletIcon className="w-8 h-8 text-zinc-300" />
                </div>
                <p className="font-semibold text-lg mb-2 text-foreground">
                  Dompet Belum Terhubung
                </p>
                <p className="text-sm text-muted-foreground mb-6 max-w-[200px]">
                  Hubungkan wallet kripto Anda untuk mulai menerima ijazah.
                </p>
                <Link
                  href="/wallet"
                  className="px-6 py-2.5 bg-foreground text-background font-semibold rounded-xl hover:bg-zinc-800 transition-colors flex items-center gap-2 shadow-sm"
                >
                  Hubungkan Sekarang <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Ijazah */}
      <div className="w-full bg-white rounded-[2rem] border border-zinc-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
        <div className="px-8 py-8 border-b border-zinc-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-transparent to-zinc-50/50">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm border border-emerald-100/50">
              <FileText className="w-6 h-6" />
            </div>
            Sertifikat Ijazah Digital
          </h2>
          {certificate ? getCertStatusBadge(certificate.status) : getCertStatusBadge("NOT_ISSUED")}
        </div>
        
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {certificate?.nftAddress && (
              <div className="bg-zinc-50 rounded-2xl p-5 border border-zinc-100">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">NFT Address (Soulbound)</span>
                <div className="font-mono text-sm font-semibold break-all text-zinc-700">
                  {certificate.nftAddress}
                </div>
              </div>
            )}
            {certificate?.txSignature && (
              <div className="bg-zinc-50 rounded-2xl p-5 border border-zinc-100">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">Transaction Hash</span>
                <a
                  href={`https://explorer.solana.com/tx/${certificate.txSignature}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm font-semibold break-all text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center gap-1"
                >
                  {certificate.txSignature.slice(0, 24)}... <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          {/* Action Blocks based on status */}
          {certificate?.status === "MINTED" && (
            <div className="p-6 bg-blue-50/50 border border-blue-100/50 rounded-2xl flex flex-col md:flex-row items-center gap-6 justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-blue-900 mb-1">Ijazah Siap Diklaim!</h3>
                  <p className="text-sm font-medium text-blue-800/80 max-w-lg leading-relaxed">
                    Aset digital Anda telah diterbitkan oleh fakultas. Segera klaim NFT ini ke dompet Anda untuk verifikasi publik seumur hidup.
                  </p>
                </div>
              </div>
              <Link
                href={`/ijazah/${user?.nim}`}
                className="shrink-0 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20"
              >
                Klaim Sekarang
              </Link>
            </div>
          )}

          {certificate?.status === "CLAIMED" && (
            <div className="p-6 bg-emerald-50/50 border border-emerald-100/50 rounded-2xl flex flex-col md:flex-row items-center gap-6 justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-emerald-900 mb-1">Aset Telah Dimiliki</h3>
                  <p className="text-sm font-medium text-emerald-800/80 max-w-lg leading-relaxed">
                    NFT Ijazah ini telah tersimpan aman di dompet Anda sebagai Soulbound Token. Bukti akademik Anda abadi di jaringan Solana.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Link
                  href={`/ijazah/${user?.nim}`}
                  className="shrink-0 px-5 py-2.5 bg-white text-emerald-700 border border-emerald-200 font-semibold rounded-xl hover:bg-emerald-50 transition-colors shadow-sm"
                >
                  Lihat Publik
                </Link>
              </div>
            </div>
          )}

          {certificate?.status === "REVOKED" && (
            <div className="p-6 bg-red-50/50 border border-red-100/50 rounded-2xl flex flex-col md:flex-row items-start gap-5">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-900 mb-1">Akses Dicabut</h3>
                <p className="text-sm font-medium text-red-800/80 mb-4 leading-relaxed">
                  Sertifikat ijazah Anda telah ditarik kembali oleh universitas dan tidak lagi valid secara kriptografis.
                </p>
                {certificate.revokeReason && (
                  <div className="bg-white p-4 rounded-xl border border-red-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider block text-red-400 mb-1">ALASAN PENCABUTAN</span>
                    <p className="text-sm text-red-900 font-medium">{certificate.revokeReason}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
