"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, ExternalLink, ShieldCheck, XCircle, FileText } from "lucide-react";

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
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-zinc-200 border-t-red-600" />
      </div>
    );
  }

  if (error || !cert) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="text-center bg-white p-10 rounded-[2rem] shadow-sm border border-zinc-100 max-w-md w-full">
          <div className="w-20 h-20 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Ijazah Tidak Ditemukan
          </h1>
          <p className="text-muted-foreground mb-8">
            {error || "Data ijazah tidak tersedia atau belum diterbitkan."}
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center h-12 px-6 rounded-full bg-foreground text-white font-semibold hover:bg-foreground/90 transition-colors"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  const isRevoked = cert.status === "REVOKED";

  return (
    <div className="min-h-screen bg-zinc-50/50 relative selection:bg-red-100 selection:text-red-900 font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] opacity-40 z-0 pointer-events-none"></div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        {/* Header Navigation — hidden on print */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 print:hidden">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-semibold bg-white px-4 py-2.5 rounded-xl border border-zinc-200 shadow-sm w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Link>
          <div className="flex flex-wrap gap-3">
            {cert.nftAddress && (
              <a
                href={`https://explorer.solana.com/address/${cert.nftAddress}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white text-zinc-700 hover:text-foreground font-semibold text-sm px-4 py-2.5 rounded-xl border border-zinc-200 shadow-sm transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Solana Explorer
              </a>
            )}
            <button 
              onClick={handlePrint}
              className="inline-flex items-center gap-2 bg-foreground text-white font-semibold text-sm px-6 py-2.5 rounded-xl shadow-md hover:bg-foreground/90 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Cetak Dokumen
            </button>
          </div>
        </div>

        {/* Revoke Banner */}
        {isRevoked && (
          <div className="mb-8 p-5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-red-900 font-bold text-lg">
                IJAZAH INI TELAH DIREVOKE / DICABUT
              </p>
              <p className="text-red-800/80 font-medium mt-1">
                Alasan: {cert.revokeReason || "Tidak tersedia"}
              </p>
            </div>
          </div>
        )}

        {/* Main Certificate View */}
        <div className="bg-white rounded-[2rem] border border-zinc-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-12 print:border-none print:shadow-none print:p-0">
          
          {/* Certificate CSS-based Preview (Copied from Dashboard Detail) */}
          <div className={`w-full aspect-[1.414] bg-[#F8F9FA] rounded-md border-[8px] ${isRevoked ? 'border-red-200' : 'border-[#D1D5DB]'} p-4 sm:p-8 flex flex-col items-center justify-center text-center shadow-inner relative overflow-hidden print:aspect-auto print:h-screen print:border-none print:shadow-none`}>
            {/* Ornamen / Latar Belakang Garis */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 1px, transparent 10px)' }}></div>
            <div className={`absolute inset-4 border-2 ${isRevoked ? 'border-red-200' : 'border-[#E5E7EB]'} rounded pointer-events-none`}></div>
            
            {/* Logo Untad */}
            <div className="w-20 h-20 sm:w-28 sm:h-28 flex items-center justify-center mb-8 z-10 drop-shadow-lg">
              <img
                src="/web-app-manifest-512x512.png"
                alt="Logo Universitas Tadulako"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="space-y-6 z-10 w-full max-w-2xl mx-auto">
              <div>
                <h3 className="text-gray-900 font-serif text-2xl sm:text-3xl font-bold uppercase tracking-[0.2em]">
                  Universitas Tadulako
                </h3>
                <p className="text-gray-500 text-sm sm:text-base font-medium mt-2 uppercase tracking-widest">
                  Sertifikat Ijazah Kelulusan
                </p>
              </div>

              <div className="py-6 border-y border-zinc-200 border-dashed">
                <p className="text-gray-500 text-sm italic mb-4">Diberikan Kepada</p>
                <h2 className="text-3xl sm:text-5xl font-serif text-gray-900 font-bold tracking-tight">
                  {cert.nama}
                </h2>
                <p className="text-gray-600 font-mono mt-3 text-base font-medium">
                  NIM: {cert.nim}
                </p>
              </div>

              <div>
                <p className="text-gray-500 text-sm mb-2">
                  Telah menyelesaikan semua persyaratan akademik<br/>pada Program Studi:
                </p>
                <p className="text-gray-900 font-bold uppercase tracking-[0.15em] text-lg sm:text-xl">
                  {cert.prodi || "INFORMATIKA"}
                </p>
                <p className="text-gray-500 text-sm mt-3 font-medium">
                  Tahun Kelulusan: {cert.angkatan || "2024"}
                </p>
              </div>
            </div>
            
            {/* Watermark REVOKED / DIBATALKAN */}
            {isRevoked && (
              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none overflow-hidden">
                <div className="text-red-500/25 text-5xl sm:text-7xl md:text-[140px] font-black uppercase tracking-[0.2em] -rotate-[30deg] border-[8px] md:border-[12px] border-red-500/25 px-8 py-4 md:px-16 md:py-6 rounded-3xl select-none">
                  DIBATALKAN
                </div>
              </div>
            )}
          </div>

          {/* Modern Detail Block */}
          <div className="mt-12 bg-zinc-50 rounded-2xl p-6 md:p-8 border border-zinc-100 print:hidden">
            <h3 className="text-base font-bold text-foreground mb-6 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Verifikasi Kriptografis
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {cert.nftAddress && (
                <div>
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">NFT Address (Soulbound)</span>
                  <div className="font-mono text-sm font-semibold break-all text-zinc-700 bg-white p-3 rounded-xl border border-zinc-100">
                    {cert.nftAddress}
                  </div>
                </div>
              )}
              {cert.txSignature && (
                <div>
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">Transaction Hash</span>
                  <div className="font-mono text-sm font-semibold break-all text-zinc-700 bg-white p-3 rounded-xl border border-zinc-100">
                    {cert.txSignature}
                  </div>
                </div>
              )}
              {cert.walletAddress && (
                <div>
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">Wallet Pemilik</span>
                  <div className="font-mono text-sm font-semibold break-all text-zinc-700 bg-white p-3 rounded-xl border border-zinc-100">
                    {cert.walletAddress}
                  </div>
                </div>
              )}
              {cert.issuedAt && (
                <div>
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">Tanggal Terbit</span>
                  <div className="text-sm font-semibold text-zinc-700 bg-white p-3 rounded-xl border border-zinc-100">
                    {new Date(cert.issuedAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-zinc-200 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-semibold text-zinc-500">
                  Sistem Jaminan Autentikasi Gelar Akademik
                </span>
              </div>
              <p className="text-xs font-medium text-zinc-500">
                Verifikasi real-time di <span className="font-bold text-foreground">{(typeof window !== 'undefined' && window.location.host) || "sijaga.untad.ac.id"}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
