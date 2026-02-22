import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";

// Build providers list dynamically
const providers: NextAuthOptions["providers"] = [];

// Add Google if credentials are configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

// Add email-based login as fallback (no Google OAuth needed)
providers.push(
  CredentialsProvider({
    name: "Email Login",
    credentials: {
      email: { label: "Email", type: "email", placeholder: "you@level.agency" },
    },
    async authorize(credentials) {
      if (!credentials?.email) return null;
      const email = credentials.email.toLowerCase();

      // Find or create user
      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        user = await prisma.user.create({
          data: { email, name: email.split("@")[0], role: "MANAGER" },
        });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }).catch(() => {});

      return { id: user.id, email: user.email, name: user.name, role: user.role };
    },
  })
);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers,
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

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },

    async session({ session, token, user }) {
      if (token) {
        // JWT strategy (used with credentials)
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      } else if (user) {
        // Database strategy (used with Google)
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
    strategy: "jwt",
  },
};
