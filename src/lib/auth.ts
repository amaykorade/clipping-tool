import { getServerSession } from "next-auth";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "database", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/" },
  // Required for callback URL to work (e.g. localhost in dev)
  trustHost: true,
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
};

export async function getSession() {
  return getServerSession(authOptions);
}

/** Use in API routes: returns userId or null. Throws if login required and not logged in. */
export async function requireAuth(): Promise<{ id: string; email?: string | null }> {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return { id: session.user.id, email: session.user.email ?? null };
}

/** Check if current session can access this video (owner or legacy unowned). */
export function canAccessVideo(
  video: { userId: string | null },
  session: { user: { id: string } } | null,
): boolean {
  if (!video.userId) return true; // legacy
  return session?.user?.id === video.userId;
}
