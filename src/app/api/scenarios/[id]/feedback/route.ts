import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

// POST /api/scenarios/[id]/feedback — Submit feedback
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const { ratingRealism, difficultyRating, commentsText } = body;

  if (!ratingRealism || !difficultyRating) {
    return NextResponse.json(
      { error: "ratingRealism and difficultyRating are required (1-5)" },
      { status: 400 }
    );
  }

  const feedback = await prisma.feedbackSubmission.create({
    data: {
      userId: session!.user.id,
      scenarioId: params.id,
      ratingRealism: Math.min(5, Math.max(1, ratingRealism)),
      difficultyRating: Math.min(5, Math.max(1, difficultyRating)),
      commentsText: commentsText || null,
    },
  });

  // Log event
  await prisma.eventLog.create({
    data: {
      userId: session!.user.id,
      eventType: "feedback_submitted",
      scenarioId: params.id,
      metadata: { ratingRealism, difficultyRating },
    },
  });

  return NextResponse.json(feedback, { status: 201 });
}
