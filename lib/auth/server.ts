import { createNeonAuth } from '@neondatabase/auth/next/server';

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
  },
  session: {
    expiresIn: 60 * 60 * 24, // 1 day (24 hours)
    updateAge: 60 * 60 * 12, // Update cookie after 12 hours
  },
});
