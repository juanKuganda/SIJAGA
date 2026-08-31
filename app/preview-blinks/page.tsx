'use client';

import { useState, useEffect } from 'react';
import { Blink, useAction, ActionAdapter } from '@dialectlabs/blinks';
import { setProxyUrl } from '@dialectlabs/blinks-core';
import '@dialectlabs/blinks/index.css';

// KRUSIAL: Menonaktifkan proxy Dialect (proxy.dial.to) yang menyebabkan
// ERR_TIMED_OUT / ERR_CERT_AUTHORITY_INVALID di environment non-localhost.
// Library blinks secara default hanya skip proxy untuk localhost/127.0.0.1,
// sehingga di Vercel preview/production, semua request diproxy melalui proxy.dial.to
// yang sering timeout. Dengan menonaktifkannya, request langsung ke API kita sendiri.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
setProxyUrl(null as any);

// Mock adapter agar preview UI bisa berjalan tanpa harus menghubungkan wallet asli
const mockAdapter: ActionAdapter = {
  metadata: {
    supportedBlockchainIds: [
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', // mainnet
      'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1'  // devnet
    ],
  },
  connect: async () => {
    console.log('Mock Wallet Connected');
    return 'DtUVhcmkVnj6nfn8DJWnRiU3RqfSz2APBbGXzFdgxkpx';
  },
  signTransaction: async (tx: string) => {
    console.log('Mock Transaction Signed', tx);
    return { signature: 'mock_signature_12345' };
  },
  confirmTransaction: async (sig: string) => {
    console.log('Mock Transaction Confirmed', sig);
  },
  signMessage: async (data: unknown) => {
    console.log('Mock Message Signed', data);
    return { signature: 'mock_signature_msg' };
  },
};

export default function PreviewBlinksPage() {
  const [nimInput, setNimInput] = useState('F55123061');
  const [actionUrl, setActionUrl] = useState('');

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-8 flex flex-col items-center font-sans">
      <div className="w-full max-w-2xl space-y-8">
        
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Blinks Local Preview</h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Lihat langsung wujud UI Blinks Anda tanpa perlu mempostingnya ke X/Twitter.
          </p>
        </div>

        {/* Control Panel */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Uji coba dengan NIM:</label>
            <div className="flex gap-3">
              <input 
                type="text" 
                value={nimInput}
                onChange={(e) => setNimInput(e.target.value)}
                className="flex-1 bg-zinc-100 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                placeholder="Masukkan NIM..."
              />
              <button 
                onClick={() => {
                  const origin = window.location.origin;
                  window.open(`https://dial.to/?action=solana-action:${origin}/api/actions/claim?nim=${nimInput}`, '_blank');
                }}
                className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap text-sm"
              >
                Uji di dial.to
              </button>
            </div>
          </div>
          
          <div className="p-3 bg-zinc-100 dark:bg-black rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs overflow-x-auto text-zinc-500">
            <strong>Action URL:</strong> {`solana-action:${window.location.origin}/api/actions/claim?nim=${nimInput}`}
          </div>
        </div>

        {/* Blink Render Area */}
        <div className="flex justify-center mt-10">
          <div className="w-full max-w-md">
            {isMounted ? <BlinkRenderer actionUrl={`${window.location.origin}/api/actions/claim?nim=${nimInput}`} /> : (
               <div className="h-64 flex items-center justify-center border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl text-zinc-500 animate-pulse">
                 Menyiapkan Preview...
               </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// Subkomponen untuk me-render Blink HANYA jika actionUrl sudah valid
function BlinkRenderer({ actionUrl }: { actionUrl: string }) {
  const { action, isLoading } = useAction({ url: actionUrl });

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl text-zinc-500 animate-pulse">
        Memuat UI Blinks dari API...
      </div>
    );
  }

  if (!action) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-2xl text-sm">
        <strong>Gagal memuat Action:</strong> Pastikan NIM tersebut ada di database dan URL valid.
      </div>
    );
  }

  return (
    <div className="shadow-2xl rounded-2xl overflow-hidden ring-1 ring-zinc-200 dark:ring-zinc-800">
      <Blink 
        blink={action} 
        adapter={mockAdapter}
        securityLevel="all"
        stylePreset="default"
        websiteText="sijaga.vercel.app" 
      />
    </div>
  );
}
