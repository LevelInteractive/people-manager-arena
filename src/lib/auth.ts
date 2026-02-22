import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Restrict to allowed domain if configured
      const allowedDomain = process.env.ALLOWED_DOMAIN;
      if (allowedDomain && user.email) {
        const domain = user.email.split("@")[1];
        if (domain !== allowedDomain) {
          return false; // Reject sign-in
        }
      }

      // Update last login
      if (user.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        }).catch(() => {
          // User might not exist yet (first login), that's fine
        });
      }

      return true;
    },

    async session({ session, user }) {
      if (session.user) {
        (session.user as any).id = user.id;
        (session.user as any).role = (user as any).role;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      // After sign-in, redirect to home
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  events: {
    async createUser({ user }) {
      // Log first-time user creation
      if (user.id) {
        await prisma.eventLog.create({
          data: {
            userId: user.id,
            eventType: "user_created",
            metadata: { email: user.email },
          },
        });
      }
    },
    async signIn({ user }) {
      if (user.id) {
        await prisma.eventLog.create({
          data: {
            userId: user.id,
            eventType: "login",
            metadata: {},
          },
        });
      }
    },
  },
  session: {
    strategy: "database",
  },
};
