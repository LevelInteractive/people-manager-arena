import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/session";

// POST /api/events — Log an event
export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const { eventType, scenarioId, metadata } = body;

  if (!eventType) {
    return NextResponse.json({ error: "eventType is required" }, { status: 400 });
  }

  const validEvents = [
    "login", "scenario_started", "reflection_submitted",
    "choice_selected", "scenario_completed", "feedback_submitted",
    "leaderboard_viewed",
  ];

  if (!validEvents.includes(eventType)) {
    return NextResponse.json({ error: `Invalid event type. Valid: ${validEvents.join(", ")}` }, { status: 400 });
  }

  const event = await prisma.eventLog.create({
    data: {
      userId: session!.user.id,
      eventType,
      scenarioId: scenarioId || null,
      metadata: metadata || {},
    },
  });

  return NextResponse.json(event, { status: 201 });
}

// GET /api/events — List events (admin only)
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "100");
  const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0");
  const eventType = req.nextUrl.searchParams.get("type");

  const where = eventType ? { eventType } : {};

  const [events, total] = await Promise.all([
    prisma.eventLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        user: { select: { name: true, email: true } },
        scenario: { select: { title: true } },
      },
    }),
    prisma.eventLog.count({ where }),
  ]);

  return NextResponse.json({ events, total, limit, offset });
}
