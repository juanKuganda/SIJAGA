import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Card, { CardContent, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import CopyBlinkLink from "./CopyBlinkLink";

export default async function DetailIjazahPage({
  params,
}: {
  params: Promise<{ nim: string }>;
}) {
  const { nim } = await params;

  const user = await prisma.user.findUnique({
    where: { nim },
    include: {
      wallet: true,
      certificate: true,
    },
  });

  if (!user) {
    notFound();
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const actionUrl = `${appUrl}/api/actions/claim?nim=${user.nim}`;
  const blinkLink = `https://dial.to/?action=solana-action:${encodeURIComponent(
    actionUrl
  )}`;

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="warning">Pending</Badge>;
      case "VERIFIED":
        return <Badge variant="success">Terverifikasi</Badge>;
      case "REJECTED":
        return <Badge variant="danger">Ditolak</Badge>;
      default:
        return <Badge>{status || "—"}</Badge>;
    }
  };

  const getCertBadge = (status?: string) => {
    switch (status) {
      case "MINTED":
        return <Badge variant="info">Minted</Badge>;
      case "CLAIMED":
        return <Badge variant="success">Claimed</Badge>;
      case "REVOKED":
        return <Badge variant="danger">Revoked</Badge>;
      case "NOT_ISSUED":
      default:
        return <Badge variant="default">Belum Diterbitkan</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/mahasiswa"
          className="p-2 rounded-lg bg-[#111118] border border-[#27272A] text-[#71717A] hover:text-white hover:border-[#3F3F46] transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Detail Ijazah</h1>
          <p className="text-[#A1A1AA] mt-1 text-sm">
            NIM: {user.nim}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kolom Kiri: Detail Data & Blinks */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-white">Data Mahasiswa</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 border-b border-[#27272A] pb-4">
                  <div>
                    <p className="text-sm text-[#71717A] mb-1">Nama Lengkap</p>
                    <p className="text-white font-medium">{user.nama}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#71717A] mb-1">Program Studi</p>
                    <p className="text-white font-medium">{user.prodi || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#71717A] mb-1">Angkatan</p>
                    <p className="text-white font-medium">{user.angkatan || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#71717A] mb-1">Email</p>
                    <p className="text-white font-medium">{user.email}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <h3 className="text-sm font-semibold text-white mb-3">Informasi Wallet & NFT</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#71717A]">Status Wallet</span>
                      {getStatusBadge(user.wallet?.status)}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#71717A]">Wallet Address</span>
                      {user.wallet ? (
                        <span className="text-xs font-mono text-[#A1A1AA]">
                          {user.wallet.walletAddress.slice(0, 8)}...
                          {user.wallet.walletAddress.slice(-6)}
                        </span>
                      ) : (
                        <span className="text-sm text-[#52525B]">Belum daftar</span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#71717A]">Status Ijazah</span>
                      {getCertBadge(user.certificate?.status)}
                    </div>
                    
                    {user.certificate && user.certificate.status !== "NOT_ISSUED" && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-[#71717A]">Tanggal Terbit</span>
                          <span className="text-sm text-white">
                            {user.certificate.issuedAt
                              ? new Date(user.certificate.issuedAt).toLocaleDateString("id-ID")
                              : "-"}
                          </span>
                        </div>
                        {user.certificate.nftAddress && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-[#71717A]">NFT Address</span>
                            <a
                              href={`https://explorer.solana.com/address/${user.certificate.nftAddress}?cluster=devnet`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-mono text-red-400 hover:text-red-300 transition-colors truncate max-w-[150px] sm:max-w-xs"
                            >
                              {user.certificate.nftAddress}
                            </a>
                          </div>
                        )}
                        {user.certificate.txSignature && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-[#71717A]">Tx Hash</span>
                            <a
                              href={`https://explorer.solana.com/tx/${user.certificate.txSignature}?cluster=devnet`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-mono text-red-400 hover:text-red-300 transition-colors truncate max-w-[150px] sm:max-w-xs"
                            >
                              {user.certificate.txSignature.slice(0, 16)}...
                            </a>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {user.certificate && user.certificate.status !== "NOT_ISSUED" && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-900/30 border border-sky-600/30 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold text-white">Solana Blinks Link</h2>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#71717A] mb-4">
                  Bagikan link di bawah ini kepada mahasiswa. Mereka bisa mengklaim Ijazah NFT secara langsung melalui aplikasi yang mendukung Blinks (X/Twitter, Dial.to, Phantom, dll).
                </p>
                <CopyBlinkLink blinkUrl={blinkLink} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Kolom Kanan: Preview Ijazah */}
        <div>
          <Card className="h-full">
            <CardHeader>
              <h2 className="text-lg font-semibold text-white">Preview Ijazah</h2>
              <p className="text-sm text-[#71717A]">
                Visualisasi desain Ijazah Digital
              </p>
            </CardHeader>
            <CardContent>
              {/* Sertifikat CSS-based Preview */}
              <div className="w-full aspect-[1.414] bg-[#F8F9FA] rounded-md border-[8px] border-[#D1D5DB] p-4 sm:p-8 flex flex-col items-center justify-center text-center shadow-inner relative overflow-hidden">
                {/* Ornamen / Latar Belakang Garis */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 1px, transparent 10px)' }}></div>
                <div className="absolute inset-4 border-2 border-[#E5E7EB] rounded pointer-events-none"></div>
                
                {/* Logo Untad (Placeholder Seal) */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-600 rounded-full flex items-center justify-center shadow-md mb-6 z-10">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 border-2 border-white/50 rounded-full flex items-center justify-center">
                    <span className="text-white font-serif font-bold text-lg sm:text-xl">UT</span>
                  </div>
                </div>

                <div className="space-y-4 z-10">
                  <div>
                    <h3 className="text-gray-900 font-serif text-lg sm:text-2xl font-bold uppercase tracking-widest">
                      Universitas Tadulako
                    </h3>
                    <p className="text-gray-500 text-xs sm:text-sm font-medium mt-1 uppercase tracking-wider">
                      Sertifikat Ijazah Kelulusan
                    </p>
                  </div>

                  <div className="py-2">
                    <p className="text-gray-500 text-xs italic mb-2">Diberikan Kepada</p>
                    <h2 className="text-2xl sm:text-4xl font-serif text-gray-900 font-bold">
                      {user.nama}
                    </h2>
                    <p className="text-gray-600 font-mono mt-1 text-sm">
                      NIM: {user.nim}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500 text-xs">
                      Telah menyelesaikan semua persyaratan akademik<br/>pada Program Studi:
                    </p>
                    <p className="text-gray-900 font-bold uppercase tracking-widest mt-1 text-sm sm:text-base">
                      {user.prodi || "INFORMATIKA"}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      Tahun Kelulusan: {user.angkatan || "2026"}
                    </p>
                  </div>
                </div>
                
                {/* Watermark / Seal status */}
                <div className="absolute bottom-6 right-6 z-10 opacity-80">
                  <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center transform -rotate-12 ${
                    user.certificate?.status === 'CLAIMED' ? 'border-emerald-500 text-emerald-600' : 
                    user.certificate?.status === 'REVOKED' ? 'border-red-500 text-red-600' :
                    user.certificate?.status === 'MINTED' ? 'border-blue-500 text-blue-600' : 'border-gray-400 text-gray-400'
                  }`}>
                    <span className="text-[10px] font-bold uppercase tracking-tighter">
                      {user.certificate?.status || "DRAFT"}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 text-center">
                <p className="text-xs text-[#71717A]">
                  Ini adalah representasi visual Ijazah. Metadata asli tersimpan di jaringan IPFS dan NFT Soulbound di blockchain Solana.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
