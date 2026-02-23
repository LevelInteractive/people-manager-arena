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

// GET /api/bugs — List bugs (admin only) with filtering
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const status = req.nextUrl.searchParams.get("status") || undefined;
  const priority = req.nextUrl.searchParams.get("priority") || undefined;
  const search = req.nextUrl.searchParams.get("search") || undefined;

  const where: any = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (search) {
    where.description = { contains: search, mode: "insensitive" };
  }

  const bugs = await prisma.bugReport.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
      scenario: { select: { title: true } },
    },
  });

  // Get counts by status
  const counts = await prisma.bugReport.groupBy({
    by: ["status"],
    _count: true,
  });

  const statusCounts: Record<string, number> = {};
  counts.forEach((c) => {
    statusCounts[c.status] = c._count;
  });

  return NextResponse.json({ bugs, statusCounts });
}

// PATCH /api/bugs — Update bug (admin only)
export async function PATCH(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const { id, status, priority, adminNotes } = body;

  if (!id) {
    return NextResponse.json({ error: "Bug id is required" }, { status: 400 });
  }

  const validStatuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
  const validPriorities = ["low", "medium", "high", "critical"];

  const data: any = {};
  if (status && validStatuses.includes(status)) data.status = status;
  if (priority && validPriorities.includes(priority)) data.priority = priority;
  if (adminNotes !== undefined) data.adminNotes = adminNotes;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const bug = await prisma.bugReport.update({
    where: { id },
    data,
    include: {
      user: { select: { name: true, email: true } },
      scenario: { select: { title: true } },
    },
  });

  return NextResponse.json(bug);
}
