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
  const [minting, setMinting] = useState<string | null>(null);

  useEffect(() => {
    fetchMahasiswa();
  }, []);

  const fetchMahasiswa = async () => {
    try {
      const response = await fetch("/api/admin/mahasiswa");
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Terbitkan Ijazah
        </h1>
        <p className="text-gray-600 mt-1">
          Mint NFT Soulbound untuk mahasiswa yang wallet-nya sudah terverifikasi
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Mahasiswa Siap Terbit
            </h2>
            <Badge variant="info">{mahasiswa.length} mahasiswa</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {mahasiswa.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Tidak ada mahasiswa yang siap untuk diterbitkan ijazahnya.
              <br />
              <span className="text-sm">
                Pastikan wallet mahasiswa sudah terverifikasi.
              </span>
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
                    <TableCell className="font-medium">{m.nim}</TableCell>
                    <TableCell>{m.nama}</TableCell>
                    <TableCell>{m.prodi || "Informatika"}</TableCell>
                    <TableCell>
                      <span className="text-xs font-mono">
                        {m.wallet?.walletAddress.slice(0, 8)}...
                        {m.wallet?.walletAddress.slice(-6)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        loading={minting === m.id}
                        onClick={() => handleMint(m.id)}
                      >
                        Terbitkan Ijazah
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
