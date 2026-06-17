"use client";

import { useEffect, useState } from "react";
import Card, { CardContent, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Table, {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import Input from "@/components/ui/Input";

interface Mahasiswa {
  id: string;
  nama: string;
  nim: string;
  email: string;
  prodi: string;
  wallet: {
    id: string;
    walletAddress: string;
    status: string;
  } | null;
  certificate: {
    status: string;
  } | null;
}

export default function MahasiswaPage() {
  const [mahasiswa, setMahasiswa] = useState<Mahasiswa[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchMahasiswa();
  }, []);

  const fetchMahasiswa = async () => {
    try {
      const response = await fetch("/api/admin/mahasiswa");
      const data = await response.json();
      if (data.mahasiswa) {
        setMahasiswa(data.mahasiswa);
      }
    } catch (error) {
      console.error("Error fetching mahasiswa:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (walletId: string, status: "VERIFIED" | "REJECTED") => {
    try {
      const response = await fetch("/api/wallet/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletId, status }),
      });

      if (response.ok) {
        fetchMahasiswa();
      }
    } catch (error) {
      console.error("Error verifying wallet:", error);
    }
  };

  const filteredMahasiswa = mahasiswa.filter((m) => {
    const matchesSearch =
      m.nama.toLowerCase().includes(search.toLowerCase()) ||
      m.nim.includes(search);

    if (filter === "all") return matchesSearch;
    if (filter === "pending")
      return matchesSearch && m.wallet?.status === "PENDING";
    if (filter === "verified")
      return matchesSearch && m.wallet?.status === "VERIFIED";
    if (filter === "no-wallet") return matchesSearch && !m.wallet;

    return matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="warning">Pending</Badge>;
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Kelola Mahasiswa</h1>
        <p className="text-gray-600 mt-1">
          Verifikasi wallet dan kelola data mahasiswa
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Cari berdasarkan nama atau NIM..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              {["all", "pending", "verified", "no-wallet"].map((f) => (
                <Button
                  key={f}
                  variant={filter === f ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => setFilter(f)}
                >
                  {f === "all"
                    ? "Semua"
                    : f === "pending"
                    ? "Pending"
                    : f === "verified"
                    ? "Terverifikasi"
                    : "Belum Daftar"}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NIM</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Prodi</TableHead>
                <TableHead>Wallet</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMahasiswa.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center py-8 text-gray-500" >
                    Tidak ada data mahasiswa
                  </TableCell>
                </TableRow>
              ) : (
                filteredMahasiswa.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.nim}</TableCell>
                    <TableCell>{m.nama}</TableCell>
                    <TableCell>{m.prodi || "-"}</TableCell>
                    <TableCell>
                      {m.wallet ? (
                        <span className="text-xs font-mono">
                          {m.wallet.walletAddress.slice(0, 8)}...
                          {m.wallet.walletAddress.slice(-6)}
                        </span>
                      ) : (
                        <span className="text-gray-400">Belum daftar</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {m.wallet ? (
                        getStatusBadge(m.wallet.status)
                      ) : (
                        <Badge>-</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {m.wallet?.status === "PENDING" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() =>
                              handleVerify(m.wallet!.id, "VERIFIED")
                            }
                          >
                            Setujui
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() =>
                              handleVerify(m.wallet!.id, "REJECTED")
                            }
                          >
                            Tolak
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
