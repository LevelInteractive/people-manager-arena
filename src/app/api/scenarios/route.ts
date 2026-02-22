import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/session";

export const dynamic = 'force-dynamic';

// GET /api/scenarios — List all active scenarios
export async function GET() {
  const { error, session } = await requireAuth();
  if (error) return error;

  const scenarios = await prisma.scenario.findMany({
    where: { isActive: true },
    include: {
      primaryQ12: true,
      secondaryQ12: true,
      coreValue: true,
      nodes: {
        select: { id: true, nodeType: true, orderIndex: true },
        orderBy: { orderIndex: "asc" },
      },
      _count: {
        select: { userProgress: { where: { completedAt: { not: null } } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Attach user's progress
  const userProgress = await prisma.userScenarioProgress.findMany({
    where: { userId: session!.user.id },
  });

  const scenariosWithProgress = scenarios.map((s) => ({
    ...s,
    userCompleted: userProgress.some(
      (p) => p.scenarioId === s.id && p.completedAt !== null
    ),
    userBestScore: userProgress
      .filter((p) => p.scenarioId === s.id && p.completedAt !== null)
      .reduce((max, p) => Math.max(max, p.scoreTotal), 0),
    totalCompletions: s._count.userProgress,
  }));

  return NextResponse.json(scenariosWithProgress);
}

// POST /api/scenarios — Create new scenario (admin only)
export async function POST(req: NextRequest) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const {
    title, description, difficulty, estimatedTimeMinutes,
    primaryQ12Id, secondaryQ12Id, coreValueId,
  } = body;

  if (!title || !description || !primaryQ12Id || !coreValueId) {
    return NextResponse.json(
      { error: "Missing required fields: title, description, primaryQ12Id, coreValueId" },
      { status: 400 }
    );
  }

  const scenario = await prisma.scenario.create({
    data: {
      title,
      description,
      difficulty: difficulty || "Medium",
      estimatedTimeMinutes: estimatedTimeMinutes || 10,
      primaryQ12Id,
      secondaryQ12Id: secondaryQ12Id || null,
      coreValueId,
      isActive: false, // New scenarios start inactive
    },
  });

  return NextResponse.json(scenario, { status: 201 });
}
