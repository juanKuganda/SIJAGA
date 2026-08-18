"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Pencil, Eye, Check, X, XCircle, Users, CheckCircle2 } from "lucide-react";
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
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { ActionModal } from "@/components/ui/action-modal";
import { EmptyState } from "@/components/ui/empty-state";

interface Mahasiswa {
  id: string;
  nama: string;
  nim: string;
  email: string;
  prodi: string;
  angkatan: string;
  dataConsent: boolean;
  consentGivenAt: string | null;
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
  nim: string;
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
    nim: "",
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
      nim: m.nim,
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

  // Pagination Logic
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(filteredMahasiswa.length / ITEMS_PER_PAGE);
  const paginatedMahasiswa = filteredMahasiswa.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );


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
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1); // Reset to page 1 on search
                }}
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
                  onClick={() => {
                    setFilter(f.key);
                    setCurrentPage(1); // Reset to page 1 on filter
                  }}
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
                <TableHead>Consent</TableHead>
                <TableHead>Wallet</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ijazah</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMahasiswa.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <EmptyState
                      icon={Users}
                      title="Tidak ada data mahasiswa"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                paginatedMahasiswa.map((m) => (
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
                      {m.dataConsent ? (
                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> {m.consentGivenAt ? new Date(m.consentGivenAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : ""}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">
                          <XCircle className="w-3 h-3 mr-1" /> Belum
                        </Badge>
                      )}
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
                      <StatusBadge status={m.wallet?.status} type="wallet" />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={m.certificate?.status || "NOT_ISSUED"} type="certificate" />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
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

          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>

      <ActionModal
        isOpen={!!editModal}
        onClose={() => setEditModal(null)}
        icon={Pencil}
        iconBgColor="bg-blue-50"
        iconTextColor="text-blue-600"
        title="Edit Data Mahasiswa"
        subtitle={editModal ? `NIM: ${editModal.nim}` : ""}
        confirmText="Simpan Perubahan"
        onConfirm={handleEditSubmit}
        isConfirming={editModal ? editLoading : false}
      >
        {editError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {editError}
          </div>
        )}

        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          <strong>Peringatan:</strong> Mengubah NIM jika sertifikat sudah aktif dapat menyebabkan ketidakkonsistenan data. Lakukan hanya jika ijazah belum diterbitkan atau telah di-revoke.
        </div>

        <div className="space-y-4">
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
            <Label htmlFor="edit-nim" className="font-semibold">
              Nomor Induk Mahasiswa (NIM)
            </Label>
            <Input
              id="edit-nim"
              value={editForm.nim}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, nim: e.target.value }))
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
              list="prodi-options"
              value={editForm.prodi}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, prodi: e.target.value }))
              }
              placeholder="Ketik atau pilih program studi..."
            />
            <datalist id="prodi-options">
              <option value="Informatika" />
              <option value="Sistem Informasi" />
              <option value="Teknik Komputer" />
              <option value="Teknologi Informasi" />
              <option value="Ilmu Komputer" />
            </datalist>
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
      </ActionModal>
    </div>
  );
}
