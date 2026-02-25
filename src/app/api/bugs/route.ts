import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/session";

// POST /api/bugs — Submit a bug report
export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { description, scenarioId, browserInfo, route } = body;

  // Input validation
  if (!description || typeof description !== "string" || description.trim().length < 10) {
    return NextResponse.json(
      { error: "Description must be at least 10 characters" },
      { status: 400 }
    );
  }
  if (description.length > 5000) {
    return NextResponse.json(
      { error: "Description must be under 5000 characters" },
      { status: 400 }
    );
  }
  if (scenarioId && typeof scenarioId !== "string") {
    return NextResponse.json({ error: "Invalid scenarioId" }, { status: 400 });
  }
  if (browserInfo && (typeof browserInfo !== "string" || browserInfo.length > 500)) {
    return NextResponse.json({ error: "Invalid browserInfo" }, { status: 400 });
  }
  if (route && (typeof route !== "string" || route.length > 500)) {
    return NextResponse.json({ error: "Invalid route" }, { status: 400 });
  }

  const bug = await prisma.bugReport.create({
    data: {
      userId: session!.user.id,
      description: description.trim().slice(0, 5000),
      scenarioId: scenarioId || null,
      browserInfo: browserInfo ? String(browserInfo).slice(0, 500) : null,
      route: route ? String(route).slice(0, 500) : null,
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
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") || "50", 10) || 50));

  const where: any = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (search) {
    where.description = { contains: search.slice(0, 200), mode: "insensitive" };
  }

  const bugs = await prisma.bugReport.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: (page - 1) * limit,
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

  return NextResponse.json({ bugs, statusCounts, page, limit });
}

// PATCH /api/bugs — Update bug (admin only)
export async function PATCH(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { id, status, priority, adminNotes } = body;

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Bug id is required" }, { status: 400 });
  }

  // Verify bug exists
  const existing = await prisma.bugReport.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Bug not found" }, { status: 404 });
  }

  const validStatuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
  const validPriorities = ["low", "medium", "high", "critical"];

  const data: any = {};
  if (status && validStatuses.includes(status)) data.status = status;
  if (priority && validPriorities.includes(priority)) data.priority = priority;
  if (adminNotes !== undefined) {
    if (typeof adminNotes !== "string" || adminNotes.length > 5000) {
      return NextResponse.json({ error: "Admin notes must be a string under 5000 characters" }, { status: 400 });
    }
    data.adminNotes = adminNotes;
  }

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
