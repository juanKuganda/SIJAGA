"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Clock, CheckCircle2, FileText, Award, XCircle, Activity, History, Target } from "lucide-react";
import { DashboardCharts } from "@/components/DashboardCharts";

interface Stats {
  totalMahasiswa: number;
  walletPending: number;
  walletVerified: number;
  ijazahMinted: number;
  ijazahClaimed: number;
  ijazahRevoked: number;
}

interface AuditLog {
  id: string;
  action: string;
  detail: string | null;
  ipAddress: string | null;
  createdAt: string;
  user: {
    nama: string;
    email: string;
  };
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
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = () => {
      Promise.all([
        fetch("/api/admin/stats").then(res => res.ok ? res.json() : Promise.reject(res)),
        fetch("/api/admin/audit?limit=5").then(res => res.ok ? res.json() : Promise.reject(res))
      ])
      .then(([statsData, auditData]) => {
        if (statsData.stats) setStats(statsData.stats);
        if (auditData.logs) setAuditLogs(auditData.logs);
      })
      .catch((err) => {
        console.error("Error fetching dashboard data:", err);
        // Jangan timpa error state jika hanya polling gagal sesekali, biarkan UI tetap jalan
        if (loading) setError("Gagal memuat data sistem");
      })
      .finally(() => setLoading(false));
    };

    fetchData(); // Fetch awal

    // Polling setiap 10 detik
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [loading]);

  const statCards = [
    {
      title: "Total Mahasiswa",
      value: stats.totalMahasiswa,
      icon: Users,
      bg: "bg-gradient-to-br from-blue-50 to-white",
      iconBg: "bg-blue-600 shadow-blue-500/30",
      iconColor: "text-white",
      textColor: "text-blue-950",
      borderColor: "border-blue-100"
    },
    {
      title: "Wallet Pending",
      value: stats.walletPending,
      icon: Clock,
      bg: "bg-gradient-to-br from-amber-50 to-white",
      iconBg: "bg-amber-500 shadow-amber-500/30",
      iconColor: "text-white",
      textColor: "text-amber-950",
      borderColor: "border-amber-100"
    },
    {
      title: "Terverifikasi",
      value: stats.walletVerified,
      icon: CheckCircle2,
      bg: "bg-gradient-to-br from-emerald-50 to-white",
      iconBg: "bg-emerald-500 shadow-emerald-500/30",
      iconColor: "text-white",
      textColor: "text-emerald-950",
      borderColor: "border-emerald-100"
    },
    {
      title: "Diterbitkan",
      value: stats.ijazahMinted,
      icon: FileText,
      bg: "bg-gradient-to-br from-indigo-50 to-white",
      iconBg: "bg-indigo-600 shadow-indigo-500/30",
      iconColor: "text-white",
      textColor: "text-indigo-950",
      borderColor: "border-indigo-100"
    },
    {
      title: "Diklaim",
      value: stats.ijazahClaimed,
      icon: Award,
      bg: "bg-gradient-to-br from-purple-50 to-white",
      iconBg: "bg-purple-600 shadow-purple-500/30",
      iconColor: "text-white",
      textColor: "text-purple-950",
      borderColor: "border-purple-100"
    },
    {
      title: "Direvoke",
      value: stats.ijazahRevoked,
      icon: XCircle,
      bg: "bg-gradient-to-br from-red-50 to-white",
      iconBg: "bg-red-600 shadow-red-500/30",
      iconColor: "text-white",
      textColor: "text-red-950",
      borderColor: "border-red-100"
    },
  ];

  if (loading) {
    return (
      <div className="p-6 md:p-10 max-w-[1600px] mx-auto">
        <div className="h-10 w-48 bg-zinc-200/50 rounded-xl mb-3 animate-pulse"></div>
        <div className="h-5 w-72 bg-zinc-200/50 rounded-lg mb-12 animate-pulse"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-24 bg-white rounded-2xl border border-zinc-100 shadow-sm animate-pulse"></div>
              ))}
            </div>
            <div className="h-96 bg-white rounded-[2rem] border border-zinc-100 shadow-sm animate-pulse"></div>
          </div>
          <div className="lg:col-span-1 space-y-6">
            <div className="h-[400px] bg-white rounded-[2rem] border border-zinc-100 shadow-sm animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] p-8 max-w-[1600px] mx-auto">
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

  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes("REVOKE") || act.includes("DELETE") || act.includes("HAPUS")) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">{action}</span>;
    }
    if (act.includes("MINT") || act.includes("TERBIT") || act.includes("CREATE")) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">{action}</span>;
    }
    if (act.includes("VERIFY") || act.includes("APPROVE")) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">{action}</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">{action}</span>;
  };

  return (
    <div className="font-sans selection:bg-zinc-200 max-w-[1600px] mx-auto pb-12">
      {/* Page Header */}
      <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-6">
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

      {/* MAIN BENTO GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Actions, Data, Metrics */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Aksi Cepat */}
          <div>
            <h2 className="text-xl font-bold tracking-tight mb-4 text-foreground flex items-center gap-2">
              <Activity className="w-6 h-6 text-blue-600" />
              Aksi Cepat
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/mahasiswa" className="block bg-white border border-zinc-100 rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_10px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300 shadow-sm shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold group-hover:text-blue-600 transition-colors">
                      Kelola Mahasiswa
                    </h3>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">Verifikasi pengajuan wallet baru.</p>
                  </div>
                </div>
              </Link>

              <Link href="/terbitkan" className="block bg-white border border-zinc-100 rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_10px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300 shadow-sm shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold group-hover:text-emerald-600 transition-colors">
                      Terbitkan Ijazah
                    </h3>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">Mint NFT ijazah Soulbound.</p>
                  </div>
                </div>
              </Link>

              <Link href="/revoke" className="block bg-white border border-zinc-100 rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_10px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors duration-300 shadow-sm shrink-0">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold group-hover:text-red-600 transition-colors">
                      Revoke & Backup
                    </h3>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">Cabut validitas ijazah.</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Inline Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.title} className={`${stat.bg} border ${stat.borderColor} rounded-2xl p-4 flex items-center gap-4 transition-all duration-300 hover:shadow-md hover:-translate-y-1 relative overflow-hidden group`}>
                  <div className={`w-12 h-12 shrink-0 rounded-xl ${stat.iconBg} ${stat.iconColor} flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-110`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <p className="text-[10px] font-bold text-zinc-500/90 uppercase tracking-widest">{stat.title}</p>
                    <p className={`text-2xl font-black ${stat.textColor} tracking-tight leading-none mt-1`}>{stat.value}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Charts */}
          <div>
            <DashboardCharts stats={stats} />
          </div>
          
        </div>

        {/* RIGHT COLUMN: Sidebar (Audit & Progress) */}
        <div className="lg:col-span-1 space-y-8">
          
          {/* Aktivitas Terbaru */}
                   <div>
            <h2 className="text-xl font-bold tracking-tight mb-5 text-foreground flex items-center gap-2">
              <Target className="w-6 h-6 text-orange-500" />
              Progres Pencapaian
            </h2>
            <div className="bg-white border border-zinc-100 rounded-[2rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col gap-6">
              
              {/* Progress 1: Verifikasi Wallet */}
              <div>
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-800">Verifikasi Mahasiswa</h3>
                    <p className="text-[11px] font-medium text-zinc-500 mt-0.5">Wallet diverifikasi</p>
                  </div>
                  <span className="text-sm font-bold text-emerald-600">
                    {stats.walletVerified} / {stats.totalMahasiswa}
                  </span>
                </div>
                <div className="h-3 w-full bg-zinc-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                    style={{ width: `${stats.totalMahasiswa > 0 ? (stats.walletVerified / stats.totalMahasiswa) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Progress 2: Penerbitan */}
              <div>
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-800">Penerbitan Ijazah</h3>
                    <p className="text-[11px] font-medium text-zinc-500 mt-0.5">Dari yang terverifikasi</p>
                  </div>
                  <span className="text-sm font-bold text-blue-600">
                    {stats.ijazahMinted} / {stats.walletVerified}
                  </span>
                </div>
                <div className="h-3 w-full bg-zinc-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                    style={{ width: `${stats.walletVerified > 0 ? (stats.ijazahMinted / stats.walletVerified) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Progress 3: Klaim */}
              <div>
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-800">Klaim NFT</h3>
                    <p className="text-[11px] font-medium text-zinc-500 mt-0.5">Dari yang diterbitkan</p>
                  </div>
                  <span className="text-sm font-bold text-purple-600">
                    {stats.ijazahClaimed} / {stats.ijazahMinted}
                  </span>
                </div>
                <div className="h-3 w-full bg-zinc-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 rounded-full transition-all duration-1000"
                    style={{ width: `${stats.ijazahMinted > 0 ? (stats.ijazahClaimed / stats.ijazahMinted) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

            </div>
          </div>

          <div>
            <div className="flex justify-between items-end mb-5">
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <History className="w-6 h-6 text-purple-600" />
                Aktivitas Terbaru
              </h2>
              <Link href="/audit" className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                Lihat Semua &rarr;
              </Link>
            </div>
            <div className="bg-white border border-zinc-100 rounded-[2rem] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col gap-4">
              {auditLogs.length > 0 ? (
                auditLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex gap-4 items-start pb-4 border-b border-zinc-50 last:border-0 last:pb-0">
                    <div className="mt-1 shrink-0">
                      {getActionBadge(log.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-zinc-800 truncate">{log.user.nama}</p>
                      <p className="text-xs text-zinc-500 line-clamp-2 mt-0.5 leading-relaxed">{log.detail || log.action}</p>
                      <p className="text-[10px] text-zinc-400 mt-1.5 font-mono bg-zinc-50 inline-block px-1.5 py-0.5 rounded">
                        {new Date(log.createdAt).toLocaleString("id-ID", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-500 text-center py-6 font-medium">Belum ada aktivitas</p>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
