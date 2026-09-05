"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Search, Pencil, Eye, Check, X, XCircle, Users, CheckCircle2, UserX, ShieldOff, MoreHorizontal, RefreshCcw, DownloadCloud, Save } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Mahasiswa {
  id: string;
  nama: string;
  nim: string;
  email: string;
  prodi: string;
  angkatan: string;
  dataConsent: boolean;
  consentGivenAt: string | null;
  dataDeletedAt: string | null;
  lastBackupAt: string | null;
  createdAt?: string;
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
  const [sortBy, setSortBy] = useState("terbaru");
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [deletePiiModal, setDeletePiiModal] = useState<{
    userId: string;
    nama: string;
    nim: string;
  } | null>(null);
  const [deletePiiReason, setDeletePiiReason] = useState("");
  const [deletePiiLoading, setDeletePiiLoading] = useState(false);
  const [deletePiiError, setDeletePiiError] = useState("");
  const [restorePiiModal, setRestorePiiModal] = useState<{
    userId: string;
    nama: string;
    nim: string;
  } | null>(null);
  const [restorePiiLoading, setRestorePiiLoading] = useState(false);
  const [restorePiiError, setRestorePiiError] = useState("");

  const [resetWalletModal, setResetWalletModal] = useState<{
    userId: string;
    nama: string;
    nim: string;
  } | null>(null);
  const [resetWalletLoading, setResetWalletLoading] = useState(false);
  const [resetWalletError, setResetWalletError] = useState("");

  const [backupLoading, setBackupLoading] = useState<string | null>(null);

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

  const handleDeletePiiSubmit = async () => {
    if (!deletePiiModal || !deletePiiReason.trim()) return;
    setDeletePiiLoading(true);
    setDeletePiiError("");

    try {
      const response = await fetch("/api/admin/delete-pii", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: deletePiiModal.userId,
          reason: deletePiiReason,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setDeletePiiModal(null);
        setDeletePiiReason("");
        fetchMahasiswa();
      } else {
        setDeletePiiError(data.error || "Gagal menganonimkan data");
      }
    } catch (error) {
      console.error("Error deleting PII:", error);
      setDeletePiiError("Terjadi kesalahan server");
    } finally {
      setDeletePiiLoading(false);
    }
  };

  const handleRestorePii = async () => {
    if (!restorePiiModal) return;

    setRestorePiiLoading(true);
    setRestorePiiError("");

    try {
      const response = await fetch("/api/admin/restore-pii", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: restorePiiModal.userId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setRestorePiiModal(null);
        fetchMahasiswa();
      } else {
        setRestorePiiError(data.error || "Gagal melakukan restore data");
      }
    } catch (error) {
      console.error("Error restoring PII:", error);
      setRestorePiiError("Terjadi kesalahan sistem saat me-restore data");
    } finally {
      setRestorePiiLoading(false);
    }
  };

  const handleResetWallet = async () => {
    if (!resetWalletModal) return;
    setResetWalletLoading(true);
    setResetWalletError("");

    try {
      const response = await fetch("/api/admin/wallet/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: resetWalletModal.userId }),
      });

      const data = await response.json();

      if (response.ok) {
        setResetWalletModal(null);
        fetchMahasiswa();
        toast.success("Wallet berhasil di-reset");
      } else {
        setResetWalletError(data.error || "Gagal me-reset wallet");
      }
    } catch (error) {
      console.error("Error resetting wallet:", error);
      setResetWalletError("Terjadi kesalahan server");
    } finally {
      setResetWalletLoading(false);
    }
  };

  const handleManualBackup = async (userId: string, nama: string) => {
    setBackupLoading(userId);
    try {
      const response = await fetch("/api/admin/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, reason: "Manual backup triggered from dashboard" }),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(`Data ${nama} berhasil di-backup`);
        fetchMahasiswa();
      } else {
        toast.error(data.error || "Gagal melakukan backup");
      }
    } catch {
      toast.error("Terjadi kesalahan sistem saat backup");
    } finally {
      setBackupLoading(null);
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

  const sortedMahasiswa = [...filteredMahasiswa].sort((a, b) => {
    if (sortBy === "terbaru") {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }
    if (sortBy === "terlama") {
      return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    }
    if (sortBy === "nama-asc") {
      return a.nama.localeCompare(b.nama);
    }
    if (sortBy === "nama-desc") {
      return b.nama.localeCompare(a.nama);
    }
    return 0;
  });

  // Pagination Logic
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(sortedMahasiswa.length / ITEMS_PER_PAGE);
  const paginatedMahasiswa = sortedMahasiswa.slice(
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
              <div className="border-l mx-1 border-border"></div>
              <Select
                value={sortBy}
                onValueChange={(value) => {
                  setSortBy(value || "terbaru");
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="terbaru">Terbaru</SelectItem>
                  <SelectItem value="terlama">Terlama</SelectItem>
                  <SelectItem value="nama-asc">Nama (A-Z)</SelectItem>
                  <SelectItem value="nama-desc">Nama (Z-A)</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open("/api/admin/backup", "_blank")}
                className="ml-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
              >
                <DownloadCloud className="w-4 h-4 mr-2" />
                Unduh Semua Backup
              </Button>
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
                <TableHead>Backup</TableHead>
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
                      {m.dataDeletedAt ? (
                        <Badge variant="secondary" className="bg-red-50 text-red-700 border-red-200">
                          <ShieldOff className="w-3 h-3 mr-1" /> Data Anonim
                        </Badge>
                      ) : m.dataConsent ? (
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
                      {m.lastBackupAt ? (
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-emerald-600">Tersedia</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(m.lastBackupAt).toLocaleDateString("id-ID")}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0 outline-none">
                          <span className="sr-only">Buka menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Link href={`/detail-ijazah/${m.id}`} className="cursor-pointer flex items-center w-full">
                              <Eye className="w-4 h-4 mr-2" />
                              Detail
                            </Link>
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem
                            onClick={() => openEditModal(m)}
                            disabled={!!m.dataDeletedAt}
                            className="cursor-pointer flex items-center"
                          >
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleManualBackup(m.id, m.nama)}
                            disabled={backupLoading === m.id}
                            className="cursor-pointer text-emerald-600 focus:text-emerald-700 flex items-center"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            {backupLoading === m.id ? "Memproses Backup..." : "Backup Data Sekarang"}
                          </DropdownMenuItem>

                          {m.wallet?.status === "PENDING" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleVerify(m.wallet!.id, "VERIFIED")}
                                className="cursor-pointer text-emerald-600 flex items-center"
                              >
                                <Check className="w-4 h-4 mr-2" />
                                Setujui Wallet
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleVerify(m.wallet!.id, "REJECTED")}
                                className="cursor-pointer text-red-600 flex items-center"
                              >
                                <X className="w-4 h-4 mr-2" />
                                Tolak Wallet
                              </DropdownMenuItem>
                            </>
                          )}

                          {m.wallet && !m.dataDeletedAt && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setResetWalletModal({ userId: m.id, nama: m.nama, nim: m.nim });
                                  setResetWalletError("");
                                }}
                                className="cursor-pointer text-amber-600 focus:text-amber-700 flex items-center"
                              >
                                <RefreshCcw className="w-4 h-4 mr-2" />
                                Reset Wallet
                              </DropdownMenuItem>
                            </>
                          )}

                          {!m.dataDeletedAt ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setDeletePiiModal({ userId: m.id, nama: m.nama, nim: m.nim });
                                  setDeletePiiReason("");
                                  setDeletePiiError("");
                                }}
                                className="cursor-pointer text-red-600 focus:text-red-700 flex items-center"
                              >
                                <UserX className="w-4 h-4 mr-2" />
                                Anonimkan Data
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setRestorePiiModal({ userId: m.id, nama: m.nama, nim: m.nim });
                                }}
                                className="cursor-pointer text-blue-600 focus:text-blue-700 flex items-center"
                              >
                                <RefreshCcw className="w-4 h-4 mr-2" />
                                Restore Data
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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

      <ActionModal
        isOpen={!!deletePiiModal}
        onClose={() => {
          if (!deletePiiLoading) {
            setDeletePiiModal(null);
            setDeletePiiReason("");
            setDeletePiiError("");
          }
        }}
        icon={ShieldOff}
        iconBgColor="bg-red-50"
        iconTextColor="text-red-600"
        title="Anonimkan Data Mahasiswa"
        subtitle={deletePiiModal ? `${deletePiiModal.nama} (${deletePiiModal.nim})` : ""}
        confirmText="Anonimkan Data Permanen"
        confirmVariant="destructive"
        onConfirm={handleDeletePiiSubmit}
        isConfirming={deletePiiLoading}
        confirmDisabled={!deletePiiReason.trim()}
      >
        {deletePiiError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {deletePiiError}
          </div>
        )}

        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 space-y-1">
          <p className="font-bold">⚠️ Perhatian (Hak untuk Dilupakan - UU PDP No. 27 Tahun 2022):</p>
          <p>
            Tindakan ini akan meng-anonimkan Nama, NIM, dan Email mahasiswa secara permanen dari database lokal. Identitas di Blinks & Verifikasi akan berubah menjadi <code>[DATA DIHAPUS]</code>.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Alasan Anonimisasi Data <span className="text-red-500">*</span>
          </label>
          <textarea
            value={deletePiiReason}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDeletePiiReason(e.target.value)}
            placeholder="Masukkan alasan (contoh: Permintaan resmi mahasiswa sesuai Hak untuk Dilupakan)..."
            className="w-full px-4 py-2.5 bg-white border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all resize-none shadow-sm text-sm"
            rows={3}
            disabled={deletePiiLoading}
          />
        </div>
      </ActionModal>

      <ActionModal
        isOpen={!!restorePiiModal}
        onClose={() => {
          if (!restorePiiLoading) {
            setRestorePiiModal(null);
          }
        }}
        icon={RefreshCcw}
        iconBgColor="bg-blue-50"
        iconTextColor="text-blue-600"
        title="Restore Data Mahasiswa"
        subtitle={restorePiiModal ? "Mengembalikan data dari status anonim" : ""}
        confirmText="Ya, Restore Data"
        onConfirm={handleRestorePii}
        isConfirming={restorePiiLoading}
      >
        {restorePiiError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{restorePiiError}</p>
          </div>
        )}
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm font-semibold text-amber-800 mb-1">
            Peringatan Konsekuensi Pemulihan (Restore)
          </p>
          <p className="text-sm text-amber-700 leading-relaxed">
            Tindakan ini akan <strong>secara publik</strong> memunculkan kembali Nama dan NIM mahasiswa yang sebelumnya telah dianonimkan (dicabut consent-nya). Pastikan Anda memiliki persetujuan baru yang sah dari mahasiswa untuk memulihkan data pribadi mereka dari cadangan (backup).
          </p>
        </div>
      </ActionModal>

      <ActionModal
        isOpen={!!resetWalletModal}
        onClose={() => {
          if (!resetWalletLoading) setResetWalletModal(null);
        }}
        icon={RefreshCcw}
        iconBgColor="bg-amber-50"
        iconTextColor="text-amber-600"
        title="Reset Wallet Mahasiswa"
        subtitle={resetWalletModal ? `${resetWalletModal.nama} (${resetWalletModal.nim})` : ""}
        confirmText="Ya, Reset Wallet"
        onConfirm={handleResetWallet}
        isConfirming={resetWalletLoading}
      >
        {resetWalletError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {resetWalletError}
          </div>
        )}
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 space-y-1">
          <p className="font-bold">⚠️ Perhatian Risiko Kriptografi:</p>
          <p>
            Me-reset wallet akan memutuskan kaitan alamat wallet yang lama secara permanen. Jika Ijazah sudah tercetak (MINTED/CLAIMED), ijazah tersebut akan di-reset menjadi <code>NOT_ISSUED</code>. Admin perlu melakukan <strong>Re-minting</strong> setelah mahasiswa mendaftarkan alamat wallet barunya.
          </p>
        </div>
      </ActionModal>
    </div>
  );
}
