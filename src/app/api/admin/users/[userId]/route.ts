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

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { role } = body;

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

  // Prevent demoting the last admin
  if (role === "MANAGER") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Cannot demote the last admin. Promote another user first." },
        { status: 400 }
      );
    }
  }

  // Get previous role for audit logging
  const previousUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, email: true },
  });

  if (!previousUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
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

  // Audit log the role change
  if (previousUser.role !== role) {
    try {
      await prisma.eventLog.create({
        data: {
          userId: session.user.id,
          eventType: "admin_role_change",
          metadata: {
            targetUserId: userId,
            targetEmail: previousUser.email,
            previousRole: previousUser.role,
            newRole: role,
            changedBy: session.user.email,
          },
        },
      });
    } catch (e) {
      console.error("Failed to create audit log for role change:", e);
    }
  }

  return NextResponse.json(user);
}
