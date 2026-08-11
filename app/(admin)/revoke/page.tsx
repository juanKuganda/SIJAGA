"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Download,
  XCircle,
  FileText,
  Search,
  ShieldAlert,
  History,
  CornerUpLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";

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
  const [revokeModal, setRevokeModal] = useState<{
    userId: string;
    nama: string;
  } | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [restoreModal, setRestoreModal] = useState<{
    backupId: string;
    nama: string;
  } | null>(null);
  const [tab, setTab] = useState<string>("active");

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
                m.certificate.status === "REVOKED"),
          ),
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMahasiswa();
    fetchBackups();
  }, []);

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
        toast.success(`Sertifikat ${revokeModal.nama} berhasil direvoke`);
        setRevokeModal(null);
        setRevokeReason("");
        fetchMahasiswa();
        fetchBackups();
      } else {
        toast.error("Gagal merevoke sertifikat", {
          description: data.error,
        });
      }
    } catch (error) {
      console.error("Error revoking:", error);
      toast.error("Terjadi kesalahan saat merevoke sertifikat");
    } finally {
      setRevoking(null);
    }
  };

  const handleRestore = async (backupId: string) => {
    setRestoring(backupId);

    try {
      const response = await fetch("/api/admin/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backupId }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Sertifikat berhasil di-restore", {
          description: data.message,
        });
        setRestoreModal(null);
        fetchMahasiswa();
        fetchBackups();
      } else {
        toast.error("Gagal restore", {
          description: data.error,
        });
      }
    } catch (error) {
      console.error("Error restoring:", error);
      toast.error("Terjadi kesalahan saat me-restore sertifikat");
    } finally {
      setRestoring(null);
    }
  };

  const handleBackupAll = async () => {
    setBackupLoading(true);
    try {
      const response = await fetch("/api/admin/backup");
      const data = await response.json();

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sijaga-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Backup berhasil diunduh");
    } catch (error) {
      console.error("Error backing up:", error);
      toast.error("Gagal mengunduh backup");
    } finally {
      setBackupLoading(false);
    }
  };

  const activeCerts = mahasiswa.filter(
    (m) =>
      m.certificate?.status === "MINTED" || m.certificate?.status === "CLAIMED",
  );
  const revokedCerts = mahasiswa.filter(
    (m) => m.certificate?.status === "REVOKED",
  );

  if (loading) {
    return (
      <div>
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
            <div className="h-4 w-72 bg-muted rounded-lg animate-pulse mt-2" />
          </div>
          <div className="h-10 w-40 bg-muted rounded-lg animate-pulse" />
        </div>
        <div className="mb-6">
          <div className="h-10 w-64 bg-muted rounded-lg animate-pulse" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
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
          onClick={() => {
            setError(null);
            setLoading(true);
            fetchMahasiswa();
            fetchBackups();
          }}
        >
          Coba Lagi
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
            Revoke & Backup
          </h1>
          <p className="text-muted-foreground mt-1">
            Cabut sertifikat, kelola backup data, dan restore sertifikat
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button
            variant="outline"
            onClick={handleBackupAll}
            disabled={backupLoading}
            className="w-full sm:w-auto"
          >
            <Download className="w-4 h-4 mr-2" />
            {backupLoading ? "Mendownload..." : "Unduh Backup Database"}
          </Button>
          <p className="text-[10px] text-muted-foreground/80 max-w-xs text-right">
            File JSON ini berfungsi sebagai cadangan lokal _(off-chain)_ data ijazah mahasiswa untuk berjaga-jaga jika database utama rusak.
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger
            value="active"
            className="data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            Aktif{" "}
            <Badge
              variant="secondary"
              className="ml-2 bg-blue-50 text-blue-700"
            >
              {activeCerts.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="revoked"
            className="data-[state=active]:bg-white data-[state=active]:text-red-600 data-[state=active]:shadow-sm"
          >
            Direvoke{" "}
            <Badge variant="destructive" className="ml-2">
              {revokedCerts.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="backups"
            className="data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            Restore{" "}
            <Badge
              variant="secondary"
              className="ml-2 bg-purple-50 text-purple-700"
            >
              {backups.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="m-0">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Sertifikat Aktif</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {activeCerts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-7 h-7 text-muted-foreground" />
                  </div>
                  <p className="text-foreground font-semibold">
                    Belum ada sertifikat yang diterbitkan
                  </p>
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
                      <TableRow key={m.id} className="hover:bg-muted/50">
                        <TableCell className="font-bold text-foreground">
                          {m.nim}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {m.nama}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              m.certificate?.status === "CLAIMED"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }
                          >
                            {m.certificate?.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-mono text-muted-foreground">
                            {m.certificate?.nftAddress?.slice(0, 8)}...
                            {m.certificate?.nftAddress?.slice(-6)}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {m.certificate?.issuedAt
                            ? new Date(
                                m.certificate.issuedAt,
                              ).toLocaleDateString("id-ID")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() =>
                                setRevokeModal({
                                  userId: m.id,
                                  nama: m.nama,
                                })
                              }
                            >
                              <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                              Revoke
                            </Button>
                            <Link href={`/detail-ijazah/${m.nim}`}>
                              <Button size="sm" variant="outline">
                                Detail
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revoked" className="m-0">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Sertifikat Direvoke</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {revokedCerts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground font-medium">
                    Belum ada sertifikat yang direvoke
                  </p>
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
                      <TableRow key={m.id} className="hover:bg-muted/50">
                        <TableCell className="font-bold text-foreground">
                          {m.nim}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {m.nama}
                        </TableCell>
                        <TableCell className="text-red-600 max-w-xs truncate font-medium">
                          {m.certificate?.revokeReason || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {m.certificate?.revokedAt
                            ? new Date(
                                m.certificate.revokedAt,
                              ).toLocaleDateString("id-ID")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive">REVOKED</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backups" className="m-0">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Riwayat Backup & Restore</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Pilih backup untuk me-restore sertifikat yang direvoke
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {backups.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <History className="w-7 h-7 text-muted-foreground" />
                  </div>
                  <p className="text-foreground font-semibold">
                    Belum ada data backup
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
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
                      <TableRow key={b.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium text-foreground">
                          {b.userData?.nama || "-"}
                        </TableCell>
                        <TableCell className="font-bold text-foreground">
                          {b.userData?.nim || "-"}
                        </TableCell>
                        <TableCell>
                          {b.nftAddress ? (
                            <span className="text-xs font-mono text-muted-foreground">
                              {b.nftAddress.slice(0, 8)}...
                              {b.nftAddress.slice(-6)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-xs truncate">
                          {b.reason || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
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
                            <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-1 rounded-md">
                              Sudah digunakan
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setRestoreModal({
                                  backupId: b.id,
                                  nama: b.userData?.nama || "mahasiswa ini",
                                })
                              }
                              disabled={restoring === b.id}
                            >
                              <CornerUpLeft className="w-3.5 h-3.5 mr-1" />
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
        </TabsContent>
      </Tabs>

      {/* Revoke Modal */}
      {revokeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            onClick={() => {
              setRevokeModal(null);
              setRevokeReason("");
            }}
          />
          <div className="relative bg-white border border-border rounded-xl shadow-2xl max-w-md w-full p-6 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Revoke Sertifikat
                </h3>
                <p className="text-sm text-muted-foreground">
                  {revokeModal.nama}
                </p>
              </div>
            </div>

            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">
                Tindakan ini akan mencabut sertifikat ijazah. Data akan
                di-backup otomatis sebelum direvoke. Anda dapat me-restore dari
                tab Restore.
              </p>
            </div>

            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Catatan:</strong> NFT di Solana Explorer akan tetap
                terlihat (soft-revoke), namun verifikasi melalui SIJAGA akan
                menunjukkan status DIREVOKE.
              </p>
            </div>

            <div className="mb-6 space-y-2">
              <Label className="font-semibold text-foreground">
                Alasan Revokasi *
              </Label>
              <textarea
                className="w-full px-4 py-2.5 bg-white border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all resize-none shadow-sm"
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
                variant="destructive"
                className="flex-1"
                onClick={handleRevoke}
                disabled={
                  !revokeReason.trim() || revoking === revokeModal.userId
                }
              >
                {revoking === revokeModal.userId
                  ? "Memproses..."
                  : "Revoke Sertifikat"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {restoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            onClick={() => setRestoreModal(null)}
          />
          <div className="relative bg-white border border-border rounded-xl shadow-2xl max-w-md w-full p-6 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <CornerUpLeft className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Restore Sertifikat
                </h3>
                <p className="text-sm text-muted-foreground">
                  {restoreModal.nama}
                </p>
              </div>
            </div>

            <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                Sertifikat akan dikembalikan ke status sebelum direvoke.
                Mahasiswa dapat kembali menggunakan ijazah digitalnya.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setRestoreModal(null)}
              >
                Batal
              </Button>
              <Button
                className="flex-1"
                onClick={() => handleRestore(restoreModal.backupId)}
                disabled={restoring === restoreModal.backupId}
              >
                {restoring === restoreModal.backupId
                  ? "Memproses..."
                  : "Ya, Restore"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
