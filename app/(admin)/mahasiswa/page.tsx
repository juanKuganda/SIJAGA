"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Pencil, Eye, Check, X, XCircle, Users } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Mahasiswa {
  id: string;
  nama: string;
  nim: string;
  email: string;
  prodi: string;
  angkatan: string;
  wallet: {
    id: string;
    walletAddress: string;
    status: string;
  } | null;
  certificate: {
    id: string;
    status: string;
    nftAddress: string;
    txSignature: string;
    issuedAt: string;
    revokedAt: string | null;
    revokeReason: string | null;
  } | null;
}

interface EditForm {
  nama: string;
  email: string;
  prodi: string;
  angkatan: string;
}

export default function MahasiswaPage() {
  const [mahasiswa, setMahasiswa] = useState<Mahasiswa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Edit modal state
  const [editModal, setEditModal] = useState<Mahasiswa | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    nama: "",
    email: "",
    prodi: "",
    angkatan: "",
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  const fetchMahasiswa = async () => {
    try {
      const response = await fetch("/api/admin/mahasiswa");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.mahasiswa) {
        setMahasiswa(data.mahasiswa);
      }
    } catch (error) {
      console.error("Error fetching mahasiswa:", error);
      setError("Gagal memuat data mahasiswa");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMahasiswa();
  }, []);

  const handleVerify = async (
    walletId: string,
    status: "VERIFIED" | "REJECTED",
  ) => {
    setVerifyError(null);
    try {
      const response = await fetch("/api/wallet/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletId, status }),
      });

      if (response.ok) {
        fetchMahasiswa();
      } else {
        const data = await response.json();
        setVerifyError(data.error || "Gagal verifikasi wallet");
      }
    } catch (error) {
      console.error("Error verifying wallet:", error);
      setVerifyError("Terjadi kesalahan saat verifikasi");
    }
  };

  const openEditModal = (m: Mahasiswa) => {
    setEditModal(m);
    setEditForm({
      nama: m.nama,
      email: m.email,
      prodi: m.prodi || "",
      angkatan: m.angkatan || "",
    });
    setEditError("");
  };

  const handleEditSubmit = async () => {
    if (!editModal) return;
    setEditLoading(true);
    setEditError("");

    try {
      const response = await fetch("/api/admin/mahasiswa", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editModal.id,
          ...editForm,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setEditModal(null);
        fetchMahasiswa();
      } else {
        setEditError(data.error || "Gagal memperbarui data");
      }
    } catch (error) {
      console.error("Error updating:", error);
      setEditError("Terjadi kesalahan");
    } finally {
      setEditLoading(false);
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
        return (
          <Badge
            variant="secondary"
            className="bg-amber-50 text-amber-700 border-amber-200"
          >
            Pending
          </Badge>
        );
      case "VERIFIED":
        return (
          <Badge
            variant="secondary"
            className="bg-emerald-50 text-emerald-700 border-emerald-200"
          >
            Terverifikasi
          </Badge>
        );
      case "REJECTED":
        return <Badge variant="destructive">Ditolak</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCertBadge = (status: string | undefined) => {
    switch (status) {
      case "MINTED":
        return (
          <Badge
            variant="secondary"
            className="bg-blue-50 text-blue-700 border-blue-200"
          >
            Minted
          </Badge>
        );
      case "CLAIMED":
        return (
          <Badge
            variant="secondary"
            className="bg-emerald-50 text-emerald-700 border-emerald-200"
          >
            Claimed
          </Badge>
        );
      case "REVOKED":
        return <Badge variant="destructive">Revoked</Badge>;
      default:
        return <Badge variant="outline">—</Badge>;
    }
  };

  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
          <div className="h-4 w-72 bg-muted rounded-lg animate-pulse mt-2" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-12 bg-muted rounded-lg animate-pulse"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <XCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-red-600 font-semibold">{error}</p>
        <Button
          variant="outline"
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
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
          Kelola Mahasiswa
        </h1>
        <p className="text-muted-foreground mt-1">
          Verifikasi wallet, edit data, dan kelola mahasiswa
        </p>
      </div>

      {verifyError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm font-medium">
          {verifyError}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari berdasarkan nama atau NIM..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {[
                { key: "all", label: "Semua" },
                { key: "pending", label: "Pending" },
                { key: "verified", label: "Terverifikasi" },
                { key: "no-wallet", label: "Belum Daftar" },
              ].map((f) => (
                <Button
                  key={f.key}
                  variant={filter === f.key ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
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
                <TableHead>Ijazah</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMahasiswa.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-muted-foreground font-medium">
                      Tidak ada data mahasiswa
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredMahasiswa.map((m) => (
                  <TableRow key={m.id} className="hover:bg-muted/50">
                    <TableCell className="font-bold text-foreground">
                      {m.nim}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {m.nama}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.prodi || "-"}
                    </TableCell>
                    <TableCell>
                      {m.wallet ? (
                        <span className="text-xs font-mono text-muted-foreground">
                          {m.wallet.walletAddress.slice(0, 8)}...
                          {m.wallet.walletAddress.slice(-6)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          Belum daftar
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {m.wallet ? (
                        getStatusBadge(m.wallet.status)
                      ) : (
                        <Badge variant="outline">-</Badge>
                      )}
                    </TableCell>
                    <TableCell>{getCertBadge(m.certificate?.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditModal(m)}
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1" />
                          Edit
                        </Button>
                        <Link href={`/detail-ijazah/${m.nim}`}>
                          <Button size="sm" variant="outline">
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Detail
                          </Button>
                        </Link>
                        {m.wallet?.status === "PENDING" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() =>
                                handleVerify(m.wallet!.id, "VERIFIED")
                              }
                            >
                              <Check className="w-3.5 h-3.5 mr-1" />
                              Setujui
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() =>
                                handleVerify(m.wallet!.id, "REJECTED")
                              }
                            >
                              <X className="w-3.5 h-3.5 mr-1" />
                              Tolak
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            onClick={() => setEditModal(null)}
          />
          <div className="relative bg-white border border-border rounded-xl shadow-2xl max-w-md w-full p-6 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <Pencil className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Edit Data Mahasiswa
                </h3>
                <p className="text-sm text-muted-foreground">
                  NIM: {editModal.nim}
                </p>
              </div>
            </div>

            {editError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {editError}
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div className="space-y-2">
                <Label htmlFor="edit-nama" className="font-semibold">
                  Nama Lengkap
                </Label>
                <Input
                  id="edit-nama"
                  value={editForm.nama}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, nama: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email" className="font-semibold">
                  Email
                </Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-prodi" className="font-semibold">
                  Program Studi
                </Label>
                <Input
                  id="edit-prodi"
                  value={editForm.prodi}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, prodi: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-angkatan" className="font-semibold">
                  Angkatan
                </Label>
                <Input
                  id="edit-angkatan"
                  value={editForm.angkatan}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      angkatan: e.target.value,
                    }))
                  }
                  maxLength={4}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setEditModal(null)}
              >
                Batal
              </Button>
              <Button
                className="flex-1"
                onClick={handleEditSubmit}
                disabled={editLoading}
              >
                {editLoading ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
