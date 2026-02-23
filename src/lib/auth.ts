import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import prisma from "@/lib/prisma";

const ALLOWED_DOMAINS = ["level.agency", "levelagency.com"];

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
              role: "MANAGER",
            },
          });
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
              role: "MANAGER",
            },
          });
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
        // For Google sign-in, look up the database user to get role and id
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
