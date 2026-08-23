'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function BlinksCopyButton({ nim }: { nim: string }) {
  const [copied, setCopied] = useState(false);

  const generateBlinkUrl = () => {
    // We use the NEXT_PUBLIC_APP_URL, falling back to window.location.origin
    const origin = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    const actionUrl = encodeURIComponent(
      `solana-action:${origin}/api/actions/claim?nim=${nim}`
    );
    return `https://actions.dialect.to/?action=${actionUrl}`;
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(generateBlinkUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link", err);
    }
  };

  return (
    <button
      onClick={copy}
      className="text-xs px-3 py-1.5 rounded-lg border border-zinc-200
                 dark:border-zinc-700 hover:border-brand-500
                 text-zinc-500 dark:text-zinc-400 hover:text-brand-600
                 transition-colors flex items-center gap-1.5"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Disalin!' : 'Salin Link Klaim (Blink)'}
    </button>
  );
}
