"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import nacl from "tweetnacl";
import bs58 from "bs58";
import {
  ShieldCheck,
  AlertTriangle,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  KeyRound,
  ExternalLink,
  Loader2,
  Lock,
  Database,
  Cpu,
  Layers,
  Copy,
  Check,
  ArrowRight,
} from "lucide-react";

// Typing for third-party injected wallets (Phantom/Solflare/Backpack)
interface PhantomProvider {
  isPhantom?: boolean;
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  signMessage: (
    msg: Uint8Array,
    encoding?: "utf8" | "hex"
  ) => Promise<{ signature: Uint8Array } | Uint8Array>;
}

interface SolflareProvider {
  isSolflare?: boolean;
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  signMessage: (
    msg: Uint8Array,
    encoding?: "utf8" | "hex"
  ) => Promise<{ signature: Uint8Array } | Uint8Array>;
}

interface CustomWindow extends Window {
  phantom?: { solana?: PhantomProvider };
  solflare?: SolflareProvider;
  solana?: PhantomProvider;
}

function getWalletProvider(): PhantomProvider | SolflareProvider | null {
  if (typeof window === "undefined") return null;
  const customWindow = window as unknown as CustomWindow;

  if (customWindow.phantom?.solana?.isPhantom) {
    return customWindow.phantom.solana;
  }
  if (customWindow.solflare?.isSolflare) {
    return customWindow.solflare;
  }
  if (customWindow.solana?.isPhantom) {
    return customWindow.solana;
  }
  return null;
}

interface InspectionResult {
  success: boolean;
  level: string;
  verdict: string;
  asset: string;
  owner: string;
  name: string;
  uri: string;
  frozen: boolean;
  updateAuthority: string;
  dataHash: string | null;
  prodi: string | null;
  tahunLulus: string | null;
  image: string | null;
  attributes: Array<{ trait_type: string; value: string }>;
  timings?: {
    rpcMs: number;
    ipfsMs: number;
  };
  checks: {
    tokenExists: { status: string; detail: string };
    issuerAuthority: { status: string; detail: string };
    tokenFrozen: { status: string; detail: string };
    dataHashOnChain: { status: string; detail: string };
    nominatifMatch: { status: string; detail: string };
    identityBinding: { status: string; detail: string };
  };
  warning: string;
}

const SAMPLE_ASSET_P26 = "FDQKnrLVQdZqP4efoNarLb87gmZj529kebFPz8SVMQCc";

function VerifyOnChainContent() {
  const searchParams = useSearchParams();
  const initialAsset =
    searchParams.get("asset") ||
    searchParams.get("query") ||
    searchParams.get("mint") ||
    "";
  const [assetInput, setAssetInput] = useState<string>(initialAsset);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InspectionResult | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Stateless Challenge State
  const [challengeStatus, setChallengeStatus] = useState<
    "idle" | "connecting" | "signing" | "verifying" | "sukses" | "gagal"
  >("idle");
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [challengeError, setChallengeError] = useState<string | null>(null);
  const [lastSignature, setLastSignature] = useState<string | null>(null);
  const [challengeMessage, setChallengeMessage] = useState<string | null>(null);
  const autoFetchedRef = React.useRef(false);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleVerify = React.useCallback(async (targetAsset?: string) => {
    const assetToInspect = (targetAsset || assetInput).trim();
    if (!assetToInspect) {
      setError("Masukkan alamat aset Solana (mint address)");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setChallengeStatus("idle");
    setChallengeError(null);
    setLastSignature(null);
    setChallengeMessage(null);

    try {
      const res = await fetch(
        `/api/verify/tingkat-1?asset=${encodeURIComponent(assetToInspect)}`
      );
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Gagal memverifikasi aset on-chain");
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Terjadi gangguan saat verifikasi"
      );
    } finally {
      setIsLoading(false);
    }
  }, [assetInput]);

  // Auto-fill and verify from query param
  useEffect(() => {
    const queryAsset =
      searchParams.get("asset") ||
      searchParams.get("query") ||
      searchParams.get("mint");
    if (queryAsset && !autoFetchedRef.current) {
      autoFetchedRef.current = true;
      void handleVerify(queryAsset);
    }
  }, [searchParams, handleVerify]);

  // Stateless Challenge Handler
  const handleStatelessChallenge = async () => {
    if (!result) return;

    setChallengeStatus("connecting");
    setChallengeError(null);

    try {
      const provider = getWalletProvider();
      if (!provider) {
        setChallengeStatus("gagal");
        setChallengeError(
          "Dompet Solana (Phantom / Solflare) tidak terdeteksi di browser. Silakan install ekstensi dompet dan muat ulang halaman."
        );
        return;
      }

      // Connect wallet
      const conn = await provider.connect();
      const walletPubkey = conn.publicKey.toString();
      setConnectedWallet(walletPubkey);

      // Generate local nonce & message
      const randomBytes = new Uint8Array(16);
      crypto.getRandomValues(randomBytes);
      const nonce = Array.from(randomBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const now = new Date();
      const expires = new Date(now.getTime() + 5 * 60 * 1000); // 5 mins

      const msg = [
        "SIJAGA Verification Challenge",
        "Context: Academic Credential Verification (Universitas Tadulako)",
        `Wallet: ${walletPubkey}`,
        `Nonce: ${nonce}`,
        `IssuedAt: ${now.toISOString()}`,
        `ExpiresAt: ${expires.toISOString()}`,
      ].join("\n");

      setChallengeMessage(msg);
      setChallengeStatus("signing");

      // Sign message via wallet
      const messageBytes = new TextEncoder().encode(msg);
      const signRes = await provider.signMessage(messageBytes, "utf8");

      let sigBytes: Uint8Array;
      if (signRes instanceof Uint8Array) {
        sigBytes = signRes;
      } else if (signRes && "signature" in signRes && signRes.signature) {
        sigBytes = signRes.signature;
      } else {
        throw new Error("Format signature dari dompet tidak didukung");
      }

      const sigB58 = bs58.encode(sigBytes);
      setLastSignature(sigB58);

      setChallengeStatus("verifying");

      // Verify Ed25519 offline via tweetnacl
      const pubkeyBytes = bs58.decode(walletPubkey);
      const isSignatureValid = nacl.sign.detached.verify(
        messageBytes,
        sigBytes,
        pubkeyBytes
      );

      if (!isSignatureValid) {
        setChallengeStatus("gagal");
        setChallengeError("INVALID_SIGNATURE: Tanda tangan kriptografis tidak valid.");
        return;
      }

      // Verify ownership against on-chain owner
      if (walletPubkey !== result.owner) {
        setChallengeStatus("gagal");
        setChallengeError(
          `OWNER_MISMATCH: Tanda tangan valid, namun dompet (${walletPubkey}) BUKAN pemilik aset ini (${result.owner}).`
        );
        return;
      }

      setChallengeStatus("sukses");
    } catch (err) {
      setChallengeStatus("gagal");
      setChallengeError(
        err instanceof Error
          ? err.message
          : "Gagal menyelesaikan penandatanganan tantangan"
      );
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50/50 text-foreground relative">
      {/* Background Dot Pattern (sama seperti homepage) */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] opacity-60 pointer-events-none"></div>
      {/* Header Bar */}
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/apple-touch-icon.png"
              alt="Logo Untad"
              width={32}
              height={32}
              className="object-contain drop-shadow-sm"
              priority
            />
            <div className="flex flex-col">
              <span className="text-base font-black text-foreground tracking-tight leading-none">
                SIJAGA
              </span>
              <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest mt-0.5">
                Universitas Tadulako
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Cpu className="w-3.5 h-3.5 text-emerald-600" />
              Tingkat 1 Mandiri
            </span>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-zinc-700 hover:text-red-700 bg-zinc-100/80 hover:bg-red-50 border border-zinc-200 hover:border-red-200 transition-all shadow-xs"
            >
              <span>Verifikasi lengkap (dengan data institusi)</span>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 relative z-10">
        {/* Title Section */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            Portal Verifikasi On-Chain (Tanpa Server Institusi)
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight sm:text-4xl">
            Verifikasi Tingkat-1 Mandiri
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Pemeriksaan keabsahan ijazah langsung ke blockchain Solana & IPFS publik.
            Membuktikan keberadaan token, pembekuan soulbound, otoritas penerbit institusi,
            dan hash metadata tanpa bergantung pada basis data lokal institusi.
          </p>
        </div>

        {/* Input Card */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 md:p-8 shadow-sm mb-8">
          <label
            htmlFor="asset-input"
            className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2"
          >
            Alamat Aset Solana (Mint Address)
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                id="asset-input"
                type="text"
                placeholder="Contoh: FDQKnrLVQdZqP4efoNarLb87gmZj529kebFPz8SVMQCc"
                value={assetInput}
                onChange={(e) => setAssetInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                className="w-full px-4 py-3 rounded-xl border border-zinc-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600/30 focus:border-red-600 font-mono tracking-tight"
              />
            </div>
            <button
              onClick={() => handleVerify()}
              disabled={isLoading}
              className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2 shrink-0 shadow-sm shadow-red-600/20"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Memeriksa...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Periksa On-Chain
                </>
              )}
            </button>
          </div>

          {/* Sample Asset Pill */}
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span>Contoh aset uji (Trace P2.6):</span>
            <button
              type="button"
              onClick={() => {
                setAssetInput(SAMPLE_ASSET_P26);
                handleVerify(SAMPLE_ASSET_P26);
              }}
              className="font-mono text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100/80 px-2 py-0.5 rounded-md border border-red-200/80 transition-colors"
            >
              FDQKnrLV... (Trace P2.6)
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
              <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Verifikasi Gagal</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Results Bento */}
        {result && (
          <div className="space-y-6">
            {/* Verdict Header Banner */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-extrabold uppercase tracking-wide bg-white text-emerald-800">
                        {result.level}
                      </span>
                      <span className="text-xs font-semibold text-emerald-100">
                        Vonis: {result.verdict}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold mt-1">
                      {result.name || "Ijazah Akademik Terverifikasi"}
                    </h2>
                  </div>
                </div>

                <div className="text-right sm:text-right shrink-0">
                  <span className="text-xs text-emerald-100 block">Status Token</span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white mt-0.5">
                    <Lock className="w-3.5 h-3.5" />
                    {result.frozen ? "SOULBOUND (BEKU)" : "AKTIF"}
                  </span>
                </div>
              </div>
            </div>

            {/* Crucial UU PDP Warning Banner */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold block text-amber-950">
                  Peringatan Metodologis & Batasan Privasi (UU PDP):
                </span>
                {result.warning}
                <p className="mt-1 text-amber-800">
                  Ketiadaan data nominatif (nama/NIM) pada mode mandiri ini merupakan bagian dari
                  desain privasi perlindungan data pribadi (UU No. 27/2022). Salt kriptografis
                  hanya tersimpan di basis data institusi untuk mencegah rekonstruksi identitas di blockchain publik.
                </p>
              </div>
            </div>

            {/* Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: On-Chain Credential Info */}
              <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4 pb-3 border-b border-zinc-100">
                  <Cpu className="w-4 h-4 text-red-600" />
                  Rincian Aset On-Chain (Solana Metaplex Core)
                </h3>

                <dl className="space-y-3.5 text-xs">
                  <div>
                    <dt className="text-muted-foreground font-medium">Alamat Aset (Mint):</dt>
                    <dd className="font-mono text-foreground font-bold mt-0.5 break-all flex items-center justify-between gap-2 bg-zinc-50 p-2 rounded-lg border border-zinc-100">
                      <span>{result.asset}</span>
                      <button
                        onClick={() => copyToClipboard(result.asset, "asset")}
                        className="p-1 hover:bg-zinc-200 rounded text-zinc-600"
                        title="Salin Alamat"
                      >
                        {copiedKey === "asset" ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </dd>
                  </div>

                  <div>
                    <dt className="text-muted-foreground font-medium">Pemilik Aset (Owner Wallet):</dt>
                    <dd className="font-mono text-foreground font-semibold mt-0.5 break-all flex items-center justify-between gap-2 bg-zinc-50 p-2 rounded-lg border border-zinc-100">
                      <span>{result.owner}</span>
                      <button
                        onClick={() => copyToClipboard(result.owner, "owner")}
                        className="p-1 hover:bg-zinc-200 rounded text-zinc-600"
                        title="Salin Alamat"
                      >
                        {copiedKey === "owner" ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </dd>
                  </div>

                  <div>
                    <dt className="text-muted-foreground font-medium">Otoritas Penerbit (Update Authority):</dt>
                    <dd className="font-mono text-foreground font-semibold mt-0.5 break-all bg-zinc-50 p-2 rounded-lg border border-zinc-100">
                      {result.updateAuthority}
                    </dd>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                      <dt className="text-muted-foreground font-medium text-[11px]">Program Studi:</dt>
                      <dd className="font-semibold text-foreground mt-0.5">
                        {result.prodi || "Sarjana (S1)"}
                      </dd>
                    </div>
                    <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                      <dt className="text-muted-foreground font-medium text-[11px]">Tahun Lulus:</dt>
                      <dd className="font-semibold text-foreground mt-0.5">
                        {result.tahunLulus || "-"}
                      </dd>
                    </div>
                  </div>
                </dl>
              </div>

              {/* Card 2: IPFS & Kriptografi */}
              <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4 pb-3 border-b border-zinc-100">
                  <Database className="w-4 h-4 text-red-600" />
                  Kriptografi & Penyimpanan Terdistribusi (IPFS)
                </h3>

                <dl className="space-y-3.5 text-xs">
                  <div>
                    <dt className="text-muted-foreground font-medium">Data Hash (SHA-256):</dt>
                    <dd className="font-mono text-foreground font-bold mt-0.5 break-all bg-zinc-50 p-2 rounded-lg border border-zinc-100 text-[11px] flex items-center justify-between gap-2">
                      <span>{result.dataHash || "Tidak ditemukan"}</span>
                      {result.dataHash && (
                        <button
                          onClick={() => copyToClipboard(result.dataHash!, "hash")}
                          className="p-1 hover:bg-zinc-200 rounded text-zinc-600"
                          title="Salin Hash"
                        >
                          {copiedKey === "hash" ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-muted-foreground font-medium">URI Metadata Terdesentralisasi:</dt>
                    <dd className="font-mono text-xs mt-0.5 break-all flex items-center justify-between gap-2 bg-zinc-50 p-2 rounded-lg border border-zinc-100">
                      <span className="truncate">{result.uri}</span>
                      <a
                        href={result.uri}
                        target="_blank"
                        rel="noreferrer"
                        className="text-red-600 hover:text-red-700 inline-flex items-center gap-1 font-sans font-semibold shrink-0"
                      >
                        Buka <ExternalLink className="w-3 h-3" />
                      </a>
                    </dd>
                  </div>

                  {/* Latency timing indicators */}
                  {result.timings && (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                        <dt className="text-muted-foreground font-medium text-[11px] flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Solana RPC:
                        </dt>
                        <dd className="font-mono font-bold text-foreground mt-0.5">
                          {result.timings.rpcMs} ms
                        </dd>
                      </div>
                      <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                        <dt className="text-muted-foreground font-medium text-[11px] flex items-center gap-1">
                          <Clock className="w-3 h-3" /> IPFS Gateway:
                        </dt>
                        <dd className="font-mono font-bold text-foreground mt-0.5">
                          {result.timings.ipfsMs} ms
                        </dd>
                      </div>
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-zinc-100/70 border border-zinc-200/60 text-[11px] text-zinc-600">
                    <span className="font-bold text-zinc-800">Catatan Validasi Kriptografi:</span>{" "}
                    Hash on-chain di atas bersifat permanen dan tidak dapat diubah (*immutable*).
                    Jika data akademik diubah satu bit saja, hash tidak akan pernah cocok.
                  </div>
                </dl>
              </div>
            </div>

            {/* Checklist Matriks TC-15 */}
            <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4 pb-3 border-b border-zinc-100">
                <Layers className="w-4 h-4 text-red-600" />
                Matriks Pembuktian Skenario Offline Server (TC-15)
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-zinc-200 text-muted-foreground uppercase tracking-wider text-[10px]">
                      <th className="pb-3 font-semibold">Objek Pemeriksaan</th>
                      <th className="pb-3 font-semibold">Kondisi Tanpa Server Institusi</th>
                      <th className="pb-3 font-semibold text-right">Hasil Evaluasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    <tr>
                      <td className="py-2.5 font-medium text-foreground">
                        Keberadaan Token di Devnet
                      </td>
                      <td className="py-2.5 text-muted-foreground">
                        Terverifikasi via Solana RPC publik (Metaplex Core)
                      </td>
                      <td className="py-2.5 text-right font-bold text-emerald-600">
                        DAPAT DIPERIKSA
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-medium text-foreground">
                        Otoritas Penerbit Institusi
                      </td>
                      <td className="py-2.5 text-muted-foreground">
                        Cocok dengan alamat publik admin Untad
                      </td>
                      <td className="py-2.5 text-right font-bold text-emerald-600">
                        DAPAT DIPERIKSA
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-medium text-foreground">
                        Status Pembekuan Token (Soulbound)
                      </td>
                      <td className="py-2.5 text-muted-foreground">
                        Plugin PermanentFreezeDelegate aktif (frozen: true)
                      </td>
                      <td className="py-2.5 text-right font-bold text-emerald-600">
                        DAPAT DIPERIKSA
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-medium text-foreground">
                        Pencatatan Hash Metadata IPFS
                      </td>
                      <td className="py-2.5 text-muted-foreground">
                        Metadata JSON dapat diakses publik dari IPFS Gateway
                      </td>
                      <td className="py-2.5 text-right font-bold text-emerald-600">
                        DAPAT DIPERIKSA
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-medium text-foreground">
                        Pencocokan Hash ke Data Nominatif
                      </td>
                      <td className="py-2.5 text-muted-foreground">
                        Membutuhkan salt rahasia yang tersimpan di Tier 1
                      </td>
                      <td className="py-2.5 text-right font-bold text-amber-600">
                        TIDAK DAPAT DIPASTIKAN
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-medium text-foreground">
                        Ikatan Dompet dengan Nama/NIM Mahasiswa
                      </td>
                      <td className="py-2.5 text-muted-foreground">
                        Membutuhkan basis data internal akademik universitas
                      </td>
                      <td className="py-2.5 text-right font-bold text-amber-600">
                        TIDAK DAPAT DIPASTIKAN
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Seksi Buktikan Kepemilikan (Stateless Challenge) */}
            <div className="bg-white rounded-2xl border border-zinc-200 p-6 md:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-red-600" />
                    Buktikan Penguasaan Dompet (Stateless Challenge)
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                    Uji tanda tangan kriptografis Ed25519 untuk membuktikan bahwa Anda menguasai
                    kunci privat dompet pemilik aset ini. Challenge dijalankan 100% mandiri di browser
                    tanpa meminta nonce ke server institusi.
                  </p>
                </div>

                {/* Status Badge */}
                <div className="shrink-0">
                  {challengeStatus === "idle" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-700">
                      Siap Menguji
                    </span>
                  )}
                  {challengeStatus === "connecting" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 animate-pulse">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Menghubungkan Dompet
                    </span>
                  )}
                  {challengeStatus === "signing" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 animate-pulse">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Menunggu Tanda Tangan
                    </span>
                  )}
                  {challengeStatus === "verifying" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 animate-pulse">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Memverifikasi Ed25519
                    </span>
                  )}
                  {challengeStatus === "sukses" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Kepemilikan Terverifikasi
                    </span>
                  )}
                  {challengeStatus === "gagal" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                      <XCircle className="w-3.5 h-3.5 text-red-600" /> Verifikasi Ditolak
                    </span>
                  )}
                </div>
              </div>

              {/* Warning on replay limit */}
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/70 text-[11px] text-muted-foreground mb-6">
                <span className="font-bold text-foreground">Catatan Metodologis Anti-Replay:</span>{" "}
                Perlindungan replay pada mode mandiri (*stateless*) berlaku secara lokal sejauh pemverifikasi
                ini menolak nonce yang sudah pernah digunakan. Perlindungan anti-replay global tetap memerlukan
                pembukuan bersama di server institusi.
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={handleStatelessChallenge}
                  disabled={
                    challengeStatus === "connecting" ||
                    challengeStatus === "signing" ||
                    challengeStatus === "verifying"
                  }
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm shadow-red-600/20"
                >
                  {challengeStatus === "sukses" ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Uji Tanda Tangan Ulang
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" /> Hubungkan Dompet & Tanda Tangani
                    </>
                  )}
                </button>
              </div>

              {/* Result Details */}
              {challengeStatus === "sukses" && (
                <div className="mt-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Kepemilikan Sah Terverifikasi!
                  </div>
                  <p>
                    Dompet <span className="font-mono font-bold">{connectedWallet}</span> terbukti
                    menguasai kunci privat dan merupakan pemilik sah dari ijazah on-chain ini.
                  </p>
                  {lastSignature && (
                    <div className="pt-1">
                      <span className="text-[10px] text-emerald-700 block">Signature Base58 (Ed25519):</span>
                      <span className="font-mono text-[11px] break-all block bg-white/70 p-1.5 rounded border border-emerald-200">
                        {lastSignature}
                      </span>
                    </div>
                  )}
                  {challengeMessage && (
                    <details className="pt-1">
                      <summary className="text-[10px] text-emerald-700 cursor-pointer font-medium">
                        Lihat Format Pesan Tantangan (Byte-Exact)
                      </summary>
                      <pre className="font-mono text-[10px] bg-white/70 p-2 rounded border border-emerald-200 mt-1 whitespace-pre-wrap">
                        {challengeMessage}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {challengeStatus === "gagal" && challengeError && (
                <div className="mt-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold text-red-800">
                    <XCircle className="w-4 h-4 text-red-600" />
                    Tantangan Gagal
                  </div>
                  <p>{challengeError}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer (sama seperti landing page) */}
      <footer className="bg-neutral-900 text-white pt-24 pb-8 overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-6 md:px-12 w-full mb-16 grid grid-cols-1 md:grid-cols-2 gap-16 relative z-10">
          <div>
            <h3 className="text-4xl font-black tracking-tighter uppercase mb-6 text-white leading-tight">
              Ekosistem
              <br />
              Transparan.
            </h3>
            <p className="text-lg text-zinc-400 font-medium max-w-sm mb-8">
              Purwarupa Sistem Jaminan Autentikasi Gelar Akademik Universitas Tadulako berbasis teknologi Web3.
            </p>
            <Link href="/#cara-verifikasi">
              <Button className="h-14 px-8 rounded-none border-2 border-white text-base font-bold bg-white text-black hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors uppercase tracking-widest">
                Coba Sekarang
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="flex flex-col gap-4">
              <h4 className="text-sm font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2 mb-2">
                Platform
              </h4>
              <Link
                href="/#cara-verifikasi"
                className="text-lg font-bold text-white hover:text-red-500 hover:translate-x-1 transition-transform"
              >
                Verifikasi
              </Link>
              <Link
                href="/#features"
                className="text-lg font-bold text-white hover:text-red-500 hover:translate-x-1 transition-transform"
              >
                Fitur
              </Link>
              <Link
                href="/#faq"
                className="text-lg font-bold text-white hover:text-red-500 hover:translate-x-1 transition-transform"
              >
                FAQ
              </Link>
            </div>
            <div className="flex flex-col gap-4">
              <h4 className="text-sm font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2 mb-2">
                Legal
              </h4>
              <a
                href="#"
                className="text-lg font-bold text-white hover:text-red-500 hover:translate-x-1 transition-transform"
              >
                Kebijakan Privasi
              </a>
              <a
                href="#"
                className="text-lg font-bold text-white hover:text-red-500 hover:translate-x-1 transition-transform"
              >
                Syarat & Ketentuan
              </a>
            </div>
          </div>
        </div>

        {/* Giant Typography */}
        <div className="w-full border-t border-zinc-700 pt-12 pb-4 flex justify-center items-center overflow-hidden">
          <span className="text-[20vw] font-black text-white uppercase tracking-tighter leading-none select-none hover:text-red-600 transition-colors duration-500 cursor-default">
            SIJAGA
          </span>
        </div>

        <div className="max-w-7xl mx-auto px-6 md:px-12 w-full flex flex-col md:flex-row justify-between items-center gap-4 relative z-10 pt-8 border-t border-zinc-700">
          <p className="text-sm font-bold text-zinc-600 uppercase tracking-widest">
            © 2024–2026 SIJAGA Beta • Universitas Tadulako
          </p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Status Sistem Berjalan
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function VerifyOnChainPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-zinc-50">
          <Loader2 className="w-6 h-6 animate-spin text-red-600" />
        </div>
      }
    >
      <VerifyOnChainContent />
    </Suspense>
  );
}
