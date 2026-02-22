import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/session";

// POST /api/bugs — Submit a bug report
export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const { description, scenarioId, browserInfo, route } = body;

  if (!description || description.trim().length < 10) {
    return NextResponse.json(
      { error: "Description must be at least 10 characters" },
      { status: 400 }
    );
  }

  const bug = await prisma.bugReport.create({
    data: {
      userId: session!.user.id,
      description,
      scenarioId: scenarioId || null,
      browserInfo: browserInfo || null,
      route: route || null,
    },
  });

  return NextResponse.json(bug, { status: 201 });
}

// GET /api/bugs — List bugs (admin only)
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const status = req.nextUrl.searchParams.get("status") || undefined;

  const bugs = await prisma.bugReport.findMany({
    where: status ? { status: status as any } : {},
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
      scenario: { select: { title: true } },
    },
  });

  return NextResponse.json(bugs);
}

// PATCH /api/bugs — Update bug status (admin only)
export async function PATCH(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const { id, status } = body;

  if (!id || !["OPEN", "CLOSED"].includes(status)) {
    return NextResponse.json({ error: "id and status (OPEN/CLOSED) required" }, { status: 400 });
  }

  const bug = await prisma.bugReport.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json(bug);
}
