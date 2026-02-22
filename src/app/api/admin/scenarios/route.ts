import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

// GET /api/admin/scenarios — List ALL scenarios (including inactive) with admin data
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const scenarios = await prisma.scenario.findMany({
    include: {
      primaryQ12: true,
      secondaryQ12: true,
      coreValue: true,
      nodes: {
        orderBy: { orderIndex: "asc" },
        include: {
          choices: { select: { id: true } },
        },
      },
      _count: {
        select: {
          userProgress: true,
          feedbackSubmissions: true,
          bugReports: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(
    scenarios.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      difficulty: s.difficulty,
      estimatedTimeMinutes: s.estimatedTimeMinutes,
      isActive: s.isActive,
      coreValue: s.coreValue,
      primaryQ12: s.primaryQ12,
      secondaryQ12: s.secondaryQ12,
      nodeCount: s.nodes.length,
      choiceCount: s.nodes.reduce((sum, n) => sum + n.choices.length, 0),
      totalAttempts: s._count.userProgress,
      totalFeedback: s._count.feedbackSubmissions,
      totalBugs: s._count.bugReports,
      createdAt: s.createdAt,
    }))
  );
}
