"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EditButtonProps {
  user: {
    id: string;
    nim: string;
    nama: string;
    email: string;
    prodi: string | null;
    angkatan: string | null;
  };
}

export default function EditButton({ user }: EditButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    nama: user.nama,
    email: user.email,
    prodi: user.prodi || "",
    angkatan: user.angkatan || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEditSubmit = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/mahasiswa", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          ...editForm,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsOpen(false);
        router.refresh();
      } else {
        setError(data.error || "Gagal memperbarui data");
      }
    } catch (err) {
      console.error("Error updating:", err);
      setError("Terjadi kesalahan saat menyimpan data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        <Pencil className="w-4 h-4 mr-2" />
        Edit Data
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <div className="relative bg-white border border-border rounded-xl shadow-2xl max-w-md w-full p-6 animate-fade-in-up text-left">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <Pencil className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Edit Data Mahasiswa
                </h3>
                <p className="text-sm text-muted-foreground">
                  NIM: {user.nim}
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div className="space-y-2">
                <Label htmlFor="edit-nama" className="font-semibold text-foreground">
                  Nama Lengkap
                </Label>
                <Input
                  id="edit-nama"
                  value={editForm.nama}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, nama: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email" className="font-semibold text-foreground">
                  Email
                </Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-prodi" className="font-semibold text-foreground">
                  Program Studi
                </Label>
                <Input
                  id="edit-prodi"
                  value={editForm.prodi}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, prodi: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-angkatan" className="font-semibold text-foreground">
                  Angkatan
                </Label>
                <Input
                  id="edit-angkatan"
                  value={editForm.angkatan}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      angkatan: e.target.value,
                    }))
                  }
                  maxLength={4}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setIsOpen(false)}
              >
                Batal
              </Button>
              <Button
                className="flex-1"
                onClick={handleEditSubmit}
                disabled={loading}
              >
                {loading ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
