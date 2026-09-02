"use server";

import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { registerSchema } from "@/lib/validation";

export async function registerWithEmail(
  _prevState: { error: string } | null,
  formData: FormData,
) {
  const email = formData.get("email") as string;
  const name = formData.get("nama") as string;
  const nim = formData.get("nim") as string;
  const prodi = formData.get("prodi") as string;
  const angkatan = formData.get("angkatan") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  // SECURITY: Validasi input menggunakan Zod schema
  const validationResult = registerSchema.safeParse({
    email,
    nama: name,
    nim,
    prodi,
    angkatan,
    password,
    confirmPassword,
  });

  if (!validationResult.success) {
    return {
      error: validationResult.error.issues[0]?.message || "Data tidak valid",
    };
  }

  // Cek apakah email/NIM sudah terdaftar
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { nim }],
    },
  });

  if (existingUser) {
    return { error: "Email atau NIM sudah terdaftar" };
  }

  // Register ke Neon Auth
  const { data, error } = await auth.signUp.email({
    email,
    name,
    password,
  });

  if (error) {
    return { error: error.message || "Gagal membuat akun" };
  }

  // Buat User di Prisma DB
  const user = await prisma.user.create({
    data: {
      id: data?.user?.id, // Gunakan ID yang sama dengan Neon Auth jika ada, atau biarkan default cuid()
      nama: name,
      email,
      nim,
      prodi,
      angkatan,
      password: "", // Neon Auth yang handle password asli
      role: "MAHASISWA",
    },
  });

  // Auto-backup initial registration data
  await prisma.certificateBackup.create({
    data: {
      certificateId: undefined,
      userId: user.id,
      backupData: JSON.stringify({
        certificate: null,
        user: {
          nama: user.nama,
          nim: user.nim,
          email: user.email,
          prodi: user.prodi,
          angkatan: user.angkatan,
        },
        wallet: null,
      }),
      reason: "Auto-backup initial registration",
      createdBy: user.id,
    },
  });

  redirect("/login?registered=true");
}
