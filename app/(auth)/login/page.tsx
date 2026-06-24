"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card, { CardContent, CardHeader } from "@/components/ui/Card";

export default function LoginPage() {
  return (
    <Suspense fallback={
      <Card className="animate-fade-in-up glass-card">
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#27272A] border-t-red-600" />
          </div>
        </CardContent>
      </Card>
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

      // Redirect berdasarkan role
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
    <Card className="animate-fade-in-up glass-card">
      <CardHeader>
        <h2 className="text-xl font-semibold text-white">Login</h2>
        <p className="text-[#71717A] text-sm mt-1">Masuk ke portal SIJAGA</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {success && (
            <div className="p-3 bg-emerald-900/20 border border-emerald-600/30 rounded-lg text-sm text-emerald-400">
              {success}
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-900/20 border border-red-600/30 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}

          <Input
            label="NIM"
            type="text"
            placeholder="Masukkan NIM Anda"
            value={nim}
            onChange={(e) => setNim(e.target.value)}
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

          <div className="text-center space-y-2">
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
              className="text-sm text-[#71717A] hover:text-red-400 transition-colors inline-block"
            >
              ← Kembali ke beranda
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

