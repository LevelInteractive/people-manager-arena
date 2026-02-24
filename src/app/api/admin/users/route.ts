import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/admin/users — list all users with role info
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      lastLoginAt: true,
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(users);
}
