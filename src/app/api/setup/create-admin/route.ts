import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { email, password, name, setupKey } = await request.json();

    // Verify setup key matches NEXTAUTH_SECRET
    if (setupKey !== process.env.NEXTAUTH_SECRET) {
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
