"use client";

import { useEffect, useState, use, useCallback } from "react";
import { Blink, useAction, ActionAdapter } from "@dialectlabs/blinks";
import { setProxyUrl } from "@dialectlabs/blinks-core";
import "@dialectlabs/blinks/index.css";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

// Nonaktifkan proxy Dialect (proxy.dial.to) agar bisa jalan di Vercel
// eslint-disable-next-line @typescript-eslint/no-explicit-any
setProxyUrl(null as any);

// Adapter yang menggunakan wallet Phantom/Solflare yang sudah terinstall di browser
function createWalletAdapter(): ActionAdapter {
  return {
    metadata: {
      supportedBlockchainIds: [
        "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", // mainnet
        "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1", // devnet
      ],
    },
    connect: async () => {
      // Cek apakah Phantom tersedia
      const provider = getWalletProvider();
      if (!provider) {
        throw new Error(
          "Wallet tidak ditemukan. Silakan install Phantom Wallet."
        );
      }
      const response = await provider.connect();
      return response.publicKey.toString();
    },
    signTransaction: async (txBase64: string) => {
      const provider = getWalletProvider();
      if (!provider) throw new Error("Wallet tidak ditemukan");

      // Decode base64 transaction
      const txBytes = Uint8Array.from(atob(txBase64), (c) => c.charCodeAt(0));

      // Import VersionedTransaction untuk sign
      const { VersionedTransaction } = await import("@solana/web3.js");
      const transaction = VersionedTransaction.deserialize(txBytes);

      // Sign via wallet
      const signedTx = await provider.signTransaction(transaction);
      const signedBytes = signedTx.serialize();

      // Kirim transaksi ke Solana
      const { Connection, clusterApiUrl } = await import("@solana/web3.js");
      const rpcUrl =
        process.env.NEXT_PUBLIC_SOLANA_RPC || clusterApiUrl("devnet");
      const connection = new Connection(rpcUrl, "confirmed");
      const signature = await connection.sendRawTransaction(signedBytes, {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });

      return { signature };
    },
    confirmTransaction: async (signature: string) => {
      const { Connection, clusterApiUrl } = await import("@solana/web3.js");
      const rpcUrl =
        process.env.NEXT_PUBLIC_SOLANA_RPC || clusterApiUrl("devnet");
      const connection = new Connection(rpcUrl, "confirmed");

      await connection.confirmTransaction(signature, "confirmed");
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signMessage: async (data: any, _context?: any) => {
      const provider = getWalletProvider();
      if (!provider) throw new Error("Wallet tidak ditemukan");

      // Extract message from SignMessageData if needed
      const message = typeof data === "string" ? data : (data.message || data.data || data);

      const msgBytes =
        typeof message === "string"
          ? new TextEncoder().encode(message)
          : message;
      const { signature } = await provider.signMessage(msgBytes);
      return {
        signature: Buffer.from(signature).toString("base64"),
      };
    },
  };
}

function getWalletProvider(): any {
  if (typeof window === "undefined") return null;
  // Phantom
  if ((window as any).phantom?.solana?.isPhantom) {
    return (window as any).phantom.solana;
  }
  // Solflare
  if ((window as any).solflare?.isSolflare) {
    return (window as any).solflare;
  }
  // Backpack
  if ((window as any).backpack?.isBackpack) {
    return (window as any).backpack;
  }
  // Generic window.solana (Phantom legacy)
  if ((window as any).solana?.isPhantom) {
    return (window as any).solana;
  }
  return null;
}

export default function ClaimPage({
  params,
}: {
  params: Promise<{ nim: string }>;
}) {
  const resolvedParams = use(params);
  const [adapter, setAdapter] = useState<ActionAdapter | null>(null);
  const [noWallet, setNoWallet] = useState(false);
  const [actionUrl, setActionUrl] = useState("");

  useEffect(() => {
    const origin = window.location.origin;
    setActionUrl(
      `solana-action:${origin}/api/actions/claim?nim=${resolvedParams.nim}`
    );

    // Cek wallet availability
    const provider = getWalletProvider();
    if (provider) {
      setAdapter(createWalletAdapter());
    } else {
      setNoWallet(true);
    }
  }, [resolvedParams.nim]);

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4 sm:p-8 font-sans">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Klaim Ijazah Digital
          </h1>
          <p className="text-sm text-muted-foreground">
            NIM: <span className="font-mono font-bold">{resolvedParams.nim}</span>
          </p>
        </div>

        {/* No wallet warning */}
        {noWallet && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
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
              untuk mengklaim ijazah. Setelah install, refresh halaman ini.
            </p>
          </div>
        )}

        {/* Blink UI */}
        {actionUrl && adapter ? (
          <BlinkClaimRenderer actionUrl={actionUrl} adapter={adapter} />
        ) : actionUrl && noWallet ? (
          <BlinkPreviewRenderer actionUrl={actionUrl} />
        ) : (
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-zinc-300 rounded-2xl text-zinc-500 animate-pulse">
            Menyiapkan...
          </div>
        )}

        {/* Back link */}
        <div className="text-center">
          <Link
            href="/ijazah"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Detail Ijazah
          </Link>
        </div>
      </div>
    </div>
  );
}

// Komponen render Blink dengan wallet asli (bisa klaim)
function BlinkClaimRenderer({
  actionUrl,
  adapter,
}: {
  actionUrl: string;
  adapter: ActionAdapter;
}) {
  const { action, isLoading } = useAction({ url: actionUrl });

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center border-2 border-dashed border-zinc-300 rounded-2xl text-zinc-500 animate-pulse">
        Memuat data ijazah...
      </div>
    );
  }

  if (!action) {
    return (
      <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-2xl text-sm">
        <strong>Gagal memuat data:</strong> Pastikan NIM tersebut valid dan
        ijazah sudah diterbitkan.
      </div>
    );
  }

  return (
    <div className="shadow-2xl rounded-2xl overflow-hidden ring-1 ring-zinc-200">
      <Blink
        blink={action}
        adapter={adapter}
        securityLevel="all"
        stylePreset="default"
        websiteText="SIJAGA · Universitas Tadulako"
      />
    </div>
  );
}

// Komponen render Blink preview saja (tanpa wallet = tidak bisa klaim)
function BlinkPreviewRenderer({ actionUrl }: { actionUrl: string }) {
  const mockAdapter: ActionAdapter = {
    metadata: {
      supportedBlockchainIds: [
        "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
        "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
      ],
    },
    connect: async () => "",
    signTransaction: async () => ({ signature: "" }),
    confirmTransaction: async () => {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signMessage: async (_data: any, _context?: any) => ({ signature: "" }),
  };

  const { action, isLoading } = useAction({ url: actionUrl });

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center border-2 border-dashed border-zinc-300 rounded-2xl text-zinc-500 animate-pulse">
        Memuat data ijazah...
      </div>
    );
  }

  if (!action) {
    return (
      <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-2xl text-sm">
        <strong>Gagal memuat data.</strong>
      </div>
    );
  }

  return (
    <div className="shadow-2xl rounded-2xl overflow-hidden ring-1 ring-zinc-200 opacity-75">
      <Blink
        blink={action}
        adapter={mockAdapter}
        securityLevel="all"
        stylePreset="default"
        websiteText="SIJAGA · Universitas Tadulako"
      />
    </div>
  );
}
