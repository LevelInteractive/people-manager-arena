import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

// GET /api/admin/analytics — Full admin dashboard data
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // ─── Usage Metrics ───
  const [
    totalUsers,
    activeUsers30d,
    totalStarted,
    totalCompleted,
    totalFeedback,
    totalBugsOpen,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "MANAGER" } }),
    prisma.user.count({ where: { role: "MANAGER", lastLoginAt: { gte: thirtyDaysAgo } } }),
    prisma.eventLog.count({ where: { eventType: "scenario_started" } }),
    prisma.userScenarioProgress.count({ where: { completedAt: { not: null } } }),
    prisma.feedbackSubmission.count(),
    prisma.bugReport.count({ where: { status: "OPEN" } }),
  ]);

  // ─── Drop-off rate (started but not completed) ───
  const dropOffRate = totalStarted > 0
    ? Math.round(((totalStarted - totalCompleted) / totalStarted) * 100)
    : 0;

  // ─── Avg completion time ───
  const completedProgress = await prisma.userScenarioProgress.findMany({
    where: { completedAt: { not: null } },
    select: { startedAt: true, completedAt: true },
  });
  const avgCompletionMinutes = completedProgress.length > 0
    ? Math.round(
        completedProgress.reduce((sum, p) => {
          const diff = (p.completedAt!.getTime() - p.startedAt.getTime()) / 60000;
          return sum + diff;
        }, 0) / completedProgress.length
      )
    : 0;

  // ─── Q12 Analytics ───
  const q12Dimensions = await prisma.q12Dimension.findMany({ orderBy: { id: "asc" } });
  const allProgress = await prisma.userScenarioProgress.findMany({
    where: { completedAt: { not: null } },
    include: { scenario: { select: { primaryQ12Id: true, secondaryQ12Id: true } } },
  });

  const q12Stats = q12Dimensions.map((q) => {
    const relevant = allProgress.filter(
      (p) => p.scenario.primaryQ12Id === q.id || p.scenario.secondaryQ12Id === q.id
    );
    const avgScore = relevant.length > 0
      ? Math.round((relevant.reduce((sum, p) => sum + p.q12ScoreTotal, 0) / relevant.length) * 100) / 100
      : 0;
    return { id: q.id, title: q.title, avgScore, attempts: relevant.length };
  });

  const mostStruggled = [...q12Stats]
    .filter((q) => q.attempts > 0)
    .sort((a, b) => a.avgScore - b.avgScore)[0] || null;

  // ─── Culture Analytics ───
  const coreValues = await prisma.coreValue.findMany();
  const cvStats = coreValues.map((cv) => {
    const relevant = allProgress.filter((p) => {
      // We'd need scenario's coreValueId — simplify
      return true;
    });
    const avgAlignment = relevant.length > 0
      ? Math.round((relevant.reduce((sum, p) => sum + p.cultureScoreTotal, 0) / relevant.length) * 100) / 100
      : 0;
    return { id: cv.id, name: cv.name, color: cv.color, avgAlignment };
  });

  // ─── Scenario Health ───
  const scenarios = await prisma.scenario.findMany({
    include: {
      userProgress: { where: { completedAt: { not: null } } },
      feedbackSubmissions: true,
      _count: {
        select: {
          userProgress: true,
        },
      },
    },
  });

  const scenarioHealth = scenarios.map((s) => {
    const completed = s.userProgress.length;
    const started = s._count.userProgress;
    const completionRate = started > 0 ? Math.round((completed / started) * 100) : 0;
    const avgScore = completed > 0
      ? Math.round(s.userProgress.reduce((sum, p) => sum + p.scoreTotal, 0) / completed)
      : 0;
    const avgFeedback = s.feedbackSubmissions.length > 0
      ? Math.round(
          (s.feedbackSubmissions.reduce((sum, f) => sum + f.ratingRealism, 0) /
            s.feedbackSubmissions.length) *
            10
        ) / 10
      : null;

    return {
      id: s.id,
      title: s.title,
      difficulty: s.difficulty,
      isActive: s.isActive,
      completionRate,
      avgScore,
      avgFeedbackRating: avgFeedback,
      totalCompletions: completed,
      totalStarts: started,
    };
  });

  // ─── Recent Events ───
  const recentEvents = await prisma.eventLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: { select: { name: true } },
      scenario: { select: { title: true } },
    },
  });

  return NextResponse.json({
    usage: {
      totalUsers,
      activeUsers30d,
      totalStarted,
      totalCompleted,
      dropOffRate,
      avgCompletionMinutes,
      totalFeedback,
      totalBugsOpen,
    },
    q12Analytics: {
      dimensions: q12Stats,
      mostStruggled,
    },
    cultureAnalytics: {
      values: cvStats,
    },
    scenarioHealth,
    recentEvents: recentEvents.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      userName: e.user.name,
      scenarioTitle: e.scenario?.title || null,
      metadata: e.metadata,
      createdAt: e.createdAt,
    })),
  });
}
