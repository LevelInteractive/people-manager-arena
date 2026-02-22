import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

// GET /api/scenarios/[id]/progress — Get user's progress for this scenario
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const progress = await prisma.userScenarioProgress.findMany({
    where: {
      userId: session!.user.id,
      scenarioId: params.id,
    },
    orderBy: { startedAt: "desc" },
  });

  return NextResponse.json(progress);
}

// POST /api/scenarios/[id]/progress — Save completed scenario attempt
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const { scoreTotal, q12ScoreTotal, cultureScoreTotal, choicesJson } = body;

  const progress = await prisma.userScenarioProgress.create({
    data: {
      userId: session!.user.id,
      scenarioId: params.id,
      scoreTotal: scoreTotal || 0,
      q12ScoreTotal: q12ScoreTotal || 0,
      cultureScoreTotal: cultureScoreTotal || 0,
      choicesJson: choicesJson || {},
      completedAt: new Date(),
    },
  });

  // Log the event
  await prisma.eventLog.create({
    data: {
      userId: session!.user.id,
      eventType: "scenario_completed",
      scenarioId: params.id,
      metadata: { scoreTotal, q12ScoreTotal, cultureScoreTotal },
    },
  });

  return NextResponse.json(progress, { status: 201 });
}
