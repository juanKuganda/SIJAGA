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
  tahunLulus: z
    .string()
    .regex(/^(20[0-9]{2})$/, "Tahun Lulus harus tahun antara 2000-2099"),
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
  nim: z
    .string()
    .min(1, "NIM wajib diisi")
    .max(20, "NIM maksimal 20 karakter")
    .optional(),
  prodi: z
    .string()
    .min(1, "Program studi wajib diisi")
    .optional(),
  tahunLulus: z
    .string()
    .regex(/^(20[0-9]{2})$/, "Tahun Lulus harus tahun antara 2000-2099")
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
  query: z
    .string()
    .min(1, "Input wajib diisi")
});

// ═══════════════════════════════════════════════════════════
// FILE UPLOAD VALIDATION
// ═══════════════════════════════════════════════════════════

/** MIME types yang diperbolehkan untuk upload gambar (OCR scan) */
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/bmp",
  "image/webp",
  "image/tiff",
]);

/** Ekstensi file yang diperbolehkan */
const ALLOWED_IMAGE_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".tiff", ".tif",
]);

/** Ukuran maksimal file: 10MB */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Validasi file yang di-upload untuk OCR scan.
 * Mengecek MIME type, ekstensi, dan ukuran file.
 *
 * @returns null jika valid, string error message jika tidak valid
 */
export function validateOcrFile(file: File): string | null {
  // 1. Cek MIME type
  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.type)) {
    return `Tipe file "${file.type || "tidak diketahui"}" tidak diperbolehkan. Gunakan format gambar: JPG, PNG, GIF, BMP, atau WebP.`;
  }

  // 2. Cek ekstensi file
  const fileName = file.name.toLowerCase();
  const extension = fileName.substring(fileName.lastIndexOf("."));
  if (!ALLOWED_IMAGE_EXTENSIONS.has(extension)) {
    return `Ekstensi file "${extension}" tidak diperbolehkan. Gunakan: ${[...ALLOWED_IMAGE_EXTENSIONS].join(", ")}`;
  }

  // 3. Cek ukuran file (maks 10MB)
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return `Ukuran file (${sizeMB}MB) melebihi batas maksimal 10MB.`;
  }

  // 4. Cek file tidak kosong
  if (file.size === 0) {
    return "File kosong. Pilih file gambar yang valid.";
  }

  return null; // Valid ✅
}
