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
  const tahunLulus = formData.get("tahunLulus") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  // SECURITY: Validasi input menggunakan Zod schema
  const validationResult = registerSchema.safeParse({
    email,
    nama: name,
    nim,
    prodi,
    tahunLulus,
    password,
    confirmPassword,
  });

  if (!validationResult.success) {
    return {
      error: validationResult.error.issues[0]?.message || "Data tidak valid",
    };
  }

  let user;
  try {
    // Cek apakah email/NIM sudah terdaftar di Prisma DB
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { nim }],
      },
    });

    if (existingUser) {
      return { error: "Email atau NIM sudah terdaftar" };
    }

    let authUserId: string | undefined;

    // Register ke Neon Auth
    let data: { user?: { id: string } } | null = null;
    let error: { message?: string } | null = null;

    try {
      const res = await auth.signUp.email({
        email,
        name,
        password,
      });
      data = res.data;
      error = res.error;
    } catch {
      // Fallback untuk eksekusi CLI script di luar request store Next.js
      try {
        const handler = auth.handler();
        const req = new Request("http://localhost:3000/api/auth/sign-up/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, name, password }),
        });
        const res = await handler.POST(req, { params: Promise.resolve({ path: ["sign-up", "email"] }) });
        const json = (await res.json().catch(() => ({}))) as { message?: string; error?: string; user?: { id: string } };
        if (!res.ok) {
          error = { message: json.message || json.error || `HTTP ${res.status}` };
        } else {
          data = { user: json.user };
        }
      } catch (handlerErr: unknown) {
        error = { message: handlerErr instanceof Error ? handlerErr.message : "Gagal menghubungi Neon Auth" };
      }
    }

    if (error) {
      // Fallback untuk Vercel Preview / Database Branching Terisolasi:
      // Neon Auth bersifat global. Jika user sudah pernah register di branch production/local,
      // signUp akan gagal karena email sudah digunakan. Kita coba signIn untuk sinkronisasi.
      console.warn(`[WARN] auth.signUp.email error: ${error.message}. Mencoba auth.signIn.email...`);
      let signInData: { user?: { id: string } } | null = null;
      let signInError: { message?: string } | null = null;

      try {
        const res = await auth.signIn.email({
          email,
          password,
        });
        signInData = res.data;
        signInError = res.error;
      } catch {
        try {
          const handler = auth.handler();
          const req = new Request("http://localhost:3000/api/auth/sign-in/email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const res = await handler.POST(req, { params: Promise.resolve({ path: ["sign-in", "email"] }) });
          const json = (await res.json().catch(() => ({}))) as { message?: string; error?: string; user?: { id: string } };
          if (!res.ok) {
            signInError = { message: json.message || json.error || `HTTP ${res.status}` };
          } else {
            signInData = { user: json.user };
          }
        } catch (handlerErr: unknown) {
          signInError = { message: handlerErr instanceof Error ? handlerErr.message : "Gagal sign in ke Neon Auth" };
        }
      }

      if (signInError) {
        return { error: error.message || "Akun sudah terdaftar di Neon Auth (dari branch lain), namun password salah. Silakan login atau gunakan password yang sesuai." };
      }
      authUserId = signInData?.user?.id;
    } else {
      authUserId = data?.user?.id;
    }

    if (!authUserId) {
      return { error: "Gagal mendapatkan User ID dari Neon Auth" };
    }

    // Buat User di Prisma DB
    user = await prisma.user.create({
      data: {
        id: authUserId, // Gunakan ID yang sama dengan Neon Auth jika ada
        nama: name,
        email,
        nim,
        prodi,
        tahunLulus,
        password: "", // Neon Auth yang handle password asli
        role: "MAHASISWA",
      },
    });

    // Auto-backup initial registration data
    try {
      await prisma.certificateBackup.create({
        data: {
          userId: user.id,
          backupData: JSON.stringify({
            certificate: null,
            user: {
              nama: user.nama,
              nim: user.nim,
              email: user.email,
              prodi: user.prodi,
              tahunLulus: user.tahunLulus,
            },
            wallet: null,
          }),
          reason: "Auto-backup initial registration",
          createdBy: user.id,
        },
      });
    } catch (backupErr) {
      console.warn("Initial registration backup warning:", backupErr);
    }
  } catch (err) {
    console.error("Registration Error:", err);
    return {
      error:
        err instanceof Error
          ? `Gagal menyimpan ke database: ${err.message}`
          : "Terjadi kesalahan server saat menyimpan profil.",
    };
  }

  redirect("/login?registered=true");
}
