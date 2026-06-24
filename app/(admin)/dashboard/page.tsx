"use client";

import { useEffect, useState } from "react";
import Card, { CardContent, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

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
    // Fetch stats dari API
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
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
      color: "text-sky-400",
      bg: "bg-sky-900/20 border-sky-800/30",
    },
    {
      title: "Wallet Pending",
      value: stats.walletPending,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      ),
      color: "text-amber-400",
      bg: "bg-amber-900/20 border-amber-800/30",
    },
    {
      title: "Wallet Terverifikasi",
      value: stats.walletVerified,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      ),
      color: "text-emerald-400",
      bg: "bg-emerald-900/20 border-emerald-800/30",
    },
    {
      title: "Ijazah Diterbitkan",
      value: stats.ijazahMinted,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      ),
      color: "text-purple-400",
      bg: "bg-purple-900/20 border-purple-800/30",
    },
    {
      title: "Ijazah Diklaim",
      value: stats.ijazahClaimed,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
        </svg>
      ),
      color: "text-red-400",
      bg: "bg-red-900/20 border-red-800/30",
    },
    {
      title: "Ijazah Direvoke",
      value: stats.ijazahRevoked,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      ),
      color: "text-orange-400",
      bg: "bg-orange-900/20 border-orange-800/30",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#27272A] border-t-red-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-red-400 mb-4">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <p className="text-red-400 font-medium">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard Admin</h1>
        <p className="text-[#71717A] mt-1">
          Kelola ijazah digital mahasiswa Universitas Tadulako
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {statCards.map((stat, i) => (
          <Card key={stat.title}>
            <CardContent className="flex items-center space-x-4">
              <div
                className={`w-12 h-12 rounded-lg flex items-center justify-center border ${stat.bg} ${stat.color}`}
              >
                {stat.icon}
              </div>
              <div>
                <p className="text-sm text-[#71717A]">{stat.title}</p>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-white">
              Aksi Cepat
            </h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <a
              href="/mahasiswa"
              className="block p-3 rounded-lg border border-[#27272A] hover:border-red-600/20 hover:bg-white/[0.02] transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">
                    Kelola Mahasiswa
                  </p>
                  <p className="text-sm text-[#71717A]">
                    Lihat dan verifikasi wallet mahasiswa
                  </p>
                </div>
                <Badge variant="info">{stats.walletPending} pending</Badge>
              </div>
            </a>
            <a
              href="/terbitkan"
              className="block p-3 rounded-lg border border-[#27272A] hover:border-red-600/20 hover:bg-white/[0.02] transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">
                    Terbitkan Ijazah
                  </p>
                  <p className="text-sm text-[#71717A]">
                    Mint NFT ijazah untuk mahasiswa
                  </p>
                </div>
                <Badge variant="success">
                  {stats.walletVerified} siap
                </Badge>
              </div>
            </a>
            <a
              href="/revoke"
              className="block p-3 rounded-lg border border-[#27272A] hover:border-red-600/20 hover:bg-white/[0.02] transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">
                    Revoke & Backup
                  </p>
                  <p className="text-sm text-[#71717A]">
                    Cabut ijazah atau backup data sertifikat
                  </p>
                </div>
                <Badge variant="danger">Revoke</Badge>
              </div>
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-white">
              Info Sistem
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-[#71717A]">Blockchain</span>
                <span className="font-medium text-white">Solana Devnet</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#71717A]">Network</span>
                <Badge variant="info">Development</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#71717A]">IPFS Provider</span>
                <span className="font-medium text-white">Pinata</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#71717A]">NFT Standard</span>
                <span className="font-medium text-white">Metaplex (Soulbound)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#71717A]">Revoke System</span>
                <Badge variant="success">Aktif</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
