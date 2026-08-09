"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { toast } from "sonner";

export default function CopyBlinkLink({ blinkUrl }: { blinkUrl: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(blinkUrl);
      setCopied(true);
      toast.success("Blink Link berhasil disalin!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Gagal menyalin", err);
      toast.error("Gagal menyalin teks");
    }
  };

  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex-1 bg-[#0A0A0F] border border-[#27272A] rounded-lg px-3 py-2 overflow-x-auto">
        <code className="text-sm text-[#A1A1AA] whitespace-nowrap">{blinkUrl}</code>
      </div>
      <Button variant="secondary" onClick={handleCopy}>
        {copied ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
        {copied ? "Tersalin" : "Salin"}
      </Button>
    </div>
  );
}
