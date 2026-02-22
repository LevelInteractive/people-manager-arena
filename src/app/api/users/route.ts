import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

// GET /api/users/me — Current user profile + stats
export async function GET() {
  const { error, session } = await requireAuth();
  if (error) return error;

  const userId = session!.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Aggregate stats
  const progress = await prisma.userScenarioProgress.findMany({
    where: { userId, completedAt: { not: null } },
    include: { scenario: { include: { primaryQ12: true, coreValue: true } } },
  });

  const totalScore = progress.reduce((sum, p) => sum + p.scoreTotal, 0);
  const totalQ12 = progress.reduce((sum, p) => sum + p.q12ScoreTotal, 0);
  const totalCulture = progress.reduce((sum, p) => sum + p.cultureScoreTotal, 0);

  // Q12 breakdown: aggregate by primary Q12 dimension
  const q12Breakdown: Record<number, number> = {};
  for (const p of progress) {
    const qId = p.scenario.primaryQ12.id;
    q12Breakdown[qId] = (q12Breakdown[qId] || 0) + p.q12ScoreTotal;
  }

  // Core value breakdown
  const cvBreakdown: Record<string, number> = {};
  for (const p of progress) {
    const cvId = p.scenario.coreValue.id;
    cvBreakdown[cvId] = (cvBreakdown[cvId] || 0) + p.cultureScoreTotal;
  }

  // Best scores per scenario
  const bestScores: Record<string, number> = {};
  for (const p of progress) {
    if (!bestScores[p.scenarioId] || p.scoreTotal > bestScores[p.scenarioId]) {
      bestScores[p.scenarioId] = p.scoreTotal;
    }
  }

  return NextResponse.json({
    user,
    stats: {
      totalScore,
      totalQ12Score: totalQ12,
      totalCultureScore: totalCulture,
      scenariosCompleted: new Set(progress.map((p) => p.scenarioId)).size,
      totalAttempts: progress.length,
      avgScore: progress.length > 0 ? Math.round(totalScore / progress.length) : 0,
      q12Breakdown,
      coreValueBreakdown: cvBreakdown,
      bestScores,
    },
    recentProgress: progress.slice(-10).reverse().map((p) => ({
      scenarioId: p.scenarioId,
      scenarioTitle: p.scenario.title,
      score: p.scoreTotal,
      q12Score: p.q12ScoreTotal,
      cultureScore: p.cultureScoreTotal,
      completedAt: p.completedAt,
    })),
  });
}
