import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import prisma from "@/lib/prisma";

const ALLOWED_DOMAINS = ["level.agency", "levelagency.com"];

// Bootstrap admin — this email is always elevated to ADMIN on sign-in.
// Once you have multiple admins, you can remove this constant.
const BOOTSTRAP_ADMIN_EMAIL = "myles.biggs@level.agency";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          throw new Error("Email is required");
        }

        const email = credentials.email.toLowerCase().trim();
        const domain = email.split("@")[1];

        if (!domain || !ALLOWED_DOMAINS.includes(domain)) {
          throw new Error("Please use your Level Agency email address");
        }

        // Find or create the user
        let user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              email,
              name: email.split("@")[0].split(".").map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(" "),
              role: email === BOOTSTRAP_ADMIN_EMAIL ? "ADMIN" : "MANAGER",
            },
          });
        }

        // Bootstrap: ensure the designated admin always has ADMIN role
        if (email === BOOTSTRAP_ADMIN_EMAIL && user.role !== "ADMIN") {
          user = await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account }) {
      // For Google sign-in, verify the email domain
      if (account?.provider === "google") {
        const email = user.email?.toLowerCase().trim();
        if (!email) return false;
        const domain = email.split("@")[1];
        if (!domain || !ALLOWED_DOMAINS.includes(domain)) {
          return false;
        }

        // Find or create user in our database
        let dbUser = await prisma.user.findUnique({
          where: { email },
        });

        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              email,
              name: user.name || email.split("@")[0].split(".").map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(" "),
              role: email === BOOTSTRAP_ADMIN_EMAIL ? "ADMIN" : "MANAGER",
            },
          });
        }

        // Bootstrap: ensure the designated admin always has ADMIN role
        if (email === BOOTSTRAP_ADMIN_EMAIL && dbUser.role !== "ADMIN") {
          await prisma.user.update({ where: { id: dbUser.id }, data: { role: "ADMIN" } });
        }

        // Update last login
        await prisma.user.update({
          where: { id: dbUser.id },
          data: { lastLoginAt: new Date() },
        });
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        // Initial sign-in: set token fields from user/db
        if (account?.provider === "google" && user.email) {
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email.toLowerCase().trim() },
          });
          if (dbUser) {
            token.role = dbUser.role;
            token.id = dbUser.id;
          }
        } else {
          token.role = (user as any).role;
          token.id = user.id;
        }
      } else if (token.id) {
        // Subsequent requests: refresh role from DB so admin changes take effect immediately
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, email: true },
        });
        if (dbUser) {
          // Bootstrap: auto-elevate the designated admin if not already ADMIN
          if (dbUser.email === BOOTSTRAP_ADMIN_EMAIL && dbUser.role !== "ADMIN") {
            await prisma.user.update({ where: { id: token.id as string }, data: { role: "ADMIN" } });
            token.role = "ADMIN";
          } else {
            token.role = dbUser.role;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
