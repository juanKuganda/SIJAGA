"use client";

import { useState } from "react";
import Card, { CardContent, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";

interface VerificationResult {
  verified: boolean;
  message?: string;
  data?: {
    nama: string;
    nim: string;
    prodi: string;
    tahunLulus: string;
    status: string;
    nftAddress: string;
    issuedAt: string;
    penerbit: string;
  };
  explorerUrl?: string;
}

export default function VerifikasiPage() {
  const [wallet, setWallet] = useState("");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);

    try {
      const response = await fetch(`/api/verify?wallet=${wallet}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Verifikasi gagal");
        return;
      }

      setResult(data);
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Verifikasi Ijazah
          </h1>
          <p className="text-lg text-gray-600">
            SIJAGA — Sistem Jaminan Autentikasi Gelar Akademik
          </p>
          <p className="text-gray-500 mt-2">
            Universitas Tadulako
          </p>
        </div>

        {/* Form Verifikasi */}
        <Card className="mb-8">
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">
              Cek Keaslian Ijazah
            </h2>
            <p className="text-gray-600 mt-1">
              Masukkan alamat wallet untuk memverifikasi keaslian ijazah
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify} className="space-y-4">
              <Input
                label="Alamat Wallet"
                placeholder="Contoh: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                required
                helperText="Masukkan alamat wallet Solana yang ingin diverifikasi"
              />

              <Button type="submit" className="w-full" loading={loading}>
                Verifikasi
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Hasil Verifikasi */}
        {error && (
          <Card className="mb-8 border-red-200">
            <CardContent>
              <div className="flex items-center space-x-3">
                <div className="text-red-500 text-2xl">❌</div>
                <div>
                  <p className="font-medium text-red-800">Verifikasi Gagal</p>
                  <p className="text-red-600">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {result && (
          <Card
            className={
              result.verified ? "border-green-200" : "border-yellow-200"
            }
          >
            <CardHeader>
              <div className="flex items-center space-x-3">
                {result.verified ? (
                  <>
                    <div className="text-green-500 text-3xl">✅</div>
                    <div>
                      <h2 className="text-xl font-semibold text-green-800">
                        Ijazah Terverifikasi
                      </h2>
                      <p className="text-green-600">
                        Ijazah ini diterbitkan oleh Universitas Tadulako
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-yellow-500 text-3xl">⚠️</div>
                    <div>
                      <h2 className="text-xl font-semibold text-yellow-800">
                        Tidak Ditemukan
                      </h2>
                      <p className="text-yellow-600">
                        {result.message}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </CardHeader>

            {result.verified && result.data && (
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600">Nama</p>
                      <p className="font-medium text-lg">{result.data.nama}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">NIM</p>
                      <p className="font-medium">{result.data.nim}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Program Studi</p>
                      <p className="font-medium">{result.data.prodi}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Tahun Lulus</p>
                      <p className="font-medium">{result.data.tahunLulus}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600">Penerbit</p>
                      <p className="font-medium">{result.data.penerbit}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <Badge variant="success">{result.data.status}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">NFT Address</p>
                      <p className="font-mono text-sm break-all">
                        {result.data.nftAddress}
                      </p>
                    </div>
                    {result.data.issuedAt && (
                      <div>
                        <p className="text-sm text-gray-600">Tanggal Terbit</p>
                        <p className="font-medium">
                          {new Date(result.data.issuedAt).toLocaleDateString(
                            "id-ID",
                            {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            }
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {result.explorerUrl && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <a
                      href={result.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Lihat di Solana Explorer →
                    </a>
                    <p className="text-sm text-gray-500 mt-1">
                      Bukti on-chain yang bisa dicek secara independen
                    </p>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        )}

        {/* Info */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>
            Sistem ini menggunakan teknologi blockchain Solana untuk memastikan
            keaslian ijazah.
          </p>
          <p className="mt-1">
            Data yang terverifikasi adalah data on-chain yang tidak dapat
            dimanipulasi.
          </p>
        </div>
      </div>
    </div>
  );
}
