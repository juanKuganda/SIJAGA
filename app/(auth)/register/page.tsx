"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Shield, ArrowLeft, Eye, EyeOff, Link as LinkIcon, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PRODI_OPTIONS = [
  "Informatika",
  "Teknik Elektro",
  "Teknik Sipil",
  "Teknik Mesin",
  "Teknik Arsitektur",
  "Agroteknologi",
  "Agribisnis",
  "Kedokteran",
  "Farmasi",
  "Kesehatan Masyarakat",
  "Hukum",
  "Ekonomi Pembangunan",
  "Manajemen",
  "Akuntansi",
  "Ilmu Komunikasi",
  "Administrasi Publik",
  "Sosiologi",
  "Matematika",
  "Fisika",
  "Kimia",
  "Biologi",
  "Statistika",
];

import { useActionState } from "react";
import { registerWithEmail } from "./actions";

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(registerWithEmail, null);

  const [formData, setFormData] = useState({
    nama: "",
    nim: "",
    email: "",
    prodi: "",
    angkatan: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    let value = e.target.value;
    if (e.target.name === "nim") {
      value = value.trim().toUpperCase();
    }
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: value,
    }));
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
            <Image src="/apple-touch-icon.png" alt="Logo Untad" width={40} height={40} className="object-contain drop-shadow-sm" priority />
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tight text-white leading-none">SIJAGA</span>
              <span className="text-[10px] font-bold text-white uppercase tracking-widest mt-1">Universitas Tadulako</span>
            </div>
          </Link>

          <h1 className="text-4xl lg:text-5xl font-black leading-[1.1] mb-6">
            Pendaftaran
            <br />
            <span className="text-white/90">Akun Mahasiswa</span>
          </h1>
          
          <p className="text-lg text-white/80 leading-relaxed mb-12">
            Langkah pertama untuk mengklaim dan memverifikasi ijazah digital Anda secara aman di ekosistem SIJAGA.
          </p>

          <div className="space-y-6">
            <div className="flex items-center gap-4 text-white/90">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="font-medium">Keamanan Kriptografi Tingkat Lanjut</span>
            </div>
            <div className="flex items-center gap-4 text-white/90">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
              <span className="font-medium">Terkoneksi dengan Database Universitas</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Register Form (White) */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-md mx-auto">
          {/* Mobile Logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <img src="/apple-touch-icon.png" alt="Logo Untad" className="w-10 h-10 object-contain drop-shadow-sm" />
            <div className="flex flex-col">
              <span className="text-xl font-black text-foreground tracking-tight leading-none">SIJAGA</span>
              <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest mt-1">Universitas Tadulako</span>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-foreground tracking-tight mb-2">Daftar Akun Baru</h2>
            <p className="text-muted-foreground">
              Buat akun untuk masuk ke portal verifikasi SIJAGA
            </p>
          </div>

          {state?.error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-red-800 leading-relaxed">{state.error}</p>
            </div>
          )}

          <form action={formAction} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="nama" className="font-semibold">Nama Lengkap</Label>
              <Input
                id="nama"
                name="nama"
                type="text"
                placeholder="Masukkan nama lengkap"
                value={formData.nama}
                onChange={handleChange}
                required
                className="h-11"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nim" className="font-semibold">NIM</Label>
                <Input
                  id="nim"
                  name="nim"
                  type="text"
                  placeholder="Contoh: H071211001"
                  value={formData.nim}
                  onChange={handleChange}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="angkatan" className="font-semibold">Angkatan</Label>
                <Input
                  id="angkatan"
                  name="angkatan"
                  type="text"
                  placeholder="Contoh: 2021"
                  value={formData.angkatan}
                  onChange={handleChange}
                  required
                  maxLength={4}
                  className="h-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="font-semibold">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Masukkan email aktif"
                value={formData.email}
                onChange={handleChange}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2 w-full">
              <Label htmlFor="prodi" className="font-semibold">Program Studi</Label>
              <Select
                name="prodi"
                value={formData.prodi}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, prodi: value || "" }))
                }
                required
              >
                <SelectTrigger id="prodi" className="w-full h-11">
                  <SelectValue placeholder="Pilih program studi" />
                </SelectTrigger>
                <SelectContent>
                  {PRODI_OPTIONS.map((prodi) => (
                    <SelectItem key={prodi} value={prodi}>
                      {prodi}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="font-semibold">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 6 karakter"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="h-11 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="font-semibold">Konfirmasi Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Ulangi password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="h-11 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full h-12 font-bold text-base mt-2" disabled={isPending}>
              {isPending ? "Memproses..." : "Daftar Sekarang"}
            </Button>
          </form>

          <div className="mt-8 text-center space-y-4 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Sudah punya akun?{" "}
              <Link
                href="/login"
                className="text-red-600 hover:text-red-700 font-bold hover:underline transition-colors"
              >
                Login di sini
              </Link>
            </p>
            <Link
              href="/"
              className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali ke beranda
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
