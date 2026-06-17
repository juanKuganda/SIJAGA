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
 * Schema validasi untuk verifikasi publik
 */
export const verifySchema = z.object({
  wallet: z
    .string()
    .min(1, "Alamat wallet wajib diisi")
    .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "Format alamat wallet tidak valid"),
});
