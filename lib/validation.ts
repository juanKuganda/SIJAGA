import { z } from "zod";

/**
 * Schema validasi untuk login
 */
export const loginSchema = z.object({
  nim: z
    .string()
    .min(1, "NIM wajib diisi")
    .max(20, "NIM maksimal 20 karakter"),
  password: z
    .string()
    .min(1, "Password wajib diisi")
    .min(6, "Password minimal 6 karakter"),
});

/**
 * Schema validasi untuk registrasi wallet
 */
export const walletRegisterSchema = z.object({
  walletAddress: z
    .string()
    .min(1, "Alamat wallet wajib diisi")
    .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "Format alamat wallet tidak valid"),
});

/**
 * Schema validasi untuk verifikasi wallet oleh admin
 */
export const walletVerifySchema = z.object({
  walletId: z.string().min(1, "ID wallet wajib diisi"),
  status: z.enum(["VERIFIED", "REJECTED"]),
});

/**
 * Schema validasi untuk mint NFT
 */
export const mintNftSchema = z.object({
  userId: z.string().min(1, "User ID wajib diisi"),
});

/**
 * Schema validasi untuk revoke NFT
 */
export const revokeNftSchema = z.object({
  userId: z.string().min(1, "User ID wajib diisi"),
  reason: z.string().min(1, "Alasan revoke wajib diisi"),
});

/**
 * Schema validasi untuk registrasi mahasiswa
 */
export const registerSchema = z.object({
  nama: z
    .string()
    .min(1, "Nama wajib diisi")
    .max(100, "Nama maksimal 100 karakter"),
  nim: z
    .string()
    .min(1, "NIM wajib diisi")
    .max(20, "NIM maksimal 20 karakter"),
  email: z
    .string()
    .min(1, "Email wajib diisi")
    .email("Format email tidak valid"),
  password: z
    .string()
    .min(6, "Password minimal 6 karakter")
    .max(100, "Password maksimal 100 karakter"),
  prodi: z
    .string()
    .min(1, "Program studi wajib diisi"),
  angkatan: z
    .string()
    .regex(/^(20[0-9]{2})$/, "Angkatan harus tahun antara 2000-2099"),
});

/**
 * Schema validasi untuk update data mahasiswa oleh admin
 */
export const updateMahasiswaSchema = z.object({
  userId: z.string().min(1, "User ID wajib diisi"),
  nama: z
    .string()
    .min(1, "Nama wajib diisi")
    .max(100, "Nama maksimal 100 karakter")
    .optional(),
  email: z
    .string()
    .min(1, "Email wajib diisi")
    .email("Format email tidak valid")
    .optional(),
  prodi: z
    .string()
    .min(1, "Program studi wajib diisi")
    .optional(),
  angkatan: z
    .string()
    .regex(/^(20[0-9]{2})$/, "Angkatan harus tahun antara 2000-2099")
    .optional(),
});

/**
 * Schema validasi untuk backup sertifikat
 */
export const backupSchema = z.object({
  userId: z.string().min(1, "User ID wajib diisi"),
  reason: z
    .string()
    .max(500, "Alasan maksimal 500 karakter")
    .optional()
    .default("Manual backup"),
});

/**
 * Schema validasi untuk verifikasi publik
 */
export const verifySchema = z.object({
  wallet: z
    .string()
    .min(1, "Alamat wallet wajib diisi")
    .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "Format alamat wallet tidak valid"),
});
