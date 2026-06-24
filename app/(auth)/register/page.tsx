"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card, { CardContent, CardHeader } from "@/components/ui/Card";

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

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nama: "",
    nim: "",
    email: "",
    prodi: "",
    angkatan: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validasi password match
    if (formData.password !== formData.confirmPassword) {
      setError("Password dan konfirmasi password tidak cocok");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: formData.nama,
          nim: formData.nim,
          email: formData.email,
          password: formData.password,
          prodi: formData.prodi,
          angkatan: formData.angkatan,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Registrasi gagal");
        return;
      }

      // Redirect ke login dengan pesan sukses
      router.push("/login?registered=true");
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="animate-fade-in-up glass-card">
      <CardHeader>
        <h2 className="text-xl font-semibold text-white">Daftar Akun</h2>
        <p className="text-[#71717A] text-sm mt-1">
          Buat akun untuk masuk ke portal SIJAGA
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-900/20 border border-red-600/30 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}

          <Input
            label="Nama Lengkap"
            name="nama"
            type="text"
            placeholder="Masukkan nama lengkap"
            value={formData.nama}
            onChange={handleChange}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="NIM"
              name="nim"
              type="text"
              placeholder="Contoh: H071211001"
              value={formData.nim}
              onChange={handleChange}
              required
            />

            <Input
              label="Angkatan"
              name="angkatan"
              type="text"
              placeholder="Contoh: 2021"
              value={formData.angkatan}
              onChange={handleChange}
              required
              maxLength={4}
            />
          </div>

          <Input
            label="Email"
            name="email"
            type="email"
            placeholder="Masukkan email aktif"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <div className="w-full">
            <label className="block text-sm font-medium text-[#A1A1AA] mb-1.5">
              Program Studi
            </label>
            <select
              name="prodi"
              value={formData.prodi}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 bg-[#0A0A0F] border border-[#27272A] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 hover:border-[#3F3F46] transition-all duration-200 text-white appearance-none cursor-pointer"
            >
              <option value="" disabled className="text-[#52525B]">
                Pilih program studi
              </option>
              {PRODI_OPTIONS.map((prodi) => (
                <option
                  key={prodi}
                  value={prodi}
                  className="bg-[#0A0A0F] text-white"
                >
                  {prodi}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Password"
            name="password"
            type="password"
            placeholder="Minimal 6 karakter"
            value={formData.password}
            onChange={handleChange}
            required
          />

          <Input
            label="Konfirmasi Password"
            name="confirmPassword"
            type="password"
            placeholder="Ulangi password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />

          <Button type="submit" className="w-full" loading={loading} size="lg">
            Daftar
          </Button>

          <div className="text-center space-y-2">
            <p className="text-sm text-[#71717A]">
              Sudah punya akun?{" "}
              <Link
                href="/login"
                className="text-red-400 hover:text-red-300 font-medium transition-colors"
              >
                Login di sini
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
