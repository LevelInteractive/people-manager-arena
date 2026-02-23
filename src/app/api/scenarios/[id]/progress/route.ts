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

  // Mark any existing incomplete progress as completed
  // (in case auto-save created a record)
  const existing = await prisma.userScenarioProgress.findFirst({
    where: {
      userId: session!.user.id,
      scenarioId: params.id,
      completedAt: null,
    },
    orderBy: { startedAt: "desc" },
  });

  let progress;
  if (existing) {
    // Update the existing in-progress record to completed
    progress = await prisma.userScenarioProgress.update({
      where: { id: existing.id },
      data: {
        scoreTotal: scoreTotal || 0,
        q12ScoreTotal: q12ScoreTotal || 0,
        cultureScoreTotal: cultureScoreTotal || 0,
        choicesJson: choicesJson || {},
        completedAt: new Date(),
        gameStateJson: null, // Clear game state on completion
      },
    });
  } else {
    progress = await prisma.userScenarioProgress.create({
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
  }

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

// PUT /api/scenarios/[id]/progress — Auto-save in-progress game state
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const { currentNodeIndex, gameStateJson, scoreTotal, q12ScoreTotal, cultureScoreTotal } = body;

  // Find existing incomplete progress record
  const existing = await prisma.userScenarioProgress.findFirst({
    where: {
      userId: session!.user.id,
      scenarioId: params.id,
      completedAt: null,
    },
    orderBy: { startedAt: "desc" },
  });

  let progress;
  if (existing) {
    // Update existing record
    progress = await prisma.userScenarioProgress.update({
      where: { id: existing.id },
      data: {
        currentNodeIndex: currentNodeIndex ?? existing.currentNodeIndex,
        gameStateJson: gameStateJson ?? existing.gameStateJson,
        scoreTotal: scoreTotal ?? existing.scoreTotal,
        q12ScoreTotal: q12ScoreTotal ?? existing.q12ScoreTotal,
        cultureScoreTotal: cultureScoreTotal ?? existing.cultureScoreTotal,
      },
    });
  } else {
    // Create new in-progress record
    progress = await prisma.userScenarioProgress.create({
      data: {
        userId: session!.user.id,
        scenarioId: params.id,
        currentNodeIndex: currentNodeIndex || 0,
        gameStateJson: gameStateJson || null,
        scoreTotal: scoreTotal || 0,
        q12ScoreTotal: q12ScoreTotal || 0,
        cultureScoreTotal: cultureScoreTotal || 0,
      },
    });
  }

  return NextResponse.json(progress);
}

// DELETE /api/scenarios/[id]/progress — Delete incomplete progress (start fresh)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireAuth();
  if (error) return error;

  await prisma.userScenarioProgress.deleteMany({
    where: {
      userId: session!.user.id,
      scenarioId: params.id,
      completedAt: null,
    },
  });

  return NextResponse.json({ ok: true });
}
