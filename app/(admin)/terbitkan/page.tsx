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
    status: string;
    txSignature: string;
  } | null;
}

export default function TerbitkanPage() {
  const [mahasiswa, setMahasiswa] = useState<Mahasiswa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [minting, setMinting] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ userId: string; nama: string; nim: string } | null>(null);

  useEffect(() => {
    fetchMahasiswa();
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
        // Filter hanya yang wallet terverifikasi dan belum ada ijazah
        setMahasiswa(
          data.mahasiswa.filter(
            (m: Mahasiswa) =>
              m.wallet?.status === "VERIFIED" &&
              (!m.certificate || m.certificate.status === "NOT_ISSUED")
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
        alert(`Ijazah berhasil diterbitkan!\nTx: ${data.certificate.txSignature}`);
        setConfirmModal(null);
        fetchMahasiswa();
      } else {
        alert(`Gagal: ${data.error}`);
      }
    } catch (error) {
      console.error("Error minting:", error);
      alert("Terjadi kesalahan saat menerbitkan ijazah");
    } finally {
      setMinting(null);
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
          onClick={() => { setError(null); setLoading(true); fetchMahasiswa(); }}
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
        <h1 className="text-2xl font-bold text-white">
          Terbitkan Ijazah
        </h1>
        <p className="text-[#71717A] mt-1">
          Mint NFT Soulbound untuk mahasiswa yang wallet-nya sudah terverifikasi
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Mahasiswa Siap Terbit
            </h2>
            <Badge variant="info">{mahasiswa.length} mahasiswa</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {mahasiswa.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-[#1A1A24] border border-[#27272A] flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#52525B" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <p className="text-[#71717A]">
                Tidak ada mahasiswa yang siap untuk diterbitkan ijazahnya.
              </p>
              <p className="text-sm text-[#52525B] mt-1">
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
                  <TableHead>Wallet Address</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mahasiswa.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium text-white">{m.nim}</TableCell>
                    <TableCell className="text-white">{m.nama}</TableCell>
                    <TableCell>{m.prodi || "Informatika"}</TableCell>
                    <TableCell>
                      <span className="text-xs font-mono text-[#71717A]">
                        {m.wallet?.walletAddress.slice(0, 8)}...
                        {m.wallet?.walletAddress.slice(-6)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        loading={minting === m.id}
                        onClick={() =>
                          setConfirmModal({
                            userId: m.id,
                            nama: m.nama,
                            nim: m.nim,
                          })
                        }
                      >
                        Terbitkan
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setConfirmModal(null)}
          />
          <div className="relative bg-[#111118] border border-[#27272A] rounded-xl shadow-2xl max-w-md w-full p-6 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-900/30 border border-emerald-600/30 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="12" y1="18" x2="12" y2="12"/>
                  <line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Terbitkan Ijazah
                </h3>
                <p className="text-sm text-[#71717A]">
                  {confirmModal.nama} ({confirmModal.nim})
                </p>
              </div>
            </div>

            <div className="mb-4 p-3 bg-emerald-900/10 border border-emerald-600/20 rounded-lg">
              <p className="text-sm text-emerald-400">
                Tindakan ini akan <strong>mint NFT Soulbound</strong> ke wallet mahasiswa. Transaksi ini <strong>tidak dapat dibatalkan</strong> setelah dikonfirmasi di blockchain.
              </p>
            </div>

            <div className="mb-6 p-3 bg-amber-900/10 border border-amber-600/20 rounded-lg">
              <p className="text-sm text-amber-400">
                <strong>Yang akan terjadi:</strong>
              </p>
              <ol className="text-sm text-amber-400/70 mt-2 space-y-1 list-decimal list-inside">
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
                variant="primary"
                className="flex-1"
                onClick={() => handleMint(confirmModal.userId)}
                loading={minting === confirmModal.userId}
              >
                Ya, Terbitkan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
