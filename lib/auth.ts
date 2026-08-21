import { auth } from "./auth/server";
import { prisma } from "./prisma";
import { Role } from "@prisma/client";
import { headers } from "next/headers";

export interface JWTPayload {
  userId: string;
  role: Role;
  nim: string;
  email: string;
}

/**
 * Get authenticated user data mapping to the old JWT payload format.
 * This function seamlessly bridges Neon Auth sessions with our Prisma User table.
 */
export async function getAuthUser(): Promise<JWTPayload | null> {
  try {
    const { data: session } = await auth.getSession();

    if (!session?.user) {
      return null;
    }

    // Fetch the detailed Prisma user to get NIM and Role
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: session.user.email },
          { id: session.user.id }
        ]
      },
      select: {
        id: true,
        role: true,
        nim: true,
        email: true,
      }
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
