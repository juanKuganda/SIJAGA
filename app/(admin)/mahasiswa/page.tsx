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

  useEffect(() => {
    fetchMahasiswa();
  }, []);

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

  const handleVerify = async (walletId: string, status: "VERIFIED" | "REJECTED") => {
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
        return <Badge variant="warning">Pending</Badge>;
      case "VERIFIED":
        return <Badge variant="success">Terverifikasi</Badge>;
      case "REJECTED":
        return <Badge variant="danger">Ditolak</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getCertBadge = (status: string | undefined) => {
    switch (status) {
      case "MINTED":
        return <Badge variant="info">Minted</Badge>;
      case "CLAIMED":
        return <Badge variant="success">Claimed</Badge>;
      case "REVOKED":
        return <Badge variant="danger">Revoked</Badge>;
      default:
        return <Badge variant="default">—</Badge>;
    }
  };

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
        <h1 className="text-2xl font-bold text-white">Kelola Mahasiswa</h1>
        <p className="text-[#71717A] mt-1">
          Verifikasi wallet, edit data, dan kelola mahasiswa
        </p>
      </div>

      {verifyError && (
        <div className="mb-4 p-4 bg-red-900/20 border border-red-800/30 rounded-lg text-red-400">
          {verifyError}
        </div>
      )}

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
              {[
                { key: "all", label: "Semua" },
                { key: "pending", label: "Pending" },
                { key: "verified", label: "Terverifikasi" },
                { key: "no-wallet", label: "Belum Daftar" },
              ].map((f) => (
                <Button
                  key={f.key}
                  variant={filter === f.key ? "primary" : "ghost"}
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
                  <TableCell className="text-center py-8 text-[#52525B]">
                    Tidak ada data mahasiswa
                  </TableCell>
                </TableRow>
              ) : (
                filteredMahasiswa.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium text-white">{m.nim}</TableCell>
                    <TableCell className="text-white">{m.nama}</TableCell>
                    <TableCell>{m.prodi || "-"}</TableCell>
                    <TableCell>
                      {m.wallet ? (
                        <span className="text-xs font-mono text-[#71717A]">
                          {m.wallet.walletAddress.slice(0, 8)}...
                          {m.wallet.walletAddress.slice(-6)}
                        </span>
                      ) : (
                        <span className="text-[#52525B]">Belum daftar</span>
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
                      {getCertBadge(m.certificate?.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openEditModal(m)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                          Edit
                        </Button>
                        {m.wallet?.status === "PENDING" && (
                          <>
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
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setEditModal(null)}
          />
          <div className="relative bg-[#111118] border border-[#27272A] rounded-xl shadow-2xl max-w-md w-full p-6 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-sky-900/30 border border-sky-600/30 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Edit Data Mahasiswa
                </h3>
                <p className="text-sm text-[#71717A]">
                  NIM: {editModal.nim}
                </p>
              </div>
            </div>

            {editError && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-600/30 rounded-lg text-sm text-red-400">
                {editError}
              </div>
            )}

            <div className="space-y-4 mb-6">
              <Input
                label="Nama Lengkap"
                value={editForm.nama}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, nama: e.target.value }))
                }
              />

              <Input
                label="Email"
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, email: e.target.value }))
                }
              />

              <Input
                label="Program Studi"
                value={editForm.prodi}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, prodi: e.target.value }))
                }
              />

              <Input
                label="Angkatan"
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

            <div className="flex gap-3">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setEditModal(null)}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleEditSubmit}
                loading={editLoading}
              >
                Simpan Perubahan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
