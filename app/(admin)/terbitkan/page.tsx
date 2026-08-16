"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FileText, Eye, XCircle, CheckCircle2, Loader2 } from "lucide-react";
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface Mahasiswa {
  id: string;
  nama: string;
  nim: string;
  prodi: string;
  dataConsent: boolean;
  wallet: {
    walletAddress: string;
    status: string;
  } | null;
  certificate: {
    status: string;
    txSignature: string;
  } | null;
}

export default function TerbitkanPage() {
  const [mahasiswa, setMahasiswa] = useState<Mahasiswa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [minting, setMinting] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    userId: string;
    nama: string;
    nim: string;
  } | null>(null);

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
              m.wallet?.status === "VERIFIED" &&
              (!m.certificate || m.certificate.status === "NOT_ISSUED"),
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMahasiswa();
  }, []);

  // Pagination Logic
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  const totalPages = Math.ceil(mahasiswa.length / ITEMS_PER_PAGE);
  const paginatedMahasiswa = mahasiswa.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleMint = async (userId: string) => {
    setMinting(userId);

    try {
      const response = await fetch("/api/nft/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Ijazah berhasil diterbitkan", {
          description: `Tx: ${data.certificate.txSignature?.slice(0, 16)}...`,
          duration: 8000,
        });
        setConfirmModal(null);
        fetchMahasiswa();
      } else {
        toast.error("Gagal menerbitkan ijazah", {
          description: data.error,
        });
      }
    } catch (error) {
      console.error("Error minting:", error);
      toast.error("Terjadi kesalahan saat menerbitkan ijazah");
    } finally {
      setMinting(null);
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
          }}
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
          Terbitkan Ijazah
        </h1>
        <p className="text-muted-foreground mt-1">
          Mint NFT Soulbound untuk mahasiswa yang wallet-nya sudah terverifikasi
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Mahasiswa Siap Terbit</CardTitle>
            <Badge
              variant="secondary"
              className="bg-blue-50 text-blue-700 border-blue-200"
            >
              {mahasiswa.length} mahasiswa
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {mahasiswa.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <FileText className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-foreground font-semibold">
                Tidak ada mahasiswa yang siap untuk diterbitkan ijazahnya.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Pastikan wallet mahasiswa sudah terverifikasi.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NIM</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Prodi</TableHead>
                  <TableHead>Consent</TableHead>
                  <TableHead>Wallet Address</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedMahasiswa.map((m) => (
                  <TableRow key={m.id} className="hover:bg-muted/50">
                    <TableCell className="font-bold text-foreground">
                      {m.nim}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {m.nama}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.prodi || "Informatika"}
                    </TableCell>
                    <TableCell>
                      {m.dataConsent ? (
                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Setuju
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">
                          <XCircle className="w-3 h-3 mr-1" /> Belum
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-mono text-muted-foreground">
                        {m.wallet?.walletAddress.slice(0, 8)}...
                        {m.wallet?.walletAddress.slice(-6)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={minting === m.id || !m.dataConsent}
                          title={!m.dataConsent ? "Mahasiswa belum memberikan consent" : undefined}
                          onClick={() =>
                            setConfirmModal({
                              userId: m.id,
                              nama: m.nama,
                              nim: m.nim,
                            })
                          }
                        >
                          {minting === m.id ? "Minting..." : !m.dataConsent ? "Perlu Consent" : "Terbitkan"}
                        </Button>
                        <Link href={`/detail-ijazah/${m.nim}`}>
                          <Button size="sm" variant="outline">
                            <Eye className="w-3.5 h-3.5 mr-1" />
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

          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink
                        onClick={() => setCurrentPage(i + 1)}
                        isActive={currentPage === i + 1}
                        className="cursor-pointer"
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            onClick={() => setConfirmModal(null)}
          />
          <div className="relative bg-white border border-border rounded-xl shadow-2xl max-w-md w-full p-6 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                <FileText className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Terbitkan Ijazah
                </h3>
                <p className="text-sm text-muted-foreground">
                  {confirmModal.nama} ({confirmModal.nim})
                </p>
              </div>
            </div>

            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-sm text-emerald-700">
                Tindakan ini akan <strong>mint NFT Soulbound</strong> ke wallet
                mahasiswa. Transaksi ini <strong>tidak dapat dibatalkan</strong>{" "}
                setelah dikonfirmasi di blockchain.
              </p>
            </div>

            <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800 font-semibold">
                Yang akan terjadi:
              </p>
              <ol className="text-sm text-amber-700 mt-2 space-y-1 list-decimal list-inside">
                <li>Metadata ijazah di-upload ke IPFS (Pinata)</li>
                <li>NFT Soulbound di-mint ke wallet mahasiswa</li>
                <li>Status berubah menjadi MINTED</li>
                <li>Mahasiswa bisa klaim via Blinks</li>
              </ol>
            </div>

            <div className="flex gap-3">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setConfirmModal(null)}
              >
                Batal
              </Button>
              <Button
                className="flex-1"
                onClick={() => handleMint(confirmModal.userId)}
                disabled={minting === confirmModal.userId}
              >
                {minting === confirmModal.userId ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Minting...
                  </>
                ) : (
                  "Ya, Terbitkan"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
