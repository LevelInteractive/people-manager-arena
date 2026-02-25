import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // Production gate: setup endpoints must be explicitly enabled
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_SETUP !== "true") {
    return NextResponse.json({ error: "Setup endpoints are disabled in production" }, { status: 403 });
  }

  // Rate limit: 5 attempts per 15 minutes per IP
  const rlKey = getRateLimitKey(request, "create-admin");
  const rl = checkRateLimit(rlKey, { limit: 5, windowSeconds: 900 });
  if (!rl.success) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  try {
    const { email, password, name, setupKey } = await request.json();

    // Verify setup key — use a dedicated SETUP_SECRET, fallback to NEXTAUTH_SECRET
    const expectedKey = process.env.SETUP_SECRET || process.env.NEXTAUTH_SECRET;
    if (!expectedKey || setupKey !== expectedKey) {
      return NextResponse.json({ error: "Invalid setup key" }, { status: 401 });
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Upsert: update if exists, create if not
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        hashedPassword,
        name: name || undefined,
        role: "ADMIN",
      },
      create: {
        email,
        name: name || "Admin",
        hashedPassword,
        role: "ADMIN",
      },
    });

    return NextResponse.json({
      message: "Admin user ready",
      userId: user.id,
      email: user.email,
    });
  } catch (error) {
    console.error("Create admin error:", error);
    return NextResponse.json(
      { error: "Failed to create admin user" },
      { status: 500 }
    );
  }
}
