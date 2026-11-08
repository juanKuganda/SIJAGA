"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Printer,
  ExternalLink,
  ShieldCheck,
  XCircle,
  FileText,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
  Clock,
} from "lucide-react";
import { CertificateUI } from "@/components/certificate-ui";
import { logoBase64 } from "@/lib/logo-base64";
import { useRouter } from "next/navigation";
import bs58 from "bs58";

// Typing for third-party injected wallets (Phantom/Solflare)
interface PhantomProvider {
  isPhantom?: boolean;
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  signTransaction?: <T>(tx: T) => Promise<T>;
  signMessage: (msg: Uint8Array, encoding?: string) => Promise<{ signature: Uint8Array } | Uint8Array>;
}

interface SolflareProvider {
  isSolflare?: boolean;
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  signTransaction?: <T>(tx: T) => Promise<T>;
  signMessage: (msg: Uint8Array, encoding?: string) => Promise<{ signature: Uint8Array } | Uint8Array>;
}

interface BackpackProvider {
  isBackpack?: boolean;
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  signTransaction?: <T>(tx: T) => Promise<T>;
  signMessage: (msg: Uint8Array, encoding?: string) => Promise<{ signature: Uint8Array } | Uint8Array>;
}

interface CustomWindow extends Window {
  phantom?: { solana?: PhantomProvider };
  solflare?: SolflareProvider;
  backpack?: BackpackProvider;
  solana?: PhantomProvider;
}

function getWalletProvider(): PhantomProvider | SolflareProvider | BackpackProvider | null {
  if (typeof window === "undefined") return null;
  const customWindow = window as unknown as CustomWindow;

  // Phantom
  if (customWindow.phantom?.solana?.isPhantom) {
    return customWindow.phantom.solana;
  }
  // Solflare
  if (customWindow.solflare?.isSolflare) {
    return customWindow.solflare;
  }
  // Backpack
  if (customWindow.backpack?.isBackpack) {
    return customWindow.backpack;
  }
  // Generic window.solana (Phantom legacy)
  if (customWindow.solana?.isPhantom) {
    return customWindow.solana;
  }
  return null;
}

interface CertificateData {
  nama: string;
  nim: string;
  prodi: string;
  tahunLulus: string;
  status: string;
  nftAddress: string | null;
  txSignature: string | null;
  metadataUri: string | null;
  issuedAt: string | null;
  claimedAt: string | null;
  revokedAt: string | null;
  revokeReason: string | null;
  walletAddress: string | null;
  dataHash: string | null;
  viewerRole?: string;
}

export default function IjazahPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [cert, setCert] = useState<CertificateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  // State Buktikan Kepemilikan (Challenge-Response Flow)
  const [challengeStatus, setChallengeStatus] = useState<
    "idle" | "connecting" | "challenge diminta" | "menunggu tanda tangan" | "memverifikasi" | "sukses" | "gagal"
  >("idle");
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [challengeData, setChallengeData] = useState<{
    nonce: string;
    message: string;
    expiresAt: string;
  } | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noWallet, setNoWallet] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(300);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  // Timer kedaluwarsa nonce 5 menit
  useEffect(() => {
    if (!challengeData?.expiresAt || challengeStatus === "sukses") return;

    const checkExpiry = () => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(challengeData.expiresAt).getTime() - Date.now()) / 1000)
      );
      setTimeLeft(remaining);
      if (remaining <= 0) {
        setIsExpired(true);
      }
    };

    checkExpiry();
    const timer = setInterval(checkExpiry, 1000);
    return () => clearInterval(timer);
  }, [challengeData, challengeStatus]);

  // Cek keberadaan wallet saat mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const provider = getWalletProvider();
      if (!provider) {
        setNoWallet(true);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleVerifyOwnership = async () => {
    setIsExpired(false);
    setErrorCode(null);
    setErrorMessage(null);

    const provider = getWalletProvider();
    if (!provider) {
      setNoWallet(true);
      setChallengeStatus("idle");
      return;
    }
    setNoWallet(false);

    let walletAddress = connectedWallet;

    try {
      // 1. connecting
      setChallengeStatus("connecting");
      const conn = await provider.connect();
      walletAddress = conn.publicKey.toString();
      setConnectedWallet(walletAddress);

      // 2. challenge diminta
      setChallengeStatus("challenge diminta");
      const challengeRes = await fetch("/api/verify/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      });

      const challengeJson = await challengeRes.json();
      if (!challengeRes.ok || !challengeJson.success) {
        setChallengeStatus("gagal");
        setErrorCode(challengeJson.error || "CHALLENGE_FAILED");
        setErrorMessage(
          challengeJson.message || challengeJson.error || "Gagal meminta challenge dari server."
        );
        return;
      }

      const freshChallenge = {
        nonce: challengeJson.nonce as string,
        message: challengeJson.message as string,
        expiresAt: challengeJson.expiresAt as string,
      };
      setChallengeData(freshChallenge);

      // 3. menunggu tanda tangan
      setChallengeStatus("menunggu tanda tangan");
      const msgBytes = new TextEncoder().encode(freshChallenge.message);

      let signedResult: unknown;
      try {
        signedResult = await provider.signMessage(msgBytes, "utf8");
      } catch (signErr: unknown) {
        const err = signErr as { code?: number; message?: string };
        setChallengeStatus("gagal");
        const isRejected =
          err?.code === 4001 ||
          err?.message?.toLowerCase().includes("reject") ||
          err?.message?.toLowerCase().includes("cancel") ||
          err?.message?.toLowerCase().includes("user rejected");
        setErrorCode(isRejected ? "USER_REJECTED" : "SIGNATURE_REJECTED");
        setErrorMessage(
          isRejected
            ? "Penandatanganan pesan dibatalkan oleh pengguna di dompet."
            : err?.message || "Gagal menandatangani pesan tantangan."
        );
        return;
      }

      let rawSig: Uint8Array;
      if (signedResult instanceof Uint8Array) {
        rawSig = signedResult;
      } else if (
        signedResult &&
        typeof signedResult === "object" &&
        "signature" in signedResult &&
        (signedResult as { signature: unknown }).signature
      ) {
        const s = (signedResult as { signature: unknown }).signature;
        rawSig = s instanceof Uint8Array ? s : new Uint8Array(s as ArrayLike<number>);
      } else {
        setChallengeStatus("gagal");
        setErrorCode("MALFORMED_INPUT");
        setErrorMessage("Format tanda tangan dari dompet tidak dikenali.");
        return;
      }

      const signature = bs58.encode(rawSig);

      // 4. memverifikasi
      setChallengeStatus("memverifikasi");
      const verifyRes = await fetch("/api/verify/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          walletAddress,
          nonce: freshChallenge.nonce,
          signature,
          message: freshChallenge.message,
          expectedOwner: cert?.walletAddress || undefined,
        }),
      });

      const verifyJson = await verifyRes.json();

      if (verifyRes.ok && verifyJson.verified) {
        setChallengeStatus("sukses");
        setErrorCode(null);
        setErrorMessage(null);
      } else {
        setChallengeStatus("gagal");
        setErrorCode(verifyJson.error || "VERIFICATION_FAILED");
        setErrorMessage(verifyJson.message || verifyJson.error || "Verifikasi tanda tangan gagal.");
      }
    } catch (err: unknown) {
      const errorObj = err as Error;
      setChallengeStatus("gagal");
      setErrorCode("CLIENT_ERROR");
      setErrorMessage(errorObj?.message || "Terjadi kesalahan saat memproses verifikasi.");
    }
  };

  useEffect(() => {
    fetch(`/api/certificate/${resolvedParams.id}`)
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
  }, [resolvedParams.id]);

  const handlePrint = () => {
    window.print();
  };

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    if (cert?.viewerRole === 'MAHASISWA') {
      router.push('/mahasiswa');
    } else if (cert?.viewerRole === 'ADMIN') {
      router.push('/admin/mahasiswa');
    } else {
      router.push('/');
    }
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
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-semibold bg-white px-4 py-2.5 rounded-xl border border-zinc-200 shadow-sm w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </button>
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
          
          {/* Certificate Component Preview */}
          <div className="w-full aspect-[1.414] overflow-hidden rounded-md border border-zinc-200 print:aspect-auto print:h-screen print:border-none print:shadow-none">
            <CertificateUI
              prodi={cert.prodi || ""}
              tahunLulus={cert.tahunLulus || ""}
              dataHash={cert.dataHash || undefined}
              isRevoked={isRevoked}
              logoBase64={logoBase64}
            />
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

          {/* Seksi Buktikan Kepemilikan */}
          <div className="mt-8 bg-zinc-50 rounded-2xl p-6 md:p-8 border border-zinc-100 print:hidden">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-red-600" />
                  Buktikan Kepemilikan
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Buktikan bahwa Anda adalah pemilik sah ijazah ini melalui tanda tangan kriptografis (challenge-response) pada dompet Solana.
                </p>
              </div>

              {/* Status Badge */}
              <div className="shrink-0">
                {challengeStatus === "idle" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-200/80 text-zinc-700">
                    Siap Memverifikasi
                  </span>
                )}
                {challengeStatus === "connecting" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Menghubungkan Dompet
                  </span>
                )}
                {challengeStatus === "challenge diminta" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Challenge Diminta
                  </span>
                )}
                {challengeStatus === "menunggu tanda tangan" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 animate-pulse">
                    <KeyRound className="w-3.5 h-3.5" />
                    Menunggu Tanda Tangan
                  </span>
                )}
                {challengeStatus === "memverifikasi" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Memverifikasi
                  </span>
                )}
                {challengeStatus === "sukses" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Kepemilikan Terverifikasi
                  </span>
                )}
                {challengeStatus === "gagal" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                    <XCircle className="w-3.5 h-3.5 text-red-600" />
                    Verifikasi Gagal
                  </span>
                )}
              </div>
            </div>

            {/* Peringatan Wallet Tidak Terdeteksi */}
            {noWallet && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                <p className="font-bold mb-1">Wallet Tidak Terdeteksi</p>
                <p>
                  Anda perlu menginstall{" "}
                  <a
                    href="https://phantom.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold underline"
                  >
                    Phantom Wallet
                  </a>{" "}
                  untuk membuktikan kepemilikan ijazah. Setelah install, refresh halaman ini.
                </p>
              </div>
            )}

            {/* Info Wallet Pemilik Terdaftar dari Sertifikat */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Alamat Pemilik Terdaftar (Expected Owner)
                </span>
                <div className="font-mono text-xs font-semibold text-zinc-700 bg-white p-3 rounded-xl border border-zinc-100 break-all">
                  {cert.walletAddress || "Belum ada wallet terhubung pada sertifikat"}
                </div>
              </div>
              <div>
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Status Dompet Pengguna
                </span>
                <div className="font-mono text-xs font-semibold text-zinc-700 bg-white p-3 rounded-xl border border-zinc-100 break-all">
                  {connectedWallet ? (
                    <span className="text-zinc-900">{connectedWallet}</span>
                  ) : (
                    <span className="text-zinc-400 italic">Belum terhubung</span>
                  )}
                </div>
              </div>
            </div>

            {/* Progress Notification saat proses berjalan */}
            {challengeStatus !== "idle" &&
              challengeStatus !== "sukses" &&
              challengeStatus !== "gagal" && (
                <div className="mb-6 p-4 bg-white rounded-xl border border-zinc-200 shadow-xs">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-red-600 shrink-0" />
                    <div className="text-xs">
                      <p className="font-bold text-zinc-900">
                        {challengeStatus === "connecting" && "Menghubungkan dompet Solana..."}
                        {challengeStatus === "challenge diminta" &&
                          "Meminta tantangan kriptografis dari server..."}
                        {challengeStatus === "menunggu tanda tangan" &&
                          "Menunggu tanda tangan di dompet Solana..."}
                        {challengeStatus === "memverifikasi" &&
                          "Memverifikasi tanda tangan Ed25519 dan kepemilikan..."}
                      </p>
                      <p className="text-zinc-500 mt-0.5">
                        {challengeStatus === "connecting" &&
                          "Silakan konfirmasi koneksi pada ekstensi dompet Anda."}
                        {challengeStatus === "challenge diminta" &&
                          "Membuat nonce 128-bit unik untuk mencegah replay attack."}
                        {challengeStatus === "menunggu tanda tangan" &&
                          "Periksa pop-up dompet Anda untuk menyetujui penandatanganan pesan."}
                        {challengeStatus === "memverifikasi" &&
                          "Memvalidasi tanda tangan kriptografis secara byte-exact."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

            {/* Challenge Details Card (Pesan, Nonce & Timer) */}
            {challengeData && (
              <div className="mb-6 p-4 bg-white rounded-xl border border-zinc-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-600">Nonce:</span>
                    <code className="text-xs font-mono font-semibold text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded break-all">
                      {challengeData.nonce}
                    </code>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="text-zinc-600">Masa Berlaku Nonce:</span>
                    <span
                      className={`font-mono font-bold ${
                        isExpired
                          ? "text-red-600"
                          : timeLeft < 60
                          ? "text-amber-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {isExpired
                        ? "Kedaluwarsa"
                        : `${Math.floor(timeLeft / 60)}:${(timeLeft % 60)
                            .toString()
                            .padStart(2, "0")}`}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Pesan Tantangan (Byte-exact UTF-8)
                  </span>
                  <pre className="text-xs font-mono bg-zinc-50 p-3 rounded-lg border border-zinc-100 whitespace-pre-wrap break-all text-zinc-700">
                    {challengeData.message}
                  </pre>
                </div>
              </div>
            )}

            {/* Nonce Expired Warning */}
            {isExpired && challengeStatus !== "sukses" && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-amber-900 text-sm">
                      Tantangan Verifikasi Telah Kedaluwarsa
                    </p>
                    <p className="text-xs text-amber-800">
                      Batas waktu 5 menit telah berakhir. Nonce ini tidak dapat digunakan lagi. Silakan minta challenge baru.
                    </p>
                    <div className="pt-2">
                      <button
                        onClick={handleVerifyOwnership}
                        className="inline-flex items-center gap-1.5 bg-amber-600 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg hover:bg-amber-700 transition-colors shadow-sm cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Minta Challenge Baru
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sukses: Kepemilikan Terverifikasi (Warna Hijau) */}
            {challengeStatus === "sukses" && (
              <div className="mb-6 p-5 bg-emerald-50 border border-emerald-200 rounded-2xl">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-2 flex-1">
                    <div>
                      <h4 className="text-base font-bold text-emerald-900">
                        Kepemilikan Terverifikasi
                      </h4>
                      <p className="text-xs font-medium text-emerald-800 mt-0.5">
                        Dompet ini pemilik sah ijazah. Tanda tangan digital kriptografis Ed25519 berhasil diverifikasi dan sesuai dengan alamat pemilik yang terdaftar pada sistem.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-emerald-200/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="font-bold text-emerald-800 block text-[11px] uppercase tracking-wider">
                          Dompet Terverifikasi
                        </span>
                        <span className="font-mono font-semibold text-emerald-900 break-all">
                          {connectedWallet}
                        </span>
                      </div>
                      {challengeData?.nonce && (
                        <div>
                          <span className="font-bold text-emerald-800 block text-[11px] uppercase tracking-wider">
                            Nonce Terverifikasi
                          </span>
                          <span className="font-mono font-semibold text-emerald-900 break-all">
                            {challengeData.nonce}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={handleVerifyOwnership}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Verifikasi Ulang
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Gagal: Kode Error dari API apa adanya */}
            {challengeStatus === "gagal" && (
              <div className="mb-6 p-5 bg-red-50 border border-red-200 rounded-2xl space-y-3">
                <div className="flex items-start gap-3">
                  <XCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-bold text-red-900">
                        {errorCode === "OWNER_MISMATCH"
                          ? "Dompet ini bukan pemilik ijazah"
                          : "Verifikasi Gagal"}
                      </h4>
                      {errorCode && (
                        <span className="font-mono text-xs font-bold px-2 py-0.5 bg-red-200 text-red-900 rounded">
                          {errorCode}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-red-800 leading-relaxed font-medium">
                      {errorCode === "OWNER_MISMATCH"
                        ? "Dompet ini bukan pemilik ijazah. Kunci publik dompet yang menandatangani tidak cocok dengan wallet pemilik ijazah ini."
                        : errorCode === "NONCE_EXPIRED"
                        ? "Tantangan verifikasi telah kedaluwarsa. Masa berlaku 5 menit telah berakhir."
                        : errorCode === "NONCE_ALREADY_USED"
                        ? "Tantangan verifikasi telah digunakan sebelumnya (replay attack terdeteksi)."
                        : errorCode === "NONCE_NOT_FOUND"
                        ? "Nonce tantangan tidak ditemukan atau tidak valid."
                        : errorCode === "MESSAGE_MISMATCH"
                        ? "Isi pesan tantangan telah dimodifikasi (tampered message)."
                        : errorCode === "WALLET_MISMATCH"
                        ? "Alamat dompet tidak cocok dengan yang meminta tantangan."
                        : errorCode === "INVALID_SIGNATURE"
                        ? "Tanda tangan kriptografis tidak valid untuk pesan ini."
                        : errorCode === "MALFORMED_INPUT"
                        ? "Parameter verifikasi tidak valid atau tidak lengkap."
                        : errorCode === "USER_REJECTED" || errorCode === "SIGNATURE_REJECTED"
                        ? "Penandatanganan pesan dibatalkan oleh pengguna di dompet."
                        : errorMessage || "Terjadi kesalahan saat memverifikasi tanda tangan kriptografis."}
                    </p>

                    {errorMessage &&
                      errorCode !== "OWNER_MISMATCH" &&
                      errorMessage !== "Dompet ini bukan pemilik ijazah" && (
                        <p className="text-[11px] text-red-700 font-mono bg-red-100/60 p-2 rounded break-all">
                          Pesan Server: {errorMessage}
                        </p>
                      )}

                    {connectedWallet && (
                      <div className="text-xs text-red-900">
                        <span className="font-bold">Dompet Signer: </span>
                        <span className="font-mono break-all">{connectedWallet}</span>
                      </div>
                    )}

                    <div className="pt-2 flex flex-wrap gap-2">
                      <button
                        onClick={handleVerifyOwnership}
                        className="inline-flex items-center gap-2 bg-red-600 text-white font-semibold text-xs px-4 py-2 rounded-xl hover:bg-red-700 transition-colors shadow-sm cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Minta Challenge Baru
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tombol Aksi */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleVerifyOwnership}
                disabled={
                  challengeStatus === "connecting" ||
                  challengeStatus === "challenge diminta" ||
                  challengeStatus === "menunggu tanda tangan" ||
                  challengeStatus === "memverifikasi"
                }
                className="inline-flex items-center justify-center gap-2 bg-foreground text-white font-semibold text-sm px-6 py-2.5 rounded-xl shadow-md hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <KeyRound className="w-4 h-4 text-red-500" />
                {challengeStatus === "idle"
                  ? "Hubungkan Dompet & Tanda Tangani"
                  : challengeStatus === "connecting"
                  ? "Menghubungkan Dompet..."
                  : challengeStatus === "challenge diminta"
                  ? "Meminta Challenge..."
                  : challengeStatus === "menunggu tanda tangan"
                  ? "Menunggu Tanda Tangan..."
                  : challengeStatus === "memverifikasi"
                  ? "Memverifikasi..."
                  : "Hubungkan Dompet & Tanda Tangani"}
              </button>

              {challengeData && (
                <button
                  onClick={handleVerifyOwnership}
                  disabled={
                    challengeStatus === "connecting" ||
                    challengeStatus === "challenge diminta" ||
                    challengeStatus === "menunggu tanda tangan" ||
                    challengeStatus === "memverifikasi"
                  }
                  className="inline-flex items-center justify-center gap-2 bg-white text-zinc-700 hover:text-foreground font-semibold text-sm px-4 py-2.5 rounded-xl border border-zinc-200 shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  Minta Challenge Baru
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
