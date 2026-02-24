import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// PUT /api/admin/users/:userId — update user role
export async function PUT(
  req: Request,
  { params }: { params: { userId: string } }
) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const { userId } = params;
  const { role } = await req.json();

  if (!role || !["ADMIN", "MANAGER"].includes(role)) {
    return NextResponse.json(
      { error: "Invalid role. Must be ADMIN or MANAGER." },
      { status: 400 }
    );
  }

  // Prevent admins from demoting themselves
  if (userId === session.user.id && role === "MANAGER") {
    return NextResponse.json(
      { error: "You cannot remove your own admin access." },
      { status: 400 }
    );
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { role },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  return NextResponse.json(user);
}
