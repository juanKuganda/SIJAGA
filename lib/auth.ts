import { auth } from "./auth/server";
import { prisma } from "./prisma";
import { Role } from "@prisma/client";

export interface JWTPayload {
  userId: string;
  role: Role;
  nim: string;
  email: string;
}

/**
 * Get authenticated user data mapping to the old JWT payload format.
 * This function seamlessly bridges Neon Auth sessions with our Prisma User table.
 * Supports admin key verification via Request headers (for CLI / benchmark automation).
 */
export async function getAuthUser(request?: Request): Promise<JWTPayload | null> {
  try {
    // 1. Check for programmatic admin key header (benchmark & test automation)
    if (request && request.headers) {
      const adminKeyHeader =
        request.headers.get("x-admin-key") ||
        request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

      const expectedAdminKey =
        process.env.ADMIN_WALLET_PRIVATE_KEY || process.env.ADMIN_API_SECRET;

      if (expectedAdminKey && adminKeyHeader === expectedAdminKey) {
        const adminUser = await prisma.user.findFirst({
          where: { role: "ADMIN" },
          select: {
            id: true,
            role: true,
            nim: true,
            email: true,
          },
        });

        if (adminUser) {
          return {
            userId: adminUser.id,
            role: adminUser.role,
            nim: adminUser.nim,
            email: adminUser.email,
          };
        }
      }
    }

    // 2. Neon Auth session
    let session = null;
    try {
      const res = await auth.getSession();
      session = res.data;
    } catch {
      session = null;
    }

    if (!session?.user) {
      return null;
    }

    // Fetch the detailed Prisma user to get NIM and Role
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: session.user.email },
          { id: session.user.id },
        ],
      },
      select: {
        id: true,
        role: true,
        nim: true,
        email: true,
      },
    });

    if (!user) {
      return null;
    }

    return {
      userId: user.id,
      role: user.role,
      nim: user.nim,
      email: user.email,
    };
  } catch (error) {
    console.error("Auth adapter error:", error);
    return null;
  }
}
