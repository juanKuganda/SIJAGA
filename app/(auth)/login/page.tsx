"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#27272A] border-t-red-600" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [nim, setNim] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuccess("Registrasi berhasil! Silakan login dengan akun Anda.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nim, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login gagal");
        return;
      }

      if (data.user.role === "ADMIN") {
        router.push("/dashboard");
      } else {
        router.push("/profil");
      }
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex">
      {/* Left Panel - Brand */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 gradient-bg-hero" />
        <div className="absolute inset-0 grid-pattern opacity-30" />

        <div className="relative flex flex-col justify-center px-16 xl:px-24">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <span className="text-2xl font-bold text-white">SIJAGA</span>
          </div>

          {/* Tagline */}
          <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
            Sistem Jaminan
            <br />
            <span className="text-red-500">Autentikasi</span>
            <br />
            Gelar Akademik
          </h1>

          <p className="text-lg text-[#A1A1AA] max-w-md leading-relaxed mb-10">
            Verifikasi ijazah anti-pemalsuan berbasis NFT Soulbound pada blockchain Solana. Universitas Tadulako.
          </p>

          {/* Features */}
          <div className="space-y-4">
            {[
              { icon: "⛓️", text: "Blockchain Solana Devnet" },
              { icon: "🛡️", text: "NFT Soulbound Non-transferable" },
              { icon: "✅", text: "Verifikasi Publik Real-time" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3 text-[#A1A1AA]">
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <span className="text-lg font-bold text-white">SIJAGA</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Masuk ke Portal</h2>
            <p className="text-[#71717A]">
              Masukkan NIM dan password untuk mengakses akun Anda
            </p>
          </div>

          {success && (
            <div className="mb-6 p-3 bg-emerald-900/20 border border-emerald-600/30 rounded-lg text-sm text-emerald-400">
              {success}
            </div>
          )}

          {error && (
            <div className="mb-6 p-3 bg-red-900/20 border border-red-600/30 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="NIM"
              type="text"
              placeholder="Masukkan NIM Anda"
              value={nim}
              onChange={(e) => setNim(e.target.value.trim().toUpperCase())}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="Masukkan password Anda"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button type="submit" className="w-full" loading={loading} size="lg">
              Login
            </Button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <p className="text-sm text-[#71717A]">
              Belum punya akun?{" "}
              <Link
                href="/register"
                className="text-red-400 hover:text-red-300 font-medium transition-colors"
              >
                Daftar di sini
              </Link>
            </p>
            <Link
              href="/"
              className="text-sm text-[#71717A] hover:text-red-400 transition-colors inline-flex items-center gap-1"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
              </svg>
              Kembali ke beranda
            </Link>
          </div>

          {/* Test credentials hint */}
          <div className="mt-8 p-4 bg-[#111118] border border-[#27272A] rounded-lg">
            <p className="text-xs text-[#71717A] font-medium mb-2">Akun Test:</p>
            <div className="space-y-1 text-xs text-[#52525B]">
              <p>Admin: <span className="text-[#A1A1AA]">ADMIN001</span> / <span className="text-[#A1A1AA]">admin123</span></p>
              <p>Mahasiswa: <span className="text-[#A1A1AA]">H071211001</span> / <span className="text-[#A1A1AA]">mahasiswa123</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
