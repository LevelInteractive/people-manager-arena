import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export const dynamic = 'force-dynamic';

// GET /api/leaderboard?sort=score|completed|q12|improved
export async function GET(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const sort = req.nextUrl.searchParams.get("sort") || "score";

  // Get all users with completed scenarios
  const users = await prisma.user.findMany({
    where: {
      scenarioProgress: { some: { completedAt: { not: null } } },
    },
    select: {
      id: true,
      name: true,
      image: true,
      scenarioProgress: {
        where: { completedAt: { not: null } },
        select: {
          scoreTotal: true,
          q12ScoreTotal: true,
          scenarioId: true,
          completedAt: true,
        },
      },
    },
  });

  // Also include users with no completions but who have logged in
  const allUsers = await prisma.user.findMany({
    where: {
      role: "MANAGER",
      scenarioProgress: { none: {} },
    },
    select: { id: true, name: true, image: true },
    take: 50,
  });

  const leaderboard = users.map((u) => {
    const completedScenarioIds = new Set(u.scenarioProgress.map((p) => p.scenarioId));
    const totalScore = u.scenarioProgress.reduce((sum, p) => sum + p.scoreTotal, 0);
    const totalQ12 = u.scenarioProgress.reduce((sum, p) => sum + p.q12ScoreTotal, 0);
    const avgQ12 = u.scenarioProgress.length > 0 ? totalQ12 / u.scenarioProgress.length : 0;

    // "Most improved" = score from last 30 days minus score before that
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentScore = u.scenarioProgress
      .filter((p) => p.completedAt && p.completedAt > thirtyDaysAgo)
      .reduce((sum, p) => sum + p.scoreTotal, 0);

    return {
      id: u.id,
      name: u.name || "Anonymous",
      image: u.image,
      totalScore,
      scenariosCompleted: completedScenarioIds.size,
      avgQ12Score: Math.round(avgQ12 * 100) / 100,
      recentScore,
      isCurrentUser: u.id === session!.user.id,
    };
  });

  // Add zero-score users
  for (const u of allUsers) {
    leaderboard.push({
      id: u.id,
      name: u.name || "Anonymous",
      image: u.image,
      totalScore: 0,
      scenariosCompleted: 0,
      avgQ12Score: 0,
      recentScore: 0,
      isCurrentUser: u.id === session!.user.id,
    });
  }

  // Sort
  switch (sort) {
    case "completed":
      leaderboard.sort((a, b) => b.scenariosCompleted - a.scenariosCompleted || b.totalScore - a.totalScore);
      break;
    case "q12":
      leaderboard.sort((a, b) => b.avgQ12Score - a.avgQ12Score || b.totalScore - a.totalScore);
      break;
    case "improved":
      leaderboard.sort((a, b) => b.recentScore - a.recentScore || b.totalScore - a.totalScore);
      break;
    default: // "score"
      leaderboard.sort((a, b) => b.totalScore - a.totalScore);
  }

  // Log view
  await prisma.eventLog.create({
    data: {
      userId: session!.user.id,
      eventType: "leaderboard_viewed",
      metadata: { sort },
    },
  });

  return NextResponse.json(leaderboard);
}
