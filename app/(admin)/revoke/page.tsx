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

interface Mahasiswa {
  id: string;
  nama: string;
  nim: string;
  prodi: string;
  wallet: {
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

interface Backup {
  id: string;
  certificateId: string;
  userId: string;
  nftAddress: string | null;
  txSignature: string | null;
  reason: string | null;
  createdAt: string;
  usedAt: string | null;
  userData: {
    nama: string;
    nim: string;
    prodi: string;
  } | null;
  certStatus: string | null;
}

export default function RevokePage() {
  const [mahasiswa, setMahasiswa] = useState<Mahasiswa[]>([]);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokeModal, setRevokeModal] = useState<{ userId: string; nama: string } | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [tab, setTab] = useState<"active" | "revoked" | "backups">("active");

  useEffect(() => {
    fetchMahasiswa();
    fetchBackups();
  }, []);

  const fetchMahasiswa = async () => {
    try {
      const response = await fetch("/api/admin/mahasiswa");
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }
      const data = await response.json();
      if (data.mahasiswa) {
        setMahasiswa(
          data.mahasiswa.filter(
            (m: Mahasiswa) =>
              m.certificate &&
              (m.certificate.status === "MINTED" ||
                m.certificate.status === "CLAIMED" ||
                m.certificate.status === "REVOKED")
          )
        );
      }
    } catch (error) {
      console.error("Error fetching mahasiswa:", error);
      setError("Gagal memuat data mahasiswa");
    } finally {
      setLoading(false);
    }
  };

  const fetchBackups = async () => {
    try {
      const response = await fetch("/api/admin/backup/list");
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }
      const data = await response.json();
      if (data.backups) {
        setBackups(data.backups);
      }
    } catch (error) {
      console.error("Error fetching backups:", error);
    }
  };

  const handleRevoke = async () => {
    if (!revokeModal || !revokeReason.trim()) return;

    setRevoking(revokeModal.userId);

    try {
      const response = await fetch("/api/nft/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: revokeModal.userId,
          reason: revokeReason,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Sertifikat ${revokeModal.nama} berhasil direvoke`);
        setRevokeModal(null);
        setRevokeReason("");
        fetchMahasiswa();
        fetchBackups();
      } else {
        alert(`Gagal: ${data.error}`);
      }
    } catch (error) {
      console.error("Error revoking:", error);
      alert("Terjadi kesalahan saat merevoke sertifikat");
    } finally {
      setRevoking(null);
    }
  };

  const handleRestore = async (backupId: string) => {
    if (!confirm("Yakin ingin me-restore sertifikat dari backup ini? Status sertifikat akan dikembalikan ke sebelum direvoke.")) {
      return;
    }

    setRestoring(backupId);

    try {
      const response = await fetch("/api/admin/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backupId }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Sertifikat berhasil di-restore: ${data.message}`);
        fetchMahasiswa();
        fetchBackups();
      } else {
        alert(`Gagal restore: ${data.error}`);
      }
    } catch (error) {
      console.error("Error restoring:", error);
      alert("Terjadi kesalahan saat me-restore sertifikat");
    } finally {
      setRestoring(null);
    }
  };

  const handleBackupAll = async () => {
    setBackupLoading(true);
    try {
      const response = await fetch("/api/admin/backup");
      const data = await response.json();

      // Download as JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sijaga-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error backing up:", error);
      alert("Gagal mengunduh backup");
    } finally {
      setBackupLoading(false);
    }
  };

  const activeCerts = mahasiswa.filter(
    (m) => m.certificate?.status === "MINTED" || m.certificate?.status === "CLAIMED"
  );
  const revokedCerts = mahasiswa.filter(
    (m) => m.certificate?.status === "REVOKED"
  );

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
          onClick={() => { setError(null); setLoading(true); fetchMahasiswa(); fetchBackups(); }}
          className="mt-4 px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Revoke & Backup</h1>
          <p className="text-[#71717A] mt-1">
            Cabut sertifikat, kelola backup data, dan restore sertifikat
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={handleBackupAll}
          loading={backupLoading}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Download Backup
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={tab === "active" ? "primary" : "ghost"}
          size="sm"
          onClick={() => setTab("active")}
        >
          Aktif ({activeCerts.length})
        </Button>
        <Button
          variant={tab === "revoked" ? "danger" : "ghost"}
          size="sm"
          onClick={() => setTab("revoked")}
        >
          Direvoke ({revokedCerts.length})
        </Button>
        <Button
          variant={tab === "backups" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setTab("backups")}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="1 4 1 10 7 10"/>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
          </svg>
          Restore ({backups.length})
        </Button>
      </div>

      {tab === "active" ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                Sertifikat Aktif
              </h2>
              <Badge variant="success">{activeCerts.length} aktif</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {activeCerts.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-[#1A1A24] border border-[#27272A] flex items-center justify-center mx-auto mb-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#52525B" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <p className="text-[#71717A]">Belum ada sertifikat yang diterbitkan</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>NIM</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>NFT Address</TableHead>
                    <TableHead>Tanggal Terbit</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeCerts.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium text-white">{m.nim}</TableCell>
                      <TableCell className="text-white">{m.nama}</TableCell>
                      <TableCell>
                        <Badge variant={m.certificate?.status === "CLAIMED" ? "success" : "info"}>
                          {m.certificate?.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono text-[#71717A]">
                          {m.certificate?.nftAddress?.slice(0, 8)}...
                          {m.certificate?.nftAddress?.slice(-6)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {m.certificate?.issuedAt
                          ? new Date(m.certificate.issuedAt).toLocaleDateString("id-ID")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() =>
                            setRevokeModal({
                              userId: m.id,
                              nama: m.nama,
                            })
                          }
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="15" y1="9" x2="9" y2="15"/>
                            <line x1="9" y1="9" x2="15" y2="15"/>
                          </svg>
                          Revoke
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : tab === "revoked" ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                Sertifikat Direvoke
              </h2>
              <Badge variant="danger">{revokedCerts.length} direvoke</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {revokedCerts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[#71717A]">Belum ada sertifikat yang direvoke</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>NIM</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Alasan</TableHead>
                    <TableHead>Tanggal Revoke</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revokedCerts.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium text-white">{m.nim}</TableCell>
                      <TableCell className="text-white">{m.nama}</TableCell>
                      <TableCell className="text-red-400 max-w-xs truncate">
                        {m.certificate?.revokeReason || "-"}
                      </TableCell>
                      <TableCell>
                        {m.certificate?.revokedAt
                          ? new Date(m.certificate.revokedAt).toLocaleDateString("id-ID")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="danger">REVOKED</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Backups & Restore Tab */
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Riwayat Backup & Restore
                </h2>
                <p className="text-sm text-[#71717A] mt-1">
                  Pilih backup untuk me-restore sertifikat yang direvoke
                </p>
              </div>
              <Badge variant="info">{backups.length} backup</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {backups.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-[#1A1A24] border border-[#27272A] flex items-center justify-center mx-auto mb-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#52525B" strokeWidth="2">
                    <polyline points="1 4 1 10 7 10"/>
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                  </svg>
                </div>
                <p className="text-[#71717A]">Belum ada data backup</p>
                <p className="text-sm text-[#52525B] mt-1">
                  Backup otomatis dibuat setiap kali sertifikat direvoke
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mahasiswa</TableHead>
                    <TableHead>NIM</TableHead>
                    <TableHead>NFT Address</TableHead>
                    <TableHead>Alasan</TableHead>
                    <TableHead>Tanggal Backup</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backups.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="text-white font-medium">
                        {b.userData?.nama || "-"}
                      </TableCell>
                      <TableCell className="text-[#A1A1AA]">
                        {b.userData?.nim || "-"}
                      </TableCell>
                      <TableCell>
                        {b.nftAddress ? (
                          <span className="text-xs font-mono text-[#71717A]">
                            {b.nftAddress.slice(0, 8)}...{b.nftAddress.slice(-6)}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-[#71717A] max-w-xs truncate">
                        {b.reason || "-"}
                      </TableCell>
                      <TableCell className="text-[#71717A]">
                        {new Date(b.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>
                        {b.usedAt ? (
                          <span className="text-xs text-[#52525B]">
                            Sudah digunakan
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRestore(b.id)}
                            loading={restoring === b.id}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="1 4 1 10 7 10"/>
                              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                            </svg>
                            Restore
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Revoke Modal */}
      {revokeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setRevokeModal(null);
              setRevokeReason("");
            }}
          />
          <div className="relative bg-[#111118] border border-[#27272A] rounded-xl shadow-2xl max-w-md w-full p-6 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-900/30 border border-red-600/30 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Revoke Sertifikat
                </h3>
                <p className="text-sm text-[#71717A]">
                  {revokeModal.nama}
                </p>
              </div>
            </div>

            <div className="mb-4 p-3 bg-red-900/10 border border-red-600/20 rounded-lg">
              <p className="text-sm text-red-400">
                Tindakan ini akan mencabut sertifikat ijazah. Data akan di-backup otomatis sebelum direvoke. Anda dapat me-restore dari tab Restore.
              </p>
            </div>

            <div className="mb-4 p-3 bg-amber-900/10 border border-amber-600/20 rounded-lg">
              <p className="text-sm text-amber-400">
                <strong>Catatan:</strong> NFT di Solana Explorer akan tetap terlihat (soft-revoke), namun verifikasi melalui SIJAGA akan menunjukkan status DIREVOKE.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-[#A1A1AA] mb-1.5">
                Alasan Revokasi *
              </label>
              <textarea
                className="w-full px-4 py-2.5 bg-[#0A0A0F] border border-[#27272A] rounded-lg text-white placeholder:text-[#52525B] focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all resize-none"
                rows={3}
                placeholder="Jelaskan alasan revokasi sertifikat ini..."
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => {
                  setRevokeModal(null);
                  setRevokeReason("");
                }}
              >
                Batal
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={handleRevoke}
                loading={revoking === revokeModal.userId}
                disabled={!revokeReason.trim()}
              >
                Revoke Sertifikat
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
