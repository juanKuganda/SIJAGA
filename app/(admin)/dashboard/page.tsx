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
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalMahasiswa: 0,
    walletPending: 0,
    walletVerified: 0,
    ijazahMinted: 0,
    ijazahClaimed: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch stats dari API
    fetch("/api/admin/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.stats) {
          setStats(data.stats);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    {
      title: "Total Mahasiswa",
      value: stats.totalMahasiswa,
      icon: "👥",
      color: "bg-blue-50 text-blue-600",
    },
    {
      title: "Wallet Pending",
      value: stats.walletPending,
      icon: "⏳",
      color: "bg-yellow-50 text-yellow-600",
    },
    {
      title: "Wallet Terverifikasi",
      value: stats.walletVerified,
      icon: "✅",
      color: "bg-green-50 text-green-600",
    },
    {
      title: "Ijazah Diterbitkan",
      value: stats.ijazahMinted,
      icon: "📜",
      color: "bg-purple-50 text-purple-600",
    },
    {
      title: "Ijazah Diklaim",
      value: stats.ijazahClaimed,
      icon: "🎓",
      color: "bg-indigo-50 text-indigo-600",
    },
  ];

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
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Admin</h1>
        <p className="text-gray-600 mt-1">
          Kelola ijazah digital mahasiswa Universitas Tadulako
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="flex items-center space-x-4">
              <div
                className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${stat.color}`}
              >
                {stat.icon}
              </div>
              <div>
                <p className="text-sm text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">
              Aksi Cepat
            </h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <a
              href="/mahasiswa"
              className="block p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    Kelola Mahasiswa
                  </p>
                  <p className="text-sm text-gray-600">
                    Lihat dan verifikasi wallet mahasiswa
                  </p>
                </div>
                <Badge variant="info">{stats.walletPending} pending</Badge>
              </div>
            </a>
            <a
              href="/terbitkan"
              className="block p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    Terbitkan Ijazah
                  </p>
                  <p className="text-sm text-gray-600">
                    Mint NFT ijazah untuk mahasiswa
                  </p>
                </div>
                <Badge variant="success">
                  {stats.walletVerified} siap
                </Badge>
              </div>
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">
              Info Sistem
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Blockchain</span>
                <span className="font-medium">Solana Devnet</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Network</span>
                <Badge variant="info">Development</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">IPFS Provider</span>
                <span className="font-medium">Pinata</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">NFT Standard</span>
                <span className="font-medium">Metaplex (Soulbound)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
