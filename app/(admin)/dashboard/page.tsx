"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card, { CardContent, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";

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

  const primaryCards = [
    {
      title: "Total Mahasiswa",
      value: stats.totalMahasiswa,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
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
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
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
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
      color: "text-emerald-400",
      bg: "bg-emerald-900/20 border-emerald-800/30",
    },
  ];

  const secondaryCards = [
    {
      title: "Ijazah Diterbitkan",
      value: stats.ijazahMinted,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      ),
      color: "text-purple-400",
      bg: "bg-purple-900/20 border-purple-800/30",
    },
    {
      title: "Ijazah Diklaim",
      value: stats.ijazahClaimed,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
        </svg>
      ),
      color: "text-red-400",
      bg: "bg-red-900/20 border-red-800/30",
    },
    {
      title: "Ijazah Direvoke",
      value: stats.ijazahRevoked,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      ),
      color: "text-orange-400",
      bg: "bg-orange-900/20 border-orange-800/30",
    },
  ];

  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <div className="h-8 w-48 bg-[#1A1A24] rounded-lg animate-pulse" />
          <div className="h-4 w-72 bg-[#1A1A24] rounded-lg animate-pulse mt-2" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-[#1A1A24] rounded-lg animate-pulse" />
                <div className="flex-1">
                  <div className="h-4 w-24 bg-[#1A1A24] rounded animate-pulse" />
                  <div className="h-8 w-16 bg-[#1A1A24] rounded animate-pulse mt-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-[#1A1A24] rounded-lg animate-pulse" />
                <div className="flex-1">
                  <div className="h-3 w-20 bg-[#1A1A24] rounded animate-pulse" />
                  <div className="h-6 w-12 bg-[#1A1A24] rounded animate-pulse mt-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-red-400 mb-4">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <p className="text-red-400 font-medium">{error}</p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Coba Lagi
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard Admin</h1>
        <p className="text-[#71717A] mt-1">
          Kelola ijazah digital mahasiswa Universitas Tadulako
        </p>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {primaryCards.map((stat) => (
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

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {secondaryCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="flex items-center space-x-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center border ${stat.bg} ${stat.color}`}
              >
                {stat.icon}
              </div>
              <div>
                <p className="text-xs text-[#71717A]">{stat.title}</p>
                <p className="text-xl font-bold text-white">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions + System Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions as Table */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-white">Aksi Cepat</h2>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-[#27272A]">
                  <TableHead className="text-[#A1A1AA]">Menu</TableHead>
                  <TableHead className="text-[#A1A1AA]">Deskripsi</TableHead>
                  <TableHead className="text-[#A1A1AA] text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="border-[#27272A] hover:bg-white/[0.02]">
                  <TableCell>
                    <Link href="/mahasiswa" className="font-medium text-white hover:text-red-400 transition-colors">
                      Kelola Mahasiswa
                    </Link>
                  </TableCell>
                  <TableCell className="text-[#71717A] text-xs">
                    Lihat dan verifikasi wallet mahasiswa
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="info">{stats.walletPending} pending</Badge>
                  </TableCell>
                </TableRow>
                <TableRow className="border-[#27272A] hover:bg-white/[0.02]">
                  <TableCell>
                    <Link href="/terbitkan" className="font-medium text-white hover:text-red-400 transition-colors">
                      Terbitkan Ijazah
                    </Link>
                  </TableCell>
                  <TableCell className="text-[#71717A] text-xs">
                    Mint NFT ijazah untuk mahasiswa
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="success">{stats.walletVerified} siap</Badge>
                  </TableCell>
                </TableRow>
                <TableRow className="border-[#27272A] hover:bg-white/[0.02]">
                  <TableCell>
                    <Link href="/revoke" className="font-medium text-white hover:text-red-400 transition-colors">
                      Revoke & Backup
                    </Link>
                  </TableCell>
                  <TableCell className="text-[#71717A] text-xs">
                    Cabut ijazah atau backup data sertifikat
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="danger">Revoke</Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-white">Info Sistem</h2>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <TableRow className="border-[#27272A]">
                  <TableCell className="text-[#71717A] pl-0">Blockchain</TableCell>
                  <TableCell className="text-white font-medium text-right pr-0">Solana Devnet</TableCell>
                </TableRow>
                <TableRow className="border-[#27272A]">
                  <TableCell className="text-[#71717A] pl-0">Network</TableCell>
                  <TableCell className="text-right pr-0">
                    <Badge variant="info">Development</Badge>
                  </TableCell>
                </TableRow>
                <TableRow className="border-[#27272A]">
                  <TableCell className="text-[#71717A] pl-0">IPFS Provider</TableCell>
                  <TableCell className="text-white font-medium text-right pr-0">Pinata</TableCell>
                </TableRow>
                <TableRow className="border-[#27272A]">
                  <TableCell className="text-[#71717A] pl-0">NFT Standard</TableCell>
                  <TableCell className="text-white font-medium text-right pr-0">Metaplex (Soulbound)</TableCell>
                </TableRow>
                <TableRow className="border-[#27272A]">
                  <TableCell className="text-[#71717A] pl-0">Revoke System</TableCell>
                  <TableCell className="text-right pr-0">
                    <Badge variant="success">Aktif</Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
