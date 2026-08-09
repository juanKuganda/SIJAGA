"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shield, ArrowLeft, Eye, EyeOff, Link as LinkIcon, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted border-t-red-600" />
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
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="min-h-screen flex">
      {/* Kiri: Ilustrasi / Branding */}
      <div className="hidden lg:flex flex-col justify-center p-12 bg-neutral-900 text-white w-1/2 relative overflow-hidden">
        {/* Dekorasi Background */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }}></div>

        <div className="relative z-10 max-w-md mx-auto">
          <Link href="/" className="inline-flex items-center gap-3 mb-16">
            <img src="/apple-touch-icon.png" alt="Logo Untad" className="w-10 h-10 object-contain drop-shadow-sm" />
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tight text-white leading-none">SIJAGA</span>
              <span className="text-[10px] font-bold text-white uppercase tracking-widest mt-1">Universitas Tadulako</span>
            </div>
          </Link>

          <h1 className="text-4xl lg:text-5xl font-black leading-[1.1] mb-6">
            Sistem Jaminan
            <br />
            <span className="text-white/90">Autentikasi</span>
            <br />
            Gelar Akademik
          </h1>
          
          <p className="text-lg text-white/80 leading-relaxed mb-12">
            Verifikasi ijazah anti-pemalsuan berbasis NFT Soulbound pada blockchain Solana. Universitas Tadulako.
          </p>

          <div className="space-y-6">
            <div className="flex items-center gap-4 text-white/90">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <LinkIcon className="w-4 h-4 text-white" />
              </div>
              <span className="font-medium">Blockchain Solana Devnet</span>
            </div>
            <div className="flex items-center gap-4 text-white/90">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="font-medium">NFT Soulbound Non-transferable</span>
            </div>
            <div className="flex items-center gap-4 text-white/90">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
              <span className="font-medium">Verifikasi Publik Real-time</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form (White) */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <img src="/apple-touch-icon.png" alt="Logo Untad" className="w-10 h-10 object-contain drop-shadow-sm" />
            <div className="flex flex-col">
              <span className="text-xl font-black text-foreground tracking-tight leading-none">SIJAGA</span>
              <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest mt-1">Universitas Tadulako</span>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-foreground tracking-tight mb-2">Masuk ke Portal</h2>
            <p className="text-muted-foreground">
              Masukkan NIM dan password untuk mengakses akun Anda
            </p>
          </div>

          {success && (
            <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 font-medium">
              {success}
            </div>
          )}

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="nim" className="font-semibold">NIM</Label>
              <Input
                id="nim"
                name="nim"
                type="text"
                placeholder="Masukkan NIM Anda"
                value={nim}
                onChange={(e) => setNim(e.target.value.trim().toUpperCase())}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="font-semibold">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan password Anda"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 font-bold text-base" disabled={loading}>
              {loading ? "Memproses..." : "Login"}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Belum punya akun?{" "}
              <Link
                href="/register"
                className="text-red-600 hover:text-red-700 font-semibold transition-colors"
              >
                Daftar di sini
              </Link>
            </p>
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali ke beranda
            </Link>
          </div>

          {/* Test credentials hint */}
          <div className="mt-8 p-4 bg-muted rounded-lg border border-border">
            <p className="text-xs text-muted-foreground font-semibold mb-2">Akun Test:</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Admin: <span className="font-mono font-semibold text-foreground">ADMIN001</span> / <span className="font-mono font-semibold text-foreground">admin123</span></p>
              <p>Mahasiswa: <span className="font-mono font-semibold text-foreground">H071211001</span> / <span className="font-mono font-semibold text-foreground">mahasiswa123</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
