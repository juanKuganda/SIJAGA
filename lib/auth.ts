import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "./prisma";
import { Role } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET || "sijaga-jwt-secret-key";

export interface JWTPayload {
  userId: string;
  role: Role;
  nim: string;
}

/**
 * Hash password dengan bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Compare password dengan hash
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token
 */
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Login user dengan NIM dan password
 */
export async function loginUser(nim: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { nim },
  });

  if (!user) {
    return { error: "NIM tidak ditemukan" };
  }

  const isValid = await comparePassword(password, user.password);
  if (!isValid) {
    return { error: "Password salah" };
  }

  const token = generateToken({
    userId: user.id,
    role: user.role,
    nim: user.nim,
  });

  return {
    user: {
      id: user.id,
      nama: user.nama,
      nim: user.nim,
      email: user.email,
      role: user.role,
    },
    token,
  };
}

/**
 * Get user dari JWT token di cookie
 */
export async function getUserFromToken(token: string) {
  const payload = verifyToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      nama: true,
      nim: true,
      email: true,
      role: true,
      prodi: true,
      angkatan: true,
    },
  });

  return user;
}
