"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Clock, CheckCircle2, FileText, Award, XCircle, ArrowRight, ExternalLink, Activity } from "lucide-react";

interface Stats {
  totalMahasiswa: number;
  walletPending: number;
  walletVerified: number;
  ijazahMinted: number;
  ijazahClaimed: number;
  ijazahRevoked: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalMahasiswa: 0,
    walletPending: 0,
    walletVerified: 0,
    ijazahMinted: 0,
    ijazahClaimed: 0,
    ijazahRevoked: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (data.stats) {
          setStats(data.stats);
        }
      })
      .catch((err) => {
        console.error("Error fetching stats:", err);
        setError("Gagal memuat data statistik");
      })
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    {
      title: "Total Mahasiswa",
      value: stats.totalMahasiswa,
      icon: Users,
      bg: "bg-blue-50/50",
      iconBg: "bg-blue-100",
      textColor: "text-blue-600",
      borderColor: "border-blue-100/50"
    },
    {
      title: "Wallet Pending",
      value: stats.walletPending,
      icon: Clock,
      bg: "bg-amber-50/50",
      iconBg: "bg-amber-100",
      textColor: "text-amber-600",
      borderColor: "border-amber-100/50"
    },
    {
      title: "Wallet Terverifikasi",
      value: stats.walletVerified,
      icon: CheckCircle2,
      bg: "bg-emerald-50/50",
      iconBg: "bg-emerald-100",
      textColor: "text-emerald-600",
      borderColor: "border-emerald-100/50"
    },
    {
      title: "Ijazah Diterbitkan",
      value: stats.ijazahMinted,
      icon: FileText,
      bg: "bg-indigo-50/50",
      iconBg: "bg-indigo-100",
      textColor: "text-indigo-600",
      borderColor: "border-indigo-100/50"
    },
    {
      title: "Ijazah Diklaim",
      value: stats.ijazahClaimed,
      icon: Award,
      bg: "bg-purple-50/50",
      iconBg: "bg-purple-100",
      textColor: "text-purple-600",
      borderColor: "border-purple-100/50"
    },
    {
      title: "Ijazah Direvoke",
      value: stats.ijazahRevoked,
      icon: XCircle,
      bg: "bg-red-50/50",
      iconBg: "bg-red-100",
      textColor: "text-red-600",
      borderColor: "border-red-100/50"
    },
  ];

  if (loading) {
    return (
      <div className="p-6 md:p-10">
        <div className="h-10 w-48 bg-zinc-200/50 rounded-xl mb-3 animate-pulse"></div>
        <div className="h-5 w-72 bg-zinc-200/50 rounded-lg mb-12 animate-pulse"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
           {[1, 2, 3, 4, 5, 6].map((i) => (
             <div key={i} className="h-32 bg-white rounded-3xl border border-zinc-100 shadow-sm animate-pulse"></div>
           ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] p-8">
        <div className="bg-red-50/50 text-red-900 p-10 rounded-[2rem] border border-red-100 flex flex-col items-center max-w-md text-center shadow-sm">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-6">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold tracking-tight mb-2">Gagal Memuat Sistem</h2>
          <p className="font-medium text-red-800/80 mb-8">{error}</p>
          <button
            className="px-6 py-2.5 bg-white text-red-600 font-semibold rounded-xl border border-red-200 hover:bg-red-50 transition-colors shadow-sm w-full"
            onClick={() => window.location.reload()}
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto font-sans selection:bg-zinc-200">
      {/* Page Header */}
      <div className="mb-10 flex flex-col md:flex-row md:justify-between md:items-end gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">Admin Dashboard</h1>
          <p className="text-base text-muted-foreground mt-2 font-medium">
            Pusat kendali ijazah digital Universitas Tadulako.
          </p>
        </div>
        <div className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200/50 rounded-xl font-semibold text-xs flex items-center gap-2 shadow-sm">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </div>
          Sistem Online
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className={`${stat.bg} border ${stat.borderColor} rounded-3xl p-6 flex flex-col transition-all hover:shadow-md hover:scale-[1.02] cursor-default`}>
              <div className="flex justify-between items-start mb-6">
                <div className={`w-12 h-12 rounded-2xl ${stat.iconBg} ${stat.textColor} flex items-center justify-center`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">{stat.title}</p>
                <p className="text-4xl font-extrabold text-foreground tracking-tight">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions + System Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-bold tracking-tight mb-5 text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-zinc-400" />
            Aksi Cepat
          </h2>
          <div className="flex flex-col gap-4">
            
            <Link href="/mahasiswa" className="block bg-white border border-zinc-100 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all group">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-bold group-hover:text-blue-600 transition-colors flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  Kelola Mahasiswa
                </h3>
                <div className="bg-amber-50 text-amber-700 px-3 py-1 text-xs font-semibold rounded-full border border-amber-200/50">{stats.walletPending} pending</div>
              </div>
              <p className="text-sm text-muted-foreground font-medium pl-10">Verifikasi dan kelola pengajuan wallet mahasiswa baru.</p>
            </Link>

            <Link href="/terbitkan" className="block bg-white border border-zinc-100 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all group">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-bold group-hover:text-emerald-600 transition-colors flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  Terbitkan Ijazah
                </h3>
                <div className="bg-emerald-50 text-emerald-700 px-3 py-1 text-xs font-semibold rounded-full border border-emerald-200/50">{stats.walletVerified} siap</div>
              </div>
              <p className="text-sm text-muted-foreground font-medium pl-10">Mint NFT ijazah (Soulbound) untuk mahasiswa yang terverifikasi.</p>
            </Link>

            <Link href="/revoke" className="block bg-white border border-zinc-100 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all group">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-bold group-hover:text-red-600 transition-colors flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                    <XCircle className="w-4 h-4" />
                  </div>
                  Revoke & Backup
                </h3>
              </div>
              <p className="text-sm text-muted-foreground font-medium pl-10">Cabut validitas ijazah secara kriptografis jika terdapat anomali.</p>
            </Link>

          </div>
        </div>

        {/* System Info */}
        <div>
          <h2 className="text-lg font-bold tracking-tight mb-5 text-foreground flex items-center gap-2">
            <Award className="w-5 h-5 text-zinc-400" />
            Informasi Sistem
          </h2>
          <div className="bg-white border border-zinc-100 rounded-3xl p-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
            <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/4 opacity-[0.03] pointer-events-none">
               <img src="/apple-touch-icon.png" alt="Watermark Untad" className="w-64 h-64 object-contain grayscale" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between p-4 border-b border-zinc-50">
              <span className="text-sm font-semibold text-zinc-500">Blockchain</span>
              <span className="text-sm font-bold text-foreground">Solana Devnet</span>
            </div>
            <div className="flex items-center justify-between p-4 border-b border-zinc-50 bg-zinc-50/50 rounded-xl m-1">
              <span className="text-sm font-semibold text-zinc-500">Network</span>
              <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-xs font-bold border border-blue-100">Development</span>
            </div>
            <div className="flex items-center justify-between p-4 border-b border-zinc-50">
              <span className="text-sm font-semibold text-zinc-500">IPFS Provider</span>
              <span className="text-sm font-bold text-foreground">Pinata Cloud</span>
            </div>
            <div className="flex items-center justify-between p-4 border-b border-zinc-50 bg-zinc-50/50 rounded-xl m-1">
              <span className="text-sm font-semibold text-zinc-500">NFT Standard</span>
              <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
                Metaplex (SBT) <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
              </span>
            </div>
            <div className="flex items-center justify-between p-4">
              <span className="text-sm font-semibold text-zinc-500">Revoke System</span>
              <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg text-xs font-bold border border-emerald-100">OPERATIONAL</span>
            </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
