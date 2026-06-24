"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface CertificateData {
  nama: string;
  nim: string;
  prodi: string;
  angkatan: string;
  status: string;
  nftAddress: string | null;
  txSignature: string | null;
  metadataUri: string | null;
  issuedAt: string | null;
  claimedAt: string | null;
  revokedAt: string | null;
  revokeReason: string | null;
  walletAddress: string | null;
}

export default function IjazahPreviewPage({
  params,
}: {
  params: Promise<{ nim: string }>;
}) {
  const resolvedParams = use(params);
  const [cert, setCert] = useState<CertificateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/certificate/${resolvedParams.nim}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setCert(data.certificate);
        }
      })
      .catch(() => setError("Gagal memuat data ijazah"))
      .finally(() => setLoading(false));
  }, [resolvedParams.nim]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#27272A] border-t-red-600" />
      </div>
    );
  }

  if (error || !cert) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-red-900/20 border border-red-600/30 flex items-center justify-center mx-auto mb-6">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#EF4444"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Ijazah Tidak Ditemukan
          </h1>
          <p className="text-[#71717A] mb-6">
            {error || "Data ijazah tidak tersedia"}
          </p>
          <Link
            href="/verifikasi"
            className="text-red-400 hover:text-red-300 font-medium transition-colors"
          >
            ← Kembali ke verifikasi
          </Link>
        </div>
      </div>
    );
  }

  const isRevoked = cert.status === "REVOKED";

  return (
    <div className="min-h-screen bg-[#0A0A0F] relative">
      {/* Background */}
      <div className="absolute inset-0 gradient-bg-hero" />
      <div className="absolute inset-0 grid-pattern opacity-20" />

      <div className="relative max-w-5xl mx-auto px-4 py-8">
        {/* Header Navigation — hidden on print */}
        <div className="flex items-center justify-between mb-8 print:hidden">
          <Link
            href="/verifikasi"
            className="inline-flex items-center gap-2 text-[#71717A] hover:text-red-400 transition-colors text-sm"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Kembali
          </Link>
          <div className="flex gap-3">
            <Button variant="secondary" size="sm" onClick={handlePrint}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Cetak
            </Button>
            {cert.nftAddress && (
              <a
                href={`https://explorer.solana.com/address/${cert.nftAddress}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  Solana Explorer
                </Button>
              </a>
            )}
          </div>
        </div>

        {/* Revoke Banner */}
        {isRevoked && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-600/30 rounded-xl flex items-center gap-4 print:bg-red-50 print:border-red-400">
            <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center flex-shrink-0">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#EF4444"
                strokeWidth="2.5"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <div>
              <p className="text-red-400 font-semibold print:text-red-700">
                IJAZAH INI TELAH DIREVOKE / DICABUT
              </p>
              <p className="text-red-400/70 text-sm print:text-red-600">
                Alasan: {cert.revokeReason || "Tidak tersedia"}
              </p>
            </div>
          </div>
        )}

        {/* Certificate Card */}
        <div
          className={`relative bg-[#111118] border-2 rounded-2xl overflow-hidden shadow-2xl print:bg-white print:text-black print:shadow-none ${
            isRevoked
              ? "border-red-600/40"
              : "border-[#27272A] hover:border-red-600/20"
          }`}
        >
          {/* Decorative Top Border */}
          <div
            className={`h-2 w-full ${
              isRevoked
                ? "bg-gradient-to-r from-red-900 via-red-600 to-red-900"
                : "bg-gradient-to-r from-red-800 via-red-600 to-red-800"
            }`}
          />

          <div className="p-8 md:p-12">
            {/* Certificate Header */}
            <div className="text-center mb-10">
              {/* University Logo/Emblem */}
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-lg shadow-red-900/30 print:shadow-none">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
              </div>

              <p className="text-[#71717A] text-sm uppercase tracking-[0.3em] mb-2 print:text-gray-500">
                Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi
              </p>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 print:text-black">
                UNIVERSITAS TADULAKO
              </h1>
              <div className="w-32 h-0.5 bg-gradient-to-r from-transparent via-red-600 to-transparent mx-auto my-4" />
              <h2 className="text-lg md:text-xl font-semibold text-[#A1A1AA] uppercase tracking-wider print:text-gray-700">
                Ijazah Sarjana (S1)
              </h2>
              <p className="text-[#52525B] text-sm mt-2 print:text-gray-500">
                Sertifikat Digital Blockchain — NFT Soulbound
              </p>
            </div>

            {/* Certificate Body */}
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <p className="text-[#71717A] text-sm print:text-gray-500">
                  Diberikan kepada:
                </p>
                <h2 className="text-3xl md:text-4xl font-bold text-white mt-2 mb-1 print:text-black">
                  {cert.nama}
                </h2>
                <div className="w-48 h-px bg-gradient-to-r from-transparent via-[#52525B] to-transparent mx-auto mt-3" />
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10 p-6 bg-[#0A0A0F]/50 rounded-xl border border-[#27272A] print:bg-gray-50 print:border-gray-200">
                <div className="text-center">
                  <p className="text-xs text-[#52525B] uppercase tracking-wider mb-1 print:text-gray-500">
                    NIM
                  </p>
                  <p className="text-white font-semibold print:text-black">
                    {cert.nim}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-[#52525B] uppercase tracking-wider mb-1 print:text-gray-500">
                    Program Studi
                  </p>
                  <p className="text-white font-semibold print:text-black">
                    {cert.prodi}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-[#52525B] uppercase tracking-wider mb-1 print:text-gray-500">
                    Angkatan
                  </p>
                  <p className="text-white font-semibold print:text-black">
                    {cert.angkatan}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-[#52525B] uppercase tracking-wider mb-1 print:text-gray-500">
                    Status
                  </p>
                  <Badge
                    variant={
                      isRevoked
                        ? "danger"
                        : cert.status === "CLAIMED"
                          ? "success"
                          : "info"
                    }
                  >
                    {cert.status}
                  </Badge>
                </div>
              </div>

              {/* Blockchain Details */}
              <div className="space-y-4 mb-10">
                <h3 className="text-sm font-semibold text-[#71717A] uppercase tracking-wider">
                  Detail Blockchain
                </h3>
                <div className="space-y-3">
                  {cert.nftAddress && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-[#0A0A0F] rounded-lg border border-[#1A1A24] print:bg-gray-50 print:border-gray-200">
                      <span className="text-xs text-[#52525B] uppercase tracking-wider print:text-gray-500">
                        NFT Address
                      </span>
                      <span className="font-mono text-xs text-[#A1A1AA] break-all print:text-gray-700">
                        {cert.nftAddress}
                      </span>
                    </div>
                  )}
                  {cert.txSignature && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-[#0A0A0F] rounded-lg border border-[#1A1A24] print:bg-gray-50 print:border-gray-200">
                      <span className="text-xs text-[#52525B] uppercase tracking-wider print:text-gray-500">
                        Transaction
                      </span>
                      <a
                        href={`https://explorer.solana.com/tx/${cert.txSignature}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-red-400 hover:text-red-300 break-all transition-colors print:text-blue-700"
                      >
                        {cert.txSignature}
                      </a>
                    </div>
                  )}
                  {cert.walletAddress && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-[#0A0A0F] rounded-lg border border-[#1A1A24] print:bg-gray-50 print:border-gray-200">
                      <span className="text-xs text-[#52525B] uppercase tracking-wider print:text-gray-500">
                        Wallet Pemilik
                      </span>
                      <span className="font-mono text-xs text-[#A1A1AA] break-all print:text-gray-700">
                        {cert.walletAddress}
                      </span>
                    </div>
                  )}
                  {cert.issuedAt && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-[#0A0A0F] rounded-lg border border-[#1A1A24] print:bg-gray-50 print:border-gray-200">
                      <span className="text-xs text-[#52525B] uppercase tracking-wider print:text-gray-500">
                        Tanggal Terbit
                      </span>
                      <span className="text-sm text-[#A1A1AA] print:text-gray-700">
                        {new Date(cert.issuedAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="text-center pt-8 border-t border-[#27272A] print:border-gray-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-md bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="2.5"
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <span className="text-sm font-bold gradient-text print:text-red-700">
                    SIJAGA
                  </span>
                </div>
                <p className="text-xs text-[#52525B] print:text-gray-500">
                  Sistem Jaminan Autentikasi Gelar Akademik
                </p>
                <p className="text-xs text-[#3F3F46] mt-1 print:text-gray-400">
                  Diverifikasi melalui blockchain Solana • NFT Soulbound (Non-transferable)
                </p>

                {/* Verification Link */}
                <div className="mt-4 p-3 bg-[#0A0A0F] rounded-lg border border-[#1A1A24] inline-block print:bg-gray-50 print:border-gray-200">
                  <p className="text-xs text-[#52525B] print:text-gray-500">
                    Verifikasi di:{" "}
                    <span className="text-red-400 print:text-blue-700">
                      {process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/verifikasi
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Info — hidden on print */}
        <div className="mt-8 text-center text-[#52525B] text-sm print:hidden">
          <p>
            Ijazah ini diverifikasi melalui teknologi blockchain Solana.
          </p>
          <p className="mt-1">
            Data on-chain tidak dapat dimanipulasi dan bisa dicek secara
            independen.
          </p>
        </div>
      </div>
    </div>
  );
}
